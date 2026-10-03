data "aws_availability_zones" "available" {
  state = "available"

  # Regular AZs only: skip Local/Wavelength Zones the account may have opted into.
  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }

  # The EKS control plane cannot use these zone IDs. AZ names map to IDs differently per
  # account, so "us-east-1a" might be use1-az3 in yours; excluding by ID is the reliable way.
  exclude_zone_ids = ["use1-az3", "usw1-az2", "cac1-az3"]
}

locals {
  azs = slice(data.aws_availability_zones.available.names, 0, 3)

  images = [
    "frontend",
    "api-gateway",
    "auth-service",
    "catalog-service",
    "library-service",
    "streaming-service",
    "recommendation-service",
  ]

  tags = {
    Project     = "streamflix"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# ---------------------------------------------------------------- network
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.21"

  name = "${var.cluster_name}-vpc"
  cidr = var.vpc_cidr
  azs  = local.azs

  # /20 private subnets for pods (VPC CNI gives every pod a VPC IP), small public subnets for load balancers.
  private_subnets  = [for i, _ in local.azs : cidrsubnet(var.vpc_cidr, 4, i)]
  public_subnets   = [for i, _ in local.azs : cidrsubnet(var.vpc_cidr, 8, 48 + i)]
  database_subnets = var.create_rds ? [for i, _ in local.azs : cidrsubnet(var.vpc_cidr, 8, 56 + i)] : []

  create_database_subnet_group = var.create_rds
  enable_nat_gateway           = true
  single_nat_gateway           = var.single_nat_gateway
  enable_dns_hostnames         = true

  # Lets Kubernetes place internet-facing and internal load balancers in the right subnets.
  public_subnet_tags  = { "kubernetes.io/role/elb" = 1 }
  private_subnet_tags = { "kubernetes.io/role/internal-elb" = 1 }
}

# ---------------------------------------------------------------- EKS
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.37"

  cluster_name    = var.cluster_name
  cluster_version = var.kubernetes_version

  cluster_endpoint_public_access           = true
  enable_cluster_creator_admin_permissions = true

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  cluster_addons = {
    coredns                = {}
    kube-proxy             = {}
    vpc-cni                = { before_compute = true }
    eks-pod-identity-agent = {}
    # Needed for the Postgres PersistentVolume (gp3 EBS).
    aws-ebs-csi-driver = { service_account_role_arn = module.ebs_csi_irsa.iam_role_arn }
  }

  eks_managed_node_groups = {
    default = {
      instance_types = var.node_instance_types
      capacity_type  = var.node_capacity_type
      min_size       = var.node_min_size
      desired_size   = var.node_desired_size
      max_size       = var.node_max_size
      labels         = { workload = "general" }
    }
  }

  access_entries = var.ci_principal_arn == "" ? {} : {
    ci = {
      principal_arn = var.ci_principal_arn
      policy_associations = {
        admin = {
          policy_arn   = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
          access_scope = { type = "cluster" }
        }
      }
    }
  }
}

module "ebs_csi_irsa" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "~> 5.55"

  role_name             = "${var.cluster_name}-ebs-csi"
  attach_ebs_csi_policy = true

  oidc_providers = {
    main = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["kube-system:ebs-csi-controller-sa"]
    }
  }
}

# ---------------------------------------------------------------- container registry
resource "aws_ecr_repository" "images" {
  for_each = toset(local.images)

  name                 = "streamflix/${each.key}"
  image_tag_mutability = "MUTABLE"
  force_delete         = var.ecr_force_delete

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }
}

resource "aws_ecr_lifecycle_policy" "images" {
  for_each   = aws_ecr_repository.images
  repository = each.value.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep the 30 most recent images"
      selection    = { tagStatus = "any", countType = "imageCountMoreThan", countNumber = 30 }
      action       = { type = "expire" }
    }]
  })
}

# ---------------------------------------------------------------- optional RDS PostgreSQL
resource "random_password" "db" {
  count   = var.create_rds ? 1 : 0
  length  = 32
  special = false # embedded in DATABASE_URL
}

resource "aws_security_group" "rds" {
  count       = var.create_rds ? 1 : 0
  name        = "${var.cluster_name}-rds"
  description = "PostgreSQL from EKS nodes only"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description     = "PostgreSQL from EKS worker nodes"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [module.eks.node_security_group_id]
  }
}

module "rds" {
  count   = var.create_rds ? 1 : 0
  source  = "terraform-aws-modules/rds/aws"
  version = "~> 6.12"

  identifier           = "${var.cluster_name}-postgres"
  engine               = "postgres"
  engine_version       = "16"
  family               = "postgres16"
  major_engine_version = "16"
  instance_class       = var.rds_instance_class

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_encrypted     = true

  db_name                     = "postgres"
  username                    = "streamflix"
  password                    = random_password.db[0].result
  manage_master_user_password = false
  port                        = 5432

  multi_az               = var.rds_multi_az
  db_subnet_group_name   = module.vpc.database_subnet_group_name
  vpc_security_group_ids = [aws_security_group.rds[0].id]

  create_db_option_group    = false
  create_db_parameter_group = false

  backup_retention_period = 7
  deletion_protection     = var.rds_deletion_protection
  skip_final_snapshot     = !var.rds_deletion_protection
}

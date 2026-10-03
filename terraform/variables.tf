variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name used in tags"
  type        = string
  default     = "dev"
}

variable "cluster_name" {
  description = "EKS cluster name (also prefixes VPC and IAM resources)"
  type        = string
  default     = "streamflix"
}

variable "kubernetes_version" {
  description = "EKS Kubernetes version"
  type        = string
  default     = "1.33"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "single_nat_gateway" {
  description = "One shared NAT gateway (cheaper) instead of one per AZ (highly available)"
  type        = bool
  default     = true
}

variable "node_instance_types" {
  description = "Instance types for the managed node group"
  type        = list(string)
  default     = ["t3.medium"]
}

variable "node_capacity_type" {
  description = "ON_DEMAND or SPOT"
  type        = string
  default     = "ON_DEMAND"
}

variable "node_min_size" {
  type    = number
  default = 2
}

variable "node_desired_size" {
  type    = number
  default = 3
}

variable "node_max_size" {
  type    = number
  default = 5
}

variable "ci_principal_arn" {
  description = "IAM role/user ARN used by Jenkins, granted cluster-admin through an EKS access entry. Empty to skip."
  type        = string
  default     = ""
}

variable "ecr_force_delete" {
  description = "Allow `terraform destroy` to delete ECR repositories that still contain images"
  type        = bool
  default     = true
}

# ---------- Optional managed PostgreSQL (RDS) ----------
variable "create_rds" {
  description = "Create an RDS PostgreSQL instance instead of running Postgres in the cluster"
  type        = bool
  default     = false
}

variable "rds_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "rds_multi_az" {
  type    = bool
  default = false
}

variable "rds_deletion_protection" {
  type    = bool
  default = false
}

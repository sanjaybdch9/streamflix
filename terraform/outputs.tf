output "region" {
  value = var.region
}

output "cluster_name" {
  value = module.eks.cluster_name
}

output "configure_kubectl" {
  description = "Run this to point kubectl at the new cluster"
  value       = "aws eks update-kubeconfig --region ${var.region} --name ${module.eks.cluster_name}"
}

output "ecr_registry" {
  description = "Use as the Helm value global.imageRegistry and the Jenkins REGISTRY"
  value       = split("/", aws_ecr_repository.images["frontend"].repository_url)[0]
}

output "ecr_repositories" {
  value = { for k, r in aws_ecr_repository.images : k => r.repository_url }
}

output "rds_endpoint" {
  description = "Set as externalDatabase.host (with postgresql.enabled=false)"
  value       = var.create_rds ? module.rds[0].db_instance_address : null
}

output "rds_password" {
  description = "Put into the streamflix-secrets POSTGRES_PASSWORD key: terraform output -raw rds_password"
  value       = var.create_rds ? random_password.db[0].result : null
  sensitive   = true
}

terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source = "hashicorp/aws"
      # The EKS v20 module supports AWS provider 5.x.
      version = ">= 5.95, < 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Recommended: keep state in S3 with locking. Create the bucket once, then uncomment.
  # backend "s3" {
  #   bucket       = "my-terraform-state-bucket"
  #   key          = "streamflix/terraform.tfstate"
  #   region       = "us-east-1"
  #   use_lockfile = true
  #   encrypt      = true
  # }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = local.tags
  }
}

# A small Terraform configuration: the .tf files tfscript must leave alone.
terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

resource "aws_s3_bucket" "logs" {
  bucket = "${var.prefix}-logs"
}

data "aws_caller_identity" "current" {}

module "network" {
  source = "./modules/network"
  cidr   = "10.0.0.0/16"
}

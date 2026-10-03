# Lets GitHub Actions deploy without any stored AWS keys.
# GitHub issues each workflow run a short-lived OpenID Connect token; AWS trusts tokens from
# this repository's main branch (and its "production" environment) and hands back temporary
# credentials for the role below. Pull requests and forks cannot assume it.

variable "github_repository" {
  description = "GitHub repository allowed to deploy, as owner/name. Empty to skip GitHub Actions setup."
  type        = string
  default     = "sanjaybdch9/streamflix"
}

# Repositories created recently use GitHub's immutable OIDC subject, which embeds the numeric
# owner and repository IDs ("repo:owner@123/name@456:..."), so a deleted-and-recreated repo with
# the same name can never assume the role. Find yours with:
#   gh api repos/OWNER/REPO/actions/oidc/customization/sub --jq .sub_claim_prefix
# Leave empty for repositories that still use the classic "repo:owner/name" subject.
variable "github_oidc_subject_prefix" {
  description = "Immutable OIDC subject prefix of the repository (see comment above), or empty"
  type        = string
  default     = "repo:sanjaybdch9@61964215/streamflix@1402766653"
}

locals {
  github_enabled = var.github_repository != ""
  github_subject = var.github_oidc_subject_prefix != "" ? var.github_oidc_subject_prefix : "repo:${var.github_repository}"
}

resource "aws_iam_openid_connect_provider" "github" {
  count = local.github_enabled ? 1 : 0

  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
  # AWS validates GitHub's certificate through its own trust store; these are kept for older tooling.
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1", "1c58a3a8518e8759bf075b76b750d4f2df264fcd"]
}

data "aws_iam_policy_document" "github_trust" {
  count = local.github_enabled ? 1 : 0

  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github[0].arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values = [
        "${local.github_subject}:ref:refs/heads/main",
        "${local.github_subject}:environment:production",
      ]
    }
  }
}

resource "aws_iam_role" "github_deploy" {
  count = local.github_enabled ? 1 : 0

  name                 = "${var.cluster_name}-github-deploy"
  description          = "Assumed by GitHub Actions in ${var.github_repository} to build and deploy"
  assume_role_policy   = data.aws_iam_policy_document.github_trust[0].json
  max_session_duration = 3600
}

data "aws_iam_policy_document" "github_deploy" {
  count = local.github_enabled ? 1 : 0

  statement {
    sid       = "EcrLogin"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }
  statement {
    sid = "EcrPushPull"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:CompleteLayerUpload",
      "ecr:DescribeImages",
      "ecr:GetDownloadUrlForLayer",
      "ecr:InitiateLayerUpload",
      "ecr:PutImage",
      "ecr:UploadLayerPart",
    ]
    resources = [for r in aws_ecr_repository.images : r.arn]
  }
  statement {
    sid       = "FindCluster"
    actions   = ["eks:DescribeCluster"]
    resources = [module.eks.cluster_arn]
  }
}

resource "aws_iam_role_policy" "github_deploy" {
  count = local.github_enabled ? 1 : 0

  name   = "build-and-deploy"
  role   = aws_iam_role.github_deploy[0].id
  policy = data.aws_iam_policy_document.github_deploy[0].json
}

# Inside Kubernetes, the role needs cluster-wide rights: the chart creates a StorageClass.
resource "aws_eks_access_entry" "github_deploy" {
  count = local.github_enabled ? 1 : 0

  cluster_name  = module.eks.cluster_name
  principal_arn = aws_iam_role.github_deploy[0].arn
}

resource "aws_eks_access_policy_association" "github_deploy" {
  count = local.github_enabled ? 1 : 0

  cluster_name  = module.eks.cluster_name
  principal_arn = aws_iam_role.github_deploy[0].arn
  policy_arn    = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"

  access_scope {
    type = "cluster"
  }

  depends_on = [aws_eks_access_entry.github_deploy]
}

output "github_deploy_role_arn" {
  description = "Set as the AWS_ROLE_ARN variable in the GitHub repository"
  value       = local.github_enabled ? aws_iam_role.github_deploy[0].arn : null
}

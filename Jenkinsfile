// StreamFlix CI/CD: test every service -> build & push 7 images to ECR -> Helm deploy to EKS -> smoke test.
// Agent needs: docker, aws CLI v2, kubectl, helm 3.
pipeline {
  agent any

  options {
    timeout(time: 45, unit: 'MINUTES')
    timestamps()
    disableConcurrentBuilds()
  }

  parameters {
    string(name: 'APP_DIR', defaultValue: '.', description: 'Path to the StreamFlix project inside the repo ("." = repository root)')
    string(name: 'AWS_REGION', defaultValue: 'us-east-1', description: 'AWS region of the EKS cluster and ECR')
    string(name: 'AWS_ACCOUNT_ID', defaultValue: '', description: 'AWS account that owns ECR (12 digits)')
    string(name: 'CLUSTER_NAME', defaultValue: 'streamflix', description: 'EKS cluster name (terraform output cluster_name)')
    string(name: 'AWS_CREDENTIALS_ID', defaultValue: 'aws-credentials', description: 'Jenkins username/password credential: access key id / secret. Leave empty to use the agent instance role.')
    string(name: 'NAMESPACE', defaultValue: 'streamflix', description: 'Kubernetes namespace')
    booleanParam(name: 'DEPLOY', defaultValue: true, description: 'Deploy to EKS after pushing images')
  }

  environment {
    SERVICES = 'api-gateway auth-service catalog-service library-service streaming-service recommendation-service'
    REGISTRY = "${params.AWS_ACCOUNT_ID}.dkr.ecr.${params.AWS_REGION}.amazonaws.com"
    AWS_DEFAULT_REGION = "${params.AWS_REGION}"
  }

  stages {
    stage('Validate parameters') {
      steps {
        script {
          if (!(params.AWS_ACCOUNT_ID ==~ /\d{12}/)) {
            error('AWS_ACCOUNT_ID must be a 12-digit AWS account id')
          }
          env.IMAGE_TAG = sh(script: 'git rev-parse --short=12 HEAD', returnStdout: true).trim()
          echo "Image tag: ${env.IMAGE_TAG}"
        }
      }
    }

    stage('Unit tests') {
      steps {
        dir("${params.APP_DIR}") {
          script {
            def services = env.SERVICES.split(' ')
            def branches = [:]
            services.each { svc ->
              branches[svc] = {
                // Run inside the same Node image used in production; no Node install needed on the agent.
                sh """
                  docker run --rm -v "\$PWD/services/${svc}":/app -w /app node:22-alpine \
                    sh -c 'npm ci --no-audit --no-fund && npm test'
                """
              }
            }
            branches['frontend-build'] = {
              sh '''
                docker run --rm -v "$PWD/frontend":/app -w /app node:22-alpine \
                  sh -c 'npm ci --no-audit --no-fund && npm run build'
              '''
            }
            parallel branches
          }
        }
      }
    }

    stage('Lint Helm chart') {
      steps {
        dir("${params.APP_DIR}") {
          sh 'helm lint helm/streamflix -f helm/streamflix/values-eks.yaml'
        }
      }
    }

    stage('Build and push images') {
      steps {
        dir("${params.APP_DIR}") {
          script {
            withAws {
              sh '''
                set -e
                aws ecr get-login-password --region "$AWS_DEFAULT_REGION" | docker login --username AWS --password-stdin "$REGISTRY"
                # EKS nodes are x86_64; pin the platform so ARM agents (e.g. Graviton, Apple Silicon) build compatible images.
                for svc in $SERVICES; do
                  docker build --platform linux/amd64 -t "$REGISTRY/streamflix/$svc:$IMAGE_TAG" "services/$svc"
                  docker push "$REGISTRY/streamflix/$svc:$IMAGE_TAG"
                done
                docker build --platform linux/amd64 -t "$REGISTRY/streamflix/frontend:$IMAGE_TAG" frontend
                docker push "$REGISTRY/streamflix/frontend:$IMAGE_TAG"
                docker logout "$REGISTRY"
              '''
            }
          }
        }
      }
    }

    stage('Deploy to EKS') {
      when { expression { params.DEPLOY } }
      steps {
        dir("${params.APP_DIR}") {
          script {
            withAws {
              sh '''
                set -e
                export KUBECONFIG="$WORKSPACE/.kubeconfig"
                aws eks update-kubeconfig --region "$AWS_DEFAULT_REGION" --name "$CLUSTER_NAME" --kubeconfig "$KUBECONFIG"

                # Roll back automatically if the new pods never become ready (flag was renamed in Helm 4).
                if helm version --short | grep -q '^v3'; then ROLLBACK=--atomic; else ROLLBACK=--rollback-on-failure; fi
                helm upgrade --install streamflix helm/streamflix \
                  --namespace "$NAMESPACE" --create-namespace \
                  -f helm/streamflix/values-eks.yaml \
                  --set global.imageRegistry="$REGISTRY" \
                  --set global.imageTag="$IMAGE_TAG" \
                  "$ROLLBACK" --wait --timeout 10m
              '''
            }
          }
        }
      }
    }

    stage('Smoke test') {
      when { expression { params.DEPLOY } }
      steps {
        script {
          withAws {
            sh '''
              set -e
              export KUBECONFIG="$WORKSPACE/.kubeconfig"
              # Ask the gateway, from inside the cluster, whether every microservice is ready.
              kubectl -n "$NAMESPACE" run "smoke-$BUILD_NUMBER" --rm -i --restart=Never \
                --image=curlimages/curl:8.14.1 -- \
                curl -fsS --retry 10 --retry-delay 6 --retry-all-errors http://api-gateway:4000/api/status
              echo
              echo "App URL: http://$(kubectl -n "$NAMESPACE" get svc frontend -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')"
            '''
          }
        }
      }
    }
  }

  post {
    always {
      sh 'rm -f "$WORKSPACE/.kubeconfig"'
    }
  }
}

// Use a static access key credential if one is configured, otherwise the agent's IAM role.
def withAws(Closure body) {
  if (params.AWS_CREDENTIALS_ID?.trim()) {
    withCredentials([usernamePassword(credentialsId: params.AWS_CREDENTIALS_ID,
                                      usernameVariable: 'AWS_ACCESS_KEY_ID',
                                      passwordVariable: 'AWS_SECRET_ACCESS_KEY')]) {
      body()
    }
  } else {
    body()
  }
}

# CloudFormation Templates

This directory contains AWS CloudFormation templates for deploying Learn-Easy to AWS.

## Template Structure

- **main.yml** - Main orchestration template (creates all resources)
- **database.yml** - RDS PostgreSQL database
- **s3-storage.yml** - S3 bucket for file uploads
- **ecs-cluster.yml** - ECS Fargate cluster and service

## Quick Deploy

### Prerequisites
1. AWS CLI configured with credentials
2. Docker image pushed to ECR
3. VPC with at least 2 subnets

### Steps

1. **Upload templates to S3** (required for nested stacks)
   ```bash
   aws s3 mb s3://learn-easy-cf-templates-$(aws sts get-caller-identity --query Account --output text)
   aws s3 cp *.yml s3://learn-easy-cf-templates-$(aws sts get-caller-identity --query Account --output text)/
   ```

2. **Update main.yml** with S3 URLs for TemplateURL

3. **Create stack**
   ```bash
   aws cloudformation create-stack \
     --stack-name learn-easy-production \
     --template-body file://main.yml \
     --parameters file://parameters.json \
     --capabilities CAPABILITY_NAMED_IAM
   ```

## Individual Templates

You can also deploy templates individually:

### Database Only
```bash
aws cloudformation create-stack \
  --stack-name learn-easy-db \
  --template-body file://database.yml \
  --parameters ParameterKey=VpcId,ParameterValue=vpc-xxx ParameterKey=SubnetIds,ParameterValue=subnet-xxx,subnet-yyy
```

### S3 Storage Only
```bash
aws cloudformation create-stack \
  --stack-name learn-easy-s3 \
  --template-body file://s3-storage.yml \
  --parameters ParameterKey=BucketName,ParameterValue=learn-easy-uploads
```

## Parameters

See each template file for required parameters. Common ones:
- `VpcId` - Your VPC ID
- `SubnetIds` - Comma-separated list of subnet IDs
- `DBPassword` - Database password (min 8 chars)
- `AdminPassword` - Admin panel password
- `ImageURI` - ECR image URI

## Outputs

Each template exports outputs that can be referenced by other stacks:
- Database endpoint and connection URL
- S3 bucket name and ARN
- Load balancer DNS name
- Application URL

## Cost Estimation

Approximate monthly costs (us-east-1):
- RDS db.t3.micro: ~$15/month
- ECS Fargate (512 CPU, 1GB): ~$15/month
- S3 storage: ~$0.023/GB/month
- Data transfer: Variable

**Total: ~$30-50/month** for small deployments

## Security Notes

- Database is in private subnets (not publicly accessible)
- S3 bucket blocks public access
- Security groups restrict access
- IAM roles follow least privilege
- Consider enabling encryption at rest for production

## Troubleshooting

- **Stack creation fails**: Check CloudFormation events in AWS Console
- **Database connection issues**: Verify security groups allow traffic
- **S3 upload fails**: Check IAM role permissions
- **ECS tasks not starting**: Check CloudWatch logs

For detailed deployment instructions, see [DEPLOYMENT.md](../DEPLOYMENT.md).

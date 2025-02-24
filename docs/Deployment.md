# Deployment Guide

## Deployment Architecture

### Components
1. AWS Lambda Functions
2. DynamoDB Tables
3. Cloudflare Workers
4. Google Cloud Storage
5. Discord/Telegram/Meta Webhooks

### Infrastructure Requirements
- AWS Account (Free Tier eligible)
- Cloudflare Account (Free Tier)
- Google Cloud Account (Free Tier)
- Domain for webhook endpoints

## Deployment Process

### 1. Initial Setup

#### AWS Setup
```bash
# Configure AWS CLI
aws configure

# Create S3 deployment bucket
aws s3 mb s3://your-deployment-bucket

# Deploy CloudFormation stack
aws cloudformation deploy \
  --template-file config/cloudformation.yaml \
  --stack-name bot-system-stack \
  --capabilities CAPABILITY_IAM
```

#### Google Cloud Setup
```bash
# Install Google Cloud SDK
# Authenticate and set project
gcloud auth login
gcloud config set project your-project-id

# Create storage bucket
gsutil mb gs://your-backup-bucket
```

#### Cloudflare Setup
```bash
# Install Wrangler CLI
npm i -g wrangler

# Configure Wrangler
wrangler login

# Publish worker
wrangler publish
```

### 2. Environment Configuration

#### Production Environment
1. Create `.env.production`:
   - AWS credentials
   - Database configuration
   - Platform tokens
   - Webhook URLs
   - Security keys

#### Staging Environment
1. Create `.env.staging` with test credentials
2. Configure staging endpoints
3. Set up test databases
4. Enable debug logging

### 3. Database Setup

#### DynamoDB Tables
```bash
# Create main table
aws dynamodb create-table \
  --table-name BotAutomationSystem \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
    AttributeName=timestamp,AttributeType=S \
  --key-schema \
    AttributeName=id,KeyType=HASH \
    AttributeName=timestamp,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST

# Create backup table
aws dynamodb create-table \
  --table-name BotSystemBackups \
  --attribute-definitions \
    AttributeName=backupId,AttributeType=S \
  --key-schema \
    AttributeName=backupId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

### 4. Platform Configuration

#### Discord Setup
1. Configure webhook endpoints
2. Set up bot permissions
3. Enable required intents
4. Configure slash commands

#### Telegram Setup
1. Set webhook URL
2. Configure commands
3. Set up webhook secret
4. Test bot functionality

#### Meta Platform Setup
1. Configure webhooks
2. Verify domains
3. Set up access tokens
4. Test integrations

### 5. Monitoring Setup

#### CloudWatch
1. Create log groups
2. Set up metrics
3. Configure alarms
4. Set up dashboards

#### Discord Notifications
1. Create notification channel
2. Set up webhooks
3. Configure alert levels
4. Test notifications

### 6. CI/CD Pipeline

#### GitHub Actions
1. Set up secrets
2. Configure environments
3. Set branch protections
4. Configure workflows

#### Deployment Stages
1. Build
2. Test
3. Stage
4. Production

## Deployment Validation

### 1. Health Checks
```bash
# Run system health check
npm run monitor

# Verify backup system
npm run backup:test

# Test platform integrations
npm run test:integration
```

### 2. Load Testing
```bash
# Run performance tests
npm run test:performance

# Monitor metrics
npm run monitor:metrics

# Check error rates
npm run monitor:errors
```

### 3. Security Verification
- Validate SSL/TLS
- Check permissions
- Test rate limiting
- Verify encryption

## Rollback Procedures

### 1. Lambda Functions
```bash
# Roll back to previous version
aws lambda update-function-code \
  --function-name function-name \
  --revision-id previous-revision
```

### 2. Database Recovery
```bash
# Restore from backup
npm run backup:restore --id backup-id
```

### 3. Worker Rollback
```bash
# Roll back Cloudflare Worker
wrangler rollback
```

## Maintenance

### Regular Tasks
1. Update dependencies
2. Rotate credentials
3. Review logs
4. Clean up data
5. Verify backups

### Monitoring
1. Check metrics
2. Review alerts
3. Analyze logs
4. Monitor costs

## Troubleshooting

### Common Issues
1. Cold start latency
2. Rate limit errors
3. Database throttling
4. Memory issues

### Solutions
1. Provisioned concurrency
2. Implement caching
3. Optimize queries
4. Adjust memory

## Cost Management

### Free Tier Usage
- AWS Lambda: 1M requests/month
- DynamoDB: 25GB storage
- Cloudflare: 100,000 requests/day
- Google Cloud: 5GB storage

### Cost Optimization
1. Use provisioned concurrency wisely
2. Implement efficient caching
3. Optimize database usage
4. Monitor API calls

## Infrastructure as Code (CloudFormation)

### Prerequisites
- AWS CLI configured with appropriate permissions
- S3 bucket for Lambda deployment packages
- Required environment variables in SSM Parameter Store

### CloudFormation Stack Deployment

1. **Prepare Deployment Package**
```bash
# Build and package Lambda functions
npm run build
zip -r function.zip . \
  -x "*.git*" \
  -x "*.github*" \
  -x "tests/*" \
  -x "docs/*" \
  -x "*.md" \
  -x "*.env*"

# Upload to S3
aws s3 cp function.zip s3://bot-system-${ENVIRONMENT}/function.zip
```

2. **Deploy CloudFormation Stack**
```bash
# For development environment
aws cloudformation deploy \
  --template-file config/cloudformation.yaml \
  --stack-name bot-system-dev \
  --parameter-overrides \
    Environment=development \
    DynamoDBTableName=BotAutomationSystem-Dev \
    BackupTableName=BotSystemBackups-Dev \
    LambdaMemorySize=256 \
    LambdaTimeout=30 \
  --capabilities CAPABILITY_IAM

# For staging environment
aws cloudformation deploy \
  --template-file config/cloudformation.yaml \
  --stack-name bot-system-staging \
  --parameter-overrides \
    Environment=staging \
    DynamoDBTableName=BotAutomationSystem-Staging \
    BackupTableName=BotSystemBackups-Staging \
    LambdaMemorySize=512 \
    LambdaTimeout=60 \
  --capabilities CAPABILITY_IAM

# For production environment
aws cloudformation deploy \
  --template-file config/cloudformation.yaml \
  --stack-name bot-system-prod \
  --parameter-overrides \
    Environment=production \
    DynamoDBTableName=BotAutomationSystem-Prod \
    BackupTableName=BotSystemBackups-Prod \
    LambdaMemorySize=1024 \
    LambdaTimeout=90 \
  --capabilities CAPABILITY_IAM
```

### CloudFormation Stack Resources

The template (`config/cloudformation.yaml`) creates:

1. **IAM Resources**
   - Lambda execution role with DynamoDB permissions
   - CloudWatch Events permissions

2. **DynamoDB Tables**
   - Main bot data table with GSI
   - Backup metadata table
   - Point-in-time recovery enabled
   - Server-side encryption

3. **Lambda Functions**
   - Discord bot function
   - Telegram bot function
   - Meta platforms bot function
   - CSV export function
   - Scheduled tasks function

4. **CloudWatch Resources**
   - Event rule for scheduled tasks
   - Lambda permissions for event invocation

### Stack Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| Environment | Deployment environment | development |
| DynamoDBTableName | Main table name | BotAutomationSystem |
| BackupTableName | Backup table name | BotSystemBackups |
| LambdaMemorySize | Lambda memory (MB) | 256 |
| LambdaTimeout | Lambda timeout (seconds) | 30 |

### Stack Outputs

| Output | Description |
|--------|-------------|
| DynamoDBTableName | Main table name |
| BackupTableName | Backup table name |
| DiscordBotFunctionArn | Discord Lambda ARN |
| TelegramBotFunctionArn | Telegram Lambda ARN |
| MetaBotFunctionArn | Meta Lambda ARN |
| CSVExportFunctionArn | Export Lambda ARN |
| ScheduledTasksFunctionArn | Tasks Lambda ARN |
| LambdaRoleArn | IAM role ARN |

### Updating Stack

```bash
# Update existing stack
aws cloudformation update-stack \
  --stack-name bot-system-${ENVIRONMENT} \
  --template-body file://config/cloudformation.yaml \
  --parameters ParameterKey=LambdaMemorySize,ParameterValue=512 \
  --capabilities CAPABILITY_IAM

# Monitor update progress
aws cloudformation describe-stack-events \
  --stack-name bot-system-${ENVIRONMENT}
```

### Stack Deletion

```bash
# Delete stack (careful with production!)
aws cloudformation delete-stack \
  --stack-name bot-system-${ENVIRONMENT}

# Verify deletion
aws cloudformation describe-stacks \
  --stack-name bot-system-${ENVIRONMENT}
```

### Best Practices

1. **Environment Separation**
   - Use different stack names per environment
   - Maintain separate parameter values
   - Isolate resources with naming

2. **Backup Strategy**
   - Enable point-in-time recovery
   - Regular automated backups
   - Test restoration process

3. **Security**
   - Use IAM roles with minimal permissions
   - Enable encryption at rest
   - Implement secure parameters

4. **Monitoring**
   - Set up CloudWatch alarms
   - Monitor stack events
   - Track resource usage

### Troubleshooting

1. **Stack Creation Failures**
   - Check CloudFormation events
   - Verify IAM permissions
   - Validate template syntax

2. **Update Issues**
   - Review change set
   - Check resource dependencies
   - Verify parameter values

3. **Resource Cleanup**
   - Empty S3 buckets before deletion
   - Check resource dependencies
   - Backup important data
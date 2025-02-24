# Configuration Guide

## Environment Variables

### Required Environment Variables

#### AWS Configuration
- `AWS_REGION`: AWS region (e.g., us-east-1)
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key

#### Database Configuration
- `DYNAMODB_TABLE_NAME`: Main DynamoDB table name
- `DYNAMODB_BACKUP_TABLE`: Backup metadata table name

#### Discord Configuration
- `DISCORD_BOT_TOKEN`: Discord bot token
- `DISCORD_CLIENT_ID`: Discord application client ID
- `DISCORD_NOTIFICATION_WEBHOOK_URL`: Webhook URL for system notifications
- `DISCORD_REPORTS_WEBHOOK_URL`: Webhook URL for reports

#### Telegram Configuration
- `TELEGRAM_BOT_TOKEN`: Telegram bot token
- `TELEGRAM_WEBHOOK_SECRET`: Webhook verification secret

#### Meta Platform Configuration
- `META_APP_ID`: Meta application ID
- `META_APP_SECRET`: Meta application secret
- `WHATSAPP_ACCESS_TOKEN`: WhatsApp Business API token
- `FACEBOOK_ACCESS_TOKEN`: Facebook page access token
- `INSTAGRAM_ACCESS_TOKEN`: Instagram graph API token

#### Google Cloud Configuration
- `GOOGLE_CLOUD_PROJECT_ID`: GCP project ID
- `GOOGLE_CLOUD_BUCKET_NAME`: GCS bucket name
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to service account key file

#### Cloudflare Configuration
- `CLOUDFLARE_API_TOKEN`: Cloudflare API token
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare account ID

### Optional Environment Variables

#### Security Configuration
- `JWT_SECRET`: Secret for JWT generation (defaults to random)
- `BACKUP_ENCRYPTION_KEY`: 32-character hex key for backup encryption

#### Monitoring Configuration
- `ALERT_THRESHOLD_WARNING`: Warning threshold percentage (default: 70)
- `ALERT_THRESHOLD_CRITICAL`: Critical threshold percentage (default: 90)
- `ERROR_THRESHOLD`: Maximum error rate before alerts (default: 5)
- `MAX_RESPONSE_TIME_MS`: Maximum acceptable response time (default: 5000)
- `BACKUP_RETENTION_DAYS`: Number of days to retain backups (default: 30)

## AWS Configuration

### DynamoDB Table Schemas

#### Main Table (BotAutomationSystem)
```json
{
  "TableName": "BotAutomationSystem",
  "KeySchema": [
    { "AttributeName": "id", "KeyType": "HASH" },
    { "AttributeName": "timestamp", "KeyType": "RANGE" }
  ],
  "AttributeDefinitions": [
    { "AttributeName": "id", "AttributeType": "S" },
    { "AttributeName": "timestamp", "AttributeType": "S" },
    { "AttributeName": "type", "AttributeType": "S" }
  ],
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "TypeIndex",
      "KeySchema": [
        { "AttributeName": "type", "KeyType": "HASH" },
        { "AttributeName": "timestamp", "KeyType": "RANGE" }
      ],
      "Projection": { "ProjectionType": "ALL" }
    }
  ]
}
```

#### Backup Table (BotSystemBackups)
```json
{
  "TableName": "BotSystemBackups",
  "KeySchema": [
    { "AttributeName": "backupId", "KeyType": "HASH" }
  ],
  "AttributeDefinitions": [
    { "AttributeName": "backupId", "AttributeType": "S" },
    { "AttributeName": "timestamp", "AttributeType": "S" }
  ],
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "TimestampIndex",
      "KeySchema": [
        { "AttributeName": "timestamp", "KeyType": "HASH" }
      ],
      "Projection": { "ProjectionType": "ALL" }
    }
  ]
}
```

### Lambda Configuration

#### Function Settings
- Runtime: Node.js 22.x
- Memory: 256 MB (adjustable based on load)
- Timeout: 30 seconds
- Concurrency: 10 (adjustable)

#### IAM Roles
Required permissions:
- DynamoDB: Read/Write
- CloudWatch: Logs and Metrics
- S3: Read/Write for deployments
- STS: AssumeRole
- SNS: Publish (for notifications)

## Platform Configuration

### Discord Bot
1. Create application at Discord Developer Portal
2. Enable bot user
3. Set required intents:
   - Presence Intent
   - Server Members Intent
   - Message Content Intent
4. Generate and configure webhook URLs

### Telegram Bot
1. Create bot via BotFather
2. Set webhook URL
3. Configure commands
4. Set up webhook secret

### Meta Platform Integration
1. Create Meta app
2. Configure webhooks
3. Set up business account
4. Generate access tokens

## Security Configuration

### API Security
- JWT authentication for API endpoints
- Webhook signature verification
- Rate limiting configuration

### Data Protection
- Encryption at rest (DynamoDB)
- Backup encryption (AES-256)
- Secure credential storage

## Monitoring Configuration

### Health Checks
- CPU usage thresholds
- Memory usage limits
- Response time thresholds
- Error rate monitoring

### Alerting
- Discord webhook configuration
- Alert severity levels
- Notification templates

## Performance Configuration

### Caching
- DynamoDB DAX settings
- In-memory cache parameters
- Rate limit cache configuration

### Lambda Optimization
- Memory allocation
- Concurrency limits
- Cold start optimization
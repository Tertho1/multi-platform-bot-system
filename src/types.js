/**
 * @typedef {Object} BackupStats
 * @property {string} timestamp - ISO timestamp of the backup
 * @property {string} fileName - Name of the backup file
 * @property {number} size - Size of the backup in bytes
 * @property {number} recordCount - Number of records in the backup
 * @property {Record<string, number>} platforms - Count of records by platform
 */

/**
 * @typedef {Object} BackupMetadata
 * @property {string} backupId - Unique identifier for the backup
 * @property {string} timestamp - ISO timestamp of the backup
 * @property {string} status - Status of the backup
 * @property {number} recordCount - Number of records in the backup
 * @property {number} size - Size of the backup in bytes
 * @property {string} bucketName - Name of the storage bucket
 * @property {string} path - Path to the backup file
 * @property {string} url - Signed URL to access the backup
 */

/**
 * @typedef {Object} PlatformStats
 * @property {number} totalInteractions - Total number of interactions
 * @property {number} uniqueUsers - Number of unique users
 * @property {number} messageCount - Number of messages
 * @property {number} commandCount - Number of commands
 * @property {number} engagementRate - Engagement rate calculation
 */

/**
 * @typedef {Object} WeeklyReport
 * @property {string} timestamp - ISO timestamp of the report
 * @property {'weekly'} period - Report period
 * @property {Record<string, PlatformStats>} platformStats - Stats by platform
 * @property {number} totalInteractions - Total interactions across all platforms
 */

/**
 * @typedef {Object} HealthCheckResult
 * @property {boolean} healthy - Overall health status
 * @property {SystemMetrics} metrics - System metrics
 * @property {Record<string, boolean>} platformStatus - Status by platform
 */

/**
 * @typedef {Object} SystemMetrics
 * @property {string} timestamp - ISO timestamp of the metrics
 * @property {number} averageResponseTime - Average response time in ms
 * @property {number} errorRate - Error rate as decimal
 * @property {PlatformResult[]} platformResults - Results by platform
 */

/**
 * @typedef {Object} PlatformResult
 * @property {string} platform - Platform name
 * @property {boolean} healthy - Platform health status
 * @property {number} [responseTime] - Response time in ms
 * @property {string} [error] - Error message if any
 */

/**
 * @typedef {Object} TicketData
 * @property {string} id - Unique ticket ID
 * @property {string} userId - User ID
 * @property {string} platform - Platform name
 * @property {string} subject - Ticket subject
 * @property {string} description - Ticket description
 * @property {string} category - Ticket category
 * @property {Record<string, any>} metadata - Additional metadata
 * @property {string} status - Ticket status
 * @property {string} [priority] - Ticket priority
 * @property {TicketResponse[]} responses - Ticket responses
 * @property {string} createdAt - Creation timestamp
 * @property {string} updatedAt - Last update timestamp
 */

/**
 * @typedef {Object} TicketResponse
 * @property {string} userId - User ID who responded
 * @property {string} content - Response content
 * @property {boolean} isStaff - Whether the response is from staff
 * @property {string} timestamp - ISO timestamp of the response
 */

/**
 * @typedef {Object} InteractionData
 * @property {string} userId - User ID
 * @property {string} platform - Platform name
 * @property {'message' | 'command' | 'reaction' | 'ticket'} type - Interaction type
 * @property {Record<string, any>} content - Interaction content
 * @property {string} timestamp - ISO timestamp
 * @property {Record<string, any>} [metadata] - Additional metadata
 */

/**
 * @typedef {Object} UserProfile
 * @property {string} userId - Primary user ID
 * @property {string} [discordId] - Discord user ID
 * @property {string} [telegramId] - Telegram user ID
 * @property {string} [whatsappId] - WhatsApp user ID
 * @property {string} [facebookId] - Facebook user ID
 * @property {string} [instagramId] - Instagram user ID
 * @property {number} reputationScore - User reputation score
 * @property {number} engagementScore - User engagement score
 * @property {string} createdAt - ISO timestamp of profile creation
 * @property {string} lastActive - ISO timestamp of last activity
 * @property {number} violations - Number of violations
 * @property {Record<string, any>} preferences - User preferences
 */

/**
 * @typedef {Object} BotConfig
 * @property {string} DYNAMODB_TABLE_NAME - DynamoDB table name
 * @property {string} DYNAMODB_BACKUP_TABLE - DynamoDB backup table name
 * @property {string} GOOGLE_CLOUD_BUCKET_NAME - GCS bucket name
 * @property {string} DISCORD_NOTIFICATION_WEBHOOK_URL - Discord notifications webhook URL
 * @property {string} DISCORD_REPORTS_WEBHOOK_URL - Discord reports webhook URL
 * @property {string} TELEGRAM_BOT_TOKEN - Telegram bot token
 * @property {string} TELEGRAM_WEBHOOK_SECRET - Telegram webhook secret
 * @property {string} META_APP_SECRET - Meta app secret
 * @property {string} WHATSAPP_ACCESS_TOKEN - WhatsApp access token
 * @property {string} FACEBOOK_ACCESS_TOKEN - Facebook access token
 * @property {string} INSTAGRAM_ACCESS_TOKEN - Instagram access token
 * @property {string} BACKUP_ENCRYPTION_KEY - Backup encryption key (hex)
 * @property {string} [BACKUP_RETENTION_DAYS] - Backup retention days
 * @property {string} [MAX_RESPONSE_TIME_MS] - Max response time in ms
 * @property {string} [ERROR_THRESHOLD] - Error rate threshold
 * @property {string} [ALERT_THRESHOLD_WARNING] - Warning threshold percentage
 * @property {string} [ALERT_THRESHOLD_CRITICAL] - Critical threshold percentage
 */

/**
 * @typedef {Object} LambdaEvent
 * @property {string} body - Request body
 * @property {Record<string, string>} headers - Request headers
 * @property {Record<string, string>} queryStringParameters - Query parameters
 * @property {string} httpMethod - HTTP method
 * @property {string} [taskType] - Task type for scheduled events
 */

/**
 * @typedef {Object} LambdaContext
 * @property {string} functionName - Lambda function name
 * @property {string} functionVersion - Lambda function version
 * @property {string} invokedFunctionArn - Lambda function ARN
 * @property {string} memoryLimitInMB - Memory limit
 * @property {string} awsRequestId - AWS request ID
 * @property {string} logGroupName - CloudWatch log group
 * @property {string} logStreamName - CloudWatch log stream
 * @property {number} getRemainingTimeInMillis - Time remaining function
 */

/**
 * @typedef {Object} LambdaResponse
 * @property {number} statusCode - HTTP status code
 * @property {string} body - Response body
 * @property {Record<string, string>} [headers] - Response headers
 * @property {boolean} [isBase64Encoded] - Whether body is base64
 */

/**
 * @typedef {Object} CSVExportData
 * @property {string} userId - User ID
 * @property {string} platform - Platform name
 * @property {string} type - Interaction type
 * @property {string} timestamp - Timestamp
 * @property {string} content - Content
 */

export { };
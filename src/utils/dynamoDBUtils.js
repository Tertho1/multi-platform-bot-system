import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocumentClient,
    PutCommand,
    GetCommand,
    QueryCommand,
    ScanCommand,
    UpdateCommand,
    DeleteCommand,
    BatchWriteCommand
} from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

/**
 * Utility class for DynamoDB operations
 */
export class DynamoDBUtils {
    /**
     * Save interaction data
     * @param {string} userId - User ID
     * @param {string} platform - Platform name
     * @param {Record<string, any>} data - Interaction data
     * @returns {Promise<void>}
     */
    static async saveInteraction(userId, platform, data) {
        const params = {
            TableName: process.env.DYNAMODB_TABLE_NAME,
            Item: {
                id: `${platform}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                userId,
                platform,
                ...data,
                timestamp: new Date().toISOString()
            }
        };

        await docClient.send(new PutCommand(params));
    }

    /**
     * Update user reputation score
     * @param {string} userId - User ID
     * @param {number} score - New score
     * @returns {Promise<void>}
     */
    static async updateReputationScore(userId, score) {
        const params = {
            TableName: process.env.DYNAMODB_TABLE_NAME,
            Item: {
                userId,
                type: 'reputation',
                score,
                updatedAt: new Date().toISOString()
            }
        };

        await docClient.send(new PutCommand(params));
    }

    /**
     * Get all data from table
     * @returns {Promise<Array>} All data from the table
     */
    static async getAllData() {
        const items = [];
        let lastEvaluatedKey;

        do {
            const params = {
                TableName: process.env.DYNAMODB_TABLE_NAME,
                Limit: 1000
            };

            if (lastEvaluatedKey) {
                params.ExclusiveStartKey = lastEvaluatedKey;
            }

            const response = await docClient.send(new ScanCommand(params));
            items.push(...(response.Items || []));
            lastEvaluatedKey = response.LastEvaluatedKey;
        } while (lastEvaluatedKey);

        return items;
    }

    /**
     * Save backup metadata
     * @param {Object} backupInfo - Backup information
     * @returns {Promise<void>}
     */
    static async saveBackupMetadata(backupInfo) {
        const params = {
            TableName: process.env.DYNAMODB_BACKUP_TABLE,
            Item: {
                backupId: backupInfo.fileName,
                timestamp: backupInfo.timestamp,
                status: backupInfo.status,
                recordCount: backupInfo.recordCount,
                size: backupInfo.size,
                bucketName: backupInfo.bucketName,
                path: backupInfo.path
            }
        };

        await docClient.send(new PutCommand(params));
    }

    /**
     * Query data by platform and date range
     * @param {string} platform - Platform name
     * @param {string} startDate - Start date ISO string
     * @param {string} endDate - End date ISO string
     * @returns {Promise<Record<string, any>[]>}
     */
    static async queryData(platform, startDate, endDate) {
        const params = {
            TableName: process.env.DYNAMODB_TABLE_NAME,
            IndexName: 'platform-timestamp-index',
            KeyConditionExpression: '#platform = :platform AND #timestamp BETWEEN :start AND :end',
            ExpressionAttributeNames: {
                '#platform': 'platform',
                '#timestamp': 'timestamp'
            },
            ExpressionAttributeValues: {
                ':platform': platform,
                ':start': startDate,
                ':end': endDate
            }
        };

        const response = await docClient.send(new QueryCommand(params));
        return response.Items || [];
    }

    /**
     * Clean up old backups
     * @returns {Promise<{ success: boolean, deletedCount: number }>}
     */
    static async cleanupOldBackups() {
        const retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS || '30');
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        const params = {
            TableName: process.env.DYNAMODB_BACKUP_TABLE,
            FilterExpression: '#timestamp < :cutoffDate',
            ExpressionAttributeNames: {
                '#timestamp': 'timestamp'
            },
            ExpressionAttributeValues: {
                ':cutoffDate': cutoffDate.toISOString()
            }
        };

        const response = await docClient.send(new ScanCommand(params));
        const items = response.Items || [];

        if (items.length === 0) {
            return { success: true, deletedCount: 0 };
        }

        // Delete in batches of 25 (DynamoDB limit)
        const batches = [];
        for (let i = 0; i < items.length; i += 25) {
            const batch = items.slice(i, i + 25).map(item => ({
                DeleteRequest: {
                    Key: {
                        backupId: item.backupId
                    }
                }
            }));

            batches.push({
                RequestItems: {
                    [process.env.DYNAMODB_BACKUP_TABLE || '']: batch
                }
            });
        }

        await Promise.all(batches.map(batch =>
            docClient.send(new BatchWriteCommand(batch))
        ));

        return { success: true, deletedCount: items.length };
    }

    /**
     * Scan table for all items with pagination
     * @param {{ TableName: string, Limit?: number }} params - Scan parameters
     * @returns {Promise<Record<string, any>[]>}
     */
    static async scan(params) {
        const items = [];
        let lastEvaluatedKey;

        do {
            const scanParams = {
                ...params,
                ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey })
            };

            const response = await docClient.send(new ScanCommand(scanParams));
            if (response.Items) {
                items.push(...response.Items);
            }

            lastEvaluatedKey = response.LastEvaluatedKey;
        } while (lastEvaluatedKey);

        return items;
    }

    /**
     * Put an item in the table
     * @param {{ TableName: string, Item: Record<string, any> }} params - Put parameters
     * @returns {Promise<void>}
     */
    static async putItem(params) {
        await docClient.send(new PutCommand(params));
    }

    /**
     * Get an item from the table
     * @param {{ TableName: string, Key: Record<string, any> }} params - Get parameters
     * @returns {Promise<Record<string, any> | null>}
     */
    static async getItem(params) {
        const response = await docClient.send(new GetCommand(params));
        return response.Item || null;
    }

    /**
     * Update an item in the table
     * @param {{ TableName: string, Key: Record<string, any>, UpdateExpression: string, ExpressionAttributeNames?: Record<string, string>, ExpressionAttributeValues: Record<string, any> }} params - Update parameters
     * @returns {Promise<void>}
     */
    static async updateItem(params) {
        await docClient.send(new UpdateCommand(params));
    }

    /**
     * Delete an item from the table
     * @param {{ TableName: string, Key: Record<string, any> }} params - Delete parameters
     * @returns {Promise<void>}
     */
    static async deleteItem(params) {
        await docClient.send(new DeleteCommand(params));
    }
}

export default DynamoDBUtils;
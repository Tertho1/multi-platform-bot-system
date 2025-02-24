import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    QueryCommand,
    UpdateCommand
} from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

export class UserUtils {
    /**
     * Link platform accounts for a user
     * @param {Object} params - Platform IDs to link
     * @param {string} [params.discordId] - Discord user ID
     * @param {string} [params.telegramId] - Telegram user ID
     * @param {string} [params.whatsappId] - WhatsApp user ID
     * @param {string} [params.facebookId] - Facebook user ID
     * @param {string} [params.instagramId] - Instagram user ID
     * @returns {Promise<{ success: boolean, userId: string }>} Result of the linking operation
     */
    static async linkAccounts({
        discordId,
        telegramId,
        whatsappId,
        facebookId,
        instagramId
    }) {
        // Check if any of these IDs are already linked
        const linkedAccounts = await Promise.all([
            discordId ? this.findByPlatformId('discord', discordId) : null,
            telegramId ? this.findByPlatformId('telegram', telegramId) : null,
            whatsappId ? this.findByPlatformId('whatsapp', whatsappId) : null,
            facebookId ? this.findByPlatformId('facebook', facebookId) : null,
            instagramId ? this.findByPlatformId('instagram', instagramId) : null
        ]);

        const existingUserId = linkedAccounts.find(id => id !== null);

        if (existingUserId) {
            // Update existing user record with new platform IDs
            await this.updateUserPlatforms(existingUserId, {
                discordId,
                telegramId,
                whatsappId,
                facebookId,
                instagramId
            });

            return { success: true, userId: existingUserId };
        }

        // Create new user record
        const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await docClient.send(new PutCommand({
            TableName: process.env.DYNAMODB_TABLE_NAME,
            Item: {
                userId,
                type: 'user',
                platforms: {
                    discord: discordId,
                    telegram: telegramId,
                    whatsapp: whatsappId,
                    facebook: facebookId,
                    instagram: instagramId
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        }));

        return { success: true, userId };
    }

    /**
     * Find user by platform-specific ID
     * @param {string} platform - Platform name
     * @param {string} platformId - Platform-specific user ID
     * @returns {Promise<string|null>} User ID if found
     */
    static async findByPlatformId(platform, platformId) {
        const params = {
            TableName: process.env.DYNAMODB_TABLE_NAME,
            Key: {
                type: 'user',
                [`platforms.${platform}`]: platformId
            }
        };

        try {
            const response = await docClient.send(new GetCommand(params));
            return response.Item ? response.Item.userId : null;
        } catch (error) {
            console.error(`Error finding user by ${platform} ID:`, error);
            return null;
        }
    }

    /**
     * Update user's platform IDs
     * @param {string} userId - User ID
     * @param {Object} platforms - Platform IDs to update
     * @returns {Promise<void>}
     */
    static async updateUserPlatforms(userId, platforms) {
        const updateExpressions = [];
        const expressionAttributeNames = { '#platforms': 'platforms' };
        const expressionAttributeValues = {};

        Object.entries(platforms).forEach(([platform, id]) => {
            if (id) {
                updateExpressions.push(`#platforms.#${platform} = :${platform}`);
                expressionAttributeNames[`#${platform}`] = platform;
                expressionAttributeValues[`:${platform}`] = id;
            }
        });

        if (updateExpressions.length === 0) return;

        const params = {
            TableName: process.env.DYNAMODB_TABLE_NAME,
            Key: { userId },
            UpdateExpression: `SET ${updateExpressions.join(', ')}, #updatedAt = :now`,
            ExpressionAttributeNames: {
                ...expressionAttributeNames,
                '#updatedAt': 'updatedAt'
            },
            ExpressionAttributeValues: {
                ...expressionAttributeValues,
                ':now': new Date().toISOString()
            }
        };

        await docClient.send(new UpdateCommand(params));
    }

    /**
     * Get user's preferred platform
     * @param {string} userId - User ID
     * @returns {Promise<string|null>} Preferred platform
     */
    static async getPreferredPlatform(userId) {
        const params = {
            TableName: process.env.DYNAMODB_TABLE_NAME,
            Key: { userId }
        };

        const response = await docClient.send(new GetCommand(params));
        if (!response.Item) return null;

        const platforms = response.Item.platforms || {};
        const platformStats = await Promise.all(
            Object.entries(platforms).map(async ([platform, id]) => {
                if (!id) return null;
                const interactions = await this.getPlatformInteractions(platform, id);
                return { platform, count: interactions.length };
            })
        );

        // Filter out null values and ensure proper type shape
        const validStats = platformStats.filter(stat =>
            stat !== null &&
            typeof stat === 'object' &&
            typeof stat.platform === 'string' &&
            typeof stat.count === 'number'
        );

        if (!validStats.length) return null;

        // Sort by count in descending order and get the first item
        validStats.sort((a, b) => (b?.count || 0) - (a?.count || 0));
        return validStats[0]?.platform || null;
    }

    /**
     * Get user's platform interactions
     * @param {string} platform - Platform name
     * @param {string} platformId - Platform-specific user ID
     * @returns {Promise<Array>} User interactions
     */
    static async getPlatformInteractions(platform, platformId) {
        const params = {
            TableName: process.env.DYNAMODB_TABLE_NAME,
            IndexName: 'platform-userId-index',
            KeyConditionExpression: '#platform = :platform AND #userId = :userId',
            ExpressionAttributeNames: {
                '#platform': 'platform',
                '#userId': 'userId'
            },
            ExpressionAttributeValues: {
                ':platform': platform,
                ':userId': platformId
            }
        };

        const response = await docClient.send(new QueryCommand(params));
        return response.Items || [];
    }
}

export default UserUtils;
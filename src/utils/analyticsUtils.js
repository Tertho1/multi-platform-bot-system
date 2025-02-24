import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBUtils } from './dynamoDBUtils.js';
import discordNotifications from './discordNotificationUtils.js';

/**
 * @typedef {import('../types.js').PlatformStats} PlatformStats
 * @typedef {import('../types.js').InteractionData} InteractionData
 * @typedef {import('../types/monitoring.js').UserEngagement} UserEngagement
 */

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

class Analytics {
    /**
     * Get user engagement metrics
     * @param {string} userId - User ID
     * @returns {Promise<UserEngagement>}
     */
    static async getUserEngagement(userId) {
        const last30Days = new Date();
        last30Days.setDate(last30Days.getDate() - 30);

        const params = {
            TableName: process.env.DYNAMODB_TABLE_NAME || '',
            KeyConditionExpression: '#userId = :userId AND #timestamp >= :startDate',
            ExpressionAttributeNames: {
                '#userId': 'userId',
                '#timestamp': 'timestamp'
            },
            ExpressionAttributeValues: {
                ':userId': userId,
                ':startDate': last30Days.toISOString()
            }
        };

        const interactions = await DynamoDBUtils.scan({
            TableName: params.TableName
        });

        const typedInteractions = interactions.map(item => ({
            userId: item.userId,
            platform: item.platform,
            type: item.type,
            content: item.content,
            timestamp: item.timestamp
        }));

        const filteredInteractions = typedInteractions.filter(item =>
            item.userId === userId &&
            item.timestamp >= last30Days.toISOString()
        );

        const activeHours = this.getActiveHours(filteredInteractions);
        const totalInteractions = filteredInteractions.length;
        const engagementScore = this.calculateEngagementScore(totalInteractions, activeHours.length);
        const interactionTypes = this.calculateInteractionDistribution(filteredInteractions);
        const platformDistribution = this.calculatePlatformDistribution(filteredInteractions);

        return {
            totalInteractions,
            activeHours,
            engagementScore,
            interactionTypes,
            platformDistribution
        };
    }

    /**
     * Get platform statistics
     * @param {string} platform - Platform name
     * @param {number} days - Number of days to analyze
     * @returns {Promise<PlatformStats>}
     */
    static async getPlatformStats(platform, days) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const interactions = await DynamoDBUtils.scan({
            TableName: process.env.DYNAMODB_TABLE_NAME || ''
        });

        const typedInteractions = interactions.map(item => ({
            userId: item.userId,
            platform: item.platform,
            type: item.type,
            content: item.content,
            timestamp: item.timestamp
        }));

        const filteredInteractions = typedInteractions.filter(item =>
            item.platform === platform &&
            item.timestamp >= startDate.toISOString()
        );

        const uniqueUsers = new Set(filteredInteractions.map(item => item.userId)).size;
        const messageCount = filteredInteractions.filter(item => item.type === 'message').length;
        const commandCount = filteredInteractions.filter(item => item.type === 'command').length;
        const engagementRate = filteredInteractions.length / Math.max(uniqueUsers, 1);

        return {
            totalInteractions: filteredInteractions.length,
            uniqueUsers,
            messageCount,
            commandCount,
            engagementRate
        };
    }

    /**
     * Get active hours from interactions
     * @private
     * @param {InteractionData[]} interactions - User interactions
     * @returns {number[]} Array of active hours (0-23)
     */
    static getActiveHours(interactions) {
        const hours = new Set(
            interactions.map(item =>
                new Date(item.timestamp).getHours()
            )
        );
        return Array.from(hours).sort((a, b) => a - b);
    }

    /**
     * Calculate engagement score
     * @private
     * @param {number} totalInteractions - Total number of interactions
     * @param {number} activeHoursCount - Number of active hours
     * @returns {number} Engagement score (0-100)
     */
    static calculateEngagementScore(totalInteractions, activeHoursCount) {
        const interactionScore = Math.min(totalInteractions / 10, 60);
        const spreadScore = (activeHoursCount / 24) * 40;
        return Math.min(interactionScore + spreadScore, 100);
    }

    /**
     * Calculate interaction type distribution
     * @private
     * @param {InteractionData[]} interactions - User interactions
     * @returns {Record<string, number>} Distribution of interaction types
     */
    static calculateInteractionDistribution(interactions) {
        return interactions.reduce((acc, item) => {
            const type = item.type || 'unknown';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, /** @type {Record<string, number>} */({}));
    }

    /**
     * Calculate platform distribution
     * @private
     * @param {InteractionData[]} interactions - User interactions
     * @returns {Record<string, number>} Distribution of platforms
     */
    static calculatePlatformDistribution(interactions) {
        return interactions.reduce((acc, item) => {
            const platform = item.platform || 'unknown';
            acc[platform] = (acc[platform] || 0) + 1;
            return acc;
        }, /** @type {Record<string, number>} */({}));
    }
}

export default Analytics;
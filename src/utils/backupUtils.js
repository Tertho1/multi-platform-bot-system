import { DynamoDBUtils } from './dynamoDBUtils.js';
import gcsUtils from './gcsUtils.js';
import { createGzip, createGunzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { Buffer } from 'node:buffer';
import discordNotifications from './discordNotificationUtils.js';

/**
 * @typedef {import('../types.js').BackupStats} BackupStats
 * @typedef {import('../types.js').BackupMetadata} BackupMetadata
 * @typedef {import('../types.js').WeeklyReport} WeeklyReport
 * @typedef {import('../types.js').PlatformStats} PlatformStats
 */

class BackupSystem {
    /** @type {Buffer[]} */
    #compressionChunks;

    /** @type {Buffer[]} */
    #decompressionChunks;

    constructor() {
        this.#compressionChunks = [];
        this.#decompressionChunks = [];
    }

    /**
     * Perform system backup
     * @returns {Promise<BackupMetadata>}
     */
    async performBackup() {
        try {
            const data = await this.getAllData();
            const jsonBuffer = Buffer.from(JSON.stringify(data));
            const compressedData = await this.compressData(jsonBuffer);
            const backupId = `backup_${new Date().toISOString()}.gz`;
            const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME || '';
            const path = `backups/${backupId}`;

            await gcsUtils.uploadFile(path, compressedData);

            const signedUrlPromise = new Promise((resolve) => {
                setTimeout(() => resolve(`https://${bucketName}.storage.googleapis.com/${path}`), 100);
            });

            const url = await signedUrlPromise;

            const metadata = {
                backupId,
                timestamp: new Date().toISOString(),
                status: 'success',
                recordCount: data.length,
                size: compressedData.length,
                bucketName,
                path,
                url
            };

            await this.saveBackupMetadata(metadata);

            await discordNotifications.sendBackupNotification({
                success: true,
                size: compressedData.length,
                records: data.length,
                error: undefined
            });

            return metadata;
        } catch (error) {
            console.error('Backup failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            await discordNotifications.sendBackupNotification({
                success: false,
                error: errorMessage,
                size: undefined,
                records: undefined
            });

            throw error;
        }
    }

    /**
     * Generate analytical report
     * @returns {Promise<WeeklyReport>}
     */
    async generateReport() {
        try {
            const stats = await this.calculateStats();
            await this.saveReport(stats);
            return stats;
        } catch (error) {
            console.error('Report generation failed:', error);
            throw error;
        }
    }

    /**
     * Get all system data
     * @returns {Promise<Record<string, any>[]>}
     */
    async getAllData() {
        return await DynamoDBUtils.scan({
            TableName: process.env.DYNAMODB_TABLE_NAME || '',
            Limit: 1000
        });
    }

    /**
     * Save backup metadata
     * @param {BackupMetadata} backupInfo - Backup information
     * @returns {Promise<void>}
     */
    async saveBackupMetadata(backupInfo) {
        await DynamoDBUtils.putItem({
            TableName: process.env.DYNAMODB_BACKUP_TABLE || '',
            Item: backupInfo
        });
    }

    /**
     * Save generated report
     * @param {WeeklyReport} report - Generated report
     * @returns {Promise<void>}
     */
    async saveReport(report) {
        await DynamoDBUtils.putItem({
            TableName: process.env.DYNAMODB_TABLE_NAME || '',
            Item: {
                type: 'report',
                id: `report_${new Date().toISOString()}`,
                ...report
            }
        });
    }

    /**
     * Calculate system statistics
     * @returns {Promise<WeeklyReport>}
     */
    async calculateStats() {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);

        const platforms = ['discord', 'telegram', 'whatsapp', 'facebook', 'instagram'];
        const stats = await Promise.all(
            platforms.map(platform =>
                DynamoDBUtils.queryData(
                    platform,
                    startDate.toISOString(),
                    endDate.toISOString()
                )
            )
        );

        /** @type {Record<string, import('../types.js').PlatformStats>} */
        const platformStats = {};
        let totalInteractions = 0;

        for (let i = 0; i < platforms.length; i++) {
            const platform = platforms[i];
            const platformData = stats[i];
            const uniqueUsers = new Set(platformData.map(item => item.userId)).size;
            const messageCount = platformData.filter(item => item.type === 'message').length;
            const commandCount = platformData.filter(item => item.type === 'command').length;

            platformStats[platform] = {
                totalInteractions: platformData.length,
                uniqueUsers,
                messageCount,
                commandCount,
                engagementRate: platformData.length / Math.max(1, uniqueUsers)
            };
            totalInteractions += platformData.length;
        }

        /** @type {import('../types.js').WeeklyReport} */
        const report = {
            timestamp: new Date().toISOString(),
            period: 'weekly',
            platformStats,
            totalInteractions
        };

        await DynamoDBUtils.putItem({
            TableName: process.env.DYNAMODB_TABLE_NAME || '',
            Item: {
                type: 'weekly_report',
                ...report
            }
        });

        // Remove the discord notification since the method doesn't exist
        return report;
    }

    /**
     * Calculate average response time
     * @param {Record<string, any>[]} items - Items to analyze
     * @returns {number}
     */
    calculateAverageResponseTime(items) {
        const responseTimes = items
            .filter(item => item.responseTime)
            .map(item => item.responseTime);

        return responseTimes.length > 0
            ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
            : 0;
    }

    /**
     * Compress data using gzip
     * @param {Buffer} data - Data to compress
     * @returns {Promise<Buffer>}
     */
    async compressData(data) {
        this.#compressionChunks = [];
        const gzip = createGzip();

        return new Promise((resolve, reject) => {
            gzip.on('data', chunk => this.#compressionChunks.push(chunk));
            gzip.on('end', () => resolve(Buffer.concat(this.#compressionChunks)));
            gzip.on('error', reject);
            gzip.end(data);
        });
    }

    /**
     * Decompress gzipped data
     * @param {Buffer} data - Data to decompress
     * @returns {Promise<Buffer>}
     */
    async decompressData(data) {
        this.#decompressionChunks = [];
        const gunzip = createGunzip();

        return new Promise((resolve, reject) => {
            gunzip.on('data', chunk => this.#decompressionChunks.push(chunk));
            gunzip.on('end', () => resolve(Buffer.concat(this.#decompressionChunks)));
            gunzip.on('error', reject);
            gunzip.end(data);
        });
    }

    /**
     * Calculate platform statistics
     * @param {Record<string, any>[]} data - Platform interaction data
     * @returns {PlatformStats}
     */
    calculatePlatformStats(data) {
        const uniqueUsers = new Set(data.map(item => item.userId)).size;
        const messageCount = data.filter(item => item.type === 'message').length;
        const commandCount = data.filter(item => item.type === 'command').length;

        return {
            totalInteractions: data.length,
            uniqueUsers,
            messageCount,
            commandCount,
            engagementRate: data.length / Math.max(1, uniqueUsers)
        };
    }
}

const backupSystem = new BackupSystem();
export default backupSystem;
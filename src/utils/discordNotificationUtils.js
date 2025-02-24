import { WebhookClient } from 'discord.js';

/**
 * @typedef {import('../types/monitoring.js').SystemMetrics} SystemMetrics
 * @typedef {import('../types/monitoring.js').PlatformPerformance} PlatformPerformance
 * @typedef {import('../types/monitoring.js').InteractionStats} InteractionStats
 */

/**
 * @typedef {Object} BackupStatus
 * @property {boolean} success - Backup completion status
 * @property {string} [error] - Error message if failed
 * @property {number} [size] - Backup size in bytes
 * @property {number} [records] - Number of records backed up
 */

class DiscordNotifications {
    /** @type {WebhookClient|null} */
    static notificationWebhook = null;

    /** @type {WebhookClient|null} */
    static reportsWebhook = null;

    /**
     * Initialize Discord webhooks
     */
    static initialize() {
        if (!this.notificationWebhook) {
            this.notificationWebhook = new WebhookClient({
                url: process.env.DISCORD_NOTIFICATION_WEBHOOK_URL || ''
            });
        }

        if (!this.reportsWebhook) {
            this.reportsWebhook = new WebhookClient({
                url: process.env.DISCORD_REPORTS_WEBHOOK_URL || ''
            });
        }
    }

    /**
     * Send system alert
     * @param {string} title - Alert title
     * @param {string} message - Alert message
     * @param {'info' | 'warning' | 'error'} severity - Alert severity level
     */
    static async sendSystemAlert(title, message, severity = 'info') {
        this.initialize();
        if (!this.notificationWebhook) return;

        const colors = {
            info: 0x0099ff,
            warning: 0xffaa00,
            error: 0xff0000
        };

        await this.notificationWebhook.send({
            embeds: [{
                title,
                description: message,
                color: colors[severity],
                timestamp: new Date().toISOString()
            }]
        });
    }

    /**
     * Send backup notification
     * @param {BackupStatus} backupStatus - Backup status
     */
    static async sendBackupNotification(backupStatus) {
        this.initialize();
        if (!this.notificationWebhook) return;

        const fields = [];

        if (backupStatus.success && typeof backupStatus.size === 'number') {
            fields.push({
                name: 'Backup Size',
                value: `${(backupStatus.size / 1024 / 1024).toFixed(2)} MB`,
                inline: true
            });
        }

        if (backupStatus.success && typeof backupStatus.records === 'number') {
            fields.push({
                name: 'Records',
                value: backupStatus.records.toString(),
                inline: true
            });
        }

        await this.notificationWebhook.send({
            embeds: [{
                title: backupStatus.success ? '✅ Backup Successful' : '❌ Backup Failed',
                description: backupStatus.error ? `Error: ${backupStatus.error}` : undefined,
                color: backupStatus.success ? 0x2ecc71 : 0xe74c3c,
                fields: fields.length > 0 ? fields : undefined,
                timestamp: new Date().toISOString()
            }]
        });
    }

    /**
     * Send performance report
     * @param {{ averageResponseTime: number, p95ResponseTime: number, errorRate: number, successRate: number }} performance - Performance metrics
     */
    static async sendPerformanceReport(performance) {
        this.initialize();
        if (!this.reportsWebhook) return;

        await this.reportsWebhook.send({
            embeds: [{
                title: '⚡ Platform Performance Report',
                fields: [
                    {
                        name: 'Response Time',
                        value: `Avg: ${performance.averageResponseTime}ms\nP95: ${performance.p95ResponseTime}ms`,
                        inline: true
                    },
                    {
                        name: 'Error Rate',
                        value: `${(performance.errorRate * 100).toFixed(1)}%`,
                        inline: true
                    },
                    {
                        name: 'Success Rate',
                        value: `${(performance.successRate * 100).toFixed(1)}%`,
                        inline: true
                    }
                ],
                timestamp: new Date().toISOString()
            }]
        });
    }

    /**
     * Cleanup webhooks
     */
    static cleanup() {
        this.notificationWebhook?.destroy();
        this.reportsWebhook?.destroy();
        this.notificationWebhook = null;
        this.reportsWebhook = null;
    }
}

export default DiscordNotifications;
import { LRUCache } from 'lru-cache';
import { DynamoDBUtils } from './dynamoDBUtils.js';
import discordNotifications from './discordNotificationUtils.js';

/**
 * @typedef {import('../types/monitoring.js').SystemMetrics} SystemMetrics
 * @typedef {import('../types/monitoring.js').HealthCheckResult} HealthCheckResult
 * @typedef {import('../types/monitoring.js').PlatformResult} PlatformResult
 * @typedef {import('../types/monitoring.js').AlertThresholds} AlertThresholds
 */

/**
 * Cache for storing monitoring results
 * @type {LRUCache<string, HealthCheckResult>}
 */
const metricsCache = new LRUCache({
    max: 1000,
    ttl: 1000 * 60 * 5 // 5 minutes
});

export class MonitoringSystem {
    static ALERT_THRESHOLDS = {
        cpuThreshold: 80,
        memoryThreshold: 85,
        latencyThreshold: 2000,
        errorRateThreshold: 5
    };

    /**
     * Check platform health statuses
     * @returns {Promise<HealthCheckResult>}
     */
    static async performHealthCheck() {
        const platforms = ['discord', 'telegram', 'whatsapp', 'facebook', 'instagram'];
        const results = await Promise.all(
            platforms.map(platform => this.checkPlatformHealth(platform))
        );

        const services = results.reduce((acc, result) => {
            acc[result.platform] = result.healthy;
            return acc;
        }, /** @type {Record<string, boolean>} */({}));

        const issues = results
            .filter(r => !r.healthy)
            .map(r => `${r.platform}: ${r.issues?.join(', ') || 'Unknown error'}`);

        const metrics = await this.collectSystemMetrics();

        /** @type {HealthCheckResult} */
        const healthCheck = {
            healthy: Object.values(services).every(Boolean),
            services,
            issues,
            metrics
        };

        // Store health check data
        await DynamoDBUtils.putItem({
            TableName: process.env.DYNAMODB_TABLE_NAME || '',
            Item: {
                type: 'health_check',
                recordedAt: new Date().toISOString(),
                healthy: healthCheck.healthy,
                services: healthCheck.services,
                issues: healthCheck.issues,
                metrics: healthCheck.metrics
            }
        });

        if (!healthCheck.healthy) {
            await this.notifyHealthIssues(results);
        }

        return healthCheck;
    }

    /**
     * Check platform health
     * @private
     * @param {string} platform - Platform name
     * @returns {Promise<PlatformResult>}
     */
    static async checkPlatformHealth(platform) {
        try {
            const startTime = Date.now();
            // Simulate API call since we don't have actual endpoints
            await new Promise(resolve => setTimeout(resolve, 100));
            const endTime = Date.now();
            const responseTime = endTime - startTime;

            return {
                platform,
                healthy: true,
                responseTime,
                issues: []
            };
        } catch (error) {
            return {
                platform,
                healthy: false,
                responseTime: 0,
                issues: [error instanceof Error ? error.message : 'Unknown error']
            };
        }
    }

    /**
     * Get system metrics
     * @private
     * @returns {Promise<SystemMetrics>}
     */
    static async collectSystemMetrics() {
        const used = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        const totalCPUUsage = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds

        /** @type {SystemMetrics} */
        const metrics = {
            cpuUsage: totalCPUUsage,
            memoryUsage: Math.round(used.heapUsed / 1024 / 1024), // Convert to MB
            latency: 0,
            errorRate: 0,
            uptime: process.uptime()
        };

        return metrics;
    }

    /**
     * Check performance degradation
     * @returns {Promise<void>}
     */
    static async checkPerformanceDegradation() {
        const metrics = await this.collectSystemMetrics();

        if (this.isPerformanceDegraded(metrics, this.ALERT_THRESHOLDS)) {
            await discordNotifications.sendSystemAlert(
                'Performance Degradation',
                `System is experiencing performance issues:\n` +
                `- CPU Usage: ${metrics.cpuUsage.toFixed(1)}%\n` +
                `- Memory Usage: ${metrics.memoryUsage} MB\n` +
                `- Latency: ${metrics.latency}ms\n` +
                `- Error Rate: ${metrics.errorRate}%`,
                'warning'
            );

            // Send performance metrics
            await discordNotifications.sendPerformanceReport({
                averageResponseTime: metrics.latency,
                p95ResponseTime: metrics.latency * 1.5,
                errorRate: metrics.errorRate / 100,
                successRate: 1 - (metrics.errorRate / 100)
            });
        }
    }

    /**
     * Check if performance is degraded
     * @private
     * @param {SystemMetrics} metrics - System metrics
     * @param {AlertThresholds} thresholds - Alert thresholds
     * @returns {boolean}
     */
    static isPerformanceDegraded(metrics, thresholds) {
        return metrics.cpuUsage > thresholds.cpuThreshold ||
            metrics.memoryUsage > thresholds.memoryThreshold ||
            metrics.latency > thresholds.latencyThreshold ||
            metrics.errorRate > thresholds.errorRateThreshold;
    }

    /**
     * Notify about health issues
     * @private
     * @param {PlatformResult[]} results - Platform health results
     * @returns {Promise<void>}
     */
    static async notifyHealthIssues(results) {
        const unhealthyPlatforms = results
            .filter(result => !result.healthy)
            .map(result => ({
                platform: result.platform,
                issues: result.issues || ['Unknown error']
            }));

        await discordNotifications.sendSystemAlert(
            'Platform Health Issues',
            `The following platforms are experiencing issues:\n${unhealthyPlatforms
                .map(p => `- ${p.platform}: ${p.issues.join(', ')}`)
                .join('\n')
            }`,
            'error'
        );

        const validResponses = results.filter(r => r.responseTime > 0);
        const avgResponseTime = validResponses.reduce((sum, r) => sum + r.responseTime, 0) / validResponses.length || 0;
        const p95ResponseTime = this.calculateP95ResponseTime(validResponses);
        const errorRate = results.filter(r => !r.healthy).length / results.length;

        await discordNotifications.sendPerformanceReport({
            averageResponseTime: avgResponseTime,
            p95ResponseTime,
            errorRate,
            successRate: 1 - errorRate
        });
    }

    /**
     * Calculate P95 response time
     * @private
     * @param {PlatformResult[]} results - Platform results
     * @returns {number}
     */
    static calculateP95ResponseTime(results) {
        const times = results.map(r => r.responseTime).sort((a, b) => a - b);
        const idx = Math.floor(times.length * 0.95);
        return times[idx] || 0;
    }
}

export default MonitoringSystem;
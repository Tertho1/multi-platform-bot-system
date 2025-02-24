require('dotenv').config();
const backupSystem = require('../src/utils/backupUtils');
const monitor = require('../src/utils/monitoringUtils');
const Analytics = require('../src/utils/analyticsUtils');

async function runSystemCheck() {
    try {
        // Check system health
        const healthStatus = await monitor.performHealthCheck();
        console.log('System Health Status:', healthStatus);

        if (!healthStatus.healthy) {
            await backupSystem.notificationWebhook.send({
                embeds: [{
                    title: '⚠️ System Health Alert',
                    description: 'System health check failed',
                    color: 0xff0000,
                    fields: [
                        {
                            name: 'Average Response Time',
                            value: `${healthStatus.metrics.averageResponseTime}ms`,
                            inline: true
                        },
                        {
                            name: 'Error Rate',
                            value: `${(healthStatus.metrics.errorRate * 100).toFixed(2)}%`,
                            inline: true
                        }
                    ],
                    timestamp: new Date()
                }]
            });
        }

        // Generate and send daily metrics
        const platforms = ['discord', 'telegram', 'whatsapp', 'facebook', 'instagram'];
        const stats = await Promise.all(
            platforms.map(platform => Analytics.getPlatformStats(platform, 1))
        );

        const report = {
            timestamp: new Date().toISOString(),
            period: 'daily',
            platformStats: stats.reduce((acc, stat, index) => {
                acc[platforms[index]] = stat;
                return acc;
            }, {}),
            totalInteractions: stats.reduce((sum, stat) => sum + stat.totalInteractions, 0)
        };

        await backupSystem.reportWebhook.send({
            embeds: [{
                title: '📊 Daily System Metrics',
                color: 0x0099ff,
                fields: [
                    {
                        name: 'Total Interactions',
                        value: report.totalInteractions.toString(),
                        inline: true
                    },
                    {
                        name: 'System Health',
                        value: healthStatus.healthy ? '✅ Healthy' : '❌ Issues Detected',
                        inline: true
                    },
                    ...platforms.map(platform => ({
                        name: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Stats`,
                        value: `Interactions: ${report.platformStats[platform].totalInteractions}\nUsers: ${report.platformStats[platform].uniqueUsers}`,
                        inline: true
                    }))
                ],
                timestamp: new Date()
            }]
        });

        console.log('Monitoring report sent successfully');
    } catch (error) {
        console.error('Error in system monitoring:', error);

        // Send error notification
        await backupSystem.notificationWebhook.send({
            embeds: [{
                title: '❌ Monitoring System Error',
                description: `Error: ${error.message}`,
                color: 0xff0000,
                timestamp: new Date()
            }]
        });
    }
}

// Run the system check
runSystemCheck().catch(console.error);
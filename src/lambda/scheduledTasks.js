import backupSystem from '../utils/backupUtils.js';
import MonitoringSystem from '../utils/monitoringUtils.js';
import discordNotifications from '../utils/discordNotificationUtils.js';

/**
 * @typedef {import('../types.js').LambdaEvent} LambdaEvent
 * @typedef {import('../types.js').LambdaResponse} LambdaResponse
 */

/**
 * @typedef {Object} TaskConfig
 * @property {string} taskType - Type of scheduled task to run
 * @property {boolean} notifyOnCompletion - Whether to send completion notification
 */

/**
 * Lambda handler for scheduled tasks
 * @param {LambdaEvent & TaskConfig} event - Lambda event with task configuration
 * @returns {Promise<LambdaResponse>} Lambda response
 */
export const handler = async (event) => {
    try {
        const taskType = event?.taskType || 'all';

        switch (taskType) {
            case 'backup':
                await backupSystem.performBackup();
                break;

            case 'report':
                await backupSystem.generateReport();
                break;

            case 'monitor':
                await MonitoringSystem.performHealthCheck();
                await MonitoringSystem.checkPerformanceDegradation();
                break;

            case 'all':
                await Promise.all([
                    backupSystem.performBackup(),
                    backupSystem.generateReport(),
                    MonitoringSystem.performHealthCheck(),
                    MonitoringSystem.checkPerformanceDegradation()
                ]);
                break;

            default:
                throw new Error(`Unknown task type: ${taskType}`);
        }

        // Send success notification
        if (event.notifyOnCompletion) {
            await discordNotifications.sendSystemAlert(
                'Scheduled Tasks Complete',
                `Successfully completed scheduled task(s): ${taskType}`,
                'info'
            );
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                taskType,
                timestamp: new Date().toISOString()
            })
        };
    } catch (error) {
        console.error('Error executing scheduled tasks:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Send error notification
        await discordNotifications.sendSystemAlert(
            'Scheduled Tasks Failed',
            `Error executing task(s): ${errorMessage}`,
            'error'
        );

        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: errorMessage,
                taskType: event?.taskType || 'unknown'
            })
        };
    }
};
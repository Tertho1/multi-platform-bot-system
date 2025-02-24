/**
 * @typedef {Object} SystemMetrics
 * @property {number} cpuUsage - CPU usage percentage
 * @property {number} memoryUsage - Memory usage in MB
 * @property {number} latency - Average latency in ms
 * @property {number} errorRate - Error rate percentage
 * @property {number} uptime - System uptime in seconds
 */

/**
 * @typedef {Object} HealthCheckResult
 * @property {boolean} healthy - Overall health status
 * @property {SystemMetrics} metrics - System metrics
 * @property {Record<string, boolean>} services - Service health status
 * @property {string[]} issues - Detected issues
 */

/**
 * @typedef {Object} PlatformResult
 * @property {string} platform - Platform name
 * @property {boolean} healthy - Platform health status
 * @property {number} responseTime - Platform response time
 * @property {string[]} [issues] - Platform-specific issues
 */

/**
 * @typedef {Object} AlertThresholds
 * @property {number} cpuThreshold - CPU usage threshold
 * @property {number} memoryThreshold - Memory usage threshold
 * @property {number} latencyThreshold - Latency threshold
 * @property {number} errorRateThreshold - Error rate threshold
 */

/**
 * @typedef {Object} InteractionStats
 * @property {number} totalInteractions - Total interactions count
 * @property {number} uniqueUsers - Unique users count
 * @property {number} messageCount - Message count
 * @property {number} commandCount - Command count
 * @property {number} engagementRate - User engagement rate
 */

/**
 * @typedef {Object} UserEngagement
 * @property {number} totalInteractions - Total user interactions
 * @property {number[]} activeHours - Most active hours (0-23)
 * @property {number} engagementScore - User engagement score
 * @property {Record<string, number>} platformDistribution - Usage by platform
 * @property {Record<string, number>} interactionTypes - Types of interactions
 */

/**
 * @typedef {Object} PlatformPerformance
 * @property {string} platform - Platform name
 * @property {number} messageLatency - Message processing latency
 * @property {number} commandLatency - Command processing latency
 * @property {number} errorCount - Number of errors
 * @property {number} successRate - Success rate percentage
 */

/**
 * @typedef {Object} TelegramContext
 * @property {Object} message - Message object
 * @property {Object} [from] - Sender info
 * @property {number} [from.id] - Sender ID
 * @property {Object} chat - Chat info
 * @property {number} chat.id - Chat ID
 * @property {string} chat.type - Chat type
 * @property {Function} reply - Reply function
 */

/**
 * @typedef {Object} TelegramCallbackContext
 * @property {Object} from - Sender info
 * @property {number} from.id - Sender ID
 * @property {Object} callbackQuery - Callback query data
 * @property {string} callbackQuery.data - Query data
 * @property {Function} reply - Reply function
 */

export { };
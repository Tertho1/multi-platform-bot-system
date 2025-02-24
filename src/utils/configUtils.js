/**
 * @typedef {Object} PlatformConfig
 * @property {string} apiVersion - API version
 * @property {string} apiBaseUrl - Base URL for API calls
 * @property {string} healthEndpoint - Health check endpoint
 * @property {string} webhookSecret - Webhook verification secret
 * @property {string} token - Platform access token
 */

/**
 * @typedef {import('../types.js').BotConfig} BotConfig
 */

/**
 * Validate required environment variables
 * @param {string[]} requiredVars - Array of required environment variable names
 * @throws {Error} If any required variables are missing
 */
export function validateEnvVars(requiredVars) {
    const missing = requiredVars.filter(key => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
}

/**
 * Get validated configuration for a specific platform
 * @param {'whatsapp' | 'facebook' | 'instagram'} platform - Platform name
 * @returns {BotConfig & PlatformConfig} Platform configuration
 */
export function getPlatformConfig(platform) {
    const baseVars = [
        'DYNAMODB_TABLE_NAME',
        'DYNAMODB_BACKUP_TABLE',
        'META_APP_SECRET'
    ];

    const platformVars = {
        whatsapp: ['WHATSAPP_ACCESS_TOKEN'],
        facebook: ['FACEBOOK_ACCESS_TOKEN'],
        instagram: ['INSTAGRAM_ACCESS_TOKEN']
    };

    validateEnvVars([...baseVars, ...(platformVars[platform] || [])]);

    /** @type {BotConfig & PlatformConfig} */
    const config = {
        DYNAMODB_TABLE_NAME: process.env.DYNAMODB_TABLE_NAME || '',
        DYNAMODB_BACKUP_TABLE: process.env.DYNAMODB_BACKUP_TABLE || '',
        GOOGLE_CLOUD_BUCKET_NAME: process.env.GOOGLE_CLOUD_BUCKET_NAME || '',
        DISCORD_NOTIFICATION_WEBHOOK_URL: process.env.DISCORD_NOTIFICATION_WEBHOOK_URL || '',
        DISCORD_REPORTS_WEBHOOK_URL: process.env.DISCORD_REPORTS_WEBHOOK_URL || '',
        TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_TOKEN || '',
        TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET || '',
        META_APP_SECRET: process.env.META_APP_SECRET || '',
        WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_TOKEN || '',
        FACEBOOK_ACCESS_TOKEN: process.env.FACEBOOK_TOKEN || '',
        INSTAGRAM_ACCESS_TOKEN: process.env.INSTAGRAM_TOKEN || '',
        BACKUP_ENCRYPTION_KEY: process.env.BACKUP_ENCRYPTION_KEY || '',
        BACKUP_RETENTION_DAYS: process.env.BACKUP_RETENTION_DAYS || '30',
        MAX_RESPONSE_TIME_MS: process.env.MAX_RESPONSE_TIME_MS || '5000',
        ERROR_THRESHOLD: process.env.ERROR_THRESHOLD || '0.05',
        ALERT_THRESHOLD_WARNING: process.env.ALERT_THRESHOLD_WARNING || '70',
        ALERT_THRESHOLD_CRITICAL: process.env.ALERT_THRESHOLD_CRITICAL || '90',
        apiVersion: 'v17.0',
        apiBaseUrl: 'https://graph.facebook.com',
        healthEndpoint: platform === 'whatsapp'
            ? process.env.WHATSAPP_HEALTH_CHECK_URL || ''
            : platform === 'facebook'
                ? process.env.FACEBOOK_HEALTH_CHECK_URL || ''
                : process.env.INSTAGRAM_HEALTH_CHECK_URL || '',
        webhookSecret: platform === 'whatsapp'
            ? process.env.WHATSAPP_WEBHOOK_SECRET || ''
            : platform === 'facebook'
                ? process.env.FACEBOOK_WEBHOOK_SECRET || ''
                : process.env.INSTAGRAM_WEBHOOK_SECRET || '',
        token: platform === 'whatsapp'
            ? process.env.WHATSAPP_TOKEN || ''
            : platform === 'facebook'
                ? process.env.FACEBOOK_TOKEN || ''
                : process.env.INSTAGRAM_TOKEN || ''
    };

    return config;
}

/**
 * Get platform access token
 * @param {'whatsapp' | 'facebook' | 'instagram'} platform - Platform name
 * @returns {string} Platform access token
 */
export function getPlatformToken(platform) {
    const tokens = {
        whatsapp: process.env.WHATSAPP_TOKEN,
        facebook: process.env.FACEBOOK_TOKEN,
        instagram: process.env.INSTAGRAM_TOKEN
    };

    return tokens[platform] || '';
}

export default {
    getPlatformConfig,
    getPlatformToken
};
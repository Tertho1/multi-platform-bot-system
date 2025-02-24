/**
 * Utility functions for content moderation and user management
 */

/**
 * @typedef {Object} UserData
 * @property {string} userId - User ID
 * @property {string} createdAt - Account creation timestamp
 * @property {number} reputationScore - User reputation score
 * @property {number} violations - Number of violations
 */

/**
 * @typedef {Object} RateLimit
 * @property {string} userId - User ID
 * @property {string} action - Action type
 * @property {number} limit - Rate limit value
 * @property {number} window - Time window in milliseconds
 */

const profanityList = [
    // Add your profanity list here
    'badword1',
    'badword2'
];

const spamPatterns = [
    /(\w+)\1{4,}/i, // Repeated words
    /(https?:\/\/[^\s]+[\s]*){5,}/, // Too many URLs
    /(.)\1{4,}/ // Repeated characters
];

/**
 * Check if content contains prohibited words
 * @param {string} content - Message content to check
 * @returns {boolean} - True if content is clean
 */
function isProfanityFree(content) {
    const lowercaseContent = content.toLowerCase();
    return !profanityList.some(word => lowercaseContent.includes(word));
}

/**
 * Check if content looks like spam
 * @param {string} content - Message content to check
 * @returns {boolean} - True if content is not spam
 */
function isNotSpam(content) {
    return !spamPatterns.some(pattern => pattern.test(content));
}

/**
 * Calculate user trust score based on various factors
 * @param {UserData} userData - User interaction data
 * @returns {number} - Trust score between 0 and 100
 */
function calculateTrustScore(userData) {
    let score = 50; // Base score

    // Account age factor
    const createdAtTime = new Date(userData.createdAt).getTime();
    const accountAgeInDays = (Date.now() - createdAtTime) / (1000 * 60 * 60 * 24);
    score += Math.min(accountAgeInDays / 30 * 10, 20); // Up to 20 points for account age

    // Interaction quality
    score += (userData.reputationScore || 0) * 0.2; // Up to 20 points from reputation

    // Reduce score for violations
    score -= (userData.violations || 0) * 10;

    return Math.max(0, Math.min(100, score));
}

/**
 * Rate limit checker
 */
class RateLimiter {
    constructor() {
        /** @type {Map<string, Array<number>>} */
        this.requests = new Map();
    }

    /**
     * Check if user has exceeded rate limit
     * @param {string} userId - User ID
     * @param {'message' | 'command' | 'export'} action - Action type
     * @returns {boolean} - True if within limit
     */
    isAllowed(userId, action) {
        const key = `${userId}:${action}`;
        const now = Date.now();
        const userRequests = this.requests.get(key) || [];

        // Clean old requests
        const recentRequests = userRequests.filter(time => now - time < 60000);

        // Check limits based on action type
        const limits = {
            'message': 30,    // 30 messages per minute
            'command': 10,    // 10 commands per minute
            'export': 2       // 2 exports per minute
        };

        const limit = limits[action] || 10;
        if (recentRequests.length >= limit) {
            return false;
        }

        // Update requests
        recentRequests.push(now);
        this.requests.set(key, recentRequests);
        return true;
    }

    /**
     * Clear expired rate limits
     * @private
     */
    cleanup() {
        const now = Date.now();
        for (const [key, times] of this.requests.entries()) {
            const recentTimes = times.filter(time => now - time < 60000);
            if (recentTimes.length === 0) {
                this.requests.delete(key);
            } else {
                this.requests.set(key, recentTimes);
            }
        }
    }
}

// Create singleton rate limiter instance
const rateLimiter = new RateLimiter();

export {
    isProfanityFree,
    isNotSpam,
    calculateTrustScore,
    rateLimiter
};
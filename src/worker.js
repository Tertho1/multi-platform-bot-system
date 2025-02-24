import { fetch } from 'undici';

/**
 * @typedef {Object} Env
 * @property {string} API_KEY - API key for authentication
 * @property {string} NODE_ENV - Environment name
 */

/**
 * @typedef {Object} ExecutionContext
 * @property {AbortSignal} signal - Abort signal
 * @property {number} waitUntil - Wait until timestamp
 * @property {string} passThroughOnException - Pass through on exception
 */

export default {
    /**
     * Handle fetch requests
     * @param {Request} request - Incoming request
     * @param {Env} env - Environment variables
     * @param {ExecutionContext} ctx - Execution context
     * @returns {Promise<Response>} Response
     */
    async fetch(request, env, ctx) {
        try {
            // Verify request
            if (!this.isValidRequest(request, env)) {
                return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // Process request based on path
            const url = new URL(request.url);
            switch (url.pathname) {
                case '/health':
                    return this.handleHealthCheck();
                case '/metrics':
                    return this.handleMetrics();
                default:
                    return new Response(JSON.stringify({ error: 'Not Found' }), {
                        status: 404,
                        headers: { 'Content-Type': 'application/json' }
                    });
            }
        } catch (error) {
            // Handle errors
            console.error('Worker error:', error);
            return new Response(
                JSON.stringify({
                    error: 'Internal Server Error',
                    message: error instanceof Error ? error.message : 'Unknown error'
                }),
                {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }
    },

    /**
     * Validate incoming request
     * @private
     * @param {Request} request - Incoming request
     * @param {Env} env - Environment variables
     * @returns {boolean} Whether request is valid
     */
    isValidRequest(request, env) {
        const apiKey = request.headers.get('x-api-key');
        return apiKey === env.API_KEY;
    },

    /**
     * Handle health check requests
     * @private
     * @returns {Response} Health check response
     */
    handleHealthCheck() {
        return new Response(
            JSON.stringify({
                status: 'healthy',
                timestamp: new Date().toISOString()
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    },

    /**
     * Handle metrics requests
     * @private
     * @returns {Response} Metrics response
     */
    handleMetrics() {
        return new Response(
            JSON.stringify({
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                timestamp: new Date().toISOString()
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
};
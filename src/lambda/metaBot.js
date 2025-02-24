import { DynamoDBUtils } from '../utils/dynamoDBUtils.js';
import Analytics from '../utils/analyticsUtils.js';
import { fetch } from 'undici';
import { createHmac } from 'crypto';
import { getPlatformToken, getPlatformConfig } from '../utils/configUtils.js';
import { isProfanityFree, isNotSpam, rateLimiter } from '../utils/moderationUtils.js';

/**
 * @typedef {import('../types.js').LambdaEvent} LambdaEvent
 * @typedef {import('../types.js').LambdaResponse} LambdaResponse
 * @typedef {import('../types/meta.js').WhatsAppMessage} WhatsAppMessage
 * @typedef {import('../types/meta.js').FacebookMessage} FacebookMessage
 * @typedef {import('../types/meta.js').InstagramMessage} InstagramMessage
 * @typedef {import('../types/meta.js').MetaWebhookEvent} MetaWebhookEvent 
 * @typedef {import('../types/meta.js').MetaWebhookHeader} MetaWebhookHeader
 */

// Verify webhook signature
function verifySignature(signature, body, appSecret) {
    const expectedSignature = createHmac('sha256', appSecret)
        .update(body)
        .digest('hex');

    return `sha256=${expectedSignature}` === signature;
}

/**
 * Process WhatsApp message
 * @param {string} senderId - Sender ID
 * @param {WhatsAppMessage} message - WhatsApp message
 */
async function handleWhatsAppMessage(senderId, message) {
    try {
        const url = new URL('https://graph.facebook.com/v17.0/messages');
        const token = getPlatformToken('whatsapp');
        url.searchParams.append('access_token', token);

        // Rate limiting check
        if (!rateLimiter.isAllowed(senderId, 'message')) {
            await fetch(url.toString(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: senderId,
                    text: { body: 'You are sending messages too quickly. Please wait a moment.' }
                })
            });
            return;
        }

        // Content moderation
        if (message.text?.body) {
            if (!isProfanityFree(message.text.body)) {
                await fetch(url.toString(), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messaging_product: 'whatsapp',
                        to: senderId,
                        text: { body: 'Your message contains inappropriate content.' }
                    })
                });
                return;
            }

            if (!isNotSpam(message.text.body)) {
                await fetch(url.toString(), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messaging_product: 'whatsapp',
                        to: senderId,
                        text: { body: 'Your message has been flagged as spam.' }
                    })
                });
                return;
            }
        }

        // Save interaction
        await DynamoDBUtils.saveInteraction(senderId, 'whatsapp', {
            type: 'message',
            content: message.text?.body || '',
            messageType: message.type,
            timestamp: message.timestamp
        });

        // Get user stats and send response
        const userStats = await Analytics.getUserEngagement(senderId);
        const engagementLevel = userStats.engagementScore >= 70 ? 'high' : 'normal';

        if (message.text?.body?.toLowerCase().includes('help')) {
            await fetch(url.toString(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: senderId,
                    text: {
                        body: 'Available commands:\n- help: Show this message'
                    }
                })
            });
            return;
        }

        // Default response
        await fetch(url.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: senderId,
                text: { body: 'Message received. How can I help you?' }
            })
        });
    } catch (error) {
        console.error('Error handling WhatsApp message:', error);
        throw error;
    }
}

/**
 * Process Facebook message
 * @param {string} senderId - Sender ID
 * @param {FacebookMessage} message - Facebook message
 */
async function handleFacebookMessage(senderId, message) {
    try {
        const url = new URL('https://graph.facebook.com/v17.0/me/messages');
        const token = getPlatformToken('facebook');
        url.searchParams.append('access_token', token);

        // Rate limiting check
        if (!rateLimiter.isAllowed(senderId, 'message')) {
            await fetch(url.toString(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient: { id: senderId },
                    message: { text: 'You are sending messages too quickly. Please wait a moment.' }
                })
            });
            return;
        }

        // Content moderation
        if (message.text) {
            if (!isProfanityFree(message.text)) {
                await fetch(url.toString(), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        recipient: { id: senderId },
                        message: { text: 'Your message contains inappropriate content.' }
                    })
                });
                return;
            }

            if (!isNotSpam(message.text)) {
                await fetch(url.toString(), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        recipient: { id: senderId },
                        message: { text: 'Your message has been flagged as spam.' }
                    })
                });
                return;
            }
        }

        // Save interaction
        await DynamoDBUtils.saveInteraction(senderId, 'facebook', {
            type: 'message',
            content: message.text || '',
            messageType: message.attachments ? 'attachment' : 'text',
            timestamp: new Date().toISOString()
        });

        // Get user stats and send response
        const userStats = await Analytics.getUserEngagement(senderId);
        const engagementLevel = userStats.engagementScore >= 70 ? 'high' : 'normal';

        if (message.text?.toLowerCase().includes('help')) {
            await fetch(url.toString(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient: { id: senderId },
                    message: {
                        text: 'Available commands:\n- help: Show this message'
                    }
                })
            });
            return;
        }

        // Default response
        await fetch(url.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipient: { id: senderId },
                message: { text: 'Message received. How can I help you?' }
            })
        });
    } catch (error) {
        console.error('Error handling Facebook message:', error);
        throw error;
    }
}

/**
 * Process Instagram message
 * @param {string} senderId - Sender ID
 * @param {InstagramMessage} message - Instagram message
 */
async function handleInstagramMessage(senderId, message) {
    try {
        const url = new URL('https://graph.facebook.com/v17.0/me/messages');
        const token = getPlatformToken('instagram');
        url.searchParams.append('access_token', token);

        // Rate limiting check
        if (!rateLimiter.isAllowed(senderId, 'message')) {
            await fetch(url.toString(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient: { id: senderId },
                    message: { text: 'You are sending messages too quickly. Please wait a moment.' }
                })
            });
            return;
        }

        // Content moderation
        if (message.text) {
            if (!isProfanityFree(message.text)) {
                await fetch(url.toString(), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        recipient: { id: senderId },
                        message: { text: 'Your message contains inappropriate content.' }
                    })
                });
                return;
            }

            if (!isNotSpam(message.text)) {
                await fetch(url.toString(), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        recipient: { id: senderId },
                        message: { text: 'Your message has been flagged as spam.' }
                    })
                });
                return;
            }
        }

        // Save interaction
        await DynamoDBUtils.saveInteraction(senderId, 'instagram', {
            type: 'message',
            content: message.text || '',
            messageType: message.attachments ? 'attachment' : 'text',
            timestamp: new Date().toISOString()
        });

        // Get user stats and send response
        const userStats = await Analytics.getUserEngagement(senderId);
        const engagementLevel = userStats.engagementScore >= 70 ? 'high' : 'normal';

        if (message.text?.toLowerCase().includes('help')) {
            await fetch(url.toString(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient: { id: senderId },
                    message: {
                        text: 'Available commands:\n- help: Show this message'
                    }
                })
            });
            return;
        }

        // Default response
        await fetch(url.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipient: { id: senderId },
                message: { text: 'Message received. How can I help you?' }
            })
        });
    } catch (error) {
        console.error('Error handling Instagram message:', error);
        throw error;
    }
}

/**
 * Lambda handler for Meta platform webhooks
 * @param {Object} event - Lambda event
 */
const handler = async (event) => {
    try {
        if (event.httpMethod === 'GET') {
            const challenge = event.queryStringParameters?.['hub.challenge'];
            if (!challenge) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: 'Missing challenge parameter' })
                };
            }
            return {
                statusCode: 200,
                body: JSON.stringify({ success: true, challenge })
            };
        }

        const body = JSON.parse(event.body || '{}');

        // Handle Facebook messages
        if (body.object === 'page') {
            const entries = body.entry || [];
            for (const entry of entries) {
                const messages = entry.messaging || [];
                for (const message of messages) {
                    if (message.message && !message.message.is_echo) {
                        await handleFacebookMessage(message.sender.id, message.message);
                    } else if (message.postback) {
                        await handleFacebookPostback(message.sender.id, message.postback);
                    }
                }
            }
        }

        // Handle Instagram messages
        if (body.object === 'instagram') {
            const entries = body.entry || [];
            for (const entry of entries) {
                const messages = entry.messaging || [];
                for (const message of messages) {
                    if (message.message && !message.message.is_echo) {
                        await handleInstagramMessage(message.sender.id, message.message);
                    }
                }
            }
        }

        // Handle WhatsApp messages
        if (body.object === 'whatsapp_business_account') {
            const entries = body.entry || [];
            for (const entry of entries) {
                const changes = entry.changes || [];
                for (const change of changes) {
                    if (change.value?.messages) {
                        for (const message of change.value.messages) {
                            await handleWhatsAppMessage(message.from, message);
                        }
                    }
                }
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true })
        };
    } catch (error) {
        console.error('Error handling webhook:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: error instanceof Error ? error.message : 'Unknown error'
            })
        };
    }
};

/**
 * Handle WhatsApp webhook events
 * @param {Object} body Webhook event body
 */
async function handleWhatsAppWebhook(body) {
    const entries = body.entry || [];
    for (const entry of entries) {
        for (const change of (entry.changes || [])) {
            if (change.value?.messages) {
                for (const message of change.value.messages) {
                    await handleWhatsAppMessage(message.from, message);
                }
            }
        }
    }
}

/**
 * Handle Facebook webhook events
 * @param {Object} body Webhook event body
 */
async function handleFacebookWebhook(body) {
    const entries = body.entry || [];
    for (const entry of entries) {
        for (const message of (entry.messaging || [])) {
            if (message.message) {
                await handleFacebookMessage(message.sender.id, message.message);
            } else if (message.postback) {
                await handleFacebookPostback(message.sender.id, message.postback);
            }
        }
    }
}

/**
 * Handle Instagram webhook events
 * @param {Object} body Webhook event body
 */
async function handleInstagramWebhook(body) {
    const entries = body.entry || [];
    for (const entry of entries) {
        for (const message of (entry.messaging || [])) {
            if (message.message) {
                await handleInstagramMessage(message.sender.id, message.message);
            }
        }
    }
}

/**
 * Send message functions (to be implemented)
 */
async function sendWhatsAppMessage(userId, message) { }
async function sendFacebookMessage(userId, message) { }
async function sendInstagramMessage(userId, message) { }

/**
 * Handle Facebook postback
 * @param {string} senderId - Sender ID
 * @param {Object} postback - Postback data
 * @returns {Promise<void>}
 */
async function handleFacebookPostback(senderId, postback) {
    await DynamoDBUtils.saveInteraction(
        senderId,
        'facebook',
        {
            type: 'postback',
            content: postback,
            timestamp: new Date().toISOString()
        }
    );
}

// Single export
export { handler };
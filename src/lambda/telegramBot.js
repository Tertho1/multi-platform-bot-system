import { Bot } from 'grammy';
import { DynamoDBUtils } from '../utils/dynamoDBUtils.js';
import { TicketManager } from '../utils/ticketUtils.js';
import Analytics from '../utils/analyticsUtils.js';

/**
 * @typedef {import('../types/monitoring.js').TelegramContext} TelegramContext
 * @typedef {import('../types/monitoring.js').TelegramCallbackContext} TelegramCallbackContext
 * @typedef {import('../types.js').LambdaEvent} LambdaEvent
 * @typedef {import('../types.js').LambdaResponse} LambdaResponse
 * @typedef {import('../types.js').TicketData} TicketData
 * @typedef {import('../types.js').TicketResponse} TicketResponse
 */

if (!process.env.TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN is not configured');
}

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

/** @type {Record<string, { category?: string, respondingTo?: string }>} */
const tempTicketData = {};

/**
 * Handle ticket response
 * @param {string} ticketId - Ticket ID
 * @param {string} userId - User ID
 * @param {string} messageText - Message text
 */
async function handleTicketResponse(ticketId, userId, messageText) {
    await TicketManager.addResponse(ticketId, {
        userId,
        content: messageText,
        timestamp: new Date().toISOString(),
        isStaff: false
    });
}

/**
 * Create a new ticket
 * @param {string} userId - User ID
 * @param {string} category - Ticket category
 * @param {string} messageText - Ticket description
 * @returns {Promise<TicketData>}
 */
async function createNewTicket(userId, category, messageText) {
    const ticketData = {
        userId,
        platform: 'telegram',
        category,
        subject: messageText.split('\n')[0] || 'No subject',
        description: messageText,
        metadata: {},
        status: 'open'
    };

    return await TicketManager.createTicket(ticketData);
}

/**
 * Handle ticket commands
 * @param {TelegramContext} ctx - Bot context
 * @param {string} command - Command name
 */
async function handleTicketCommand(ctx, command) {
    if (!ctx.from?.id) return;
    const userId = ctx.from.id.toString();

    switch (command) {
        case 'new': {
            await ctx.reply('Please select a ticket category:', {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Technical Support', callback_data: 'ticket:category:tech' }],
                        [{ text: 'Account Issues', callback_data: 'ticket:category:account' }],
                        [{ text: 'Feature Request', callback_data: 'ticket:category:feature' }],
                        [{ text: 'Other', callback_data: 'ticket:category:other' }]
                    ]
                }
            });
            break;
        }
        case 'list': {
            const tickets = await TicketManager.getUserTickets(userId);
            if (!tickets.length) {
                await ctx.reply('You have no open tickets.');
                return;
            }

            const ticketList = tickets.map(ticket =>
                `🎫 #${ticket.id}\nStatus: ${ticket.status}\nSubject: ${ticket.subject}`
            ).join('\n\n');

            await ctx.reply(ticketList);
            break;
        }
        default:
            await ctx.reply('Unknown ticket command. Available commands: /ticket new, /ticket list');
    }
}

/**
 * Handle callback queries
 * @param {TelegramCallbackContext} ctx - Callback query context
 */
async function handleCallbackQuery(ctx) {
    const userId = ctx.from.id.toString();
    const data = ctx.callbackQuery.data;

    if (data.startsWith('ticket:category:')) {
        const category = data.split(':')[2];
        tempTicketData[userId] = { category };
        await ctx.reply('Please reply to this message with your ticket description.');
        return;
    }

    if (data.startsWith('ticket:view:')) {
        const ticketId = data.split(':')[2];
        const ticket = await TicketManager.getTicket(ticketId);

        if (!ticket) {
            await ctx.reply('Ticket not found.');
            return;
        }

        const responseList = ticket.responses?.map(response =>
            `From: ${response.userId}\n${response.content}\n(${new Date(response.timestamp).toLocaleString()})`
        ).join('\n\n') || 'No responses yet';

        await ctx.reply(
            `🎫 #${ticket.id}\n` +
            `Status: ${ticket.status}\n` +
            `Category: ${ticket.category}\n` +
            `Subject: ${ticket.subject}\n\n` +
            `Description: ${ticket.description}\n\n` +
            `Responses:\n${responseList}`
        );
    }

    if (data.startsWith('ticket:respond:')) {
        const ticketId = data.split(':')[2];
        tempTicketData[userId] = { respondingTo: ticketId };
        await ctx.reply('Please reply to this message with your response.');
    }
}

/**
 * Handle message events
 * @param {TelegramContext} ctx - Bot context
 */
async function handleMessage(ctx) {
    if (!ctx.message?.text || !ctx.from?.id) return;

    const userId = ctx.from.id.toString();
    const messageText = ctx.message.text;

    if (ctx.message.reply_to_message && tempTicketData[userId]) {
        const ticketData = tempTicketData[userId];

        if (ticketData.category) {
            const ticket = await createNewTicket(userId, ticketData.category, messageText);
            delete tempTicketData[userId];
            await ctx.reply(
                `Ticket created! #${ticket.id}\n` +
                'Use /ticket list to view your tickets.'
            );
            return;
        }

        if (ticketData.respondingTo) {
            await handleTicketResponse(ticketData.respondingTo, userId, messageText);
            delete tempTicketData[userId];
            await ctx.reply('Response added to ticket.');
            return;
        }
    }

    // Save interaction
    await DynamoDBUtils.saveInteraction(
        userId,
        'telegram',
        {
            type: 'message',
            content: messageText,
            timestamp: new Date().toISOString()
        }
    );

    // Handle direct messages with stats
    if (ctx.chat.type === 'private' && messageText.startsWith('/stats')) {
        const stats = await Analytics.getUserEngagement(userId);
        await ctx.reply(
            '📊 Your Engagement Stats\n\n' +
            `Total Interactions: ${stats.totalInteractions}\n` +
            `Active Hours: ${stats.activeHours.map(h => `${h}:00`).join(', ')}\n` +
            `Engagement Score: ${stats.engagementScore.toFixed(1)}/100`
        );
    }
}

/**
 * Lambda handler for Telegram bot
 * @param {LambdaEvent} event - Lambda event
 * @returns {Promise<LambdaResponse>} Lambda response
 */
export const handler = async (event) => {
    try {
        // Parse update from event body
        const update = JSON.parse(event.body || '{}');

        // Handle different types of updates
        if (update.callback_query) {
            const ctx = {
                ...update,
                reply: async (text, extra) => bot.api.sendMessage(update.callback_query.message.chat.id, text, extra)
            };
            await handleCallbackQuery(ctx);
        } else if (update.message) {
            const ctx = {
                ...update,
                reply: async (text, extra) => bot.api.sendMessage(update.message.chat.id, text, extra)
            };

            if (update.message.text?.startsWith('/')) {
                const command = update.message.text.substring(1).split('@')[0];
                if (command.startsWith('ticket')) {
                    const subCommand = command.split(' ')[1];
                    await handleTicketCommand(ctx, subCommand || 'help');
                } else if (command === 'stats') {
                    await handleMessage(ctx);
                } else {
                    await ctx.reply('Unknown command. Available commands:\n/ticket new\n/ticket list\n/stats');
                }
            } else {
                await handleMessage(ctx);
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ ok: true })
        };
    } catch (error) {
        console.error('Error handling Telegram update:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                ok: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            })
        };
    }
};
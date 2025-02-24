import { Client, GatewayIntentBits, Partials, Events } from 'discord.js';
import { DynamoDBUtils } from '../utils/dynamoDBUtils.js';
import Analytics from '../utils/analyticsUtils.js';
import { TicketManager } from '../utils/ticketUtils.js';

/**
 * @typedef {import('../types/monitoring.js').InteractionStats} InteractionStats
 * @typedef {import('../types/monitoring.js').UserEngagement} UserEngagement
 * @typedef {import('../types.js').LambdaEvent} LambdaEvent
 * @typedef {import('../types.js').LambdaResponse} LambdaResponse
 * @typedef {import('../types.js').TicketData} TicketData
 */

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.Message]
});

/**
 * Create a new ticket
 * @param {string} userId - User ID
 * @param {string} subject - Ticket subject
 * @param {string} description - Ticket description
 * @param {string} category - Ticket category
 * @returns {Promise<TicketData>}
 */
async function createTicket(userId, subject, description, category) {
    const ticketData = {
        userId,
        platform: 'discord',
        subject,
        description,
        category,
        metadata: {},
        status: 'open'
    };

    return await TicketManager.createTicket(ticketData);
}

/**
 * Get platform statistics
 * @param {string} platform - Platform name
 * @param {number} days - Number of days to analyze
 * @returns {Promise<InteractionStats>} Platform statistics
 */
async function getPlatformStats(platform, days) {
    return await Analytics.getPlatformStats(platform, days);
}

/**
 * Get user engagement metrics
 * @param {string} userId - User ID
 * @returns {Promise<UserEngagement>} User engagement metrics
 */
async function getUserEngagement(userId) {
    return await Analytics.getUserEngagement(userId);
}

/**
 * Initialize Discord bot
 * @returns {Promise<void>}
 */
async function initializeBot() {
    if (!process.env.DISCORD_BOT_TOKEN) {
        throw new Error('DISCORD_BOT_TOKEN is not configured');
    }

    await client.login(process.env.DISCORD_BOT_TOKEN);

    client.on('ready', () => {
        console.log(`Logged in as ${client.user?.tag}`);
    });

    client.on('messageCreate', handleMessage);
    client.on(Events.InteractionCreate, handleInteraction);
}

/**
 * Handle incoming messages
 * @param {import('discord.js').Message} message - Discord message
 * @returns {Promise<void>}
 */
async function handleMessage(message) {
    if (message.author.bot) return;

    try {
        await DynamoDBUtils.saveInteraction(
            message.author.id,
            'discord',
            {
                type: 'message',
                content: message.content,
                timestamp: new Date().toISOString()
            }
        );

        if (message.content.startsWith('!stats')) {
            const stats = await getPlatformStats('discord', 7);
            await message.reply({
                content: [
                    '📊 Discord Stats (Last 7 days):',
                    `Total Interactions: ${stats.totalInteractions}`,
                    `Unique Users: ${stats.uniqueUsers}`,
                    `Messages: ${stats.messageCount}`,
                    `Commands: ${stats.commandCount}`,
                    `Engagement Rate: ${(stats.engagementRate * 100).toFixed(1)}%`
                ].join('\n')
            });
        }
    } catch (error) {
        console.error('Error handling message:', error);
        await message.reply('An error occurred while processing your message.');
    }
}

/**
 * Handle Discord interactions
 * @param {import('discord.js').Interaction} interaction - Discord interaction
 * @returns {Promise<void>}
 */
async function handleInteraction(interaction) {
    if (!interaction.isChatInputCommand()) return;

    try {
        await DynamoDBUtils.saveInteraction(
            interaction.user.id,
            'discord',
            {
                type: 'command',
                content: interaction.commandName,
                timestamp: new Date().toISOString()
            }
        );

        switch (interaction.commandName) {
            case 'stats':
                await handleStatsCommand(interaction);
                break;
            case 'ticket':
                await handleTicketCommand(interaction);
                break;
            default:
                await interaction.reply({
                    content: 'Unknown command',
                    ephemeral: true
                });
        }
    } catch (error) {
        console.error('Error handling interaction:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred';
        await interaction.reply({
            content: `Error: ${message}`,
            ephemeral: true
        });
    }
}

/**
 * Handle stats command
 * @param {import('discord.js').ChatInputCommandInteraction} interaction - Command interaction
 * @returns {Promise<void>}
 */
async function handleStatsCommand(interaction) {
    const userId = interaction.user.id;
    const stats = await getUserEngagement(userId);

    const embed = {
        title: '📊 Your Engagement Stats',
        fields: [
            {
                name: 'Total Interactions',
                value: stats.totalInteractions.toString(),
                inline: true
            },
            {
                name: 'Active Hours',
                value: stats.activeHours.map(hour => `${hour}:00`).join(', '),
                inline: true
            },
            {
                name: 'Engagement Score',
                value: `${stats.engagementScore.toFixed(1)}/100`,
                inline: true
            }
        ],
        timestamp: new Date().toISOString()
    };

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

/**
 * Handle ticket command
 * @param {import('discord.js').ChatInputCommandInteraction} interaction - Command interaction
 * @returns {Promise<void>}
 */
async function handleTicketCommand(interaction) {
    const subcommand = interaction.options.getSubcommand(false);
    const userId = interaction.user.id;

    switch (subcommand) {
        case 'create': {
            const subject = interaction.options.getString('subject', true);
            const description = interaction.options.getString('description', true);
            const category = interaction.options.getString('category', true);

            const ticket = await createTicket(userId, subject, description, category);

            await interaction.reply({
                content: `Ticket created! #${ticket.id}`,
                ephemeral: true
            });
            break;
        }
        case 'list': {
            const tickets = await TicketManager.getUserTickets(userId);
            if (!tickets.length) {
                await interaction.reply({
                    content: 'You have no open tickets.',
                    ephemeral: true
                });
                return;
            }

            const embed = {
                title: '🎫 Your Tickets',
                fields: tickets.map(ticket => ({
                    name: `Ticket #${ticket.id}`,
                    value: [
                        `Status: ${ticket.status}`,
                        `Subject: ${ticket.subject}`,
                        `Category: ${ticket.category}`
                    ].join('\n')
                }))
            };

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });
            break;
        }
        default:
            await interaction.reply({
                content: 'Unknown subcommand',
                ephemeral: true
            });
    }
}

/**
 * Lambda handler for Discord bot
 * @param {LambdaEvent} event - Lambda event
 * @returns {Promise<LambdaResponse>} Lambda response
 */
export const handler = async (event) => {
    try {
        await initializeBot();
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Bot initialized successfully' })
        };
    } catch (error) {
        console.error('Error initializing bot:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: error instanceof Error ? error.message : 'Unknown error'
            })
        };
    }
};
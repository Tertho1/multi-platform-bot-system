import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocumentClient,
    PutCommand,
    GetCommand,
    QueryCommand,
    UpdateCommand
} from '@aws-sdk/lib-dynamodb';

/**
 * @typedef {import('../types.js').TicketData} TicketData
 * @typedef {import('../types.js').TicketResponse} TicketResponse
 */

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

/**
 * Ticket and CRM management system
 */
export class TicketManager {
    /**
     * Create a new ticket
     * @param {Omit<TicketData, 'id' | 'createdAt' | 'updatedAt' | 'responses'>} ticketData - Ticket information
     * @returns {Promise<TicketData>}
     */
    static async createTicket(ticketData) {
        /** @type {TicketData} */
        const ticket = {
            ...ticketData,
            id: `TICKET_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            responses: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await docClient.send(new PutCommand({
            TableName: process.env.DYNAMODB_TABLE_NAME,
            Item: ticket
        }));

        return ticket;
    }

    /**
     * Add response to ticket
     * @param {string} ticketId - Ticket ID
     * @param {TicketResponse} response - Response data
     * @returns {Promise<void>}
     */
    static async addResponse(ticketId, response) {
        const ticket = await this.getTicket(ticketId);
        if (!ticket) {
            throw new Error('Ticket not found');
        }

        const params = {
            TableName: process.env.DYNAMODB_TABLE_NAME,
            Key: { id: ticketId },
            UpdateExpression: 'SET #responses = list_append(if_not_exists(#responses, :empty_list), :response), #updatedAt = :timestamp',
            ExpressionAttributeNames: {
                '#responses': 'responses',
                '#updatedAt': 'updatedAt'
            },
            ExpressionAttributeValues: {
                ':response': [response],
                ':empty_list': [],
                ':timestamp': new Date().toISOString()
            }
        };

        await docClient.send(new UpdateCommand(params));
    }

    /**
     * Update ticket status
     * @param {string} ticketId - Ticket ID
     * @param {string} status - New status
     * @param {string} [comment] - Status change comment
     * @returns {Promise<void>}
     */
    static async updateStatus(ticketId, status, comment) {
        const params = {
            TableName: process.env.DYNAMODB_TABLE_NAME,
            Key: { id: ticketId },
            UpdateExpression: 'SET #status = :status, #updatedAt = :timestamp',
            ExpressionAttributeNames: {
                '#status': 'status',
                '#updatedAt': 'updatedAt'
            },
            ExpressionAttributeValues: {
                ':status': status,
                ':timestamp': new Date().toISOString()
            }
        };

        if (comment) {
            params.UpdateExpression += ', #statusComment = :comment';
            params.ExpressionAttributeNames['#statusComment'] = 'statusComment';
            params.ExpressionAttributeValues[':comment'] = comment;
        }

        await docClient.send(new UpdateCommand(params));
    }

    /**
     * Get ticket by ID
     * @param {string} ticketId - Ticket ID
     * @returns {Promise<TicketData|null>}
     */
    static async getTicket(ticketId) {
        const params = {
            TableName: process.env.DYNAMODB_TABLE_NAME,
            Key: { id: ticketId }
        };

        const response = await docClient.send(new GetCommand(params));
        return response.Item ? /** @type {TicketData} */ (response.Item) : null;
    }

    /**
     * Get user's tickets
     * @param {string} userId - User ID
     * @param {string} [status] - Filter by status
     * @returns {Promise<TicketData[]>}
     */
    static async getUserTickets(userId, status) {
        const params = {
            TableName: process.env.DYNAMODB_TABLE_NAME,
            IndexName: 'userId-index',
            KeyConditionExpression: '#userId = :userId',
            ExpressionAttributeNames: {
                '#userId': 'userId'
            },
            ExpressionAttributeValues: {
                ':userId': userId
            }
        };

        if (status) {
            params.ExpressionAttributeNames['#status'] = 'status';
            params.FilterExpression = '#status = :status';
            params.ExpressionAttributeValues[':status'] = status;
        }

        const response = await docClient.send(new QueryCommand(params));
        return (response.Items || []).map(item => /** @type {TicketData} */(item));
    }

    /**
     * Get ticket analytics
     * @param {string} [platform] - Filter by platform
     * @returns {Promise<Object>}
     */
    static async getTicketAnalytics(platform) {
        const params = {
            TableName: process.env.DYNAMODB_TABLE_NAME,
            IndexName: 'type-timestamp-index',
            KeyConditionExpression: '#type = :type',
            ExpressionAttributeNames: {
                '#type': 'type'
            },
            ExpressionAttributeValues: {
                ':type': 'ticket'
            }
        };

        if (platform) {
            params.ExpressionAttributeNames['#platform'] = 'platform';
            params.FilterExpression = '#platform = :platform';
            params.ExpressionAttributeValues[':platform'] = platform;
        }

        const response = await docClient.send(new QueryCommand(params));
        const tickets = (response.Items || []).map(item => /** @type {TicketData} */(item));

        return {
            byStatus: this.groupBy(tickets, 'status'),
            byPlatform: this.groupBy(tickets, 'platform'),
            averageResponseTime: this.calculateAverageResponseTime(tickets)
        };
    }

    /**
     * Group tickets by property
     * @private
     * @param {TicketData[]} tickets - Tickets to group
     * @param {keyof TicketData} property - Property to group by
     * @returns {Record<string, number>}
     */
    static groupBy(tickets, property) {
        return tickets.reduce((acc, ticket) => {
            const key = ticket[property]?.toString() || 'unknown';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, /** @type {Record<string, number>} */({}));
    }

    /**
     * Calculate average response time
     * @private
     * @param {TicketData[]} tickets - Tickets to analyze
     * @returns {number}
     */
    static calculateAverageResponseTime(tickets) {
        const ticketsWithResponses = tickets
            .filter(ticket => ticket.responses && ticket.responses.length > 0);

        const totalResponseTime = ticketsWithResponses.reduce((sum, ticket) => {
            const firstResponse = ticket.responses[0];
            if (firstResponse && ticket.createdAt) {
                const createdTime = new Date(ticket.createdAt).getTime();
                const responseTime = new Date(firstResponse.timestamp).getTime();
                return sum + (responseTime - createdTime);
            }
            return sum;
        }, 0);

        return ticketsWithResponses.length > 0
            ? totalResponseTime / ticketsWithResponses.length
            : 0;
    }
}

export default TicketManager;
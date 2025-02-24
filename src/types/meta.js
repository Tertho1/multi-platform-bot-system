/**
 * @typedef {Object} WhatsAppMessage
 * @property {string} from - Sender ID
 * @property {Object} [text] - Text message content
 * @property {string} [text.body] - Message body
 * @property {string} type - Message type
 * @property {string} timestamp - Message timestamp
 * @property {Object[]} [attachments] - Message attachments
 */

/**
 * @typedef {Object} FacebookMessage
 * @property {string} from - Sender ID
 * @property {string} text - Message text
 * @property {Object[]} [attachments] - Message attachments
 */

/**
 * @typedef {Object} InstagramMessage
 * @property {string} from - Sender ID
 * @property {string} text - Message text
 * @property {Object[]} [attachments] - Message attachments
 */

/**
 * @typedef {Object} MetaWebhookHeader
 * @property {string} xHubSignature256 - Webhook signature without hyphens
 */

/**
 * @typedef {Object} MetaWebhookEvent
 * @property {string} object - Platform identifier
 * @property {Array<MetaWebhookEntry>} entry - Webhook entries
 */

/**
 * @typedef {Object} MetaWebhookEntry
 * @property {string} id - Entry ID
 * @property {number} time - Timestamp
 * @property {Array<MetaWebhookChange>} changes - Changes in this entry
 * @property {Array<Object>} [messaging] - Messaging events
 */

/**
 * @typedef {Object} MetaWebhookChange
 * @property {Object} value - Change value
 * @property {string} field - Changed field
 */

export { };
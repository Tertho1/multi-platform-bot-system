import { config } from 'dotenv';
import { jest } from '@jest/globals';
import { webcrypto } from 'node:crypto';

/**
 * @typedef {import('discord.js').WebhookClient} WebhookClient
 * @typedef {import('@google-cloud/storage').Storage} Storage
 * @typedef {import('@aws-sdk/client-dynamodb').DynamoDBClient} DynamoDBClient
 */

// Load environment variables for testing
config();

// Set crypto for tests
globalThis.crypto = webcrypto;

// Mock environment variables
process.env = {
    ...process.env,
    DISCORD_NOTIFICATION_WEBHOOK_URL: 'https://discord.com/api/webhooks/test',
    DISCORD_REPORTS_WEBHOOK_URL: 'https://discord.com/api/webhooks/reports',
    GOOGLE_CLOUD_BUCKET_NAME: 'test-bucket',
    BACKUP_ENCRYPTION_KEY: 'test-key',
    API_KEY: 'test-api-key'
};

// Mock Discord WebhookClient
jest.mock('discord.js', () => ({
    WebhookClient: jest.fn(() => ({
        send: jest.fn(() => Promise.resolve({ id: 'message-id' })),
        destroy: jest.fn()
    }))
}));

// Mock Google Cloud Storage
jest.mock('@google-cloud/storage', () => ({
    Storage: jest.fn(() => ({
        bucket: jest.fn(() => ({
            file: jest.fn(() => ({
                save: jest.fn(() => Promise.resolve([{ status: 'success' }])),
                getSignedUrl: jest.fn(() => Promise.resolve(['https://example.com/test'])),
                download: jest.fn(() => Promise.resolve([Buffer.from('test')])),
                delete: jest.fn(() => Promise.resolve([{ status: 'success' }]))
            })),
            getFiles: jest.fn(() => Promise.resolve([[
                {
                    name: 'backup_test.gz',
                    metadata: {
                        size: '1024',
                        timeCreated: new Date().toISOString(),
                        updated: new Date().toISOString()
                    }
                }
            ]]))
        }))
    }))
}));

// Mock AWS DynamoDB
jest.mock('@aws-sdk/client-dynamodb', () => ({
    DynamoDBClient: jest.fn(() => ({
        send: jest.fn(() => Promise.resolve({
            Items: [{ id: 'test', data: 'test' }]
        }))
    }))
}));

// Mock DynamoDB Document Client
jest.mock('@aws-sdk/lib-dynamodb', () => ({
    DynamoDBDocumentClient: {
        from: jest.fn(() => ({
            send: jest.fn(() => Promise.resolve({
                Items: [{ id: 'test', data: 'test' }]
            }))
        }))
    },
    PutCommand: jest.fn(),
    GetCommand: jest.fn(),
    QueryCommand: jest.fn(),
    ScanCommand: jest.fn(),
    UpdateCommand: jest.fn(),
    DeleteCommand: jest.fn(),
    BatchWriteCommand: jest.fn()
}));

// Mock fetch with proper Response interface implementation
const mockResponse = {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    json: () => Promise.resolve({ success: true }),
    text: () => Promise.resolve('success'),
    url: 'https://example.com',
    type: 'basic',
    redirected: false,
    body: null,
    bodyUsed: false,
    clone: function () { return this; },
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob([new ArrayBuffer(0)], { type: 'application/octet-stream' })),
    formData: () => Promise.resolve(new FormData()),
};

// @ts-ignore - Mocking fetch
global.fetch = jest.fn(() => Promise.resolve(mockResponse));

// Mock crypto for encryption
jest.mock('crypto', () => ({
    createCipheriv: jest.fn(() => ({
        update: jest.fn().mockReturnValue(Buffer.from('encrypted')),
        final: jest.fn().mockReturnValue(Buffer.from('')),
        getAuthTag: jest.fn().mockReturnValue(Buffer.from('tag'))
    })),
    createDecipheriv: jest.fn(() => ({
        update: jest.fn().mockReturnValue(Buffer.from('decrypted')),
        final: jest.fn().mockReturnValue(Buffer.from('')),
        setAuthTag: jest.fn()
    })),
    randomBytes: jest.fn().mockReturnValue(Buffer.from('1234567890123456'))
}));

// Mock console methods to reduce noise in tests
global.console = {
    ...console,
    error: jest.fn(),
    warn: jest.fn(),
    log: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
};
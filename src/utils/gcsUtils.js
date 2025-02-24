import { Storage } from '@google-cloud/storage';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { createGzip, createGunzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { Buffer } from 'node:buffer';

/**
 * @typedef {Object} BackupFile
 * @property {string} name - File name
 * @property {string} url - Signed URL
 * @property {number} size - File size in bytes
 * @property {string} timeCreated - Creation timestamp
 * @property {string} updated - Last update timestamp
 */

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

class GCSUtils {
    constructor() {
        if (!process.env.GOOGLE_CLOUD_BUCKET_NAME) {
            throw new Error('GOOGLE_CLOUD_BUCKET_NAME is not configured');
        }
        if (!process.env.BACKUP_ENCRYPTION_KEY) {
            throw new Error('BACKUP_ENCRYPTION_KEY is not configured');
        }

        this.storage = new Storage();
        this.bucket = this.storage.bucket(process.env.GOOGLE_CLOUD_BUCKET_NAME);
        this.encryptionKey = Buffer.from(process.env.BACKUP_ENCRYPTION_KEY, 'hex');
    }

    /**
     * Upload file to GCS
     * @param {string} fileName - Name of the file
     * @param {Buffer | string} data - File data
     * @returns {Promise<string>} Signed URL of the uploaded file
     */
    async uploadFile(fileName, data) {
        try {
            const file = this.bucket.file(fileName);
            const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);

            // Encrypt and compress data
            const compressedData = await this.compressAndEncrypt(buffer);

            // Upload to GCS with metadata
            await file.save(compressedData, {
                metadata: {
                    encryption: ENCRYPTION_ALGORITHM,
                    contentEncoding: 'gzip',
                    contentType: 'application/octet-stream'
                }
            });

            // Generate signed URL
            const [url] = await file.getSignedUrl({
                version: 'v4',
                action: 'read',
                expires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
            });

            return url;
        } catch (error) {
            console.error('Error uploading file:', error);
            throw error;
        }
    }

    /**
     * Download file from GCS
     * @param {string} fileName - Name of the file to download
     * @returns {Promise<Buffer>} Decrypted and decompressed file data
     */
    async downloadFile(fileName) {
        try {
            const file = this.bucket.file(fileName);
            const [fileData] = await file.download();
            return this.decryptAndDecompress(fileData);
        } catch (error) {
            console.error('Error downloading file:', error);
            throw error;
        }
    }

    /**
     * List backup files
     * @returns {Promise<BackupFile[]>} List of backup files
     */
    async listBackupFiles() {
        try {
            const [files] = await this.bucket.getFiles({ prefix: 'backup_' });

            return files.map(file => ({
                name: file.name,
                size: Number(file.metadata.size) || 0,
                timeCreated: file.metadata.timeCreated || new Date().toISOString(),
                updated: file.metadata.updated || new Date().toISOString(),
                url: file.metadata.selfLink || ''
            }));
        } catch (error) {
            console.error('Error listing backup files:', error);
            throw error;
        }
    }

    /**
     * Clean up old backup files
     * @param {number} retentionDays - Number of days to retain backups
     */
    async cleanupOldBackups(retentionDays = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

            const [files] = await this.bucket.getFiles({ prefix: 'backup_' });
            const oldFiles = files
                .filter(file => new Date(file.metadata.timeCreated || 0) < cutoffDate);

            await Promise.all(oldFiles.map(file => file.delete()));

            return {
                success: true,
                deletedCount: oldFiles.length
            };
        } catch (error) {
            console.error('Error cleaning up old backups:', error);
            throw error;
        }
    }

    /**
     * Verify backup integrity
     * @param {string} fileName - Name of the backup file
     */
    async verifyBackupIntegrity(fileName) {
        try {
            const file = await this.downloadFile(fileName);
            const data = await this.decompressData(file);
            return data.length > 0;
        } catch (error) {
            console.error('Backup integrity check failed:', error);
            return false;
        }
    }

    /**
     * Delete a file from GCS
     * @param {string} fileName - Name of file to delete
     * @returns {Promise<void>}
     */
    async deleteFile(fileName) {
        try {
            const file = this.bucket.file(fileName);
            await file.delete();
        } catch (error) {
            console.error('Error deleting file:', error);
            throw error;
        }
    }

    /**
     * Compress and encrypt data
     * @private
     * @param {Buffer} data - Data to process
     * @returns {Promise<Buffer>} Processed data
     */
    async compressAndEncrypt(data) {
        // First compress
        const compressed = await this.compressData(data);

        // Then encrypt
        const iv = randomBytes(16);
        const cipher = createCipheriv(ENCRYPTION_ALGORITHM, this.encryptionKey, iv);
        const encrypted = Buffer.concat([iv, cipher.update(compressed), cipher.final(), cipher.getAuthTag()]);

        return encrypted;
    }

    /**
     * Decrypt and decompress data
     * @private
     * @param {Buffer} data - Data to process
     * @returns {Promise<Buffer>} Processed data
     */
    async decryptAndDecompress(data) {
        // Extract IV and auth tag
        const iv = data.slice(0, 16);
        const authTag = data.slice(-16);
        const encrypted = data.slice(16, -16);

        // Decrypt
        const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, this.encryptionKey, iv);
        decipher.setAuthTag(authTag);
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

        // Decompress
        return this.decompressData(decrypted);
    }

    /**
     * Compress data using gzip
     * @private
     * @param {Buffer} data - Data to compress
     * @returns {Promise<Buffer>} Compressed data
     */
    async compressData(data) {
        const chunks = [];
        const gzip = createGzip();

        return new Promise((resolve, reject) => {
            gzip.on('data', chunk => chunks.push(chunk));
            gzip.on('end', () => resolve(Buffer.concat(chunks)));
            gzip.on('error', reject);
            gzip.end(data);
        });
    }

    /**
     * Decompress gzipped data
     * @private
     * @param {Buffer} data - Data to decompress
     * @returns {Promise<Buffer>} Decompressed data
     */
    async decompressData(data) {
        const chunks = [];
        const gunzip = createGunzip();

        return new Promise((resolve, reject) => {
            gunzip.on('data', chunk => chunks.push(chunk));
            gunzip.on('end', () => resolve(Buffer.concat(chunks)));
            gunzip.on('error', reject);
            gunzip.end(data);
        });
    }
}

// Create singleton instance
const gcsUtils = new GCSUtils();

export default gcsUtils;
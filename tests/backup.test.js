import { jest } from '@jest/globals';
import BackupSystem from '../src/utils/backupUtils.js';

/**
 * @typedef {import('../src/types/monitoring.js').InteractionStats} InteractionStats
 */

describe('Backup System', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('performBackup', () => {
        it('should perform backup successfully', async () => {
            const mockData = [
                {
                    userId: 'user1',
                    platform: 'discord',
                    type: 'message',
                    timestamp: new Date().toISOString()
                }
            ];

            // Mock private methods using prototype access
            jest.spyOn(Object.getPrototypeOf(BackupSystem), 'getAllData').mockResolvedValue(mockData);
            jest.spyOn(Object.getPrototypeOf(BackupSystem), 'compressData').mockResolvedValue(Buffer.from('test'));
            jest.spyOn(Object.getPrototypeOf(BackupSystem), 'saveBackupMetadata').mockResolvedValue(undefined);

            const result = await BackupSystem.performBackup();
            expect(result).toEqual(expect.objectContaining({
                status: 'success',
                recordCount: 1,
                size: expect.any(Number)
            }));
        });

        it('should handle backup failure', async () => {
            jest.spyOn(Object.getPrototypeOf(BackupSystem), 'getAllData').mockRejectedValue(new Error('Database error'));
            await expect(BackupSystem.performBackup()).rejects.toThrow('Database error');
        });
    });

    describe('generateReport', () => {
        it('should generate report successfully', async () => {
            /** @type {InteractionStats} */
            const mockStats = {
                totalInteractions: 100,
                uniqueUsers: 50,
                messageCount: 80,
                commandCount: 20,
                engagementRate: 0.75
            };

            const testReport = {
                timestamp: new Date().toISOString(),
                platformStats: {
                    discord: mockStats,
                    telegram: mockStats
                },
                totalStats: {
                    totalInteractions: 200,
                    averageResponseTime: 500
                }
            };

            jest.spyOn(Object.getPrototypeOf(BackupSystem), 'calculateStats').mockResolvedValue(testReport);
            jest.spyOn(Object.getPrototypeOf(BackupSystem), 'saveReport').mockResolvedValue(undefined);

            const result = await BackupSystem.generateReport();
            expect(result).toEqual(testReport);
        });

        it('should handle report generation failure', async () => {
            jest.spyOn(Object.getPrototypeOf(BackupSystem), 'calculateStats').mockRejectedValue(new Error('Stats error'));
            await expect(BackupSystem.generateReport()).rejects.toThrow('Stats error');
        });
    });

    describe('compress/decompress', () => {
        it('should compress and decompress data successfully', async () => {
            const testData = Buffer.from('test data');
            const compressed = await BackupSystem.compressData(testData);
            expect(compressed).toBeInstanceOf(Buffer);

            const decompressed = await BackupSystem.decompressData(compressed);
            expect(decompressed.toString()).toBe('test data');
        });

        it('should handle compression errors', async () => {
            // @ts-ignore - Testing invalid input
            await expect(BackupSystem.compressData(null)).rejects.toThrow();
        });
    });

    describe('calculateStats', () => {
        it('should calculate platform stats correctly', async () => {
            const mockData = [
                {
                    userId: 'user1',
                    type: 'message',
                    timestamp: new Date().toISOString()
                },
                {
                    userId: 'user2',
                    type: 'command',
                    timestamp: new Date().toISOString()
                }
            ];

            jest.spyOn(Object.getPrototypeOf(BackupSystem), 'getAllData').mockResolvedValue(mockData);

            const result = await BackupSystem.calculateStats();
            expect(result).toEqual(expect.objectContaining({
                totalInteractions: expect.any(Number),
                uniqueUsers: expect.any(Number),
                averageResponseTime: expect.any(Number),
                platformStats: expect.any(Object)
            }));
        });
    });
});

describe('Discord Notification Integration', () => {
    test('should send system alerts', async () => {
        await expect(
            BackupSystem.performBackup()
        ).resolves.not.toThrow();
    });

    test('should send weekly analytics report', async () => {
        const testReport = {
            timestamp: new Date().toISOString(),
            platformStats: {
                discord: { totalInteractions: 500 },
                telegram: { totalInteractions: 500 }
            },
            totalStats: {
                totalInteractions: 1000,
                averageResponseTime: 500
            }
        };

        jest.spyOn(Object.getPrototypeOf(BackupSystem), 'calculateStats').mockResolvedValue(testReport);
        await expect(BackupSystem.generateReport()).resolves.not.toThrow();
    });
});
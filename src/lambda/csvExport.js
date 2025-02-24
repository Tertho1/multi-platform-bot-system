import { DynamoDBUtils } from '../utils/dynamoDBUtils.js';
import gcsUtils from '../utils/gcsUtils.js';
import { createObjectCsvStringifier } from 'csv-writer';

/**
 * @typedef {import('../types.js').LambdaEvent} LambdaEvent
 * @typedef {import('../types.js').LambdaResponse} LambdaResponse
 * @typedef {import('../types.js').CSVExportData} CSVExportData
 */

/**
 * Convert DynamoDB items to CSV format data
 * @param {Record<string, any>[]} items - DynamoDB items
 * @returns {CSVExportData[]}
 */
function formatDataForCSV(items) {
    return items.map(item => ({
        userId: item.userId,
        platform: item.platform,
        type: item.type,
        timestamp: item.timestamp,
        content: typeof item.content === 'object' ?
            JSON.stringify(item.content) : String(item.content)
    }));
}

/**
 * Convert array of objects to CSV
 * @param {CSVExportData[]} data - Array of objects to convert to CSV
 * @returns {Promise<string>} CSV string
 */
async function convertToCSV(data) {
    const csvStringifier = createObjectCsvStringifier({
        header: [
            { id: 'userId', title: 'User ID' },
            { id: 'platform', title: 'Platform' },
            { id: 'type', title: 'Type' },
            { id: 'timestamp', title: 'Timestamp' },
            { id: 'content', title: 'Content' }
        ]
    });

    const csvString = csvStringifier.stringifyRecords(data);
    return csvStringifier.getHeaderString() + csvString;
}

/**
 * Lambda handler for CSV export
 * @param {LambdaEvent} event - Lambda event
 * @returns {Promise<LambdaResponse>} Lambda response
 */
export const handler = async (event) => {
    try {
        // Verify API key
        const apiKey = event.headers?.['x-api-key'];
        if (!apiKey || apiKey !== process.env.API_KEY) {
            return {
                statusCode: 401,
                body: JSON.stringify({ error: 'Invalid API key' })
            };
        }

        // Get query parameters
        const params = event.queryStringParameters || {};
        const platform = params.platform;
        const startDate = params.startDate;
        const endDate = params.endDate;

        if (!platform || !startDate || !endDate) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'Missing required parameters: platform, startDate, endDate'
                })
            };
        }

        // Query data
        const rawData = await DynamoDBUtils.queryData(
            platform,
            startDate,
            endDate
        );

        // Format data for CSV
        const formattedData = formatDataForCSV(rawData);

        // Convert to CSV
        const csv = await convertToCSV(formattedData);

        // Generate filename
        const filename = `export_${platform}_${startDate}_${endDate}.csv`;

        // Upload to GCS
        const url = await gcsUtils.uploadFile(filename, csv);

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                url,
                filename,
                recordCount: formattedData.length
            })
        };
    } catch (error) {
        console.error('Error exporting data:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: error instanceof Error ? error.message : 'Unknown error'
            })
        };
    }
};
const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { google } = require('googleapis');

/**
 * Process CSV file and upload to Google Sheets
 * Handles duplicate detection and appending new records
 */

// Parse CSV file
function parseCSV(filePath) {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');

        // Parse CSV - skip first 7 rows (header formatting rows)
        const records = parse(fileContent, {
            skip_empty_lines: true,
            from_line: 8, // Start from line 8 (first data row)
            relax_column_count: true,
            relax_quotes: true
        });

        // Filter out empty rows and extract relevant columns
        const cleanedData = records
            .filter(row => row[1] || row[4]) // Has Item Code OR Description
            .map(row => {
                // Extract columns based on AutoCount CSV format
                // Verified column positions from actual CSV structure
                return [
                    row[1] || '',   // Item Code (col 1)
                    row[4] || '',   // Description (col 4) - FIXED!
                    row[7] || '',   // Qty (col 7) - FIXED!
                    row[10] || '',  // Unit Price (col 10) - FIXED!
                    row[13] || '',  // Discount (col 13)
                    row[18] || '',  // Currency (col 18 - RM)
                    row[20] || '',  // Sub Total (col 20)
                    row[21] || '',  // Doc No (col 21 - Invoice number)
                    row[23] || '',  // Date (col 23)
                    row[25] || '',  // Debtor Code (col 25)
                    row[27] || '',  // Debtor Name (col 27)
                    row[29] || '',  // Additional Notes (col 29)
                    'Unpaid',       // Payment Status (col M) - NEW!
                    ''              // Payment Date (col N) - NEW!
                ];
            });

        return cleanedData;
    } catch (error) {
        console.error('Error parsing CSV:', error);
        throw new Error('Failed to parse CSV file');
    }
}

// Get existing data from Google Sheets to check for duplicates
async function getExistingData(sheetsAPI, sheetId, sheetName) {
    try {
        const response = await sheetsAPI.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: `${sheetName}!A:N`, // Columns A to N (added payment columns)
        });

        return response.data.values || [];
    } catch (error) {
        console.error('Error reading existing data:', error);
        return [];
    }
}

// Check if a row already exists (based on Doc No + Item Code)
function isDuplicate(newRow, existingData) {
    const newDocNo = newRow[7]; // Doc No column
    const newItemCode = newRow[0]; // Item Code column
    const newDesc = newRow[1]; // Description column

    return existingData.some(existingRow => {
        const existingDocNo = existingRow[7];
        const existingItemCode = existingRow[0];
        const existingDesc = existingRow[1];

        // Match by Doc No + (Item Code OR Description)
        return existingDocNo === newDocNo &&
               (existingItemCode === newItemCode || existingDesc === newDesc);
    });
}

// Append new data to Google Sheets
async function appendToSheet(sheetsAPI, sheetId, sheetName, data) {
    try {
        await sheetsAPI.spreadsheets.values.append({
            spreadsheetId: sheetId,
            range: `${sheetName}!A:N`,
            valueInputOption: 'RAW',
            resource: {
                values: data
            }
        });
        return true;
    } catch (error) {
        console.error('Error appending to sheet:', error);
        throw new Error('Failed to append data to Google Sheets');
    }
}

// Ensure sheet exists, create if it doesn't
async function ensureSheetExists(sheetsAPI, sheetId, sheetName) {
    try {
        const response = await sheetsAPI.spreadsheets.get({
            spreadsheetId: sheetId,
        });

        const sheetExists = response.data.sheets.some(
            sheet => sheet.properties.title === sheetName
        );

        if (!sheetExists) {
            // Create the sheet with headers
            await sheetsAPI.spreadsheets.batchUpdate({
                spreadsheetId: sheetId,
                resource: {
                    requests: [{
                        addSheet: {
                            properties: {
                                title: sheetName
                            }
                        }
                    }]
                }
            });

            // Add headers
            const headers = [
                'Item Code', 'Description', 'Qty', 'Unit Price',
                'Discount', 'Currency', 'Sub Total', 'Doc No',
                'Date', 'Debtor Code', 'Debtor', 'Notes',
                'Payment Status', 'Payment Date'
            ];

            await sheetsAPI.spreadsheets.values.update({
                spreadsheetId: sheetId,
                range: `${sheetName}!A1:N1`,
                valueInputOption: 'RAW',
                resource: {
                    values: [headers]
                }
            });

            console.log(`✅ Created new sheet: ${sheetName}`);
            return true;
        }

        return false;
    } catch (error) {
        console.error('Error checking/creating sheet:', error);
        throw error;
    }
}

// Main processing function
async function processCsvFile(filePath, sheetsAPI, sheetId, sheetName = 'Invoice Detail Listing') {
    try {
        console.log('📄 Parsing CSV file...');
        const newData = parseCSV(filePath);

        if (newData.length === 0) {
            return {
                success: false,
                message: 'CSV file is empty or has no valid data'
            };
        }

        console.log(`📊 Found ${newData.length} records in CSV`);

        // Ensure sheet exists
        console.log('📋 Checking if sheet exists...');
        await ensureSheetExists(sheetsAPI, sheetId, sheetName);

        // Get existing data
        console.log('🔍 Checking for duplicates...');
        const existingData = await getExistingData(sheetsAPI, sheetId, sheetName);

        // Filter out duplicates
        const uniqueData = newData.filter(row => !isDuplicate(row, existingData));

        if (uniqueData.length === 0) {
            return {
                success: true,
                message: `All ${newData.length} records already exist. No new data to add.`,
                totalRecords: newData.length,
                newRecords: 0,
                duplicates: newData.length
            };
        }

        // Append new data
        console.log(`➕ Appending ${uniqueData.length} new records...`);
        await appendToSheet(sheetsAPI, sheetId, sheetName, uniqueData);

        console.log('✅ CSV processing complete!');

        return {
            success: true,
            message: `Successfully processed invoice data!`,
            totalRecords: newData.length,
            newRecords: uniqueData.length,
            duplicates: newData.length - uniqueData.length,
            sheetName: sheetName
        };

    } catch (error) {
        console.error('Error processing CSV:', error);
        return {
            success: false,
            message: `Error: ${error.message}`
        };
    }
}

module.exports = {
    processCsvFile
};

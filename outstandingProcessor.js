const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { google } = require('googleapis');

/**
 * Process Outstanding CSV and update payment status in Google Sheets
 * Matches by invoice number and updates all line items
 */

// Parse Outstanding CSV file
function parseOutstandingCSV(filePath) {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');

        // Parse CSV - simplified format with only 3 columns: Invoice No, Total, Outstanding
        const records = parse(fileContent, {
            skip_empty_lines: true,
            from_line: 1, // Start from line 1 (first data row in cleaned CSV)
            relax_column_count: true,
            relax_quotes: true
        });

        // Extract relevant data
        const outstandingData = records
            .filter(row => row[0] && row[0].startsWith('IV-')) // Has invoice number
            .map(row => {
                // Clean and parse outstanding amount from column 2
                let outstandingStr = (row[2] || '0').toString().replace(/,/g, '');
                const outstanding = parseFloat(outstandingStr) || 0;

                return {
                    invoiceNo: row[0] || '',           // Doc No (col 0)
                    total: row[1] || '',               // Total amount (col 1)
                    outstanding: outstanding           // Outstanding amount (col 2)
                };
            });

        console.log(`📊 Parsed ${outstandingData.length} outstanding records`);
        return outstandingData;
    } catch (error) {
        console.error('Error parsing Outstanding CSV:', error);
        throw new Error('Failed to parse Outstanding CSV file');
    }
}

// Get all data from Invoice Detail Listing sheet
async function getInvoiceDetailData(sheetsAPI, sheetId, sheetName = 'Invoice Detail Listing') {
    try {
        const response = await sheetsAPI.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: `${sheetName}!A:N`,
        });

        return response.data.values || [];
    } catch (error) {
        console.error('Error reading Invoice Detail Listing:', error);
        throw error;
    }
}

// Update payment status for matching invoices
async function updatePaymentStatus(sheetsAPI, sheetId, outstandingData, sheetName = 'Invoice Detail Listing') {
    try {
        console.log('📋 Reading Invoice Detail Listing...');
        const allRows = await getInvoiceDetailData(sheetsAPI, sheetId, sheetName);

        if (allRows.length === 0) {
            throw new Error('Invoice Detail Listing sheet is empty');
        }

        // Create a map of invoice number -> outstanding amount
        const outstandingMap = {};
        outstandingData.forEach(item => {
            outstandingMap[item.invoiceNo] = item.outstanding;
        });

        console.log(`🔍 Checking ${allRows.length} rows for payment status...`);

        // Track updates
        let updatedRows = 0;
        let paidCount = 0;
        let unpaidCount = 0;

        // Prepare batch update
        const updates = [];

        // Skip header row (index 0), process from row 2 onwards
        for (let i = 1; i < allRows.length; i++) {
            const row = allRows[i];
            const invoiceNo = row[7]; // Doc No is column H (index 7)

            if (!invoiceNo) continue;

            // Check if this invoice has outstanding amount
            const outstanding = outstandingMap[invoiceNo];

            if (outstanding !== undefined) {
                let newStatus = '';
                let paymentDate = '';

                if (outstanding === 0) {
                    newStatus = 'Paid';
                    paymentDate = row[8] || ''; // Use invoice date if no specific payment date
                    paidCount++;
                } else {
                    newStatus = 'Unpaid';
                    paymentDate = '';
                    unpaidCount++;
                }

                // Only update if status changed
                const currentStatus = row[12] || ''; // Payment Status is column M (index 12)
                if (currentStatus !== newStatus) {
                    updates.push({
                        range: `${sheetName}!M${i + 1}:N${i + 1}`, // +1 because sheets are 1-indexed
                        values: [[newStatus, paymentDate]]
                    });
                    updatedRows++;
                }
            }
        }

        if (updates.length === 0) {
            return {
                success: true,
                message: 'No updates needed - all payment statuses are already current',
                updatedRows: 0,
                paidCount: paidCount,
                unpaidCount: unpaidCount
            };
        }

        // Batch update all rows
        console.log(`✍️  Updating ${updates.length} rows...`);
        await sheetsAPI.spreadsheets.values.batchUpdate({
            spreadsheetId: sheetId,
            resource: {
                valueInputOption: 'RAW',
                data: updates
            }
        });

        console.log('✅ Payment status update complete!');

        return {
            success: true,
            message: 'Payment status updated successfully!',
            updatedRows: updatedRows,
            paidCount: paidCount,
            unpaidCount: unpaidCount
        };

    } catch (error) {
        console.error('Error updating payment status:', error);
        throw error;
    }
}

// Main processing function
async function processOutstandingCSV(filePath, sheetsAPI, sheetId) {
    try {
        console.log('📄 Processing Outstanding CSV...');

        // Parse the CSV
        const outstandingData = parseOutstandingCSV(filePath);

        if (outstandingData.length === 0) {
            return {
                success: false,
                message: 'No valid outstanding data found in CSV'
            };
        }

        // Update payment statuses
        const result = await updatePaymentStatus(sheetsAPI, sheetId, outstandingData);

        return result;

    } catch (error) {
        console.error('Error processing Outstanding CSV:', error);
        return {
            success: false,
            message: `Error: ${error.message}`
        };
    }
}

module.exports = {
    processOutstandingCSV
};

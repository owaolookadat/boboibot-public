const { google } = require('googleapis');

// Update payment status for a specific invoice
async function updatePaymentStatus(invoiceNo, status, paymentDate, sheetsAPI, sheetId, sheetName = 'Invoice Detail Listing') {
    try {
        console.log(`💳 Updating payment status for ${invoiceNo} to ${status}...`);

        // Get all data from the sheet
        const response = await sheetsAPI.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: `${sheetName}!A:N`, // Columns A to N (includes Payment Status and Payment Date)
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            return {
                success: false,
                message: 'No data found in sheet'
            };
        }

        // Find all rows matching the invoice number (column H = index 7)
        const matchingRows = [];
        for (let i = 1; i < rows.length; i++) { // Skip header row
            const row = rows[i];
            const docNo = row[7] || ''; // Column H (Doc No)

            if (docNo.trim().toUpperCase() === invoiceNo.trim().toUpperCase()) {
                matchingRows.push({
                    rowIndex: i + 1, // +1 for 1-based indexing in Sheets
                    data: row
                });
            }
        }

        if (matchingRows.length === 0) {
            return {
                success: false,
                message: `Invoice ${invoiceNo} not found in sheet`
            };
        }

        // Prepare batch update for all matching rows
        const updates = matchingRows.map(match => ({
            range: `${sheetName}!M${match.rowIndex}:N${match.rowIndex}`, // Columns M and N
            values: [[status, paymentDate || '']]
        }));

        // Execute batch update
        await sheetsAPI.spreadsheets.values.batchUpdate({
            spreadsheetId: sheetId,
            resource: {
                valueInputOption: 'RAW',
                data: updates
            }
        });

        console.log(`✅ Updated ${matchingRows.length} line items for invoice ${invoiceNo}`);

        return {
            success: true,
            message: `Successfully updated payment status`,
            invoiceNo: invoiceNo,
            status: status,
            paymentDate: paymentDate,
            rowsUpdated: matchingRows.length
        };

    } catch (error) {
        console.error('Error updating payment status:', error);
        return {
            success: false,
            message: `Error updating payment status: ${error.message}`
        };
    }
}

// Parse payment command from message (supports multiple invoices)
function parsePaymentCommand(message) {
    const text = message.trim();

    // Patterns to match:
    // "mark paid IV-2506-005"
    // "IV2511007 Iv2511031 Iv2512026 Mark paid on 21/12/2025"
    // "mark unpaid IV-2506-005"
    // "/payment paid IV-2506-005"
    // "IV-2506-005 paid"

    const lowerText = text.toLowerCase();

    // Extract ALL invoice numbers (starts with IV-)
    const invoiceMatches = text.matchAll(/IV-?\d{4}-?\d{3}/gi);
    const invoiceNumbers = Array.from(invoiceMatches, match => {
        // Normalize format: add dash if missing (IV2511007 -> IV-2511-007)
        let inv = match[0].toUpperCase().replace(/^IV-?/, 'IV-');
        if (!inv.includes('-', 3)) {
            // No dashes, add them: IV2511007 -> IV-2511-007
            inv = inv.replace(/^IV-?(\d{4})(\d{3})$/, 'IV-$1-$2');
        }
        return inv;
    });

    if (invoiceNumbers.length === 0) {
        return null; // No invoice numbers found
    }

    // Determine status
    let status = null;
    if (lowerText.includes('paid') && !lowerText.includes('unpaid')) {
        status = 'Paid';
    } else if (lowerText.includes('unpaid')) {
        status = 'Unpaid';
    }

    if (!status) {
        return null; // No valid status found
    }

    // Extract date if present (DD/MM/YYYY or DD/MM/YY format)
    const dateMatch = text.match(/\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/);
    const paymentDate = dateMatch ? dateMatch[1] : '';

    return {
        invoiceNumbers,  // Changed from invoiceNo to invoiceNumbers (array)
        status,
        paymentDate
    };
}

module.exports = {
    updatePaymentStatus,
    parsePaymentCommand
};

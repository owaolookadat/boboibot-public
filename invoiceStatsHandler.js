// Get invoice statistics from Google Sheets
async function getInvoiceStats(sheetsAPI, sheetId, sheetName = 'Invoice Detail Listing') {
    try {
        console.log('📊 Fetching invoice statistics...');

        // Get all data from the sheet
        const response = await sheetsAPI.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: `${sheetName}!A:N`, // All columns
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            return {
                success: false,
                message: 'No data found in sheet'
            };
        }

        // Skip header row and process data
        const dataRows = rows.slice(1);

        // Extract unique invoices with their payment status
        const invoiceMap = new Map();

        for (const row of dataRows) {
            const docNo = row[7] || ''; // Column H (Doc No)
            const paymentStatus = row[12] || 'Unpaid'; // Column M (Payment Status)
            const paymentDate = row[13] || ''; // Column N (Payment Date)
            const subTotal = parseFloat((row[6] || '0').toString().replace(/,/g, '')) || 0; // Column G (Sub Total)

            if (!docNo || !docNo.startsWith('IV-')) continue; // Skip invalid rows

            // If invoice already exists, add to its total
            if (invoiceMap.has(docNo)) {
                const existing = invoiceMap.get(docNo);
                existing.total += subTotal;
                existing.lineItems += 1;
            } else {
                invoiceMap.set(docNo, {
                    invoiceNo: docNo,
                    status: paymentStatus,
                    paymentDate: paymentDate,
                    total: subTotal,
                    lineItems: 1
                });
            }
        }

        // Calculate statistics
        const allInvoices = Array.from(invoiceMap.values());
        const totalInvoices = allInvoices.length;
        const paidInvoices = allInvoices.filter(inv => inv.status === 'Paid');
        const unpaidInvoices = allInvoices.filter(inv => inv.status === 'Unpaid');

        const totalPaidCount = paidInvoices.length;
        const totalUnpaidCount = unpaidInvoices.length;

        const totalPaidAmount = paidInvoices.reduce((sum, inv) => sum + inv.total, 0);
        const totalUnpaidAmount = unpaidInvoices.reduce((sum, inv) => sum + inv.total, 0);

        console.log(`✅ Stats calculated: ${totalInvoices} total, ${totalPaidCount} paid, ${totalUnpaidCount} unpaid`);

        return {
            success: true,
            totalInvoices,
            paidCount: totalPaidCount,
            unpaidCount: totalUnpaidCount,
            paidAmount: totalPaidAmount,
            unpaidAmount: totalUnpaidAmount,
            unpaidInvoices: unpaidInvoices.map(inv => ({
                invoiceNo: inv.invoiceNo,
                total: inv.total,
                lineItems: inv.lineItems
            }))
        };

    } catch (error) {
        console.error('Error getting invoice stats:', error);
        return {
            success: false,
            message: `Error getting invoice stats: ${error.message}`
        };
    }
}

module.exports = {
    getInvoiceStats
};

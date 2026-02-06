// Invoice details and customer invoice query functions
// Handles specific invoice lookups and customer invoice history

/**
 * Normalize invoice number to standard format
 * Handles variations like:
 * - "2501006" → "IV-2501-006"
 * - "IV2501006" → "IV-2501-006"
 * - "IV-2501-006" → "IV-2501-006" (already correct)
 */
function normalizeInvoiceNumber(invoiceNo) {
    if (!invoiceNo) return null;

    const cleaned = invoiceNo.toString().toUpperCase().trim();

    // Already in correct format
    if (/^IV-\d{4}-\d{3}$/.test(cleaned)) {
        return cleaned;
    }

    // Format: "2501006" (7 digits)
    if (/^\d{7}$/.test(cleaned)) {
        return `IV-${cleaned.substring(0, 4)}-${cleaned.substring(4)}`;
    }

    // Format: "IV2501006" (no dashes)
    if (/^IV\d{7}$/.test(cleaned)) {
        const digits = cleaned.substring(2);
        return `IV-${digits.substring(0, 4)}-${digits.substring(4)}`;
    }

    // Format: "IV-2501006" (one dash)
    if (/^IV-\d{7}$/.test(cleaned)) {
        const digits = cleaned.substring(3);
        return `IV-${digits.substring(0, 4)}-${digits.substring(4)}`;
    }

    // Format: "2501-006" (missing IV)
    if (/^\d{4}-\d{3}$/.test(cleaned)) {
        return `IV-${cleaned}`;
    }

    // Return as-is if can't normalize
    return cleaned;
}

/**
 * Get details for a specific invoice
 * Returns all line items, customer info, totals, payment status
 */
function getInvoiceDetails(invoiceData, invoiceNo) {
    if (!invoiceData || invoiceData.length <= 1) {
        return null;
    }

    // Normalize invoice number
    const normalizedInvoiceNo = normalizeInvoiceNumber(invoiceNo);
    if (!normalizedInvoiceNo) {
        return null;
    }

    const headers = invoiceData[0];
    const docNoIndex = headers.findIndex(h => h && h.toLowerCase().includes('doc') && h.toLowerCase().includes('no'));
    const customerNameIndex = headers.findIndex(h => h && h.toLowerCase().includes('customer'));
    const customerCodeIndex = headers.findIndex(h => h && h.toLowerCase().includes('code'));
    const dateIndex = headers.findIndex(h => h && h.toLowerCase().includes('date'));
    const itemDescIndex = headers.findIndex(h => h && h.toLowerCase().includes('description'));
    const qtyIndex = headers.findIndex(h => h && h.toLowerCase().includes('qty'));
    const unitPriceIndex = headers.findIndex(h => h && (h.toLowerCase().includes('unit price') || h.toLowerCase() === 'price'));
    const subTotalIndex = headers.findIndex(h => h && h.toLowerCase().includes('sub total'));
    const statusIndex = headers.findIndex(h => h && h.toLowerCase() === 'status');
    const paymentDateIndex = headers.findIndex(h => h && h.toLowerCase().includes('payment date'));

    // Find all rows for this invoice
    const invoiceRows = [];
    for (let i = 1; i < invoiceData.length; i++) {
        const row = invoiceData[i];
        const docNo = row[docNoIndex] || '';

        if (docNo.toUpperCase() === normalizedInvoiceNo) {
            invoiceRows.push({
                itemDescription: row[itemDescIndex] || '',
                qty: parseFloat(row[qtyIndex]) || 0,
                unitPrice: parseFloat(row[unitPriceIndex]) || 0,
                subTotal: parseFloat(row[subTotalIndex]) || 0,
                // Keep other fields from first row
                customerName: row[customerNameIndex] || '',
                customerCode: row[customerCodeIndex] || '',
                date: row[dateIndex] || '',
                status: row[statusIndex] || '',
                paymentDate: row[paymentDateIndex] || ''
            });
        }
    }

    if (invoiceRows.length === 0) {
        return null;
    }

    // Calculate total from all line items
    const total = invoiceRows.reduce((sum, item) => sum + item.subTotal, 0);

    return {
        invoiceNo: normalizedInvoiceNo,
        customerName: invoiceRows[0].customerName,
        customerCode: invoiceRows[0].customerCode,
        date: invoiceRows[0].date,
        status: invoiceRows[0].status,
        paymentDate: invoiceRows[0].paymentDate,
        lineItems: invoiceRows.map(row => ({
            description: row.itemDescription,
            qty: row.qty,
            unitPrice: row.unitPrice,
            subTotal: row.subTotal
        })),
        total: total,
        itemCount: invoiceRows.length
    };
}

/**
 * Format invoice details for WhatsApp message
 */
function formatInvoiceDetails(details, language = 'zh') {
    if (!details) {
        return language === 'zh' ?
            '找不到该发票' :
            'Invoice not found';
    }

    const isPaid = details.status && details.status.toLowerCase() === 'paid';

    let message = language === 'zh' ?
        `📋 *发票详情*\n\n` :
        `📋 *Invoice Details*\n\n`;

    message += `*${details.invoiceNo}*\n`;
    message += language === 'zh' ?
        `客户: ${details.customerName}\n` :
        `Customer: ${details.customerName}\n`;
    message += language === 'zh' ?
        `日期: ${details.date}\n` :
        `Date: ${details.date}\n`;
    message += language === 'zh' ?
        `状态: ${isPaid ? '✅ 已付款' : '⚠️ 未付款'}\n` :
        `Status: ${isPaid ? '✅ Paid' : '⚠️ Unpaid'}\n`;

    if (isPaid && details.paymentDate) {
        message += language === 'zh' ?
            `付款日期: ${details.paymentDate}\n` :
            `Payment Date: ${details.paymentDate}\n`;
    }

    message += '\n';
    message += language === 'zh' ?
        `*项目 (${details.itemCount}):*\n\n` :
        `*Items (${details.itemCount}):*\n\n`;

    // List all line items
    for (const item of details.lineItems) {
        message += `• ${item.description}\n`;
        message += `  ${item.qty} × RM${item.unitPrice.toFixed(2)} = RM${item.subTotal.toFixed(2)}\n\n`;
    }

    message += language === 'zh' ?
        `*总计: RM${details.total.toFixed(2)}*` :
        `*Total: RM${details.total.toFixed(2)}*`;

    return message;
}

/**
 * Get customer's invoice history
 * Returns list of invoices for a specific customer
 */
function getCustomerInvoices(invoiceData, customerName, filters = {}) {
    if (!invoiceData || invoiceData.length <= 1) {
        return null;
    }

    const headers = invoiceData[0];
    const customerNameIndex = headers.findIndex(h => h && h.toLowerCase().includes('customer'));
    const docNoIndex = headers.findIndex(h => h && h.toLowerCase().includes('doc') && h.toLowerCase().includes('no'));
    const dateIndex = headers.findIndex(h => h && h.toLowerCase().includes('date'));
    const subTotalIndex = headers.findIndex(h => h && h.toLowerCase().includes('sub total'));
    const statusIndex = headers.findIndex(h => h && h.toLowerCase() === 'status');

    // Group invoices by invoice number
    const invoiceMap = new Map();

    for (let i = 1; i < invoiceData.length; i++) {
        const row = invoiceData[i];
        const rowCustomer = (row[customerNameIndex] || '').toLowerCase();
        const docNo = row[docNoIndex] || '';
        const status = (row[statusIndex] || '').toLowerCase();
        const date = row[dateIndex] || '';
        const subTotal = parseFloat(row[subTotalIndex]) || 0;

        // Skip if not matching customer
        if (!customerName || !rowCustomer.includes(customerName.toLowerCase())) {
            continue;
        }

        // Apply filters
        if (filters.unpaidOnly && status !== 'unpaid') continue;
        if (filters.paidOnly && status !== 'paid') continue;

        // Group by invoice number
        if (!invoiceMap.has(docNo)) {
            invoiceMap.set(docNo, {
                invoiceNo: docNo,
                date: date,
                status: status,
                total: 0,
                itemCount: 0
            });
        }

        const invoice = invoiceMap.get(docNo);
        invoice.total += subTotal;
        invoice.itemCount += 1;
    }

    // Convert to array and sort by date (newest first)
    let invoices = Array.from(invoiceMap.values());

    // Sort by date descending
    invoices.sort((a, b) => {
        const dateA = new Date(a.date.split('/').reverse().join('-'));
        const dateB = new Date(b.date.split('/').reverse().join('-'));
        return dateB - dateA;
    });

    // Apply limit
    if (filters.limit) {
        invoices = invoices.slice(0, filters.limit);
    }

    return {
        customerName: customerName,
        invoices: invoices,
        totalInvoices: invoices.length,
        totalAmount: invoices.reduce((sum, inv) => sum + inv.total, 0),
        unpaidCount: invoices.filter(inv => inv.status === 'unpaid').length,
        paidCount: invoices.filter(inv => inv.status === 'paid').length
    };
}

/**
 * Format customer invoices for WhatsApp message
 */
function formatCustomerInvoices(result, language = 'zh') {
    if (!result || result.invoices.length === 0) {
        return language === 'zh' ?
            '找不到该客户的发票记录' :
            'No invoices found for this customer';
    }

    let message = language === 'zh' ?
        `📊 *${result.customerName}*\n\n` :
        `📊 *${result.customerName}*\n\n`;

    message += language === 'zh' ?
        `总发票: ${result.totalInvoices}\n` :
        `Total Invoices: ${result.totalInvoices}\n`;
    message += language === 'zh' ?
        `已付: ${result.paidCount} | 未付: ${result.unpaidCount}\n` :
        `Paid: ${result.paidCount} | Unpaid: ${result.unpaidCount}\n`;
    message += language === 'zh' ?
        `总金额: RM${result.totalAmount.toFixed(2)}\n\n` :
        `Total Amount: RM${result.totalAmount.toFixed(2)}\n\n`;

    // List invoices (up to 10)
    const invoicesToShow = result.invoices.slice(0, 10);

    for (const invoice of invoicesToShow) {
        const statusIcon = invoice.status === 'paid' ? '✅' : '⚠️';
        message += `${statusIcon} ${invoice.invoiceNo} (${invoice.date})\n`;
        message += `   RM${invoice.total.toFixed(2)} • ${invoice.itemCount} ${language === 'zh' ? '项' : 'items'}\n\n`;
    }

    if (result.invoices.length > 10) {
        message += language === 'zh' ?
            `...还有 ${result.invoices.length - 10} 张发票` :
            `...and ${result.invoices.length - 10} more invoices`;
    }

    return message;
}

module.exports = {
    normalizeInvoiceNumber,
    getInvoiceDetails,
    formatInvoiceDetails,
    getCustomerInvoices,
    formatCustomerInvoices
};

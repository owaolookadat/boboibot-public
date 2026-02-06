// Direct code-based payment checking - NO AI hallucination
// Reads data directly from filtered invoice data

/**
 * Check payment status for a customer
 * Returns accurate payment information without AI interpretation
 */
function checkPaymentStatus(invoiceData, customerName) {
    if (!invoiceData || invoiceData.length <= 1) {
        return null;
    }

    const headers = invoiceData[0];
    const customerNameIndex = headers.findIndex(h => h && h.toLowerCase().includes('customer'));
    const docNoIndex = headers.findIndex(h => h && h.toLowerCase().includes('doc') && h.toLowerCase().includes('no'));
    const statusIndex = headers.findIndex(h => h && h.toLowerCase() === 'status');
    const amountIndex = headers.findIndex(h => h && h.toLowerCase().includes('total'));
    const dateIndex = headers.findIndex(h => h && h.toLowerCase().includes('date'));

    if (statusIndex === -1 || docNoIndex === -1) {
        return null;
    }

    // Track unique invoices by invoice number
    const unpaidInvoices = new Map();
    const paidInvoices = new Map();

    for (let i = 1; i < invoiceData.length; i++) {
        const row = invoiceData[i];
        const rowCustomer = (row[customerNameIndex] || '').toLowerCase();
        const docNo = row[docNoIndex] || '';
        const status = (row[statusIndex] || '').toLowerCase().trim();
        const amount = parseFloat(row[amountIndex]) || 0;
        const date = row[dateIndex] || '';

        // Skip if not matching customer
        if (!customerName || !rowCustomer.includes(customerName.toLowerCase())) {
            continue;
        }

        // Group by invoice number
        if (status === 'unpaid') {
            if (!unpaidInvoices.has(docNo)) {
                unpaidInvoices.set(docNo, {
                    invoiceNo: docNo,
                    amount: amount,
                    date: date,
                    items: []
                });
            }
            // Track line items
            const itemDesc = row[headers.findIndex(h => h && h.toLowerCase().includes('description'))] || '';
            if (itemDesc) {
                unpaidInvoices.get(docNo).items.push(itemDesc);
            }
        } else if (status === 'paid') {
            if (!paidInvoices.has(docNo)) {
                paidInvoices.set(docNo, {
                    invoiceNo: docNo,
                    amount: amount,
                    date: date
                });
            }
        }
    }

    const unpaidArray = Array.from(unpaidInvoices.values());
    const totalUnpaid = unpaidArray.reduce((sum, inv) => sum + inv.amount, 0);

    return {
        hasUnpaid: unpaidArray.length > 0,
        unpaidInvoices: unpaidArray,
        totalUnpaid: totalUnpaid,
        paidCount: paidInvoices.size,
        totalInvoices: unpaidInvoices.size + paidInvoices.size
    };
}

/**
 * Format payment status for WhatsApp message
 * Returns formatted text in Chinese or English
 */
function formatPaymentStatus(paymentStatus, customerName, language = 'zh') {
    if (!paymentStatus) {
        return language === 'zh' ?
            '找不到该客户的发票记录' :
            'No invoice records found for this customer';
    }

    if (!paymentStatus.hasUnpaid) {
        return language === 'zh' ?
            `✅ ${customerName} 没有欠款\n\n所有 ${paymentStatus.totalInvoices} 张发票已付清` :
            `✅ ${customerName} has no outstanding\n\nAll ${paymentStatus.totalInvoices} invoices paid`;
    }

    // Format unpaid invoices
    let message = language === 'zh' ?
        `⚠️ ${customerName} 有欠款\n\n` :
        `⚠️ ${customerName} has outstanding\n\n`;

    message += language === 'zh' ?
        `*未付款发票 (${paymentStatus.unpaidInvoices.length}):*\n\n` :
        `*Unpaid Invoices (${paymentStatus.unpaidInvoices.length}):*\n\n`;

    // List each unpaid invoice
    for (const invoice of paymentStatus.unpaidInvoices) {
        message += `• ${invoice.invoiceNo} (${invoice.date})\n`;
        message += `  RM ${invoice.amount.toFixed(2)}\n`;

        // Show first 2 items
        if (invoice.items && invoice.items.length > 0) {
            const itemsToShow = invoice.items.slice(0, 2);
            message += `  ${itemsToShow.join(', ')}${invoice.items.length > 2 ? '...' : ''}\n`;
        }
        message += '\n';
    }

    message += language === 'zh' ?
        `*总欠款: RM ${paymentStatus.totalUnpaid.toFixed(2)}*\n\n` :
        `*Total Outstanding: RM ${paymentStatus.totalUnpaid.toFixed(2)}*\n\n`;

    message += language === 'zh' ?
        `已付清: ${paymentStatus.paidCount} 张发票` :
        `Paid: ${paymentStatus.paidCount} invoices`;

    return message;
}

/**
 * Detect if question is asking about payment status
 */
function isPaymentQuery(question) {
    const lowerQuestion = question.toLowerCase();

    // Chinese patterns
    const chinesePatterns = [
        '欠钱', '欠款', '未付', '还没付', '没付',
        '还欠', 'outstanding', '待付', '应付'
    ];

    // English patterns
    const englishPatterns = [
        'owe', 'owing', 'unpaid', 'outstanding',
        'not paid', 'pending payment', 'due'
    ];

    const allPatterns = [...chinesePatterns, ...englishPatterns];

    return allPatterns.some(pattern => lowerQuestion.includes(pattern));
}

/**
 * Detect language from question
 */
function detectLanguage(question) {
    // Check if contains Chinese characters
    const hasChinese = /[\u4e00-\u9fa5]/.test(question);
    return hasChinese ? 'zh' : 'en';
}

module.exports = {
    checkPaymentStatus,
    formatPaymentStatus,
    isPaymentQuery,
    detectLanguage
};

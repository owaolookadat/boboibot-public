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
    const customerNameIndex = headers.findIndex(h => h && h.toLowerCase().includes('debtor') && !h.toLowerCase().includes('code'));
    const docNoIndex = headers.findIndex(h => h && h.toLowerCase().includes('doc') && h.toLowerCase().includes('no'));
    const statusIndex = headers.findIndex(h => h && h.toLowerCase().includes('payment') && h.toLowerCase().includes('status'));
    const amountIndex = headers.findIndex(h => h && h.toLowerCase().includes('sub') && h.toLowerCase().includes('total'));
    const dateIndex = headers.findIndex(h => h && h.toLowerCase().includes('date') && !h.toLowerCase().includes('payment'));

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
        // Remove commas from amount before parsing (e.g., "7,634.60" -> "7634.60")
        const amountStr = (row[amountIndex] || '').toString().replace(/,/g, '');
        const amount = parseFloat(amountStr) || 0;
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
                    amount: 0,
                    date: date,
                    items: []
                });
            }
            // Accumulate amounts for all line items
            unpaidInvoices.get(docNo).amount += amount;

            // Track line items
            const itemDesc = row[headers.findIndex(h => h && h.toLowerCase().includes('description'))] || '';
            if (itemDesc) {
                unpaidInvoices.get(docNo).items.push(itemDesc);
            }
        } else if (status === 'paid') {
            if (!paidInvoices.has(docNo)) {
                paidInvoices.set(docNo, {
                    invoiceNo: docNo,
                    amount: 0,
                    date: date
                });
            }
            // Accumulate amounts for all line items
            paidInvoices.get(docNo).amount += amount;
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

    // Format unpaid invoices in DM-style format
    const intro = language === 'zh' ?
        `看看 ${customerName} 的未付款发票，我找到了这些欠款：\n\n*${customerName} - 未付款发票：*\n\n` :
        `Looking at the unpaid invoices for ${customerName}, I found these outstanding amounts:\n\n*${customerName} - Unpaid Invoices:*\n\n`;

    let message = intro;

    // List each unpaid invoice with detailed formatting
    for (let i = 0; i < paymentStatus.unpaidInvoices.length; i++) {
        const invoice = paymentStatus.unpaidInvoices[i];
        const num = i + 1;

        message += `${num}. *${invoice.invoiceNo}* (${invoice.date}) - *RM ${invoice.amount.toLocaleString('en-MY', {minimumFractionDigits: 2, maximumFractionDigits: 2})}*\n`;

        // Show all items (not just first 2)
        if (invoice.items && invoice.items.length > 0) {
            for (const item of invoice.items) {
                message += `   - ${item}\n`;
            }
        }
        message += '\n';
    }

    // Total with formatting
    message += `*${language === 'zh' ? '总欠款' : 'Total Outstanding'}: RM ${paymentStatus.totalUnpaid.toLocaleString('en-MY', {minimumFractionDigits: 2, maximumFractionDigits: 2})}*\n\n`;

    // Footer
    const footer = language === 'zh' ?
        `所有发票都来自最近的订单。需要我标记任何发票为已付款吗？` :
        `All invoices are from recent orders. Would you like me to mark any of these as paid or need more details?`;

    message += footer;

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

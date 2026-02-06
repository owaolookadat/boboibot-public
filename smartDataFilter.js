// Smart data filtering to reduce token usage and improve accuracy
// Detects customer names in questions and pre-filters data

/**
 * Extract customer names/keywords from question
 * Handles English and Chinese customer names
 */
function extractCustomerKeywords(question) {
    const keywords = [];
    const lowerQuestion = question.toLowerCase();

    // Common customer name patterns
    const customerPatterns = [
        /\b([A-Z][A-Za-z\s&]+(?:SDN BHD|BHD|SDN|RESTAURANT|CUISINE|HOTEL|TRADING|ENTERPRISE|PRODUCTS|SEAFOOD|FOOD|MART|STORE|SHOP))\b/gi,
        /\b([A-Z][A-Za-z\s&]{3,})\b/g, // Capitalized words (likely names)
    ];

    // Extract from patterns
    for (const pattern of customerPatterns) {
        const matches = question.match(pattern);
        if (matches) {
            keywords.push(...matches);
        }
    }

    // Also include any word that looks like a customer code or short name
    const words = question.split(/\s+/);
    for (const word of words) {
        // Check for customer codes like "300-C014", "300-T025"
        if (/^\d{3}-[A-Z]\d{3}$/i.test(word)) {
            keywords.push(word);
        }
        // Check for short names (4+ chars, starts with capital)
        if (/^[A-Z][a-z]{3,}$/i.test(word)) {
            keywords.push(word);
        }
    }

    return [...new Set(keywords)]; // Remove duplicates
}

/**
 * Filter invoice data by customer keywords
 * Returns only rows matching the customer
 */
function filterByCustomer(invoiceData, customerKeywords) {
    if (!invoiceData || invoiceData.length === 0) return invoiceData;
    if (!customerKeywords || customerKeywords.length === 0) return invoiceData;

    const headers = invoiceData[0];
    const customerNameIndex = headers.findIndex(h =>
        h && (h.toLowerCase().includes('customer') || h.toLowerCase() === 'name')
    );
    const customerCodeIndex = headers.findIndex(h =>
        h && h.toLowerCase().includes('code')
    );

    if (customerNameIndex === -1 && customerCodeIndex === -1) {
        return invoiceData; // Can't filter without customer column
    }

    // Filter rows
    const filteredRows = [headers]; // Keep headers

    for (let i = 1; i < invoiceData.length; i++) {
        const row = invoiceData[i];
        const customerName = row[customerNameIndex] || '';
        const customerCode = row[customerCodeIndex] || '';

        // Check if any keyword matches
        const matches = customerKeywords.some(keyword => {
            const keywordLower = keyword.toLowerCase();
            return customerName.toLowerCase().includes(keywordLower) ||
                   customerCode.toLowerCase().includes(keywordLower);
        });

        if (matches) {
            filteredRows.push(row);
        }
    }

    return filteredRows;
}

/**
 * Calculate payment summary from filtered invoice data
 * Returns structured data about unpaid invoices
 */
function calculatePaymentSummary(invoiceData) {
    if (!invoiceData || invoiceData.length <= 1) {
        return { totalUnpaid: 0, unpaidInvoices: [], paidInvoices: 0, totalRows: 0 };
    }

    const headers = invoiceData[0];
    const statusIndex = headers.findIndex(h => h && h.toLowerCase() === 'status');
    const docNoIndex = headers.findIndex(h => h && (h.toLowerCase().includes('doc') && h.toLowerCase().includes('no')));
    const amountIndex = headers.findIndex(h => h && h.toLowerCase().includes('total'));

    if (statusIndex === -1) {
        return { totalUnpaid: 0, unpaidInvoices: [], paidInvoices: 0, totalRows: invoiceData.length - 1 };
    }

    const unpaidInvoiceMap = new Map(); // Use map to deduplicate by invoice number
    let paidInvoiceCount = new Set();

    for (let i = 1; i < invoiceData.length; i++) {
        const row = invoiceData[i];
        const status = (row[statusIndex] || '').toLowerCase();
        const docNo = row[docNoIndex] || `Row${i}`;
        const amount = parseFloat(row[amountIndex]) || 0;

        if (status === 'unpaid') {
            // Track by unique invoice number
            if (!unpaidInvoiceMap.has(docNo)) {
                unpaidInvoiceMap.set(docNo, {
                    invoiceNo: docNo,
                    amount: amount,
                    status: 'Unpaid'
                });
            }
        } else if (status === 'paid') {
            paidInvoiceCount.add(docNo);
        }
    }

    const unpaidInvoices = Array.from(unpaidInvoiceMap.values());
    const totalUnpaid = unpaidInvoices.reduce((sum, inv) => sum + inv.amount, 0);

    return {
        totalUnpaid,
        unpaidInvoices,
        paidInvoices: paidInvoiceCount.size,
        totalRows: invoiceData.length - 1
    };
}

/**
 * Smart filter: applies customer filtering and calculates summaries
 * Returns filtered data + metadata for AI context
 */
function smartFilter(businessData, question, customerContext = null) {
    // Extract customer keywords from question
    let customerKeywords = extractCustomerKeywords(question);

    // Add customer context from group if available
    if (customerContext && customerContext.customerName) {
        customerKeywords.push(customerContext.customerName);
    }
    if (customerContext && customerContext.customerCode) {
        customerKeywords.push(customerContext.customerCode);
    }

    const filteredData = {};
    const metadata = {};

    // Filter each sheet
    for (const [sheetName, data] of Object.entries(businessData)) {
        if (sheetName.toLowerCase().includes('invoice') && customerKeywords.length > 0) {
            // Filter invoice data by customer
            const filtered = filterByCustomer(data, customerKeywords);
            filteredData[sheetName] = filtered;

            // Calculate payment summary if this is invoice data
            if (filtered.length > 1) {
                metadata[sheetName] = {
                    originalRows: data.length - 1,
                    filteredRows: filtered.length - 1,
                    customerKeywords: customerKeywords,
                    paymentSummary: calculatePaymentSummary(filtered)
                };
            }
        } else {
            // Keep non-invoice sheets or when no customer detected
            filteredData[sheetName] = data;
        }
    }

    return { filteredData, metadata, customerKeywords };
}

module.exports = {
    extractCustomerKeywords,
    filterByCustomer,
    calculatePaymentSummary,
    smartFilter
};

// Advanced Query Functions - Phase 2
// Handles date ranges, product queries, customer analytics, and overdue tracking

/**
 * SECTION 1: GENERAL UNPAID INVOICES
 * Get all unpaid invoices across all customers
 */

function getAllUnpaidInvoices(invoiceData) {
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

    // Group by customer, then by invoice
    const customerUnpaid = new Map(); // customerName -> Map of invoices

    for (let i = 1; i < invoiceData.length; i++) {
        const row = invoiceData[i];
        const status = (row[statusIndex] || '').toLowerCase();
        const invoiceNo = row[docNoIndex] || '';
        const customer = row[customerNameIndex] || 'Unknown';

        if (status === 'unpaid' && invoiceNo) {
            if (!customerUnpaid.has(customer)) {
                customerUnpaid.set(customer, new Map());
            }

            const customerInvoices = customerUnpaid.get(customer);

            if (!customerInvoices.has(invoiceNo)) {
                const amountStr = (row[amountIndex] || '0').toString().replace(/,/g, '');
                const amount = parseFloat(amountStr) || 0;

                customerInvoices.set(invoiceNo, {
                    invoiceNo: invoiceNo,
                    date: row[dateIndex] || '',
                    amount: amount
                });
            } else {
                // Accumulate amounts for same invoice
                const invoice = customerInvoices.get(invoiceNo);
                const amountStr = (row[amountIndex] || '0').toString().replace(/,/g, '');
                invoice.amount += parseFloat(amountStr) || 0;
            }
        }
    }

    if (customerUnpaid.size === 0) {
        return {
            hasUnpaid: false,
            totalCustomers: 0,
            totalInvoices: 0,
            totalAmount: 0,
            customers: []
        };
    }

    // Build result
    const customers = [];
    let totalAmount = 0;
    let totalInvoices = 0;

    for (const [customerName, invoices] of customerUnpaid.entries()) {
        const invoiceList = Array.from(invoices.values());
        const customerTotal = invoiceList.reduce((sum, inv) => sum + inv.amount, 0);

        customers.push({
            name: customerName,
            invoices: invoiceList,
            total: customerTotal,
            count: invoiceList.length
        });

        totalAmount += customerTotal;
        totalInvoices += invoiceList.length;
    }

    // Sort by total amount (highest first)
    customers.sort((a, b) => b.total - a.total);

    return {
        hasUnpaid: true,
        totalCustomers: customers.length,
        totalInvoices: totalInvoices,
        totalAmount: totalAmount,
        customers: customers
    };
}

/**
 * SECTION 2: DATE RANGE QUERIES
 * Query invoices by date range
 */

function parseDate(dateStr) {
    if (!dateStr) return null;

    // Try DD/MM/YYYY format
    const parts = dateStr.toString().split('/');
    if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // JS months are 0-indexed
        const year = parseInt(parts[2]);
        return new Date(year, month, day);
    }

    // Try other formats
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
}

function getInvoicesByDateRange(invoiceData, startDate, endDate) {
    if (!invoiceData || invoiceData.length <= 1) {
        return null;
    }

    const headers = invoiceData[0];
    const dateIndex = headers.findIndex(h => h && h.toLowerCase().includes('date') && !h.toLowerCase().includes('payment'));
    const docNoIndex = headers.findIndex(h => h && h.toLowerCase().includes('doc') && h.toLowerCase().includes('no'));
    const customerIndex = headers.findIndex(h => h && h.toLowerCase().includes('debtor') && !h.toLowerCase().includes('code'));
    const amountIndex = headers.findIndex(h => h && h.toLowerCase().includes('sub') && h.toLowerCase().includes('total'));
    const statusIndex = headers.findIndex(h => h && h.toLowerCase().includes('payment') && h.toLowerCase().includes('status'));

    if (dateIndex === -1 || docNoIndex === -1) {
        return null;
    }

    const start = parseDate(startDate);
    const end = parseDate(endDate);

    if (!start || !end) {
        return null;
    }

    const invoices = new Map();

    for (let i = 1; i < invoiceData.length; i++) {
        const row = invoiceData[i];
        const invoiceDate = parseDate(row[dateIndex]);

        if (invoiceDate && invoiceDate >= start && invoiceDate <= end) {
            const invoiceNo = row[docNoIndex] || '';

            if (!invoices.has(invoiceNo)) {
                const amountStr = (row[amountIndex] || '0').toString().replace(/,/g, '');

                invoices.set(invoiceNo, {
                    invoiceNo: invoiceNo,
                    date: row[dateIndex],
                    customer: row[customerIndex] || 'Unknown',
                    amount: parseFloat(amountStr) || 0,
                    status: row[statusIndex] || 'Unknown'
                });
            } else {
                // Accumulate amount for same invoice
                const invoice = invoices.get(invoiceNo);
                const amountStr = (row[amountIndex] || '0').toString().replace(/,/g, '');
                invoice.amount += parseFloat(amountStr) || 0;
            }
        }
    }

    const invoiceList = Array.from(invoices.values());
    const totalAmount = invoiceList.reduce((sum, inv) => sum + inv.amount, 0);
    const paidCount = invoiceList.filter(inv => inv.status.toLowerCase() === 'paid').length;
    const unpaidCount = invoiceList.filter(inv => inv.status.toLowerCase() === 'unpaid').length;

    return {
        startDate: startDate,
        endDate: endDate,
        totalInvoices: invoiceList.length,
        totalAmount: totalAmount,
        paidCount: paidCount,
        unpaidCount: unpaidCount,
        invoices: invoiceList.sort((a, b) => parseDate(b.date) - parseDate(a.date))
    };
}

function getRecentInvoices(invoiceData, days = 7) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Format dates as DD/MM/YYYY
    const formatDate = (date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    return getInvoicesByDateRange(invoiceData, formatDate(startDate), formatDate(endDate));
}

function getCurrentMonthInvoices(invoiceData) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0); // Last day of month

    const formatDate = (date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const y = date.getFullYear();
        return `${day}/${m}/${y}`;
    };

    return getInvoicesByDateRange(invoiceData, formatDate(startDate), formatDate(endDate));
}

/**
 * SECTION 3: PRODUCT/ITEM QUERIES
 * Search invoices by product/item name
 */

function searchInvoicesByProduct(invoiceData, productName) {
    if (!invoiceData || invoiceData.length <= 1 || !productName) {
        console.log('❌ Product search: Invalid input or no product name');
        return null;
    }

    const headers = invoiceData[0];
    console.log('📋 Available columns:', headers.slice(0, 10).join(', '));

    const productIndex = headers.findIndex(h => h && (
        h.toLowerCase().includes('description') ||
        (h.toLowerCase().includes('item') && !h.toLowerCase().includes('code')) ||
        h.toLowerCase().includes('product')
    ));
    const docNoIndex = headers.findIndex(h => h && h.toLowerCase().includes('doc') && h.toLowerCase().includes('no'));
    const customerIndex = headers.findIndex(h => h && h.toLowerCase().includes('debtor') && !h.toLowerCase().includes('code'));
    const qtyIndex = headers.findIndex(h => h && (h.toLowerCase().includes('qty') || h.toLowerCase().includes('quantity')));
    const amountIndex = headers.findIndex(h => h && h.toLowerCase().includes('sub') && h.toLowerCase().includes('total'));
    const dateIndex = headers.findIndex(h => h && h.toLowerCase().includes('date') && !h.toLowerCase().includes('payment'));

    console.log(`🔍 Column indices - Product: ${productIndex}, Doc: ${docNoIndex}, Customer: ${customerIndex}`);

    if (productIndex === -1 || docNoIndex === -1) {
        console.log('❌ Product search: Required columns not found');
        return null;
    }

    const searchTerm = productName.toLowerCase();
    const matchingInvoices = [];
    const totalByProduct = {};

    for (let i = 1; i < invoiceData.length; i++) {
        const row = invoiceData[i];
        const product = (row[productIndex] || '').toLowerCase();

        if (product.includes(searchTerm)) {
            const amountStr = (row[amountIndex] || '0').toString().replace(/,/g, '');
            const amount = parseFloat(amountStr) || 0;
            const qty = parseFloat(row[qtyIndex]) || 0;
            const productName = row[productIndex] || 'Unknown';

            matchingInvoices.push({
                invoiceNo: row[docNoIndex],
                customer: row[customerIndex] || 'Unknown',
                product: productName,
                quantity: qty,
                amount: amount,
                date: row[dateIndex] || ''
            });

            // Accumulate totals by product
            if (!totalByProduct[productName]) {
                totalByProduct[productName] = { qty: 0, amount: 0 };
            }
            totalByProduct[productName].qty += qty;
            totalByProduct[productName].amount += amount;
        }
    }

    if (matchingInvoices.length === 0) {
        return null;
    }

    const totalAmount = matchingInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const totalQty = matchingInvoices.reduce((sum, inv) => sum + inv.quantity, 0);

    return {
        searchTerm: productName,
        totalInvoices: matchingInvoices.length,
        totalQuantity: totalQty,
        totalAmount: totalAmount,
        productBreakdown: totalByProduct,
        invoices: matchingInvoices.sort((a, b) => parseDate(b.date) - parseDate(a.date))
    };
}

/**
 * SECTION 4: CUSTOMER ANALYTICS
 * Top customers, rankings, inactive customers
 */

function getTopCustomers(invoiceData, limit = 10, sortBy = 'revenue') {
    if (!invoiceData || invoiceData.length <= 1) {
        return null;
    }

    const headers = invoiceData[0];
    const customerIndex = headers.findIndex(h => h && h.toLowerCase().includes('debtor') && !h.toLowerCase().includes('code'));
    const amountIndex = headers.findIndex(h => h && h.toLowerCase().includes('sub') && h.toLowerCase().includes('total'));
    const docNoIndex = headers.findIndex(h => h && h.toLowerCase().includes('doc') && h.toLowerCase().includes('no'));
    const dateIndex = headers.findIndex(h => h && h.toLowerCase().includes('date') && !h.toLowerCase().includes('payment'));
    const statusIndex = headers.findIndex(h => h && h.toLowerCase().includes('payment') && h.toLowerCase().includes('status'));

    if (customerIndex === -1 || amountIndex === -1) {
        return null;
    }

    const customerStats = new Map();

    for (let i = 1; i < invoiceData.length; i++) {
        const row = invoiceData[i];
        const customer = row[customerIndex] || 'Unknown';
        const amountStr = (row[amountIndex] || '0').toString().replace(/,/g, '');
        const amount = parseFloat(amountStr) || 0;
        const invoiceNo = row[docNoIndex];
        const status = (row[statusIndex] || '').toLowerCase();
        const date = parseDate(row[dateIndex]);

        if (!customerStats.has(customer)) {
            customerStats.set(customer, {
                name: customer,
                totalRevenue: 0,
                invoiceCount: new Set(),
                paidAmount: 0,
                unpaidAmount: 0,
                lastOrderDate: date
            });
        }

        const stats = customerStats.get(customer);
        stats.totalRevenue += amount;
        stats.invoiceCount.add(invoiceNo);

        if (status === 'paid') {
            stats.paidAmount += amount;
        } else if (status === 'unpaid') {
            stats.unpaidAmount += amount;
        }

        if (date && (!stats.lastOrderDate || date > stats.lastOrderDate)) {
            stats.lastOrderDate = date;
        }
    }

    // Convert to array and calculate final stats
    const customers = Array.from(customerStats.values()).map(c => ({
        name: c.name,
        totalRevenue: c.totalRevenue,
        invoiceCount: c.invoiceCount.size,
        paidAmount: c.paidAmount,
        unpaidAmount: c.unpaidAmount,
        lastOrderDate: c.lastOrderDate
    }));

    // Sort based on criteria
    if (sortBy === 'revenue') {
        customers.sort((a, b) => b.totalRevenue - a.totalRevenue);
    } else if (sortBy === 'invoices') {
        customers.sort((a, b) => b.invoiceCount - a.invoiceCount);
    }

    return {
        topCustomers: customers.slice(0, limit),
        totalCustomers: customers.length
    };
}

function getInactiveCustomers(invoiceData, days = 60) {
    if (!invoiceData || invoiceData.length <= 1) {
        return null;
    }

    const headers = invoiceData[0];
    const customerIndex = headers.findIndex(h => h && h.toLowerCase().includes('debtor') && !h.toLowerCase().includes('code'));
    const dateIndex = headers.findIndex(h => h && h.toLowerCase().includes('date') && !h.toLowerCase().includes('payment'));
    const amountIndex = headers.findIndex(h => h && h.toLowerCase().includes('sub') && h.toLowerCase().includes('total'));

    if (customerIndex === -1 || dateIndex === -1) {
        return null;
    }

    const customerLastOrder = new Map();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    for (let i = 1; i < invoiceData.length; i++) {
        const row = invoiceData[i];
        const customer = row[customerIndex] || 'Unknown';
        const date = parseDate(row[dateIndex]);

        if (date) {
            if (!customerLastOrder.has(customer) || date > customerLastOrder.get(customer).date) {
                const amountStr = (row[amountIndex] || '0').toString().replace(/,/g, '');
                customerLastOrder.set(customer, {
                    name: customer,
                    date: date,
                    lastAmount: parseFloat(amountStr) || 0
                });
            }
        }
    }

    const inactiveCustomers = [];

    for (const [customer, data] of customerLastOrder.entries()) {
        if (data.date < cutoffDate) {
            const daysSince = Math.floor((new Date() - data.date) / (1000 * 60 * 60 * 24));
            inactiveCustomers.push({
                name: data.name,
                lastOrderDate: data.date,
                daysSinceLastOrder: daysSince,
                lastAmount: data.lastAmount
            });
        }
    }

    inactiveCustomers.sort((a, b) => b.daysSinceLastOrder - a.daysSinceLastOrder);

    return {
        inactiveCount: inactiveCustomers.length,
        cutoffDays: days,
        customers: inactiveCustomers
    };
}

/**
 * SECTION 5: OVERDUE TRACKING
 * Track overdue invoices and payment aging
 */

function getOverdueInvoices(invoiceData, days = 30) {
    if (!invoiceData || invoiceData.length <= 1) {
        return null;
    }

    const headers = invoiceData[0];
    const customerIndex = headers.findIndex(h => h && h.toLowerCase().includes('debtor') && !h.toLowerCase().includes('code'));
    const docNoIndex = headers.findIndex(h => h && h.toLowerCase().includes('doc') && h.toLowerCase().includes('no'));
    const statusIndex = headers.findIndex(h => h && h.toLowerCase().includes('payment') && h.toLowerCase().includes('status'));
    const amountIndex = headers.findIndex(h => h && h.toLowerCase().includes('sub') && h.toLowerCase().includes('total'));
    const dateIndex = headers.findIndex(h => h && h.toLowerCase().includes('date') && !h.toLowerCase().includes('payment'));

    if (statusIndex === -1 || docNoIndex === -1 || dateIndex === -1) {
        return null;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const overdueInvoices = new Map();

    for (let i = 1; i < invoiceData.length; i++) {
        const row = invoiceData[i];
        const status = (row[statusIndex] || '').toLowerCase();
        const invoiceNo = row[docNoIndex] || '';
        const date = parseDate(row[dateIndex]);

        if (status === 'unpaid' && date && date < cutoffDate && invoiceNo) {
            if (!overdueInvoices.has(invoiceNo)) {
                const amountStr = (row[amountIndex] || '0').toString().replace(/,/g, '');
                const daysOverdue = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));

                overdueInvoices.set(invoiceNo, {
                    invoiceNo: invoiceNo,
                    customer: row[customerIndex] || 'Unknown',
                    date: row[dateIndex],
                    amount: parseFloat(amountStr) || 0,
                    daysOverdue: daysOverdue
                });
            } else {
                // Accumulate amount
                const invoice = overdueInvoices.get(invoiceNo);
                const amountStr = (row[amountIndex] || '0').toString().replace(/,/g, '');
                invoice.amount += parseFloat(amountStr) || 0;
            }
        }
    }

    const invoiceList = Array.from(overdueInvoices.values());
    const totalAmount = invoiceList.reduce((sum, inv) => sum + inv.amount, 0);

    // Sort by days overdue (most overdue first)
    invoiceList.sort((a, b) => b.daysOverdue - a.daysOverdue);

    return {
        cutoffDays: days,
        overdueCount: invoiceList.length,
        totalAmount: totalAmount,
        invoices: invoiceList
    };
}

// Export all functions
module.exports = {
    getAllUnpaidInvoices,
    getInvoicesByDateRange,
    getRecentInvoices,
    getCurrentMonthInvoices,
    searchInvoicesByProduct,
    getTopCustomers,
    getInactiveCustomers,
    getOverdueInvoices
};

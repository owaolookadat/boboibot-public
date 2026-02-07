// Formatters for advanced query responses
// Handles formatting for all Phase 2 functions

/**
 * Format all unpaid invoices response
 */
function formatAllUnpaid(result, language = 'en') {
    if (!result || !result.hasUnpaid) {
        return language === 'zh'
            ? '✅ 没有未付款的发票！所有发票都已付款。'
            : '✅ No unpaid invoices! All invoices are paid.';
    }

    const formatCurrency = (amount) => {
        return `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    let response = language === 'zh'
        ? `💰 未付款发票汇总\n\n`
        : `💰 All Unpaid Invoices Summary\n\n`;

    response += language === 'zh'
        ? `总客户: ${result.totalCustomers}\n`
        : `Total Customers: ${result.totalCustomers}\n`;

    response += language === 'zh'
        ? `未付发票数: ${result.totalInvoices}\n`
        : `Unpaid Invoices: ${result.totalInvoices}\n`;

    response += language === 'zh'
        ? `总欠款: ${formatCurrency(result.totalAmount)}\n\n`
        : `Total Outstanding: ${formatCurrency(result.totalAmount)}\n\n`;

    // Show top 10 customers with unpaid invoices
    const topCustomers = result.customers.slice(0, 10);

    response += language === 'zh' ? `📋 客户明细:\n\n` : `📋 Customer Breakdown:\n\n`;

    for (const customer of topCustomers) {
        response += `👤 ${customer.name}\n`;
        response += `   ${formatCurrency(customer.total)} (${customer.count} ${language === 'zh' ? '张发票' : 'invoices'})\n\n`;
    }

    if (result.customers.length > 10) {
        const remaining = result.customers.length - 10;
        response += language === 'zh'
            ? `...还有 ${remaining} 个客户\n\n`
            : `...and ${remaining} more customers\n\n`;
    }

    response += language === 'zh'
        ? `💡 输入客户名查看详细发票`
        : `💡 Type a customer name to see detailed invoices`;

    return response;
}

/**
 * Format date range query response
 */
function formatDateRange(result, language = 'en') {
    if (!result) {
        return language === 'zh'
            ? '❌ 未找到该日期范围的发票'
            : '❌ No invoices found for this date range';
    }

    const formatCurrency = (amount) => {
        return `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    let response = language === 'zh'
        ? `📅 日期范围查询结果\n\n`
        : `📅 Date Range Query Results\n\n`;

    response += language === 'zh'
        ? `期间: ${result.startDate} 至 ${result.endDate}\n\n`
        : `Period: ${result.startDate} to ${result.endDate}\n\n`;

    response += language === 'zh'
        ? `📊 统计:\n`
        : `📊 Summary:\n`;

    response += language === 'zh'
        ? `• 总发票: ${result.totalInvoices}\n`
        : `• Total Invoices: ${result.totalInvoices}\n`;

    response += language === 'zh'
        ? `• 总金额: ${formatCurrency(result.totalAmount)}\n`
        : `• Total Amount: ${formatCurrency(result.totalAmount)}\n`;

    response += language === 'zh'
        ? `• 已付: ${result.paidCount} | 未付: ${result.unpaidCount}\n\n`
        : `• Paid: ${result.paidCount} | Unpaid: ${result.unpaidCount}\n\n`;

    // Show recent invoices (limit to 10)
    const invoicesToShow = result.invoices.slice(0, 10);

    if (invoicesToShow.length > 0) {
        response += language === 'zh' ? `📋 发票列表:\n\n` : `📋 Invoice List:\n\n`;

        for (const invoice of invoicesToShow) {
            const statusEmoji = invoice.status.toLowerCase() === 'paid' ? '✅' : '⚠️';
            response += `${statusEmoji} ${invoice.invoiceNo} (${invoice.date})\n`;
            response += `   ${invoice.customer}\n`;
            response += `   ${formatCurrency(invoice.amount)}\n\n`;
        }

        if (result.invoices.length > 10) {
            const remaining = result.invoices.length - 10;
            response += language === 'zh'
                ? `...还有 ${remaining} 张发票\n`
                : `...and ${remaining} more invoices\n`;
        }
    }

    return response;
}

/**
 * Format product search response
 */
function formatProductSearch(result, language = 'en') {
    if (!result) {
        return language === 'zh'
            ? `❌ 未找到 "${result?.searchTerm || '该产品'}" 的相关发票`
            : `❌ No invoices found for "${result?.searchTerm || 'this product'}"`;
    }

    const formatCurrency = (amount) => {
        return `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    let response = language === 'zh'
        ? `🔍 产品搜索结果: "${result.searchTerm}"\n\n`
        : `🔍 Product Search: "${result.searchTerm}"\n\n`;

    response += language === 'zh'
        ? `📊 总结:\n`
        : `📊 Summary:\n`;

    response += language === 'zh'
        ? `• 发票数: ${result.totalInvoices}\n`
        : `• Invoices: ${result.totalInvoices}\n`;

    response += language === 'zh'
        ? `• 总数量: ${result.totalQuantity}\n`
        : `• Total Quantity: ${result.totalQuantity}\n`;

    response += language === 'zh'
        ? `• 总金额: ${formatCurrency(result.totalAmount)}\n\n`
        : `• Total Amount: ${formatCurrency(result.totalAmount)}\n\n`;

    // Product breakdown
    response += language === 'zh' ? `📦 产品明细:\n\n` : `📦 Product Breakdown:\n\n`;

    for (const [productName, stats] of Object.entries(result.productBreakdown)) {
        response += `• ${productName}\n`;
        response += language === 'zh'
            ? `  数量: ${stats.qty} | 金额: ${formatCurrency(stats.amount)}\n\n`
            : `  Qty: ${stats.qty} | Amount: ${formatCurrency(stats.amount)}\n\n`;
    }

    // Recent invoices (limit to 5)
    const recentInvoices = result.invoices.slice(0, 5);

    if (recentInvoices.length > 0) {
        response += language === 'zh' ? `📋 最近发票:\n\n` : `📋 Recent Invoices:\n\n`;

        for (const invoice of recentInvoices) {
            response += `${invoice.invoiceNo} (${invoice.date})\n`;
            response += `${invoice.customer} | ${invoice.quantity} × ${formatCurrency(invoice.amount)}\n\n`;
        }
    }

    return response;
}

/**
 * Format top customers response
 */
function formatTopCustomers(result, language = 'en') {
    if (!result || result.topCustomers.length === 0) {
        return language === 'zh'
            ? '❌ 未找到客户数据'
            : '❌ No customer data found';
    }

    const formatCurrency = (amount) => {
        return `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    let response = language === 'zh'
        ? `👑 排名前 ${result.topCustomers.length} 客户\n\n`
        : `👑 Top ${result.topCustomers.length} Customers\n\n`;

    for (let i = 0; i < result.topCustomers.length; i++) {
        const customer = result.topCustomers[i];
        const rank = i + 1;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;

        response += `${medal} ${customer.name}\n`;

        response += language === 'zh'
            ? `   总收入: ${formatCurrency(customer.totalRevenue)}\n`
            : `   Revenue: ${formatCurrency(customer.totalRevenue)}\n`;

        response += language === 'zh'
            ? `   发票数: ${customer.invoiceCount}\n`
            : `   Invoices: ${customer.invoiceCount}\n`;

        if (customer.unpaidAmount > 0) {
            response += language === 'zh'
                ? `   ⚠️ 未付: ${formatCurrency(customer.unpaidAmount)}\n`
                : `   ⚠️ Unpaid: ${formatCurrency(customer.unpaidAmount)}\n`;
        }

        response += '\n';
    }

    response += language === 'zh'
        ? `💡 总客户数: ${result.totalCustomers}`
        : `💡 Total Customers: ${result.totalCustomers}`;

    return response;
}

/**
 * Format inactive customers response
 */
function formatInactiveCustomers(result, language = 'en') {
    if (!result || result.inactiveCount === 0) {
        return language === 'zh'
            ? `✅ 过去 ${result?.cutoffDays || 60} 天内所有客户都有订单！`
            : `✅ All customers have ordered in the last ${result?.cutoffDays || 60} days!`;
    }

    const formatCurrency = (amount) => {
        return `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    let response = language === 'zh'
        ? `😴 ${result.cutoffDays} 天内未下单客户 (${result.inactiveCount})\n\n`
        : `😴 Inactive Customers (${result.cutoffDays}+ days) - ${result.inactiveCount} total\n\n`;

    const customersToShow = result.customers.slice(0, 15);

    for (const customer of customersToShow) {
        response += `👤 ${customer.name}\n`;

        response += language === 'zh'
            ? `   最后订单: ${customer.daysSinceLastOrder} 天前\n`
            : `   Last Order: ${customer.daysSinceLastOrder} days ago\n`;

        response += language === 'zh'
            ? `   最后金额: ${formatCurrency(customer.lastAmount)}\n\n`
            : `   Last Amount: ${formatCurrency(customer.lastAmount)}\n\n`;
    }

    if (result.customers.length > 15) {
        const remaining = result.customers.length - 15;
        response += language === 'zh'
            ? `...还有 ${remaining} 个客户\n\n`
            : `...and ${remaining} more customers\n\n`;
    }

    response += language === 'zh'
        ? `💡 建议: 联系这些客户了解情况`
        : `💡 Suggestion: Reach out to re-engage these customers`;

    return response;
}

/**
 * Format overdue invoices response
 */
function formatOverdueInvoices(result, language = 'en') {
    if (!result || result.overdueCount === 0) {
        return language === 'zh'
            ? `✅ 没有超过 ${result?.cutoffDays || 30} 天的逾期发票！`
            : `✅ No invoices overdue for more than ${result?.cutoffDays || 30} days!`;
    }

    const formatCurrency = (amount) => {
        return `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    let response = language === 'zh'
        ? `⏰ 逾期发票 (${result.cutoffDays}+ 天)\n\n`
        : `⏰ Overdue Invoices (${result.cutoffDays}+ days)\n\n`;

    response += language === 'zh'
        ? `📊 总结:\n`
        : `📊 Summary:\n`;

    response += language === 'zh'
        ? `• 逾期发票: ${result.overdueCount}\n`
        : `• Overdue Count: ${result.overdueCount}\n`;

    response += language === 'zh'
        ? `• 总逾期金额: ${formatCurrency(result.totalAmount)}\n\n`
        : `• Total Overdue: ${formatCurrency(result.totalAmount)}\n\n`;

    response += language === 'zh' ? `📋 逾期明细:\n\n` : `📋 Overdue Details:\n\n`;

    const invoicesToShow = result.invoices.slice(0, 15);

    for (const invoice of invoicesToShow) {
        const urgency = invoice.daysOverdue > 60 ? '🔴' : invoice.daysOverdue > 30 ? '🟠' : '🟡';

        response += `${urgency} ${invoice.invoiceNo}\n`;
        response += `   ${invoice.customer}\n`;

        response += language === 'zh'
            ? `   逾期: ${invoice.daysOverdue} 天 | 金额: ${formatCurrency(invoice.amount)}\n`
            : `   Overdue: ${invoice.daysOverdue} days | ${formatCurrency(invoice.amount)}\n`;

        response += `   ${language === 'zh' ? '开票日期' : 'Date'}: ${invoice.date}\n\n`;
    }

    if (result.invoices.length > 15) {
        const remaining = result.invoices.length - 15;
        response += language === 'zh'
            ? `...还有 ${remaining} 张发票\n\n`
            : `...and ${remaining} more invoices\n\n`;
    }

    response += language === 'zh'
        ? `💡 🔴 > 60天 | 🟠 > 30天 | 🟡 < 30天`
        : `💡 🔴 > 60 days | 🟠 > 30 days | 🟡 < 30 days`;

    return response;
}

// Export all formatters
module.exports = {
    formatAllUnpaid,
    formatDateRange,
    formatProductSearch,
    formatTopCustomers,
    formatInactiveCustomers,
    formatOverdueInvoices
};

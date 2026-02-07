// AI-powered intent router
// Uses Claude Haiku to classify user intent and route to appropriate functions

const Anthropic = require('@anthropic-ai/sdk');

// Lazy-load anthropic client to ensure .env is loaded first
let anthropic = null;
function getAnthropicClient() {
    if (!anthropic) {
        anthropic = new Anthropic({
            apiKey: process.env.CLAUDE_API_KEY
        });
    }
    return anthropic;
}

/**
 * Classify user intent using AI (Claude Haiku - fast & cheap)
 * Returns structured intent with parameters
 */
async function classifyIntent(question, businessData) {
    try {
        // Get customer list from business data for better classification
        let customerList = [];
        const invoiceSheet = businessData['Invoice Detail Listing'] || businessData['Invoice Detail'];

        if (invoiceSheet && invoiceSheet.length > 1) {
            const headers = invoiceSheet[0];
            const customerNameIndex = headers.findIndex(h => h && h.toLowerCase().includes('customer'));

            if (customerNameIndex !== -1) {
                // Get unique customer names (first 50 to keep it short)
                const customers = new Set();
                for (let i = 1; i < Math.min(invoiceSheet.length, 200); i++) {
                    const customerName = invoiceSheet[i][customerNameIndex];
                    if (customerName) {
                        customers.add(customerName);
                    }
                }
                customerList = Array.from(customers).slice(0, 50);
            }
        }

        const prompt = `You are an intent classifier for a business bot. Analyze the user's question and return a JSON object with the intent and parameters.

USER QUESTION: "${question}"

AVAILABLE CUSTOMERS (for reference):
${customerList.join(', ')}

AVAILABLE INTENTS:
1. "payment_status" - User asks if a customer owes money, has unpaid invoices, outstanding balance
   Examples: "Does X owe money?", "X欠钱吗", "outstanding for X", "unpaid invoices for X"

2. "all_unpaid" - User wants to see ALL unpaid invoices across all customers
   Examples: "list all unpaid invoices", "show me all customers with unpaid invoices", "total outstanding", "who owes money?"

3. "payment_update" - User wants to mark an invoice as paid/unpaid (admin only)
   Examples: "Mark IV-2602-005 paid", "IV-123 已付款", "update payment status"

4. "date_range" - User asks for invoices within a date range or time period
   Examples: "Show January invoices", "last 7 days", "this month sales", "invoices from 1/1 to 31/1"

5. "product_search" - User searches for invoices containing specific products/items
   Examples: "sharkfin sales", "invoices with sea cucumber", "how much X did we sell?"

6. "top_customers" - User wants customer rankings or analytics
   Examples: "top 5 customers", "who are my best customers?", "customer ranking by revenue"

7. "inactive_customers" - User wants to see customers who haven't ordered recently
   Examples: "who hasn't ordered in 2 months?", "inactive customers", "customers we lost"

8. "overdue_invoices" - User asks about overdue/aging invoices
   Examples: "overdue invoices", "who hasn't paid for 30 days?", "payment reminders needed"

9. "invoice_stats" - User asks for invoice statistics, counts, totals
   Examples: "How many invoices?", "total sales", "invoice count for January"

10. "invoice_details" - User wants to see specific invoice details
   Examples: "Show invoice IV-123", "details for 2501006", "what's in invoice X"
   Note: Invoice numbers can be in formats: IV-2501-006, 2501006, IV2501006

11. "customer_query" - General queries about a specific customer
   Examples: "Show me X's invoices", "recent orders for X", "X's history"

12. "general_query" - Everything else that needs AI analysis
   Examples: "Why did sales drop?", "Compare X and Y", "trend analysis"

Return ONLY a JSON object in this exact format (no markdown, no explanations):
{
  "intent": "payment_status|all_unpaid|payment_update|date_range|product_search|top_customers|inactive_customers|overdue_invoices|invoice_stats|invoice_details|customer_query|general_query",
  "customer": "EXACT CUSTOMER NAME FROM LIST or null",
  "invoiceNumber": "invoice number if mentioned, or null",
  "dateRange": {"start": "DD/MM/YYYY", "end": "DD/MM/YYYY"} or null,
  "productName": "product name if searching for specific item, or null",
  "days": number of days for date-based queries (7 for "last week", 30 for "last month", etc.),
  "limit": number of results to return (for top customers, default 10),
  "confidence": 0.0-1.0,
  "language": "zh|en",
  "parameters": {}
}

RULES:
- Match customer names from the list above (case-insensitive partial match is OK)
- If question mentions "tekka", "tekkah", or similar, match to "TEKKAH FROZEN SEAFOOD"
- If question mentions "chef tam", match to "CHEF TAM CANTONESE CUISINE"
- Detect invoice numbers in ANY format:
  * "IV-2501-006" (standard)
  * "2501006" (7 digits, no prefix/dashes)
  * "IV2501006" (no dashes)
  * "2501-006" (missing IV prefix)
  Extract and normalize to "invoiceNumber" field
- Use "zh" if question contains Chinese characters, otherwise "en"
- Set confidence high (0.8+) only if very clear
- For ambiguous queries, use "general_query" with lower confidence`;

        const response = await getAnthropicClient().messages.create({
            model: "claude-3-haiku-20240307", // Fast & cheap for classification
            max_tokens: 300,
            messages: [{
                role: "user",
                content: prompt
            }]
        });

        const result = response.content[0].text.trim();

        // Parse JSON response
        let intent;
        try {
            // Remove markdown code blocks if present
            const jsonText = result.replace(/```json\n?|\n?```/g, '').trim();
            intent = JSON.parse(jsonText);
        } catch (e) {
            console.error('Failed to parse intent JSON:', result);
            // Fallback to general query
            intent = {
                intent: 'general_query',
                customer: null,
                invoiceNumber: null,
                confidence: 0.5,
                language: /[\u4e00-\u9fa5]/.test(question) ? 'zh' : 'en',
                parameters: {}
            };
        }

        console.log(`🎯 Intent classified: ${intent.intent} (confidence: ${intent.confidence})`);
        if (intent.customer) {
            console.log(`   Customer: ${intent.customer}`);
        }
        if (intent.invoiceNumber) {
            console.log(`   Invoice: ${intent.invoiceNumber}`);
        }

        return intent;

    } catch (error) {
        console.error('Error classifying intent:', error);
        // Fallback to general query on error
        return {
            intent: 'general_query',
            customer: null,
            invoiceNumber: null,
            confidence: 0.5,
            language: /[\u4e00-\u9fa5]/.test(question) ? 'zh' : 'en',
            parameters: {}
        };
    }
}

/**
 * Route query to appropriate function based on intent
 * Returns { handled: boolean, response: string|null, useAI: boolean }
 */
async function routeQuery(intent, question, businessData, handlers) {
    const {
        checkPaymentStatus,
        formatPaymentStatus,
        getInvoiceStats,
        getInvoiceDetails,
        formatInvoiceDetails,
        getCustomerInvoices,
        formatCustomerInvoices
    } = handlers;

    // Only route if confidence is high enough
    if (intent.confidence < 0.6) {
        console.log(`⚠️  Low confidence (${intent.confidence}), using AI fallback`);
        return { handled: false, response: null, useAI: true };
    }

    try {
        switch (intent.intent) {
            case 'payment_status':
                if (!intent.customer) {
                    console.log('❌ Payment query but no customer identified');
                    return { handled: false, response: null, useAI: true };
                }

                console.log(`💰 Routing to payment status checker for ${intent.customer}`);
                const invoiceSheet = businessData['Invoice Detail Listing'] || businessData['Invoice Detail'];

                if (!invoiceSheet) {
                    return { handled: false, response: null, useAI: true };
                }

                const paymentStatus = checkPaymentStatus(invoiceSheet, intent.customer);
                const response = formatPaymentStatus(paymentStatus, intent.customer, intent.language);

                return {
                    handled: true,
                    response: response,
                    useAI: false,
                    intent: 'payment_status'
                };

            case 'invoice_stats':
                console.log(`📊 Routing to invoice stats handler`);
                // For now, let AI handle stats queries with filtered data
                // Could route to getInvoiceStats() in the future
                return { handled: false, response: null, useAI: true };

            case 'invoice_details':
                if (!intent.invoiceNumber) {
                    console.log('❌ Invoice details query but no invoice number identified');
                    return { handled: false, response: null, useAI: true };
                }

                console.log(`📋 Routing to invoice details for ${intent.invoiceNumber}`);
                const invoiceData = businessData['Invoice Detail Listing'] || businessData['Invoice Detail'];

                if (!invoiceData) {
                    return { handled: false, response: null, useAI: true };
                }

                const invoiceDetails = getInvoiceDetails(invoiceData, intent.invoiceNumber);
                const detailsResponse = formatInvoiceDetails(invoiceDetails, intent.language);

                return {
                    handled: true,
                    response: detailsResponse,
                    useAI: false,
                    intent: 'invoice_details'
                };

            case 'customer_query':
                if (!intent.customer) {
                    console.log('❌ Customer query but no customer identified');
                    return { handled: false, response: null, useAI: true };
                }

                console.log(`📊 Routing to customer invoices for ${intent.customer}`);
                const customerInvoiceData = businessData['Invoice Detail Listing'] || businessData['Invoice Detail'];

                if (!customerInvoiceData) {
                    return { handled: false, response: null, useAI: true };
                }

                // Check if they want unpaid only
                const filters = {
                    limit: 20 // Show last 20 invoices
                };

                if (question.toLowerCase().includes('unpaid') || question.toLowerCase().includes('欠') || question.toLowerCase().includes('未付')) {
                    filters.unpaidOnly = true;
                }

                const customerInvoices = getCustomerInvoices(customerInvoiceData, intent.customer, filters);
                const customerResponse = formatCustomerInvoices(customerInvoices, intent.language);

                return {
                    handled: true,
                    response: customerResponse,
                    useAI: false,
                    intent: 'customer_query'
                };

            case 'all_unpaid':
                console.log(`💰 Routing to all unpaid invoices query`);
                const allUnpaidData = businessData['Invoice Detail Listing'] || businessData['Invoice Detail'];

                if (!allUnpaidData || !handlers.getAllUnpaidInvoices) {
                    return { handled: false, response: null, useAI: true };
                }

                const allUnpaid = handlers.getAllUnpaidInvoices(allUnpaidData);
                const allUnpaidResponse = handlers.formatAllUnpaid(allUnpaid, intent.language);

                return {
                    handled: true,
                    response: allUnpaidResponse,
                    useAI: false,
                    intent: 'all_unpaid'
                };

            case 'date_range':
                console.log(`📅 Routing to date range query`);
                const dateData = businessData['Invoice Detail Listing'] || businessData['Invoice Detail'];

                if (!dateData || !handlers.getInvoicesByDateRange) {
                    return { handled: false, response: null, useAI: true };
                }

                let dateResult;
                if (intent.days) {
                    // Recent invoices (e.g., "last 7 days")
                    dateResult = handlers.getRecentInvoices(dateData, intent.days);
                } else if (intent.dateRange && intent.dateRange.start && intent.dateRange.end) {
                    // Specific date range
                    dateResult = handlers.getInvoicesByDateRange(dateData, intent.dateRange.start, intent.dateRange.end);
                } else if (question.toLowerCase().includes('this month') || question.toLowerCase().includes('当月')) {
                    // Current month
                    dateResult = handlers.getCurrentMonthInvoices(dateData);
                } else {
                    return { handled: false, response: null, useAI: true };
                }

                const dateResponse = handlers.formatDateRange(dateResult, intent.language);

                return {
                    handled: true,
                    response: dateResponse,
                    useAI: false,
                    intent: 'date_range'
                };

            case 'product_search':
                console.log(`🔍 Routing to product search: ${intent.productName}`);
                const productData = businessData['Invoice Detail Listing'] || businessData['Invoice Detail'];

                if (!productData || !intent.productName || !handlers.searchInvoicesByProduct) {
                    return { handled: false, response: null, useAI: true };
                }

                const productResult = handlers.searchInvoicesByProduct(productData, intent.productName);
                const productResponse = handlers.formatProductSearch(productResult, intent.language);

                return {
                    handled: true,
                    response: productResponse,
                    useAI: false,
                    intent: 'product_search'
                };

            case 'top_customers':
                console.log(`👑 Routing to top customers query`);
                const topCustomerData = businessData['Invoice Detail Listing'] || businessData['Invoice Detail'];

                if (!topCustomerData || !handlers.getTopCustomers) {
                    return { handled: false, response: null, useAI: true };
                }

                const limit = intent.limit || 10;
                const topCustomers = handlers.getTopCustomers(topCustomerData, limit);
                const topCustomersResponse = handlers.formatTopCustomers(topCustomers, intent.language);

                return {
                    handled: true,
                    response: topCustomersResponse,
                    useAI: false,
                    intent: 'top_customers'
                };

            case 'inactive_customers':
                console.log(`😴 Routing to inactive customers query`);
                const inactiveData = businessData['Invoice Detail Listing'] || businessData['Invoice Detail'];

                if (!inactiveData || !handlers.getInactiveCustomers) {
                    return { handled: false, response: null, useAI: true };
                }

                const days = intent.days || 60;
                const inactiveCustomers = handlers.getInactiveCustomers(inactiveData, days);
                const inactiveResponse = handlers.formatInactiveCustomers(inactiveCustomers, intent.language);

                return {
                    handled: true,
                    response: inactiveResponse,
                    useAI: false,
                    intent: 'inactive_customers'
                };

            case 'overdue_invoices':
                console.log(`⏰ Routing to overdue invoices query`);
                const overdueData = businessData['Invoice Detail Listing'] || businessData['Invoice Detail'];

                if (!overdueData || !handlers.getOverdueInvoices) {
                    return { handled: false, response: null, useAI: true };
                }

                const overdueDays = intent.days || 30;
                const overdueInvoices = handlers.getOverdueInvoices(overdueData, overdueDays);
                const overdueResponse = handlers.formatOverdueInvoices(overdueInvoices, intent.language);

                return {
                    handled: true,
                    response: overdueResponse,
                    useAI: false,
                    intent: 'overdue_invoices'
                };

            case 'payment_update':
                // This is handled separately by parsePaymentCommand in bot.js
                // Don't intercept here
                return { handled: false, response: null, useAI: true };

            case 'general_query':
            default:
                // Use AI with smart filtering
                return { handled: false, response: null, useAI: true };
        }
    } catch (error) {
        console.error('Error routing query:', error);
        return { handled: false, response: null, useAI: true };
    }
}

module.exports = {
    classifyIntent,
    routeQuery
};

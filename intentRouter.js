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

2. "payment_update" - User wants to mark an invoice as paid/unpaid (admin only)
   Examples: "Mark IV-2602-005 paid", "IV-123 已付款", "update payment status"

3. "invoice_stats" - User asks for invoice statistics, counts, totals
   Examples: "How many invoices?", "total sales", "invoice count for January"

4. "invoice_details" - User wants to see specific invoice details
   Examples: "Show invoice IV-123", "details for 2501006", "what's in invoice X"
   Note: Invoice numbers can be in formats: IV-2501-006, 2501006, IV2501006

5. "customer_query" - General queries about a specific customer
   Examples: "Show me X's invoices", "recent orders for X", "X's history", "X's unpaid invoices"

6. "general_query" - Everything else that needs AI analysis
   Examples: "Why did sales drop?", "Compare X and Y", "trend analysis"

Return ONLY a JSON object in this exact format (no markdown, no explanations):
{
  "intent": "payment_status|payment_update|invoice_stats|invoice_details|customer_query|general_query",
  "customer": "EXACT CUSTOMER NAME FROM LIST or null",
  "invoiceNumber": "invoice number if mentioned, or null",
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

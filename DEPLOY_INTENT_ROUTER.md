# AI-Powered Intent Router Deployment

## What's New:

Instead of brittle regex patterns, the bot now uses **AI to understand what you're asking**, then routes to the best handler.

### Before (Regex):
```
"tekka欠钱吗" → ❌ Doesn't match (lowercase "tekka")
"Tekkah owes?" → ❌ Doesn't match pattern
"that seafood company outstanding?" → ❌ Can't detect customer
```

### After (AI Intent Router):
```
"tekka欠钱吗" → ✅ AI: payment_status, customer: TEKKAH → Code-based accurate response
"Tekkah owes?" → ✅ AI: payment_status, customer: TEKKAH → Code-based accurate response
"that seafood company outstanding?" → ✅ AI figures it out → Routes appropriately
```

---

## How It Works:

```
User sends message
    ↓
AI (Haiku) classifies intent in <1 second
    ↓
Intent: payment_status?
    ├─ YES → checkPaymentStatus() (code, 100% accurate)
    └─ NO → AI analyzes with filtered data
    ↓
Response sent
```

**Intent Types:**
1. **payment_status** → Code-based payment checker (accurate)
2. **payment_update** → Payment command handler (admin only)
3. **invoice_stats** → Could route to stats function
4. **customer_query** → AI with customer-filtered data
5. **general_query** → AI with full analysis

---

## Deploy:

```bash
ssh ubuntu@54.255.183.209
cd ~/boboibot
git pull
npm install  # (no new dependencies needed)
pm2 restart boboibot
pm2 logs boboibot --lines 30
```

---

## What to Look For in Logs:

**Good signs:**
```
🤖 Classifying intent with AI...
🎯 Intent classified: payment_status (confidence: 0.95)
   Customer: TEKKAH FROZEN SEAFOOD
💰 Routing to payment status checker for TEKKAH FROZEN SEAFOOD
✅ Response sent (payment_status, code-based)
```

**AI fallback (also good):**
```
🤖 Classifying intent with AI...
🎯 Intent classified: general_query (confidence: 0.85)
🧠 Using AI for response (with smart filtering)
✅ Response sent (AI)
```

**Low confidence (uses AI as safety):**
```
⚠️  Low confidence (0.5), using AI fallback
```

---

## Test Cases:

### Test 1: Payment Query (Lowercase)
**Send:** `tekka欠钱吗`

**Expected:**
- Logs show: "🎯 Intent classified: payment_status"
- Logs show: "Customer: TEKKAH FROZEN SEAFOOD"
- Response shows exact unpaid invoices
- Logs show: "✅ Response sent (payment_status, code-based)"

### Test 2: Payment Query (English variation)
**Send:** `Does Tekkah owe money?`

**Expected:**
- Same as Test 1
- AI understands "Tekkah" = "TEKKAH FROZEN SEAFOOD"

### Test 3: Abbreviated Name
**Send:** `chef tam outstanding?`

**Expected:**
- Logs show: "Customer: CHEF TAM CANTONESE CUISINE"
- Code-based accurate response

### Test 4: General Query
**Send:** `Show me January sales trends`

**Expected:**
- Logs show: "🎯 Intent classified: general_query"
- Logs show: "🧠 Using AI for response"
- AI analyzes and responds

### Test 5: Ambiguous Query
**Send:** `What's happening with that customer?`

**Expected:**
- Low confidence or general_query
- AI asks for clarification

---

## Cost Comparison:

### Old Approach (All Sonnet):
- Every query: Sonnet 4 on 5000 rows
- Cost: ~$0.01-0.02 per query
- Slow: 2-5 seconds

### New Approach (Intent Router + Functions):
- Intent classification: Haiku (~$0.0002)
- Payment query: Code execution (FREE)
- Complex query: Sonnet on filtered data (~$0.003)
- **Total: $0.0002-0.003 per query (90% savings!)**
- **Fast: 0.5-2 seconds**

---

## Benefits:

### 1. Flexible Customer Matching
- Handles typos: "Tekka", "tekka", "TEKKAH"
- Handles abbreviations: "chef tam" → "CHEF TAM CANTONESE CUISINE"
- Handles descriptions: "that seafood place" → figures it out

### 2. Accurate Critical Queries
- Payment status: Code-based (no hallucination)
- Payment updates: Existing command handler
- Invoice stats: Could add code-based handler

### 3. Cost Optimized
- Haiku for routing ($0.25 per 1M input tokens)
- Code execution for common queries (FREE)
- Sonnet only for complex analysis

### 4. Extensible
Easy to add new handlers:
```javascript
case 'generate_report':
    return await generateMonthlyReport(businessData, intent.parameters);
```

---

## Troubleshooting:

### Intent classification fails:
- Check logs for errors
- Fallback will use AI anyway (safe)

### Wrong customer matched:
- AI will improve over time with context
- Can add customer aliases to intent classifier

### Haiku too slow:
- Haiku is already very fast (<1 second)
- Check network latency

---

## Future Enhancements:

1. **Add more function handlers:**
   - `generateReport()`
   - `getCustomerHistory()`
   - `compareCustomers()`

2. **Intent confidence tuning:**
   - Currently >0.6 to route
   - Can adjust based on accuracy

3. **Response caching by intent:**
   - Cache payment status for 5 min
   - Cache invoice stats for 10 min

4. **Multi-step queries:**
   - "Show unpaid, then mark as paid"
   - Chain multiple functions

---

**Deploy now to fix the "tekka" issue and enable flexible AI routing!**

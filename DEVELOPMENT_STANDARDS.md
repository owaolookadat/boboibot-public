# 🏗️ Development Standards & Architecture Patterns

## Core Architecture Principle

**AI for Understanding → Code for Execution**

All features follow this pattern:
1. **AI classifies intent** (what does the user want?)
2. **Code executes the action** (deterministic, reliable logic)

---

## 📋 Standard Development Pattern

### **For ALL New Features:**

```
User Input (Natural Language)
    ↓
AI Intent Classification (Claude Haiku)
    ↓
Intent Router (maps intent to handler)
    ↓
Handler Function (executes specific logic)
    ↓
Response to User
```

### **Why This Pattern:**

✅ **Natural Language** - Users phrase requests however they want
✅ **No Regex Hell** - No fragile pattern matching, ordering issues, or conflicts
✅ **Easy to Extend** - Just update AI prompt, add new handler function
✅ **Self-Documenting** - Intent descriptions in AI prompt serve as documentation
✅ **Consistent** - Same pattern for personal AND business features
✅ **Debuggable** - Logs show intent + confidence scores
✅ **Fast & Cheap** - Haiku classification ~200-500ms, ~$0.00025 per call

❌ **Never Use Regex for Intent Detection** - Only use regex for data extraction AFTER intent is classified

---

## 🎯 How to Add a New Feature

### **Step 1: Update AI Intent Classifier**

#### **For Personal Features:**
Edit `personalIntentRouter.js`:

```javascript
// Add new intent to prompt
const prompt = `
...
AVAILABLE INTENTS:

1. "delete_reminder" - User wants to delete/remove/cancel their last reminder
   Examples: "delete last reminder", "cancel reminder", "remove reminder", "undo that"

2. "snooze_reminder" - User wants to postpone a reminder ⭐ NEW
   Examples: "snooze 10 minutes", "remind me again in 30 minutes", "snooze until 3pm"

3. "list_today" - User wants today's reminders ⭐ NEW
   Examples: "what's today", "today's reminders", "what's on today"
...

Return JSON:
{
  "intent": "delete_reminder|snooze_reminder|list_today|...",
  ...
}
`;
```

#### **For Business Features:**
Edit `intentRouter.js` (same pattern, different file)

### **Step 2: Add Intent Mapping**

#### **For Personal Features:**
Edit `personalAssistant.js`:

```javascript
async function detectPersonalIntent(message, context = {}) {
    const intent = await classifyPersonalIntent(message, {...});

    // Map AI intent to handler types
    const intentMap = {
        'delete_reminder': 'delete_reminder',
        'snooze_reminder': 'snooze_reminder',  // ⭐ NEW
        'list_today': 'list_today',            // ⭐ NEW
        'create_reminder': 'reminder',
        'general_query': null
    };

    return {
        isPersonal: intent.isPersonal,
        type: intentMap[intent.intent] || null,
        ...
    };
}
```

### **Step 3: Create Handler Function**

Create specific handler (e.g., in `reminderHandler.js`):

```javascript
/**
 * Snooze a reminder - postpone it by specified duration
 */
async function snoozeReminder(reminderId, duration, userId) {
    // 1. Find the reminder
    const reminder = findReminderById(reminderId);

    // 2. Parse new time
    const newTime = calculateNewTime(reminder.datetime, duration);

    // 3. Update reminder
    reminder.datetime = newTime;
    reminder.notified = false;

    // 4. Update Google Calendar
    await calendarManager.updateReminder(reminder);

    // 5. Save locally
    await saveReminders();

    // 6. Return response
    return `⏰ Reminder snoozed until ${formatDateTime(newTime)}`;
}
```

### **Step 4: Route to Handler**

Edit `personalAssistant.js`:

```javascript
async function handlePersonalRequest(message, userId, context = {}) {
    const intent = await detectPersonalIntent(message, context);

    try {
        switch (intent.type) {
            case 'reminder':
                return await reminderHandler.handleReminderRequest(...);

            case 'snooze_reminder':  // ⭐ NEW
                return await reminderHandler.snoozeReminder(message, userId);

            case 'list_today':  // ⭐ NEW
                return await reminderHandler.listTodayReminders(userId);

            case 'delete_reminder':
                return await reminderHandler.deleteLastReminder(userId);

            default:
                return null;
        }
    } catch (error) {
        console.error('❌ Personal assistant error:', error);
        return `❌ Sorry, I encountered an error: ${error.message}`;
    }
}
```

### **Step 5: Test & Deploy**

```bash
# Test locally first
cd "C:\Users\user\Desktop\boboibot\boboibot"

# Commit with clear description
git add .
git commit -m "Add snooze reminder feature

- Updated personalIntentRouter.js with snooze intent
- Added snoozeReminder handler in reminderHandler.js
- Routed snooze_reminder in personalAssistant.js
- AI understands: 'snooze 10 min', 'remind again in 30 min', etc."

# Deploy
git push
ssh -i "C:\Users\user\Downloads\LightsailDefaultKey-ap-southeast-1.pem" ubuntu@13.250.50.95 "cd boboibot && git pull && pm2 restart boboibot"
```

---

## 🎨 Intent Classification Best Practices

### **1. Clear Intent Descriptions**

```javascript
// ✅ GOOD - Clear, with examples
"snooze_reminder" - User wants to postpone a reminder
   Examples: "snooze 10 minutes", "remind me again later", "snooze until 3pm"

// ❌ BAD - Vague
"snooze" - postpone
```

### **2. Priority Ordering**

```javascript
// List most specific intents FIRST
// More general intents LAST

1. "delete_reminder" - Specific action
2. "edit_reminder" - Specific action
3. "list_today" - Specific query
4. "list_reminders" - General query
5. "create_reminder" - General action
6. "general_query" - Catch-all
```

### **3. Conflict Prevention**

```javascript
// ✅ GOOD - Clear distinction
CRITICAL RULES:
- "delete", "cancel", "remove" + "reminder" = ALWAYS "delete_reminder" intent
- DO NOT confuse "delete reminder" with "create_reminder"
- Simple yes/no responses are only confirm/cancel if hasPendingConfirmation is true

// ❌ BAD - No disambiguation rules
```

### **4. Context Awareness**

```javascript
// Pass context to AI
const intent = await classifyPersonalIntent(message, {
    isGroup: context.isGroup,
    hasPendingConfirmation: reminderHandler.pendingConfirmations.size > 0,
    lastAction: context.lastAction,  // What did user just do?
    activeReminders: context.activeReminders  // Relevant state
});
```

### **5. Confidence Logging**

```javascript
// Always log confidence for debugging
console.log(`🎯 Intent: ${intent.intent} (confidence: ${intent.confidence})`);

// If confidence is low, consider:
// - Intent might be ambiguous
// - Need better examples in AI prompt
// - May need to ask user for clarification
```

---

## 🔧 Handler Function Best Practices

### **1. Single Responsibility**

```javascript
// ✅ GOOD - One clear purpose
async function snoozeReminder(reminderId, duration, userId) {
    // Only handles snoozing
}

// ❌ BAD - Multiple responsibilities
async function handleReminder(action, reminderId, userId) {
    if (action === 'snooze') { ... }
    if (action === 'delete') { ... }
    if (action === 'edit') { ... }
}
```

### **2. Clear Return Values**

```javascript
// ✅ GOOD - Return user-friendly message
async function snoozeReminder() {
    // ... logic ...
    return `⏰ Reminder snoozed until ${formatDateTime(newTime)}`;
}

// ✅ GOOD - Return structured data when needed
async function listTodayReminders() {
    return {
        reminders: [...],
        count: 5,
        formatted: "📅 Today's reminders..."
    };
}
```

### **3. Error Handling**

```javascript
async function snoozeReminder(reminderId, duration, userId) {
    try {
        // Validate inputs
        if (!reminderId) {
            return '❌ No reminder to snooze';
        }

        // Find reminder
        const reminder = await findReminder(reminderId);
        if (!reminder) {
            return '❌ Reminder not found';
        }

        // Execute logic
        // ...

        return '✅ Success message';

    } catch (error) {
        console.error('❌ Snooze error:', error);
        throw error; // Let router handle it
    }
}
```

### **4. Async/Await Discipline**

```javascript
// ✅ GOOD - Always await async functions
const intent = await detectPersonalIntent(message, context);
const result = await reminderHandler.snoozeReminder(...);

// ❌ BAD - Forgetting await (returns Promise, not value!)
const intent = detectPersonalIntent(message, context);  // ❌ Bug!
```

---

## 📊 Testing New Features

### **1. Test Intent Classification**

```javascript
// Test various phrasings
Test cases:
- "snooze 10 minutes" → snooze_reminder ✅
- "remind me again in 30 min" → snooze_reminder ✅
- "postpone for 1 hour" → snooze_reminder ✅
- "snooze" → snooze_reminder ✅
- "snooze until 3pm" → snooze_reminder ✅
```

### **2. Test Edge Cases**

```javascript
Test cases:
- What if no reminder to snooze?
- What if invalid duration? ("snooze abc")
- What if time is in the past?
- What if Google Calendar fails?
- What if user cancels mid-flow?
```

### **3. Check Logs**

```bash
# Watch intent classification
ssh ... "pm2 logs boboibot --lines 50" | grep "Intent:"

# Look for:
- Correct intent detected? ✅
- Confidence score high enough? (>0.7 ideal)
- Any errors in handler? ❌
```

---

## 🚫 Anti-Patterns to Avoid

### **1. Regex Intent Detection**

```javascript
// ❌ NEVER DO THIS
if (/snooze|postpone|later/i.test(message)) {
    return 'snooze_reminder';
}

// ✅ DO THIS INSTEAD
const intent = await classifyPersonalIntent(message);
// AI handles all variations intelligently
```

### **2. Complex Conditional Logic**

```javascript
// ❌ BAD - Nested conditionals
if (message.includes('reminder')) {
    if (message.includes('delete') || message.includes('remove')) {
        if (lastAction === 'created') {
            return 'delete_reminder';
        }
    } else if (message.includes('show')) {
        return 'list_reminders';
    }
}

// ✅ GOOD - Let AI handle it
const intent = await classifyPersonalIntent(message, { lastAction });
```

### **3. Hardcoded Keywords**

```javascript
// ❌ BAD - Rigid keywords
const keywords = ['snooze', 'postpone', 'delay', 'later'];
if (keywords.some(k => message.includes(k))) { ... }

// ✅ GOOD - AI understands naturally
// Just update AI prompt with examples
```

### **4. Missing Await**

```javascript
// ❌ BAD - Critical bug!
const intent = detectPersonalIntent(message);  // Returns Promise
console.log(intent.type);  // undefined!

// ✅ GOOD
const intent = await detectPersonalIntent(message);
console.log(intent.type);  // Correct value
```

### **5. Mixing Business and Personal Logic**

```javascript
// ❌ BAD - Mixed concerns
async function handleMessage(message) {
    if (isReminder(message)) {
        // personal logic
    } else if (isInvoice(message)) {
        // business logic
    }
}

// ✅ GOOD - Separate routers
if (isAdmin) {
    const personalIntent = await detectPersonalIntent(message);
    if (personalIntent.isPersonal) {
        return await handlePersonalRequest(message);
    }
}
// Then check business intents separately
```

---

## 📚 File Organization

```
boboibot/
├── bot.js                      # Main orchestration
├── intentRouter.js             # AI classifier for BUSINESS features
├── personalIntentRouter.js     # AI classifier for PERSONAL features
├── personalAssistant.js        # Router for personal features
├── reminderHandler.js          # Reminder-specific logic
├── reminderParser.js           # Date/time parsing
├── reminderScheduler.js        # Background checker
├── calendarManager.js          # Google Calendar integration
└── financialAdvisor.js         # Financial features (future)
```

**Pattern:**
- `*IntentRouter.js` = AI classification (Haiku)
- `*Assistant.js` or `*Router.js` = Maps intent to handlers
- `*Handler.js` = Specific feature logic
- `*Manager.js` = External service integration

---

## 🎯 Checklist for New Features

Before committing a new feature:

- [ ] AI prompt updated with clear intent description + examples
- [ ] Intent added to mapping in assistant/router
- [ ] Handler function created with single responsibility
- [ ] Error handling implemented
- [ ] All async functions are awaited
- [ ] Tested with multiple natural language variations
- [ ] Edge cases handled
- [ ] Logs include intent + confidence
- [ ] Documentation updated
- [ ] Committed with clear description

---

## 💡 Key Principles Summary

1. **AI understands, code executes** - Never mix these concerns
2. **One intent = One handler** - Keep functions focused
3. **Natural language first** - Users shouldn't learn syntax
4. **Context matters** - Pass relevant state to AI
5. **Log everything** - Intent, confidence, errors
6. **Always await** - Async bugs are silent and deadly
7. **Test variations** - People phrase things differently
8. **Fail gracefully** - Clear error messages

---

**This pattern has proven to be:**
- ✅ Maintainable (easy to add features)
- ✅ Debuggable (clear logs, confidence scores)
- ✅ User-friendly (natural language)
- ✅ Reliable (deterministic execution)
- ✅ Fast (Haiku is quick)
- ✅ Cheap (~$0.00025 per classification)

**Apply this pattern to ALL future features!** 🚀

// AI-powered personal assistant intent router
// Uses Claude Haiku to classify personal assistant intents

const Anthropic = require('@anthropic-ai/sdk');

// Lazy-load anthropic client
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
 * Classify personal assistant intent using AI (Claude Haiku - fast & cheap)
 * Returns structured intent with parameters
 */
async function classifyPersonalIntent(message, context = {}) {
    try {
        const prompt = `You are an intent classifier for a personal assistant bot with reminder/calendar features. Analyze the user's message and return a JSON object with the intent.

USER MESSAGE: "${message}"

CONTEXT:
- Is group chat: ${context.isGroup || false}
- Has pending confirmation: ${context.hasPendingConfirmation || false}

AVAILABLE INTENTS:

1. "delete_reminder" - User wants to delete/remove/cancel their last reminder
   Examples: "delete last reminder", "cancel reminder", "remove reminder", "undo that"
   PRIORITY: Check this FIRST before checking for general reminder keywords

2. "confirm_reminder" - User is confirming a pending reminder creation
   Examples: "yes", "yeah", "ok", "confirm", "sure", "correct"
   ONLY if hasPendingConfirmation is true

3. "cancel_reminder" - User is canceling a pending reminder creation
   Examples: "no", "nope", "cancel", "nevermind"
   ONLY if hasPendingConfirmation is true

4. "list_reminders" - User wants to see their reminders/schedule
   Examples: "my reminders", "show reminders", "list reminders", "what's on my schedule", "my schedule"

5. "create_reminder" - User wants to create a new reminder
   Examples: "remind me to...", "remind to...", "reminder", "set reminder", "alert me"
   IMPORTANT: Extract whether this is a group reminder (mentions "message this group", "tell the group", etc.)

6. "general_query" - Everything else
   Examples: General questions, commands not related to reminders

Return ONLY a JSON object in this exact format (no markdown, no explanations):
{
  "intent": "delete_reminder|confirm_reminder|cancel_reminder|list_reminders|create_reminder|general_query",
  "isGroupReminder": true/false (only for create_reminder - if they want to remind themselves to message the group),
  "confidence": 0.0-1.0,
  "isPersonal": true/false (true if this is a personal assistant request, false if business query)
}

CRITICAL RULES:
- "delete", "cancel", "remove" + "reminder" = ALWAYS "delete_reminder" intent
- DO NOT confuse "delete reminder" with "create_reminder"
- If message contains both "delete/cancel/remove" AND "reminder", it's ALWAYS delete_reminder
- Set isPersonal to true for all reminder/calendar-related intents
- Set isPersonal to false for business queries about invoices, customers, payments
- Simple yes/no responses are only confirm/cancel if hasPendingConfirmation is true
- Group reminders: detect phrases like "remind me to message this group", "tell the group", etc.`;

        const response = await getAnthropicClient().messages.create({
            model: "claude-3-haiku-20240307", // Fast & cheap for classification
            max_tokens: 200,
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
            console.error('Failed to parse personal intent JSON:', result);
            // Fallback
            intent = {
                intent: 'general_query',
                isGroupReminder: false,
                confidence: 0.3,
                isPersonal: false
            };
        }

        console.log(`🎯 Personal intent: ${intent.intent} (confidence: ${intent.confidence}, isPersonal: ${intent.isPersonal})`);
        if (intent.isGroupReminder) {
            console.log(`   📱 Group reminder detected`);
        }

        return intent;

    } catch (error) {
        console.error('❌ Personal intent classification error:', error.message);
        // Fallback to general query
        return {
            intent: 'general_query',
            isGroupReminder: false,
            confidence: 0.3,
            isPersonal: false
        };
    }
}

module.exports = {
    classifyPersonalIntent
};

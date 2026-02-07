// Personal Assistant Module
// Routes personal queries to appropriate handlers (reminders, finance, etc.)

const reminderHandler = require('./reminderHandler');
const financialAdvisor = require('./financialAdvisor');
const { classifyPersonalIntent } = require('./personalIntentRouter');

/**
 * Detect if message is a personal assistant request
 * Uses AI-powered intent classification instead of fragile regex patterns
 * @param {string} message - User's message
 * @param {Object} context - Chat context (isGroup, etc.)
 * @returns {Promise<Object>} - { isPersonal: boolean, type: string, isGroupReminder: boolean, confidence: number }
 */
async function detectPersonalIntent(message, context = {}) {
    // Use AI to classify intent (Claude Haiku - fast & cheap)
    const intent = await classifyPersonalIntent(message, {
        isGroup: context.isGroup,
        hasPendingConfirmation: reminderHandler.pendingConfirmations.size > 0
    });

    // Map AI intent to our handler types
    const intentMap = {
        'delete_reminder': 'delete_reminder',
        'confirm_reminder': 'confirm_reminder',
        'cancel_reminder': 'cancel_reminder',
        'list_reminders': 'calendar_query',
        'create_reminder': 'reminder',
        'general_query': null
    };

    return {
        isPersonal: intent.isPersonal,
        type: intentMap[intent.intent] || null,
        isGroupReminder: intent.isGroupReminder || false,
        confidence: intent.confidence
    };
}

/**
 * Handle personal assistant requests
 * @param {string} message - User's message
 * @param {string} userId - WhatsApp user ID
 * @param {Object} context - Additional context (chat type, chatId, etc.)
 * @returns {Promise<string>} - Response message
 */
async function handlePersonalRequest(message, userId, context = {}) {
    const intent = detectPersonalIntent(message, context);

    console.log(`🤖 Personal intent detected: ${intent.type}`, intent.isGroupReminder ? '(Group reminder)' : '');

    try {
        switch (intent.type) {
            case 'reminder':
                const result = await reminderHandler.handleReminderRequest(message, userId, {
                    isGroupReminder: intent.isGroupReminder,
                    chatId: context.chatId,
                    groupName: context.groupName
                });
                if (typeof result === 'string') {
                    return result;
                } else {
                    // Has confirmation
                    return result.response;
                }

            case 'calendar_query':
                return await reminderHandler.listReminders(userId, {
                    isGroup: context.isGroup,
                    chatId: context.chatId,
                    groupName: context.groupName
                });

            case 'delete_reminder':
                return await reminderHandler.deleteLastReminder(userId);

            case 'confirm_reminder':
                // Get the most recent confirmation for this user
                const confirmationId = Array.from(reminderHandler.pendingConfirmations.keys())
                    .find(id => reminderHandler.pendingConfirmations.get(id).userId === userId);

                if (confirmationId) {
                    return await reminderHandler.handleConfirmation(confirmationId, true);
                }
                return '❌ No pending confirmation found';

            case 'cancel_reminder':
                const cancelId = Array.from(reminderHandler.pendingConfirmations.keys())
                    .find(id => reminderHandler.pendingConfirmations.get(id).userId === userId);

                if (cancelId) {
                    return await reminderHandler.handleConfirmation(cancelId, false);
                }
                return '❌ No pending confirmation found';

            case 'financial':
                return await handleFinancialQuery(message, userId);

            default:
                return null; // Not a personal request
        }
    } catch (error) {
        console.error('❌ Personal assistant error:', error);
        return `❌ Sorry, I encountered an error: ${error.message}`;
    }
}

/**
 * Handle financial queries (placeholder for now)
 */
async function handleFinancialQuery(message, userId) {
    if (!financialAdvisor.initialized) {
        await financialAdvisor.initialize();
    }

    // For now, just acknowledge
    return '💰 Financial advisor coming soon! You\'ll be able to:\n\n' +
        '• Track expenses\n' +
        '• Upload bank statements\n' +
        '• Get spending insights\n' +
        '• Receive personalized advice\n\n' +
        'Stay tuned! 🚀';
}

module.exports = {
    detectPersonalIntent,
    handlePersonalRequest
};

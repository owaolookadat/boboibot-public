// Personal Assistant Module
// Routes personal queries to appropriate handlers (reminders, finance, etc.)

const reminderHandler = require('./reminderHandler');
const financialAdvisor = require('./financialAdvisor');

/**
 * Detect if message is a personal assistant request
 * @param {string} message - User's message
 * @param {Object} context - Chat context (isGroup, etc.)
 * @returns {Object} - { isPersonal: boolean, type: string, isGroupReminder: boolean }
 */
function detectPersonalIntent(message, context = {}) {
    const lower = message.toLowerCase();

    // Group reminder patterns (e.g., "remind me to message this group...")
    const isGroupReminder = /remind\s+me\s+to\s+(message|post|send|tell|text|notify)\s+(this\s+)?(group|chat|here)/i.test(message) ||
                           /remind\s+(this\s+)?(group|chat)/i.test(message);

    // Reminder patterns
    if (/remind\s+me|reminder|set\s+reminder|alert\s+me|notify\s+me/i.test(message)) {
        return {
            isPersonal: true,
            type: 'reminder',
            isGroupReminder: isGroupReminder && context.isGroup
        };
    }

    // Calendar/Schedule patterns
    if (/my\s+schedule|what'?s\s+on|my\s+reminders|list\s+reminders|show\s+reminders/i.test(message)) {
        return { isPersonal: true, type: 'calendar_query' };
    }

    // Delete reminder
    if (/delete\s+(last\s+)?reminder|cancel\s+reminder|remove\s+reminder/i.test(message)) {
        return { isPersonal: true, type: 'delete_reminder' };
    }

    // Confirmation responses (yes/no) - check if there's a pending confirmation
    if (/^(yes|yeah|yep|ok|okay|sure|confirm)$/i.test(message.trim())) {
        if (reminderHandler.pendingConfirmations.size > 0) {
            return { isPersonal: true, type: 'confirm_reminder' };
        }
    }

    if (/^(no|nope|cancel|nevermind|never\s+mind)$/i.test(message.trim())) {
        if (reminderHandler.pendingConfirmations.size > 0) {
            return { isPersonal: true, type: 'cancel_reminder' };
        }
    }

    // Financial patterns
    if (/spent|expense|budget|financial|money|save|saving|debt/i.test(message)) {
        return { isPersonal: true, type: 'financial' };
    }

    return { isPersonal: false, type: null };
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

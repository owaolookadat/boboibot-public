// Main reminder handler
// Orchestrates parsing, confirmation, and calendar creation

const { parseReminder, formatDateTime, formatRecurring } = require('./reminderParser');
const calendarManager = require('./calendarManager');
const fs = require('fs').promises;
const path = require('path');

// Store pending confirmations
const pendingConfirmations = new Map();

// Local reminder storage
const REMINDERS_FILE = path.join(__dirname, 'data', 'reminders.json');

/**
 * Handle reminder request from user
 */
async function handleReminderRequest(message, userId) {
    // Parse the reminder
    const parsed = parseReminder(message);

    console.log('📝 Parsed reminder:', parsed);

    // If confidence is low or needs more info, ask for clarification
    if (parsed.needsMoreInfo || parsed.confidence < 0.7) {
        return askForClarification(parsed, userId);
    }

    // High confidence - create confirmation
    return createConfirmation(parsed, userId);
}

/**
 * Ask for clarification when parsing is ambiguous
 */
function askForClarification(parsed, userId) {
    let response = '🤔 I need more details:\n\n';

    if (!parsed.datetime) {
        response += 'When should I remind you?\n';
        response += 'Examples: "tomorrow at 3pm", "next Monday", "in 2 hours"\n\n';
    }

    if (!parsed.task || parsed.task === 'Reminder') {
        response += 'What should I remind you about?\n';
        response += 'Example: "Remind me to call John at 3pm tomorrow"';
    }

    return response;
}

/**
 * Create confirmation message
 */
function createConfirmation(parsed, userId) {
    const confirmationId = `conf_${Date.now()}_${userId}`;

    // Store pending confirmation
    pendingConfirmations.set(confirmationId, {
        userId,
        parsed,
        timestamp: Date.now()
    });

    // Build confirmation message
    let response = '📋 Confirm reminder details:\n\n';
    response += `📝 Task: "${parsed.task}"\n`;
    response += `📅 When: ${formatDateTime(parsed.datetime)}\n`;

    if (parsed.repeat) {
        response += `🔁 Repeat: ${formatRecurring(parsed.repeat)}\n`;
    }

    response += `\nIs this correct?\n`;
    response += `Reply "yes" to create or "no" to cancel`;

    return {
        response,
        confirmationId,
        requiresConfirmation: true
    };
}

/**
 * Handle confirmation response
 */
async function handleConfirmation(confirmationId, confirmed) {
    const pending = pendingConfirmations.get(confirmationId);

    if (!pending) {
        return '❌ Confirmation expired. Please try again.';
    }

    pendingConfirmations.delete(confirmationId);

    if (!confirmed) {
        return '❌ Reminder cancelled.';
    }

    // Create the reminder
    try {
        const result = await createReminder(pending.parsed, pending.userId);
        return result;
    } catch (error) {
        console.error('Error creating reminder:', error);
        return `❌ Failed to create reminder: ${error.message}`;
    }
}

/**
 * Create reminder in calendar and local storage
 */
async function createReminder(parsed, userId) {
    const reminder = {
        id: `rem_${Date.now()}`,
        userId,
        task: parsed.task,
        datetime: parsed.datetime,
        repeat: parsed.repeat,
        created: new Date().toISOString(),
        calendarEventId: null
    };

    // Try to create in Google Calendar
    try {
        if (calendarManager.initialized) {
            const calResult = await calendarManager.createReminder({
                task: parsed.task,
                datetime: parsed.datetime,
                repeat: parsed.repeat
            });

            reminder.calendarEventId = calResult.eventId;
            reminder.calendarLink = calResult.htmlLink;
        }
    } catch (error) {
        console.warn('⚠️  Calendar creation failed, saving locally only:', error.message);
    }

    // Save to local storage
    await saveReminderLocally(reminder);

    // Build success response
    let response = '✅ Reminder created!\n\n';
    response += `📝 ${parsed.task}\n`;
    response += `📅 ${formatDateTime(parsed.datetime)}\n`;

    if (parsed.repeat) {
        response += `🔁 ${formatRecurring(parsed.repeat)}\n`;
    }

    if (reminder.calendarEventId) {
        response += `\n📱 Added to Google Calendar\n`;
        response += `🔔 You'll get iPhone notifications\n`;
    } else {
        response += `\n💾 Saved locally\n`;
        response += `⚠️  Google Calendar not connected\n`;
    }

    response += `\n⚠️ Wrong? Reply "delete last reminder"`;

    return response;
}

/**
 * Save reminder to local JSON file
 */
async function saveReminderLocally(reminder) {
    try {
        // Ensure data directory exists
        const dataDir = path.dirname(REMINDERS_FILE);
        await fs.mkdir(dataDir, { recursive: true });

        // Read existing reminders
        let reminders = [];
        try {
            const data = await fs.readFile(REMINDERS_FILE, 'utf8');
            reminders = JSON.parse(data);
        } catch (error) {
            // File doesn't exist yet
        }

        // Add new reminder
        reminders.push(reminder);

        // Save
        await fs.writeFile(REMINDERS_FILE, JSON.stringify(reminders, null, 2));

        console.log('✅ Reminder saved locally');
    } catch (error) {
        console.error('❌ Error saving reminder locally:', error);
    }
}

/**
 * List user's reminders
 */
async function listReminders(userId, upcoming = true) {
    try {
        // Try calendar first
        if (calendarManager.initialized) {
            const events = await calendarManager.listUpcomingReminders(10);

            if (events.length === 0) {
                return '📅 No upcoming reminders';
            }

            let response = `📅 Your upcoming reminders (${events.length}):\n\n`;

            events.forEach((event, index) => {
                const start = new Date(event.start.dateTime || event.start.date);
                response += `${index + 1}. ${event.summary}\n`;
                response += `   ${formatDateTime(start)}\n\n`;
            });

            return response;
        }

        // Fallback to local storage
        const data = await fs.readFile(REMINDERS_FILE, 'utf8');
        const reminders = JSON.parse(data);

        const userReminders = reminders
            .filter(r => r.userId === userId)
            .filter(r => upcoming ? new Date(r.datetime) > new Date() : true)
            .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

        if (userReminders.length === 0) {
            return '📅 No reminders found';
        }

        let response = `📅 Your reminders (${userReminders.length}):\n\n`;

        userReminders.slice(0, 10).forEach((reminder, index) => {
            response += `${index + 1}. ${reminder.task}\n`;
            response += `   ${formatDateTime(new Date(reminder.datetime))}\n\n`;
        });

        return response;
    } catch (error) {
        return '📅 No reminders found';
    }
}

/**
 * Delete last reminder
 */
async function deleteLastReminder(userId) {
    try {
        const data = await fs.readFile(REMINDERS_FILE, 'utf8');
        const reminders = JSON.parse(data);

        const userReminders = reminders.filter(r => r.userId === userId);
        const lastReminder = userReminders[userReminders.length - 1];

        if (!lastReminder) {
            return '❌ No reminders to delete';
        }

        // Delete from calendar
        if (lastReminder.calendarEventId && calendarManager.initialized) {
            try {
                await calendarManager.deleteReminder(lastReminder.calendarEventId);
            } catch (error) {
                console.warn('⚠️  Calendar deletion failed:', error.message);
            }
        }

        // Remove from local storage
        const updated = reminders.filter(r => r.id !== lastReminder.id);
        await fs.writeFile(REMINDERS_FILE, JSON.stringify(updated, null, 2));

        return `✅ Deleted: "${lastReminder.task}"`;
    } catch (error) {
        return '❌ Failed to delete reminder';
    }
}

module.exports = {
    handleReminderRequest,
    handleConfirmation,
    listReminders,
    deleteLastReminder,
    pendingConfirmations
};

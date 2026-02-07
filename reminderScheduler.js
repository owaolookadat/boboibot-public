// Reminder Scheduler
// Checks for due reminders and sends WhatsApp notifications

const fs = require('fs').promises;
const path = require('path');

const REMINDERS_FILE = path.join(__dirname, 'data', 'reminders.json');
const CHECK_INTERVAL = 30000; // Check every 30 seconds

class ReminderScheduler {
    constructor() {
        this.whatsappClient = null;
        this.intervalId = null;
        this.cleanupIntervalId = null;
        this.isRunning = false;
    }

    /**
     * Initialize scheduler with WhatsApp client
     */
    initialize(whatsappClient) {
        this.whatsappClient = whatsappClient;
        console.log('⏰ Reminder scheduler initialized');
    }

    /**
     * Start the scheduler
     */
    start() {
        if (this.isRunning) {
            console.log('⚠️  Scheduler already running');
            return;
        }

        if (!this.whatsappClient) {
            console.error('❌ Cannot start scheduler: WhatsApp client not initialized');
            return;
        }

        this.isRunning = true;
        this.intervalId = setInterval(() => this.checkReminders(), CHECK_INTERVAL);
        console.log('✅ Reminder scheduler started (checking every 30s)');

        // Clean up old reminders once a day
        this.cleanupIntervalId = setInterval(() => this.cleanupOldReminders(), 24 * 60 * 60 * 1000);
        // Run cleanup immediately on start
        this.cleanupOldReminders();
    }

    /**
     * Stop the scheduler
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        if (this.cleanupIntervalId) {
            clearInterval(this.cleanupIntervalId);
            this.cleanupIntervalId = null;
        }
        this.isRunning = false;
        console.log('🛑 Reminder scheduler stopped');
    }

    /**
     * Check for due reminders
     */
    async checkReminders() {
        try {
            console.log('🔍 Checking for due reminders...');

            // Read reminders
            const data = await fs.readFile(REMINDERS_FILE, 'utf8');
            const reminders = JSON.parse(data);

            console.log(`📊 Total reminders in file: ${reminders.length}`);

            const now = new Date();
            const dueReminders = reminders.filter(r => {
                const reminderTime = new Date(r.datetime);
                const timeDiff = reminderTime - now;

                // Trigger if within the last 30 seconds (to account for check interval)
                const isDue = timeDiff <= 0 && timeDiff > -30000 && !r.notified;

                if (isDue) {
                    console.log(`⏰ Reminder due: ${r.task} (time diff: ${timeDiff}ms)`);
                }

                return isDue;
            });

            if (dueReminders.length > 0) {
                console.log(`🔔 Found ${dueReminders.length} due reminder(s)`);
            }

            // Send notifications for due reminders
            for (const reminder of dueReminders) {
                await this.sendReminderNotification(reminder);

                // Mark as notified
                reminder.notified = true;
            }

            // Save updated reminders
            if (dueReminders.length > 0) {
                await fs.writeFile(REMINDERS_FILE, JSON.stringify(reminders, null, 2));
            }

        } catch (error) {
            // Silently handle errors (file might not exist yet)
            if (error.code !== 'ENOENT') {
                console.error('❌ Error checking reminders:', error.message);
            }
        }
    }

    /**
     * Send WhatsApp notification for a reminder
     */
    async sendReminderNotification(reminder) {
        try {
            let chatId;
            let message;

            if (reminder.type === 'personal') {
                // Personal reminder: Send to user's DM
                chatId = reminder.userId;
                message = `📌 *Reminder*\n\n${reminder.task}`;
            } else {
                // Business reminder: Send to group
                chatId = reminder.groupChatId;
                message = `📌 *Reminder* (${reminder.groupName})\n\n${reminder.task}`;
            }

            // Send message
            await this.whatsappClient.sendMessage(chatId, message);

            console.log(`✅ Sent reminder notification to ${reminder.type === 'personal' ? 'DM' : 'group'}: ${reminder.task}`);

        } catch (error) {
            console.error(`❌ Failed to send reminder notification: ${error.message}`);
        }
    }

    /**
     * Clean up old reminders (past 7 days and notified)
     */
    async cleanupOldReminders() {
        try {
            const data = await fs.readFile(REMINDERS_FILE, 'utf8');
            const reminders = JSON.parse(data);

            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const activeReminders = reminders.filter(r => {
                const reminderTime = new Date(r.datetime);
                return reminderTime > sevenDaysAgo || !r.notified;
            });

            const removedCount = reminders.length - activeReminders.length;
            if (removedCount > 0) {
                await fs.writeFile(REMINDERS_FILE, JSON.stringify(activeReminders, null, 2));
                console.log(`🧹 Cleaned up ${removedCount} old reminder(s)`);
            }

        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('❌ Error cleaning up reminders:', error.message);
            }
        }
    }
}

module.exports = new ReminderScheduler();

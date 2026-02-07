// Google Calendar integration for reminders
// Handles creating, updating, deleting calendar events

const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');

class CalendarManager {
    constructor() {
        this.calendar = null;
        this.auth = null;
        this.initialized = false;
    }

    /**
     * Initialize Google Calendar API
     */
    async initialize() {
        try {
            // Use SAME credentials as Google Sheets
            const credentialsPath = path.join(__dirname, 'oauth_credentials.json');
            const tokenPath = path.join(__dirname, 'token.json');

            const credentialsExist = await this.fileExists(credentialsPath);
            if (!credentialsExist) {
                console.log('⚠️  Google credentials not found');
                console.log('📝 Need oauth_credentials.json (same as Sheets)');
                return false;
            }

            const credentials = JSON.parse(await fs.readFile(credentialsPath, 'utf8'));

            // Create OAuth2 client
            const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
            const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

            // Check if we have a token
            const tokenExists = await this.fileExists(tokenPath);
            if (tokenExists) {
                const token = JSON.parse(await fs.readFile(tokenPath, 'utf8'));
                oAuth2Client.setCredentials(token);
            } else {
                console.log('⚠️  Google token not found');
                console.log('📝 Calendar will work once you re-authorize with Calendar scope');
                console.log('   Just delete token.json and restart bot to re-authorize');
                return false;
            }

            this.auth = oAuth2Client;
            this.calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
            this.initialized = true;

            console.log('✅ Google Calendar initialized');
            return true;
        } catch (error) {
            console.error('❌ Calendar initialization error:', error.message);
            return false;
        }
    }

    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Create a calendar event (reminder)
     * @param {Object} reminder - { task, datetime, repeat, alertMinutes }
     * @returns {Object} - Created event details
     */
    async createReminder(reminder) {
        if (!this.initialized) {
            throw new Error('Calendar not initialized');
        }

        const { task, datetime, repeat, alertMinutes = [0] } = reminder;

        // Create event object
        const event = {
            summary: `📌 ${task}`,
            description: 'Created via BoboiBot WhatsApp',
            start: {
                dateTime: datetime.toISOString(),
                timeZone: 'Asia/Kuala_Lumpur',
            },
            end: {
                dateTime: new Date(datetime.getTime() + 30 * 60000).toISOString(), // 30 mins default
                timeZone: 'Asia/Kuala_Lumpur',
            },
            reminders: {
                useDefault: false,
                overrides: alertMinutes.map(mins => ({ method: 'popup', minutes: mins })),
            },
            colorId: '9', // Blue
        };

        // Add recurrence if specified
        if (repeat) {
            event.recurrence = [this.buildRecurrenceRule(repeat)];
        }

        try {
            const response = await this.calendar.events.insert({
                calendarId: 'primary',
                resource: event,
            });

            console.log(`✅ Calendar event created: ${response.data.id}`);

            return {
                success: true,
                eventId: response.data.id,
                htmlLink: response.data.htmlLink
            };
        } catch (error) {
            console.error('❌ Error creating calendar event:', error.message);
            throw error;
        }
    }

    /**
     * Build RRULE for recurring events
     */
    buildRecurrenceRule(repeat) {
        switch (repeat.type) {
            case 'daily':
                return `RRULE:FREQ=DAILY;INTERVAL=${repeat.interval || 1}`;

            case 'weekly':
                if (repeat.daysOfWeek && repeat.daysOfWeek.length > 0) {
                    const days = repeat.daysOfWeek.map(d => d.substring(0, 2).toUpperCase()).join(',');
                    return `RRULE:FREQ=WEEKLY;BYDAY=${days}`;
                }
                return `RRULE:FREQ=WEEKLY;INTERVAL=${repeat.interval || 1}`;

            case 'monthly':
                if (repeat.dayOfMonth) {
                    return `RRULE:FREQ=MONTHLY;BYMONTHDAY=${repeat.dayOfMonth}`;
                }
                return `RRULE:FREQ=MONTHLY;INTERVAL=${repeat.interval || 1}`;

            default:
                return null;
        }
    }

    /**
     * Delete a calendar event
     */
    async deleteReminder(eventId) {
        if (!this.initialized) {
            throw new Error('Calendar not initialized');
        }

        try {
            await this.calendar.events.delete({
                calendarId: 'primary',
                eventId: eventId,
            });

            console.log(`✅ Calendar event deleted: ${eventId}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Error deleting calendar event:', error.message);
            throw error;
        }
    }

    /**
     * List upcoming reminders
     */
    async listUpcomingReminders(maxResults = 10) {
        if (!this.initialized) {
            throw new Error('Calendar not initialized');
        }

        try {
            const response = await this.calendar.events.list({
                calendarId: 'primary',
                timeMin: new Date().toISOString(),
                maxResults: maxResults,
                singleEvents: true,
                orderBy: 'startTime',
                q: '📌', // Search for our reminder prefix
            });

            return response.data.items || [];
        } catch (error) {
            console.error('❌ Error listing calendar events:', error.message);
            throw error;
        }
    }
}

module.exports = new CalendarManager();

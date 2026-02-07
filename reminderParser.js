// Natural language date/time parser for reminders
// Uses chrono-node for robust date parsing

const chrono = require('chrono-node');

/**
 * Parse natural language into structured reminder data
 * @param {string} input - User's message (e.g., "Remind me to call John at 3pm tomorrow")
 * @returns {Object} - Parsed reminder { task, datetime, repeat, confidence }
 */
function parseReminder(input) {
    // Extract the task (what to remind about)
    const task = extractTask(input);

    // Parse date and time using chrono
    const parsedDate = chrono.parse(input, new Date(), { forwardDate: true });

    if (parsedDate.length === 0) {
        return {
            task: task || input,
            datetime: null,
            repeat: null,
            confidence: 0.3,
            needsMoreInfo: true
        };
    }

    const result = parsedDate[0];
    const datetime = result.start.date();

    // Detect recurring patterns
    const repeat = detectRecurring(input);

    // Calculate confidence based on how specific the date/time is
    const confidence = calculateConfidence(result, input);

    return {
        task: task || 'Reminder',
        datetime: datetime,
        repeat: repeat,
        confidence: confidence,
        needsMoreInfo: confidence < 0.7
    };
}

/**
 * Extract the task description from the input
 */
function extractTask(input) {
    // Remove common reminder prefixes
    let task = input
        .replace(/^(remind me to|reminder to|remind me|reminder:?)/i, '')
        .replace(/^(set (a )?reminder (to|for)?)/i, '')
        .trim();

    // Remove time expressions from the end
    task = task.replace(/(at |on |in |every |tomorrow|today|next|this|morning|afternoon|evening|night|\d+:\d+|am|pm).*$/i, '').trim();

    return task || null;
}

/**
 * Detect recurring patterns
 */
function detectRecurring(input) {
    const lowerInput = input.toLowerCase();

    // Daily patterns
    if (/every day|daily|each day/i.test(input)) {
        return { type: 'daily', interval: 1 };
    }

    // Weekly patterns
    const weeklyMatch = input.match(/every (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
    if (weeklyMatch) {
        return {
            type: 'weekly',
            interval: 1,
            daysOfWeek: [weeklyMatch[1].toLowerCase()]
        };
    }

    // Multiple days per week
    const multiDayMatch = input.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:,?\s+(?:and\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday))+/gi);
    if (multiDayMatch && /every/i.test(input)) {
        const days = multiDayMatch[0].match(/monday|tuesday|wednesday|thursday|friday|saturday|sunday/gi).map(d => d.toLowerCase());
        return {
            type: 'weekly',
            interval: 1,
            daysOfWeek: days
        };
    }

    // Monthly patterns
    if (/every month|monthly/i.test(input)) {
        const dayMatch = input.match(/(\d+)(st|nd|rd|th)?/);
        return {
            type: 'monthly',
            interval: 1,
            dayOfMonth: dayMatch ? parseInt(dayMatch[1]) : 1
        };
    }

    return null;
}

/**
 * Calculate confidence score
 */
function calculateConfidence(chronoResult, input) {
    let confidence = 0.5;

    // Has specific time
    if (chronoResult.start.get('hour') !== null) {
        confidence += 0.2;
    }

    // Has specific date
    if (chronoResult.start.get('day') !== null) {
        confidence += 0.15;
    }

    // Contains clear reminder keywords
    if (/remind|reminder|alert|notify/i.test(input)) {
        confidence += 0.15;
    }

    // Cap at 1.0
    return Math.min(confidence, 1.0);
}

/**
 * Format datetime for display
 */
function formatDateTime(datetime) {
    if (!datetime) return null;

    const now = new Date();
    const diff = datetime - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    const timeStr = datetime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    const dateStr = datetime.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    // Relative descriptions
    if (days === 0) {
        return `Today at ${timeStr}`;
    } else if (days === 1) {
        return `Tomorrow at ${timeStr}`;
    } else if (days < 7) {
        return `${dateStr.split(',')[0]} at ${timeStr}`;
    } else {
        return `${dateStr} at ${timeStr}`;
    }
}

/**
 * Format recurring pattern for display
 */
function formatRecurring(repeat) {
    if (!repeat) return null;

    switch (repeat.type) {
        case 'daily':
            return 'Every day';

        case 'weekly':
            if (repeat.daysOfWeek && repeat.daysOfWeek.length > 0) {
                const days = repeat.daysOfWeek.map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ');
                return `Every ${days}`;
            }
            return 'Every week';

        case 'monthly':
            return `Every month on the ${repeat.dayOfMonth}${getOrdinalSuffix(repeat.dayOfMonth)}`;

        default:
            return 'Recurring';
    }
}

function getOrdinalSuffix(num) {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
}

module.exports = {
    parseReminder,
    formatDateTime,
    formatRecurring
};

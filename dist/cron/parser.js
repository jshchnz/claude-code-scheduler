import { Cron } from 'croner';
/**
 * Validate a cron expression
 */
export function validateCron(expression) {
    try {
        // Croner will throw if invalid
        new Cron(expression);
        return { valid: true };
    }
    catch (error) {
        return {
            valid: false,
            error: error instanceof Error ? error.message : 'Invalid cron expression',
        };
    }
}
/**
 * Get the next N run times for a cron expression
 */
export function getNextRuns(expression, count = 5, timezone) {
    const cron = new Cron(expression, {
        timezone: timezone === 'local' ? undefined : timezone,
    });
    const runs = [];
    let next = cron.nextRun();
    while (next && runs.length < count) {
        runs.push(next);
        next = cron.nextRun(next);
    }
    return runs;
}
/**
 * Get the next run time for a cron expression
 */
export function getNextRun(expression, timezone) {
    const runs = getNextRuns(expression, 1, timezone);
    return runs[0] || null;
}
/**
 * Common cron presets with human-readable names
 */
export const CRON_PRESETS = {
    'every-minute': {
        expression: '* * * * *',
        description: 'Every minute',
    },
    'every-5-minutes': {
        expression: '*/5 * * * *',
        description: 'Every 5 minutes',
    },
    'every-15-minutes': {
        expression: '*/15 * * * *',
        description: 'Every 15 minutes',
    },
    'every-30-minutes': {
        expression: '*/30 * * * *',
        description: 'Every 30 minutes',
    },
    'hourly': {
        expression: '0 * * * *',
        description: 'Every hour',
    },
    'daily-midnight': {
        expression: '0 0 * * *',
        description: 'Daily at midnight',
    },
    'daily-9am': {
        expression: '0 9 * * *',
        description: 'Daily at 9:00 AM',
    },
    'daily-6pm': {
        expression: '0 18 * * *',
        description: 'Daily at 6:00 PM',
    },
    'weekdays-9am': {
        expression: '0 9 * * 1-5',
        description: 'Weekdays at 9:00 AM',
    },
    'weekly-monday': {
        expression: '0 9 * * 1',
        description: 'Every Monday at 9:00 AM',
    },
    'weekly-friday': {
        expression: '0 17 * * 5',
        description: 'Every Friday at 5:00 PM',
    },
    'monthly-first': {
        expression: '0 9 1 * *',
        description: 'First day of month at 9:00 AM',
    },
};
/**
 * Try to parse natural language into a cron expression
 * Returns undefined if parsing fails
 */
export function naturalLanguageToCron(input) {
    const lower = input.toLowerCase().trim();
    // Check presets first
    for (const [, preset] of Object.entries(CRON_PRESETS)) {
        if (lower === preset.description.toLowerCase()) {
            return preset.expression;
        }
    }
    // Common patterns
    const patterns = [
        // Every X minutes
        [/^every\s+(\d+)\s+minutes?$/i, (m) => `*/${m[1]} * * * *`],
        // Every X hours
        [/^every\s+(\d+)\s+hours?$/i, (m) => `0 */${m[1]} * * *`],
        // Every hour
        [/^every\s+hour$/i, '0 * * * *'],
        [/^hourly$/i, '0 * * * *'],
        // Daily at X
        [/^daily\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i, (m) => {
                let hour = parseInt(m[1], 10);
                const minute = m[2] ? parseInt(m[2], 10) : 0;
                const period = m[3]?.toLowerCase();
                if (period === 'pm' && hour < 12)
                    hour += 12;
                if (period === 'am' && hour === 12)
                    hour = 0;
                return `${minute} ${hour} * * *`;
            }],
        // Every day at X
        [/^every\s+day\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i, (m) => {
                let hour = parseInt(m[1], 10);
                const minute = m[2] ? parseInt(m[2], 10) : 0;
                const period = m[3]?.toLowerCase();
                if (period === 'pm' && hour < 12)
                    hour += 12;
                if (period === 'am' && hour === 12)
                    hour = 0;
                return `${minute} ${hour} * * *`;
            }],
        // Weekdays at X
        [/^(?:every\s+)?weekdays?\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i, (m) => {
                let hour = parseInt(m[1], 10);
                const minute = m[2] ? parseInt(m[2], 10) : 0;
                const period = m[3]?.toLowerCase();
                if (period === 'pm' && hour < 12)
                    hour += 12;
                if (period === 'am' && hour === 12)
                    hour = 0;
                return `${minute} ${hour} * * 1-5`;
            }],
        // Every Monday/Tuesday/etc at X
        [/^every\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i, (m) => {
                const days = {
                    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
                    thursday: 4, friday: 5, saturday: 6,
                };
                const day = days[m[1].toLowerCase()];
                let hour = parseInt(m[2], 10);
                const minute = m[3] ? parseInt(m[3], 10) : 0;
                const period = m[4]?.toLowerCase();
                if (period === 'pm' && hour < 12)
                    hour += 12;
                if (period === 'am' && hour === 12)
                    hour = 0;
                return `${minute} ${hour} * * ${day}`;
            }],
        // Weekly (defaults to Monday 9am)
        [/^weekly$/i, '0 9 * * 1'],
        // Monthly (defaults to 1st at 9am)
        [/^monthly$/i, '0 9 1 * *'],
    ];
    for (const [pattern, result] of patterns) {
        const match = lower.match(pattern);
        if (match) {
            if (typeof result === 'function') {
                return result(match);
            }
            return result;
        }
    }
    return undefined;
}
//# sourceMappingURL=parser.js.map
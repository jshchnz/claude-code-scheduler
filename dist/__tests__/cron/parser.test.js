import { describe, it, expect } from 'vitest';
import { validateCron, getNextRuns, getNextRun, naturalLanguageToCron, CRON_PRESETS, } from '../../cron/parser.js';
describe('validateCron', () => {
    it('accepts valid cron expressions', () => {
        expect(validateCron('* * * * *').valid).toBe(true);
        expect(validateCron('0 9 * * *').valid).toBe(true);
        expect(validateCron('0 9 * * 1-5').valid).toBe(true);
        expect(validateCron('*/15 * * * *').valid).toBe(true);
        expect(validateCron('0 */2 * * *').valid).toBe(true);
        expect(validateCron('0 9 1 * *').valid).toBe(true);
        expect(validateCron('30 8 * * 1').valid).toBe(true);
    });
    it('rejects invalid cron expressions', () => {
        expect(validateCron('invalid').valid).toBe(false);
        expect(validateCron('').valid).toBe(false);
        expect(validateCron('* * *').valid).toBe(false); // too few fields
        expect(validateCron('60 * * * *').valid).toBe(false); // minute > 59
        expect(validateCron('* 25 * * *').valid).toBe(false); // hour > 23
    });
    it('returns error message for invalid expressions', () => {
        const result = validateCron('invalid');
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
    });
});
describe('getNextRuns', () => {
    it('returns the correct number of runs', () => {
        const runs = getNextRuns('* * * * *', 5);
        expect(runs).toHaveLength(5);
    });
    it('returns dates in chronological order', () => {
        const runs = getNextRuns('0 9 * * *', 3);
        for (let i = 1; i < runs.length; i++) {
            expect(runs[i].getTime()).toBeGreaterThan(runs[i - 1].getTime());
        }
    });
    it('returns Date objects', () => {
        const runs = getNextRuns('0 9 * * *', 1);
        expect(runs[0]).toBeInstanceOf(Date);
    });
});
describe('getNextRun', () => {
    it('returns a single Date', () => {
        const next = getNextRun('0 9 * * *');
        expect(next).toBeInstanceOf(Date);
    });
    it('returns a future date', () => {
        const next = getNextRun('* * * * *');
        expect(next).not.toBeNull();
        expect(next.getTime()).toBeGreaterThan(Date.now());
    });
});
describe('CRON_PRESETS', () => {
    it('contains common presets', () => {
        expect(CRON_PRESETS['every-minute']).toBeDefined();
        expect(CRON_PRESETS['hourly']).toBeDefined();
        expect(CRON_PRESETS['daily-9am']).toBeDefined();
        expect(CRON_PRESETS['weekdays-9am']).toBeDefined();
        expect(CRON_PRESETS['weekly-monday']).toBeDefined();
    });
    it('all presets have valid cron expressions', () => {
        for (const [name, preset] of Object.entries(CRON_PRESETS)) {
            const result = validateCron(preset.expression);
            expect(result.valid, `Preset "${name}" should be valid`).toBe(true);
        }
    });
    it('all presets have descriptions', () => {
        for (const [name, preset] of Object.entries(CRON_PRESETS)) {
            expect(preset.description, `Preset "${name}" should have description`).toBeTruthy();
        }
    });
});
describe('naturalLanguageToCron', () => {
    describe('time intervals', () => {
        it('parses "every X minutes"', () => {
            expect(naturalLanguageToCron('every 5 minutes')).toBe('*/5 * * * *');
            expect(naturalLanguageToCron('every 15 minutes')).toBe('*/15 * * * *');
            expect(naturalLanguageToCron('every 30 minutes')).toBe('*/30 * * * *');
        });
        it('parses "every X hours"', () => {
            expect(naturalLanguageToCron('every 2 hours')).toBe('0 */2 * * *');
            expect(naturalLanguageToCron('every 4 hours')).toBe('0 */4 * * *');
        });
        it('parses "every hour" and "hourly"', () => {
            expect(naturalLanguageToCron('every hour')).toBe('0 * * * *');
            expect(naturalLanguageToCron('hourly')).toBe('0 * * * *');
        });
    });
    describe('daily schedules', () => {
        it('parses "daily at X"', () => {
            expect(naturalLanguageToCron('daily at 9am')).toBe('0 9 * * *');
            expect(naturalLanguageToCron('daily at 9:30am')).toBe('30 9 * * *');
            expect(naturalLanguageToCron('daily at 6pm')).toBe('0 18 * * *');
            expect(naturalLanguageToCron('daily at 12pm')).toBe('0 12 * * *');
        });
        it('parses "every day at X"', () => {
            expect(naturalLanguageToCron('every day at 9am')).toBe('0 9 * * *');
            expect(naturalLanguageToCron('every day at 10:15pm')).toBe('15 22 * * *');
        });
    });
    describe('weekday schedules', () => {
        it('parses "weekdays at X"', () => {
            expect(naturalLanguageToCron('weekdays at 9am')).toBe('0 9 * * 1-5');
            expect(naturalLanguageToCron('weekday at 8:30am')).toBe('30 8 * * 1-5');
        });
        it('parses "every weekday at X"', () => {
            expect(naturalLanguageToCron('every weekday at 9am')).toBe('0 9 * * 1-5');
        });
    });
    describe('specific day schedules', () => {
        it('parses "every Monday at X"', () => {
            expect(naturalLanguageToCron('every monday at 9am')).toBe('0 9 * * 1');
            expect(naturalLanguageToCron('every Monday at 10am')).toBe('0 10 * * 1');
        });
        it('parses other days of the week', () => {
            expect(naturalLanguageToCron('every tuesday at 9am')).toBe('0 9 * * 2');
            expect(naturalLanguageToCron('every wednesday at 9am')).toBe('0 9 * * 3');
            expect(naturalLanguageToCron('every thursday at 9am')).toBe('0 9 * * 4');
            expect(naturalLanguageToCron('every friday at 5pm')).toBe('0 17 * * 5');
            expect(naturalLanguageToCron('every saturday at 10am')).toBe('0 10 * * 6');
            expect(naturalLanguageToCron('every sunday at 9am')).toBe('0 9 * * 0');
        });
    });
    describe('shorthand schedules', () => {
        it('parses "weekly"', () => {
            expect(naturalLanguageToCron('weekly')).toBe('0 9 * * 1');
        });
        it('parses "monthly"', () => {
            expect(naturalLanguageToCron('monthly')).toBe('0 9 1 * *');
        });
    });
    describe('edge cases', () => {
        it('handles AM/PM correctly', () => {
            expect(naturalLanguageToCron('daily at 12am')).toBe('0 0 * * *'); // midnight
            expect(naturalLanguageToCron('daily at 12pm')).toBe('0 12 * * *'); // noon
        });
        it('returns undefined for unrecognized patterns', () => {
            expect(naturalLanguageToCron('some random text')).toBeUndefined();
            expect(naturalLanguageToCron('tomorrow at 3pm')).toBeUndefined(); // one-time, not cron
        });
        it('is case insensitive', () => {
            expect(naturalLanguageToCron('DAILY AT 9AM')).toBe('0 9 * * *');
            expect(naturalLanguageToCron('Every Monday at 9AM')).toBe('0 9 * * 1');
        });
    });
});
//# sourceMappingURL=parser.test.js.map
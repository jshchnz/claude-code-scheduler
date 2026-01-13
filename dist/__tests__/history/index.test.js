import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import { getHistoryPath, createHistoryRecord, completeHistoryRecord, recordExecution, getRecentExecutions, getExecutionById, getExecutionStats, cleanupOldHistory, formatProjectPath, getStatusIcon, formatTimeAgo, formatDuration, } from '../../history/index.js';
describe('formatProjectPath', () => {
    it('replaces home directory with ~', () => {
        const home = os.homedir();
        expect(formatProjectPath(`${home}/projects/app`)).toBe('~/projects/app');
        expect(formatProjectPath(`${home}/Documents/code`)).toBe('~/Documents/code');
    });
    it('keeps paths outside home directory unchanged', () => {
        expect(formatProjectPath('/var/www/app')).toBe('/var/www/app');
        expect(formatProjectPath('/tmp/test')).toBe('/tmp/test');
    });
});
describe('getStatusIcon', () => {
    it('returns correct icon for each status', () => {
        expect(getStatusIcon('success')).toContain('OK');
        expect(getStatusIcon('failure')).toContain('FAIL');
        expect(getStatusIcon('timeout')).toContain('TIMEOUT');
        expect(getStatusIcon('skipped')).toContain('SKIP');
        expect(getStatusIcon('running')).toContain('RUN');
    });
});
describe('formatTimeAgo', () => {
    it('formats recent times as "just now"', () => {
        const now = new Date();
        expect(formatTimeAgo(now)).toBe('just now');
    });
    it('formats minutes ago', () => {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        expect(formatTimeAgo(fiveMinutesAgo)).toBe('5 minutes ago');
    });
    it('formats hours ago', () => {
        const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
        expect(formatTimeAgo(threeHoursAgo)).toBe('3 hours ago');
    });
    it('formats yesterday with time', () => {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const result = formatTimeAgo(yesterday);
        expect(result).toMatch(/Yesterday/);
    });
    it('formats days ago', () => {
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        expect(formatTimeAgo(threeDaysAgo)).toBe('3 days ago');
    });
    it('accepts string dates', () => {
        const isoDate = new Date(Date.now() - 2 * 60 * 1000).toISOString();
        expect(formatTimeAgo(isoDate)).toBe('2 minutes ago');
    });
});
describe('formatDuration', () => {
    it('formats milliseconds', () => {
        expect(formatDuration(500)).toBe('500ms');
        expect(formatDuration(0)).toBe('0ms');
    });
    it('formats seconds', () => {
        expect(formatDuration(1000)).toBe('1s');
        expect(formatDuration(45000)).toBe('45s');
    });
    it('formats minutes and seconds', () => {
        expect(formatDuration(60000)).toBe('1m');
        expect(formatDuration(90000)).toBe('1m 30s');
        expect(formatDuration(125000)).toBe('2m 5s');
    });
    it('formats hours and minutes', () => {
        expect(formatDuration(3600000)).toBe('1h');
        expect(formatDuration(5400000)).toBe('1h 30m');
    });
    it('handles undefined', () => {
        expect(formatDuration(undefined)).toBe('-');
    });
});
describe('createHistoryRecord', () => {
    it('creates a valid history record', () => {
        const record = createHistoryRecord('task-123', 'Daily Review', '/Users/home/projects/app', 'scheduled');
        expect(record.id).toBeTruthy();
        expect(record.taskId).toBe('task-123');
        expect(record.taskName).toBe('Daily Review');
        expect(record.project).toBe('/Users/home/projects/app');
        expect(record.triggeredBy).toBe('scheduled');
        expect(record.status).toBe('running');
        expect(record.startedAt).toBeTruthy();
    });
    it('includes optional cronExpression', () => {
        const record = createHistoryRecord('task-123', 'Daily Review', '/projects/app', 'scheduled', { cronExpression: '0 9 * * 1-5' });
        expect(record.cronExpression).toBe('0 9 * * 1-5');
    });
    it('generates unique IDs', () => {
        const record1 = createHistoryRecord('t1', 'Task 1', '/p1', 'manual');
        const record2 = createHistoryRecord('t2', 'Task 2', '/p2', 'manual');
        expect(record1.id).not.toBe(record2.id);
    });
});
describe('completeHistoryRecord', () => {
    it('completes a record with success', () => {
        const initial = createHistoryRecord('task-123', 'Test Task', '/project', 'manual');
        // Wait a bit to ensure duration > 0
        const completed = completeHistoryRecord(initial, {
            status: 'success',
            output: 'Task completed successfully',
            exitCode: 0,
        });
        expect(completed.status).toBe('success');
        expect(completed.completedAt).toBeTruthy();
        expect(completed.output).toBe('Task completed successfully');
        expect(completed.exitCode).toBe(0);
        expect(completed.duration).toBeGreaterThanOrEqual(0);
    });
    it('completes a record with failure', () => {
        const initial = createHistoryRecord('task-123', 'Test Task', '/project', 'manual');
        const completed = completeHistoryRecord(initial, {
            status: 'failure',
            error: 'Command not found',
            exitCode: 127,
        });
        expect(completed.status).toBe('failure');
        expect(completed.error).toBe('Command not found');
        expect(completed.exitCode).toBe(127);
    });
    it('preserves original record fields', () => {
        const initial = createHistoryRecord('task-123', 'Test Task', '/project', 'scheduled', { cronExpression: '0 9 * * *' });
        const completed = completeHistoryRecord(initial, {
            status: 'success',
        });
        expect(completed.taskId).toBe(initial.taskId);
        expect(completed.taskName).toBe(initial.taskName);
        expect(completed.project).toBe(initial.project);
        expect(completed.startedAt).toBe(initial.startedAt);
        expect(completed.cronExpression).toBe(initial.cronExpression);
    });
});
describe('getHistoryPath', () => {
    it('returns path in .claude directory', () => {
        const historyPath = getHistoryPath();
        expect(historyPath).toContain('.claude');
        expect(historyPath).toContain('execution-history.jsonl');
    });
});
// Integration tests that use the filesystem
describe('history file operations', () => {
    const testDir = path.join(os.tmpdir(), `claude-scheduler-test-${Date.now()}`);
    const originalHome = process.env.HOME;
    beforeEach(async () => {
        await fs.ensureDir(testDir);
        // Mock HOME to use test directory
        process.env.HOME = testDir;
    });
    afterEach(async () => {
        process.env.HOME = originalHome;
        await fs.remove(testDir);
    });
    it('records and retrieves executions', async () => {
        const record = createHistoryRecord('task-1', 'Test Task', '/projects/test', 'manual');
        const completed = completeHistoryRecord(record, {
            status: 'success',
            exitCode: 0,
        });
        await recordExecution(completed);
        const executions = await getRecentExecutions();
        expect(executions).toHaveLength(1);
        expect(executions[0].taskId).toBe('task-1');
        expect(executions[0].taskName).toBe('Test Task');
    });
    it('retrieves execution by ID', async () => {
        const record = createHistoryRecord('task-2', 'Another Task', '/projects/another', 'scheduled');
        const completed = completeHistoryRecord(record, {
            status: 'success',
        });
        await recordExecution(completed);
        const found = await getExecutionById(completed.id);
        expect(found).toBeDefined();
        expect(found?.id).toBe(completed.id);
        expect(found?.taskName).toBe('Another Task');
    });
    it('filters executions by status', async () => {
        // Add success
        const success = completeHistoryRecord(createHistoryRecord('t1', 'Success Task', '/p1', 'manual'), { status: 'success' });
        await recordExecution(success);
        // Add failure
        const failure = completeHistoryRecord(createHistoryRecord('t2', 'Failed Task', '/p2', 'manual'), { status: 'failure' });
        await recordExecution(failure);
        const failures = await getRecentExecutions({ status: 'failure' });
        expect(failures).toHaveLength(1);
        expect(failures[0].taskName).toBe('Failed Task');
        const successes = await getRecentExecutions({ status: 'success' });
        expect(successes).toHaveLength(1);
        expect(successes[0].taskName).toBe('Success Task');
    });
    it('filters executions by task name', async () => {
        await recordExecution(completeHistoryRecord(createHistoryRecord('t1', 'Code Review', '/p1', 'manual'), { status: 'success' }));
        await recordExecution(completeHistoryRecord(createHistoryRecord('t2', 'Test Suite', '/p2', 'manual'), { status: 'success' }));
        const reviews = await getRecentExecutions({ taskName: 'Review' });
        expect(reviews).toHaveLength(1);
        expect(reviews[0].taskName).toBe('Code Review');
    });
    it('limits results', async () => {
        // Add 5 records
        for (let i = 0; i < 5; i++) {
            await recordExecution(completeHistoryRecord(createHistoryRecord(`t${i}`, `Task ${i}`, '/p', 'manual'), { status: 'success' }));
        }
        const limited = await getRecentExecutions({ limit: 3 });
        expect(limited).toHaveLength(3);
    });
    it('returns stats correctly', async () => {
        // Add mixed results
        await recordExecution(completeHistoryRecord(createHistoryRecord('t1', 'Task 1', '/p', 'manual'), { status: 'success' }));
        await recordExecution(completeHistoryRecord(createHistoryRecord('t2', 'Task 2', '/p', 'manual'), { status: 'success' }));
        await recordExecution(completeHistoryRecord(createHistoryRecord('t3', 'Task 3', '/p', 'manual'), { status: 'failure' }));
        const stats = await getExecutionStats();
        expect(stats.total).toBe(3);
        expect(stats.success).toBe(2);
        expect(stats.failure).toBe(1);
    });
    it('cleans up old history', async () => {
        // Add old record (simulate by directly writing to file)
        const historyPath = getHistoryPath();
        await fs.ensureDir(path.dirname(historyPath));
        const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000); // 40 days ago
        const oldRecord = {
            id: crypto.randomUUID(),
            taskId: 'old-task',
            taskName: 'Old Task',
            project: '/old',
            startedAt: oldDate.toISOString(),
            completedAt: oldDate.toISOString(),
            status: 'success',
            triggeredBy: 'scheduled',
        };
        await fs.appendFile(historyPath, JSON.stringify(oldRecord) + '\n');
        // Add recent record
        await recordExecution(completeHistoryRecord(createHistoryRecord('new', 'New Task', '/new', 'manual'), { status: 'success' }));
        // Cleanup with 30 day retention
        const removed = await cleanupOldHistory(30);
        expect(removed).toBe(1);
        // Verify only new record remains
        const remaining = await getRecentExecutions({ limit: 100 });
        expect(remaining).toHaveLength(1);
        expect(remaining[0].taskName).toBe('New Task');
    });
});
//# sourceMappingURL=index.test.js.map
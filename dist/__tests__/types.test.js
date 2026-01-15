import { describe, it, expect } from 'vitest';
import { CronTriggerSchema, ExecutionConfigSchema, ScheduledTaskSchema, SchedulesConfigSchema, WorktreeConfigSchema, createEmptyConfig, generateTaskId, createTask, } from '../types.js';
describe('CronTriggerSchema', () => {
    it('validates a valid cron trigger', () => {
        const trigger = {
            type: 'cron',
            expression: '0 9 * * *',
        };
        expect(() => CronTriggerSchema.parse(trigger)).not.toThrow();
    });
    it('sets default timezone to local', () => {
        const trigger = {
            type: 'cron',
            expression: '0 9 * * *',
        };
        const parsed = CronTriggerSchema.parse(trigger);
        expect(parsed.timezone).toBe('local');
    });
    it('allows custom timezone', () => {
        const trigger = {
            type: 'cron',
            expression: '0 9 * * *',
            timezone: 'America/New_York',
        };
        const parsed = CronTriggerSchema.parse(trigger);
        expect(parsed.timezone).toBe('America/New_York');
    });
    it('rejects missing expression', () => {
        const trigger = {
            type: 'cron',
        };
        expect(() => CronTriggerSchema.parse(trigger)).toThrow();
    });
});
describe('ExecutionConfigSchema', () => {
    it('validates a minimal execution config', () => {
        const config = {
            command: 'echo hello',
        };
        expect(() => ExecutionConfigSchema.parse(config)).not.toThrow();
    });
    it('sets default values', () => {
        const config = {
            command: 'echo hello',
        };
        const parsed = ExecutionConfigSchema.parse(config);
        expect(parsed.workingDirectory).toBe('.');
        expect(parsed.timeout).toBe(300);
    });
    it('rejects empty command', () => {
        const config = {
            command: '',
        };
        expect(() => ExecutionConfigSchema.parse(config)).toThrow();
    });
    it('rejects negative timeout', () => {
        const config = {
            command: 'echo hello',
            timeout: -1,
        };
        expect(() => ExecutionConfigSchema.parse(config)).toThrow();
    });
    it('allows custom env variables', () => {
        const config = {
            command: 'echo hello',
            env: { MY_VAR: 'value' },
        };
        const parsed = ExecutionConfigSchema.parse(config);
        expect(parsed.env).toEqual({ MY_VAR: 'value' });
    });
});
describe('ScheduledTaskSchema', () => {
    it('validates a complete task', () => {
        const task = createTask('Test Task', '0 9 * * *', 'echo hello');
        expect(() => ScheduledTaskSchema.parse(task)).not.toThrow();
    });
    it('rejects task without id', () => {
        const task = {
            name: 'Test',
            trigger: { type: 'cron', expression: '0 9 * * *' },
            execution: { command: 'echo' },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        expect(() => ScheduledTaskSchema.parse(task)).toThrow();
    });
    it('rejects task without name', () => {
        const task = {
            id: 'test-id',
            trigger: { type: 'cron', expression: '0 9 * * *' },
            execution: { command: 'echo' },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        expect(() => ScheduledTaskSchema.parse(task)).toThrow();
    });
    it('defaults enabled to true', () => {
        const task = createTask('Test', '0 9 * * *', 'echo');
        const parsed = ScheduledTaskSchema.parse(task);
        expect(parsed.enabled).toBe(true);
    });
    it('defaults tags to empty array', () => {
        const task = createTask('Test', '0 9 * * *', 'echo');
        const parsed = ScheduledTaskSchema.parse(task);
        expect(parsed.tags).toEqual([]);
    });
});
describe('SchedulesConfigSchema', () => {
    it('validates an empty config', () => {
        const config = createEmptyConfig();
        expect(() => SchedulesConfigSchema.parse(config)).not.toThrow();
    });
    it('validates a config with tasks', () => {
        const config = createEmptyConfig();
        config.tasks.push(createTask('Test', '0 9 * * *', 'echo'));
        expect(() => SchedulesConfigSchema.parse(config)).not.toThrow();
    });
    it('requires version to be 1', () => {
        const config = {
            version: 2,
            tasks: [],
        };
        expect(() => SchedulesConfigSchema.parse(config)).toThrow();
    });
});
describe('createEmptyConfig', () => {
    it('creates a valid config', () => {
        const config = createEmptyConfig();
        expect(() => SchedulesConfigSchema.parse(config)).not.toThrow();
    });
    it('has version 1', () => {
        const config = createEmptyConfig();
        expect(config.version).toBe(1);
    });
    it('has empty tasks array', () => {
        const config = createEmptyConfig();
        expect(config.tasks).toEqual([]);
    });
    it('has default settings', () => {
        const config = createEmptyConfig();
        expect(config.settings?.defaultTimezone).toBe('local');
        expect(config.settings?.logRetentionDays).toBe(30);
        expect(config.settings?.maxExecutionHistory).toBe(100);
    });
});
describe('generateTaskId', () => {
    it('returns a string', () => {
        const id = generateTaskId();
        expect(typeof id).toBe('string');
    });
    it('returns a UUID format', () => {
        const id = generateTaskId();
        // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
        expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });
    it('generates unique IDs', () => {
        const ids = new Set();
        for (let i = 0; i < 100; i++) {
            ids.add(generateTaskId());
        }
        expect(ids.size).toBe(100);
    });
});
describe('createTask', () => {
    it('creates a valid task with required fields', () => {
        const task = createTask('My Task', '0 9 * * *', 'echo hello');
        expect(task.name).toBe('My Task');
        expect(task.trigger.expression).toBe('0 9 * * *');
        expect(task.execution.command).toBe('echo hello');
    });
    it('generates an id', () => {
        const task = createTask('Test', '0 9 * * *', 'echo');
        expect(task.id).toBeTruthy();
        expect(task.id.length).toBeGreaterThan(0);
    });
    it('sets timestamps', () => {
        const before = new Date().toISOString();
        const task = createTask('Test', '0 9 * * *', 'echo');
        const after = new Date().toISOString();
        expect(task.createdAt >= before).toBe(true);
        expect(task.createdAt <= after).toBe(true);
        expect(task.updatedAt).toBe(task.createdAt);
    });
    it('sets default values', () => {
        const task = createTask('Test', '0 9 * * *', 'echo');
        expect(task.enabled).toBe(true);
        expect(task.trigger.timezone).toBe('local');
        expect(task.execution.workingDirectory).toBe('.');
        expect(task.execution.timeout).toBe(300);
        expect(task.tags).toEqual([]);
    });
    it('accepts optional parameters', () => {
        const task = createTask('Test', '0 9 * * *', 'echo', {
            description: 'My description',
            workingDirectory: '/tmp',
            timeout: 600,
            timezone: 'UTC',
            tags: ['test', 'example'],
        });
        expect(task.description).toBe('My description');
        expect(task.execution.workingDirectory).toBe('/tmp');
        expect(task.execution.timeout).toBe(600);
        expect(task.trigger.timezone).toBe('UTC');
        expect(task.tags).toEqual(['test', 'example']);
    });
});
describe('WorktreeConfigSchema', () => {
    it('validates a minimal worktree config', () => {
        const config = { enabled: true };
        expect(() => WorktreeConfigSchema.parse(config)).not.toThrow();
    });
    it('sets default values', () => {
        const config = { enabled: true };
        const parsed = WorktreeConfigSchema.parse(config);
        expect(parsed.branchPrefix).toBe('claude-task/');
        expect(parsed.remoteName).toBe('origin');
    });
    it('accepts valid branchPrefix', () => {
        const config = {
            enabled: true,
            branchPrefix: 'feature/claude-',
        };
        expect(() => WorktreeConfigSchema.parse(config)).not.toThrow();
    });
    it('accepts valid remoteName', () => {
        const config = {
            enabled: true,
            remoteName: 'upstream',
        };
        expect(() => WorktreeConfigSchema.parse(config)).not.toThrow();
    });
    it('accepts valid basePath', () => {
        const config = {
            enabled: true,
            basePath: '/home/user/worktrees',
        };
        expect(() => WorktreeConfigSchema.parse(config)).not.toThrow();
    });
    // Security tests for input validation
    describe('security validations', () => {
        it('rejects branchPrefix with shell metacharacters', () => {
            const config = {
                enabled: true,
                branchPrefix: 'test; rm -rf /',
            };
            expect(() => WorktreeConfigSchema.parse(config)).toThrow();
        });
        it('rejects branchPrefix with backticks', () => {
            const config = {
                enabled: true,
                branchPrefix: 'test`whoami`',
            };
            expect(() => WorktreeConfigSchema.parse(config)).toThrow();
        });
        it('rejects branchPrefix with $() syntax', () => {
            const config = {
                enabled: true,
                branchPrefix: 'test$(id)',
            };
            expect(() => WorktreeConfigSchema.parse(config)).toThrow();
        });
        it('rejects remoteName with semicolons', () => {
            const config = {
                enabled: true,
                remoteName: 'origin; malicious',
            };
            expect(() => WorktreeConfigSchema.parse(config)).toThrow();
        });
        it('rejects remoteName with spaces', () => {
            const config = {
                enabled: true,
                remoteName: 'origin upstream',
            };
            expect(() => WorktreeConfigSchema.parse(config)).toThrow();
        });
        it('rejects remoteName with slashes', () => {
            const config = {
                enabled: true,
                remoteName: 'origin/test',
            };
            expect(() => WorktreeConfigSchema.parse(config)).toThrow();
        });
        it('rejects basePath with shell metacharacters', () => {
            const config = {
                enabled: true,
                basePath: '/path; rm -rf /',
            };
            expect(() => WorktreeConfigSchema.parse(config)).toThrow();
        });
        it('rejects basePath with backticks', () => {
            const config = {
                enabled: true,
                basePath: '/path`whoami`',
            };
            expect(() => WorktreeConfigSchema.parse(config)).toThrow();
        });
        it('rejects basePath with $() syntax', () => {
            const config = {
                enabled: true,
                basePath: '/path$(id)',
            };
            expect(() => WorktreeConfigSchema.parse(config)).toThrow();
        });
    });
});
//# sourceMappingURL=types.test.js.map
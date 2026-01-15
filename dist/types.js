import { z } from 'zod';
// =============================================================================
// Trigger Configuration
// =============================================================================
/**
 * Cron-based schedule trigger
 */
export const CronTriggerSchema = z.object({
    type: z.literal('cron'),
    expression: z.string().describe('Cron expression (e.g., "0 9 * * 1-5")'),
    timezone: z.string().optional().default('local').describe('IANA timezone or "local"'),
});
/**
 * Union of all trigger types (extensible for future file-watch, git-hook)
 */
export const TriggerConfigSchema = z.discriminatedUnion('type', [
    CronTriggerSchema,
    // Future: FileWatchTriggerSchema, GitHookTriggerSchema
]);
// =============================================================================
// Worktree/Workspace Configuration
// =============================================================================
/**
 * Configuration for running tasks in isolated git worktrees or jj workspaces
 */
export const WorktreeConfigSchema = z.object({
    /**
     * Whether to run the task in an isolated worktree/workspace
     */
    enabled: z.boolean().default(false),
    /**
     * Base path where worktrees are created (default: sibling .worktrees dir)
     * Must contain only safe filesystem characters.
     */
    basePath: z
        .string()
        .optional()
        .refine((val) => !val || /^[a-zA-Z0-9/_. ~-]+$/.test(val), 'basePath contains invalid characters (only alphanumeric, /, _, ., ~, - and spaces allowed)'),
    /**
     * Prefix for branch names (default: 'claude-task/')
     * Must be a valid git ref prefix.
     */
    branchPrefix: z
        .string()
        .optional()
        .default('claude-task/')
        .refine((val) => /^[a-zA-Z0-9/_.-]+$/.test(val), 'branchPrefix must only contain alphanumeric, /, _, ., -'),
    /**
     * Remote name for pushing (default: 'origin')
     * Must be a valid git remote name.
     */
    remoteName: z
        .string()
        .optional()
        .default('origin')
        .refine((val) => /^[a-zA-Z0-9_.-]+$/.test(val), 'remoteName must only contain alphanumeric, _, ., -'),
});
// =============================================================================
// Execution Configuration
// =============================================================================
/**
 * What to execute when triggered
 */
export const ExecutionConfigSchema = z.object({
    /**
     * The Claude prompt or slash command to execute
     * Examples: "/review-code" or "Review the changes in the last commit"
     */
    command: z.string().min(1).describe('Claude prompt or /command to execute'),
    /**
     * Working directory for execution (relative to project root or absolute)
     */
    workingDirectory: z.string().optional().default('.'),
    /**
     * Maximum execution time in seconds
     */
    timeout: z.number().positive().optional().default(300),
    /**
     * Environment variables to set during execution
     */
    env: z.record(z.string()).optional(),
    /**
     * Run with --dangerously-skip-permissions for fully autonomous execution
     * Required for tasks that need to edit files, run commands, etc.
     */
    skipPermissions: z.boolean().optional().default(false),
    /**
     * Worktree/workspace configuration for isolated execution
     */
    worktree: WorktreeConfigSchema.optional(),
});
// =============================================================================
// Execution History
// =============================================================================
/**
 * Status of task execution
 */
export const ExecutionStatusSchema = z.enum([
    'success',
    'failure',
    'timeout',
    'skipped',
    'running',
]);
/**
 * Record of a single task execution
 */
export const ExecutionRecordSchema = z.object({
    id: z.string().uuid(),
    taskId: z.string(),
    startedAt: z.string().datetime(),
    completedAt: z.string().datetime().optional(),
    status: ExecutionStatusSchema,
    triggeredBy: z.string().describe('What triggered this execution'),
    duration: z.number().optional().describe('Duration in milliseconds'),
    output: z.string().optional().describe('Truncated output'),
    error: z.string().optional().describe('Error message if failed'),
    exitCode: z.number().optional(),
});
/**
 * Extended execution record for history tracking across all projects
 * Includes denormalized task info for efficient querying without loading task configs
 */
export const ExecutionHistoryRecordSchema = ExecutionRecordSchema.extend({
    taskName: z.string().describe('Task name at time of execution'),
    project: z.string().describe('Working directory / project path'),
    cronExpression: z.string().optional().describe('Cron expression for context'),
    // Worktree tracking
    worktreePath: z.string().optional().describe('Path to worktree/workspace used'),
    worktreeBranch: z.string().optional().describe('Branch/bookmark created'),
    worktreePushed: z.boolean().optional().describe('Whether changes were pushed'),
});
// =============================================================================
// Scheduled Task Definition
// =============================================================================
/**
 * Complete scheduled task definition
 */
export const ScheduledTaskSchema = z.object({
    /**
     * Unique identifier for this task
     */
    id: z.string().min(1).describe('Unique task identifier'),
    /**
     * Human-readable name
     */
    name: z.string().min(1).describe('Display name for the task'),
    /**
     * Detailed description of what this task does
     */
    description: z.string().optional(),
    /**
     * Whether the task is currently enabled
     */
    enabled: z.boolean().default(true),
    /**
     * Trigger configuration
     */
    trigger: TriggerConfigSchema,
    /**
     * Execution configuration
     */
    execution: ExecutionConfigSchema,
    /**
     * Tags for organization
     */
    tags: z.array(z.string()).optional().default([]),
    /**
     * Creation timestamp
     */
    createdAt: z.string().datetime(),
    /**
     * Last modification timestamp
     */
    updatedAt: z.string().datetime(),
});
// =============================================================================
// Schedules Configuration File
// =============================================================================
/**
 * Global settings for the scheduler
 */
export const SchedulerSettingsSchema = z.object({
    /**
     * Default timezone for cron tasks
     */
    defaultTimezone: z.string().optional().default('local'),
    /**
     * Log retention in days
     */
    logRetentionDays: z.number().positive().optional().default(30),
    /**
     * Maximum executions to keep in history per task
     */
    maxExecutionHistory: z.number().positive().optional().default(100),
});
/**
 * Complete schedules.json file schema
 */
export const SchedulesConfigSchema = z.object({
    /**
     * Schema version for migrations
     */
    version: z.literal(1),
    /**
     * Array of scheduled tasks
     */
    tasks: z.array(ScheduledTaskSchema),
    /**
     * Global settings
     */
    settings: SchedulerSettingsSchema.optional(),
});
// =============================================================================
// Helper Functions
// =============================================================================
/**
 * Create an empty schedules config
 */
export function createEmptyConfig() {
    return {
        version: 1,
        tasks: [],
        settings: {
            defaultTimezone: 'local',
            logRetentionDays: 30,
            maxExecutionHistory: 100,
        },
    };
}
/**
 * Generate a new task ID
 */
export function generateTaskId() {
    return crypto.randomUUID();
}
/**
 * Create a new scheduled task with defaults
 */
export function createTask(name, cronExpression, command, options = {}) {
    const now = new Date().toISOString();
    return {
        id: generateTaskId(),
        name,
        description: options.description,
        enabled: true,
        trigger: {
            type: 'cron',
            expression: cronExpression,
            timezone: options.timezone ?? 'local',
        },
        execution: {
            command,
            workingDirectory: options.workingDirectory ?? '.',
            timeout: options.timeout ?? 300,
            skipPermissions: options.skipPermissions ?? false,
        },
        tags: options.tags ?? [],
        createdAt: now,
        updatedAt: now,
    };
}
//# sourceMappingURL=types.js.map
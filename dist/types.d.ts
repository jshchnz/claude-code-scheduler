import { z } from 'zod';
/**
 * Cron-based schedule trigger
 */
export declare const CronTriggerSchema: z.ZodObject<{
    type: z.ZodLiteral<"cron">;
    expression: z.ZodString;
    timezone: z.ZodDefault<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    type: "cron";
    expression: string;
    timezone: string;
}, {
    type: "cron";
    expression: string;
    timezone?: string | undefined;
}>;
export type CronTrigger = z.infer<typeof CronTriggerSchema>;
/**
 * Union of all trigger types (extensible for future file-watch, git-hook)
 */
export declare const TriggerConfigSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    type: z.ZodLiteral<"cron">;
    expression: z.ZodString;
    timezone: z.ZodDefault<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    type: "cron";
    expression: string;
    timezone: string;
}, {
    type: "cron";
    expression: string;
    timezone?: string | undefined;
}>]>;
export type TriggerConfig = z.infer<typeof TriggerConfigSchema>;
/**
 * Configuration for running tasks in isolated git worktrees or jj workspaces
 */
export declare const WorktreeConfigSchema: z.ZodObject<{
    /**
     * Whether to run the task in an isolated worktree/workspace
     */
    enabled: z.ZodDefault<z.ZodBoolean>;
    /**
     * Base path where worktrees are created (default: sibling .worktrees dir)
     */
    basePath: z.ZodOptional<z.ZodString>;
    /**
     * Prefix for branch names (default: 'claude-task/')
     */
    branchPrefix: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    /**
     * Remote name for pushing (default: 'origin')
     */
    remoteName: z.ZodDefault<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    branchPrefix: string;
    remoteName: string;
    basePath?: string | undefined;
}, {
    enabled?: boolean | undefined;
    basePath?: string | undefined;
    branchPrefix?: string | undefined;
    remoteName?: string | undefined;
}>;
export type WorktreeConfig = z.infer<typeof WorktreeConfigSchema>;
/**
 * What to execute when triggered
 */
export declare const ExecutionConfigSchema: z.ZodObject<{
    /**
     * The Claude prompt or slash command to execute
     * Examples: "/review-code" or "Review the changes in the last commit"
     */
    command: z.ZodString;
    /**
     * Working directory for execution (relative to project root or absolute)
     */
    workingDirectory: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    /**
     * Maximum execution time in seconds
     */
    timeout: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    /**
     * Environment variables to set during execution
     */
    env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    /**
     * Run with --dangerously-skip-permissions for fully autonomous execution
     * Required for tasks that need to edit files, run commands, etc.
     */
    skipPermissions: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /**
     * Worktree/workspace configuration for isolated execution
     */
    worktree: z.ZodOptional<z.ZodObject<{
        /**
         * Whether to run the task in an isolated worktree/workspace
         */
        enabled: z.ZodDefault<z.ZodBoolean>;
        /**
         * Base path where worktrees are created (default: sibling .worktrees dir)
         */
        basePath: z.ZodOptional<z.ZodString>;
        /**
         * Prefix for branch names (default: 'claude-task/')
         */
        branchPrefix: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        /**
         * Remote name for pushing (default: 'origin')
         */
        remoteName: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        branchPrefix: string;
        remoteName: string;
        basePath?: string | undefined;
    }, {
        enabled?: boolean | undefined;
        basePath?: string | undefined;
        branchPrefix?: string | undefined;
        remoteName?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    command: string;
    workingDirectory: string;
    timeout: number;
    skipPermissions: boolean;
    env?: Record<string, string> | undefined;
    worktree?: {
        enabled: boolean;
        branchPrefix: string;
        remoteName: string;
        basePath?: string | undefined;
    } | undefined;
}, {
    command: string;
    workingDirectory?: string | undefined;
    timeout?: number | undefined;
    env?: Record<string, string> | undefined;
    skipPermissions?: boolean | undefined;
    worktree?: {
        enabled?: boolean | undefined;
        basePath?: string | undefined;
        branchPrefix?: string | undefined;
        remoteName?: string | undefined;
    } | undefined;
}>;
export type ExecutionConfig = z.infer<typeof ExecutionConfigSchema>;
/**
 * Status of task execution
 */
export declare const ExecutionStatusSchema: z.ZodEnum<["success", "failure", "timeout", "skipped", "running"]>;
export type ExecutionStatus = z.infer<typeof ExecutionStatusSchema>;
/**
 * Record of a single task execution
 */
export declare const ExecutionRecordSchema: z.ZodObject<{
    id: z.ZodString;
    taskId: z.ZodString;
    startedAt: z.ZodString;
    completedAt: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<["success", "failure", "timeout", "skipped", "running"]>;
    triggeredBy: z.ZodString;
    duration: z.ZodOptional<z.ZodNumber>;
    output: z.ZodOptional<z.ZodString>;
    error: z.ZodOptional<z.ZodString>;
    exitCode: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status: "timeout" | "success" | "failure" | "skipped" | "running";
    id: string;
    taskId: string;
    startedAt: string;
    triggeredBy: string;
    completedAt?: string | undefined;
    duration?: number | undefined;
    output?: string | undefined;
    error?: string | undefined;
    exitCode?: number | undefined;
}, {
    status: "timeout" | "success" | "failure" | "skipped" | "running";
    id: string;
    taskId: string;
    startedAt: string;
    triggeredBy: string;
    completedAt?: string | undefined;
    duration?: number | undefined;
    output?: string | undefined;
    error?: string | undefined;
    exitCode?: number | undefined;
}>;
export type ExecutionRecord = z.infer<typeof ExecutionRecordSchema>;
/**
 * Extended execution record for history tracking across all projects
 * Includes denormalized task info for efficient querying without loading task configs
 */
export declare const ExecutionHistoryRecordSchema: z.ZodObject<{
    id: z.ZodString;
    taskId: z.ZodString;
    startedAt: z.ZodString;
    completedAt: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<["success", "failure", "timeout", "skipped", "running"]>;
    triggeredBy: z.ZodString;
    duration: z.ZodOptional<z.ZodNumber>;
    output: z.ZodOptional<z.ZodString>;
    error: z.ZodOptional<z.ZodString>;
    exitCode: z.ZodOptional<z.ZodNumber>;
} & {
    taskName: z.ZodString;
    project: z.ZodString;
    cronExpression: z.ZodOptional<z.ZodString>;
    worktreePath: z.ZodOptional<z.ZodString>;
    worktreeBranch: z.ZodOptional<z.ZodString>;
    worktreePushed: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    status: "timeout" | "success" | "failure" | "skipped" | "running";
    id: string;
    taskId: string;
    startedAt: string;
    triggeredBy: string;
    taskName: string;
    project: string;
    completedAt?: string | undefined;
    duration?: number | undefined;
    output?: string | undefined;
    error?: string | undefined;
    exitCode?: number | undefined;
    cronExpression?: string | undefined;
    worktreePath?: string | undefined;
    worktreeBranch?: string | undefined;
    worktreePushed?: boolean | undefined;
}, {
    status: "timeout" | "success" | "failure" | "skipped" | "running";
    id: string;
    taskId: string;
    startedAt: string;
    triggeredBy: string;
    taskName: string;
    project: string;
    completedAt?: string | undefined;
    duration?: number | undefined;
    output?: string | undefined;
    error?: string | undefined;
    exitCode?: number | undefined;
    cronExpression?: string | undefined;
    worktreePath?: string | undefined;
    worktreeBranch?: string | undefined;
    worktreePushed?: boolean | undefined;
}>;
export type ExecutionHistoryRecord = z.infer<typeof ExecutionHistoryRecordSchema>;
/**
 * Complete scheduled task definition
 */
export declare const ScheduledTaskSchema: z.ZodObject<{
    /**
     * Unique identifier for this task
     */
    id: z.ZodString;
    /**
     * Human-readable name
     */
    name: z.ZodString;
    /**
     * Detailed description of what this task does
     */
    description: z.ZodOptional<z.ZodString>;
    /**
     * Whether the task is currently enabled
     */
    enabled: z.ZodDefault<z.ZodBoolean>;
    /**
     * Trigger configuration
     */
    trigger: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        type: z.ZodLiteral<"cron">;
        expression: z.ZodString;
        timezone: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        type: "cron";
        expression: string;
        timezone: string;
    }, {
        type: "cron";
        expression: string;
        timezone?: string | undefined;
    }>]>;
    /**
     * Execution configuration
     */
    execution: z.ZodObject<{
        /**
         * The Claude prompt or slash command to execute
         * Examples: "/review-code" or "Review the changes in the last commit"
         */
        command: z.ZodString;
        /**
         * Working directory for execution (relative to project root or absolute)
         */
        workingDirectory: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        /**
         * Maximum execution time in seconds
         */
        timeout: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        /**
         * Environment variables to set during execution
         */
        env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        /**
         * Run with --dangerously-skip-permissions for fully autonomous execution
         * Required for tasks that need to edit files, run commands, etc.
         */
        skipPermissions: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        /**
         * Worktree/workspace configuration for isolated execution
         */
        worktree: z.ZodOptional<z.ZodObject<{
            /**
             * Whether to run the task in an isolated worktree/workspace
             */
            enabled: z.ZodDefault<z.ZodBoolean>;
            /**
             * Base path where worktrees are created (default: sibling .worktrees dir)
             */
            basePath: z.ZodOptional<z.ZodString>;
            /**
             * Prefix for branch names (default: 'claude-task/')
             */
            branchPrefix: z.ZodDefault<z.ZodOptional<z.ZodString>>;
            /**
             * Remote name for pushing (default: 'origin')
             */
            remoteName: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            branchPrefix: string;
            remoteName: string;
            basePath?: string | undefined;
        }, {
            enabled?: boolean | undefined;
            basePath?: string | undefined;
            branchPrefix?: string | undefined;
            remoteName?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        command: string;
        workingDirectory: string;
        timeout: number;
        skipPermissions: boolean;
        env?: Record<string, string> | undefined;
        worktree?: {
            enabled: boolean;
            branchPrefix: string;
            remoteName: string;
            basePath?: string | undefined;
        } | undefined;
    }, {
        command: string;
        workingDirectory?: string | undefined;
        timeout?: number | undefined;
        env?: Record<string, string> | undefined;
        skipPermissions?: boolean | undefined;
        worktree?: {
            enabled?: boolean | undefined;
            basePath?: string | undefined;
            branchPrefix?: string | undefined;
            remoteName?: string | undefined;
        } | undefined;
    }>;
    /**
     * Tags for organization
     */
    tags: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    /**
     * Creation timestamp
     */
    createdAt: z.ZodString;
    /**
     * Last modification timestamp
     */
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    id: string;
    name: string;
    trigger: {
        type: "cron";
        expression: string;
        timezone: string;
    };
    execution: {
        command: string;
        workingDirectory: string;
        timeout: number;
        skipPermissions: boolean;
        env?: Record<string, string> | undefined;
        worktree?: {
            enabled: boolean;
            branchPrefix: string;
            remoteName: string;
            basePath?: string | undefined;
        } | undefined;
    };
    tags: string[];
    createdAt: string;
    updatedAt: string;
    description?: string | undefined;
}, {
    id: string;
    name: string;
    trigger: {
        type: "cron";
        expression: string;
        timezone?: string | undefined;
    };
    execution: {
        command: string;
        workingDirectory?: string | undefined;
        timeout?: number | undefined;
        env?: Record<string, string> | undefined;
        skipPermissions?: boolean | undefined;
        worktree?: {
            enabled?: boolean | undefined;
            basePath?: string | undefined;
            branchPrefix?: string | undefined;
            remoteName?: string | undefined;
        } | undefined;
    };
    createdAt: string;
    updatedAt: string;
    enabled?: boolean | undefined;
    description?: string | undefined;
    tags?: string[] | undefined;
}>;
export type ScheduledTask = z.infer<typeof ScheduledTaskSchema>;
/**
 * Global settings for the scheduler
 */
export declare const SchedulerSettingsSchema: z.ZodObject<{
    /**
     * Default timezone for cron tasks
     */
    defaultTimezone: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    /**
     * Log retention in days
     */
    logRetentionDays: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    /**
     * Maximum executions to keep in history per task
     */
    maxExecutionHistory: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    defaultTimezone: string;
    logRetentionDays: number;
    maxExecutionHistory: number;
}, {
    defaultTimezone?: string | undefined;
    logRetentionDays?: number | undefined;
    maxExecutionHistory?: number | undefined;
}>;
export type SchedulerSettings = z.infer<typeof SchedulerSettingsSchema>;
/**
 * Complete schedules.json file schema
 */
export declare const SchedulesConfigSchema: z.ZodObject<{
    /**
     * Schema version for migrations
     */
    version: z.ZodLiteral<1>;
    /**
     * Array of scheduled tasks
     */
    tasks: z.ZodArray<z.ZodObject<{
        /**
         * Unique identifier for this task
         */
        id: z.ZodString;
        /**
         * Human-readable name
         */
        name: z.ZodString;
        /**
         * Detailed description of what this task does
         */
        description: z.ZodOptional<z.ZodString>;
        /**
         * Whether the task is currently enabled
         */
        enabled: z.ZodDefault<z.ZodBoolean>;
        /**
         * Trigger configuration
         */
        trigger: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
            type: z.ZodLiteral<"cron">;
            expression: z.ZodString;
            timezone: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            type: "cron";
            expression: string;
            timezone: string;
        }, {
            type: "cron";
            expression: string;
            timezone?: string | undefined;
        }>]>;
        /**
         * Execution configuration
         */
        execution: z.ZodObject<{
            /**
             * The Claude prompt or slash command to execute
             * Examples: "/review-code" or "Review the changes in the last commit"
             */
            command: z.ZodString;
            /**
             * Working directory for execution (relative to project root or absolute)
             */
            workingDirectory: z.ZodDefault<z.ZodOptional<z.ZodString>>;
            /**
             * Maximum execution time in seconds
             */
            timeout: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
            /**
             * Environment variables to set during execution
             */
            env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
            /**
             * Run with --dangerously-skip-permissions for fully autonomous execution
             * Required for tasks that need to edit files, run commands, etc.
             */
            skipPermissions: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
            /**
             * Worktree/workspace configuration for isolated execution
             */
            worktree: z.ZodOptional<z.ZodObject<{
                /**
                 * Whether to run the task in an isolated worktree/workspace
                 */
                enabled: z.ZodDefault<z.ZodBoolean>;
                /**
                 * Base path where worktrees are created (default: sibling .worktrees dir)
                 */
                basePath: z.ZodOptional<z.ZodString>;
                /**
                 * Prefix for branch names (default: 'claude-task/')
                 */
                branchPrefix: z.ZodDefault<z.ZodOptional<z.ZodString>>;
                /**
                 * Remote name for pushing (default: 'origin')
                 */
                remoteName: z.ZodDefault<z.ZodOptional<z.ZodString>>;
            }, "strip", z.ZodTypeAny, {
                enabled: boolean;
                branchPrefix: string;
                remoteName: string;
                basePath?: string | undefined;
            }, {
                enabled?: boolean | undefined;
                basePath?: string | undefined;
                branchPrefix?: string | undefined;
                remoteName?: string | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            command: string;
            workingDirectory: string;
            timeout: number;
            skipPermissions: boolean;
            env?: Record<string, string> | undefined;
            worktree?: {
                enabled: boolean;
                branchPrefix: string;
                remoteName: string;
                basePath?: string | undefined;
            } | undefined;
        }, {
            command: string;
            workingDirectory?: string | undefined;
            timeout?: number | undefined;
            env?: Record<string, string> | undefined;
            skipPermissions?: boolean | undefined;
            worktree?: {
                enabled?: boolean | undefined;
                basePath?: string | undefined;
                branchPrefix?: string | undefined;
                remoteName?: string | undefined;
            } | undefined;
        }>;
        /**
         * Tags for organization
         */
        tags: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
        /**
         * Creation timestamp
         */
        createdAt: z.ZodString;
        /**
         * Last modification timestamp
         */
        updatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        id: string;
        name: string;
        trigger: {
            type: "cron";
            expression: string;
            timezone: string;
        };
        execution: {
            command: string;
            workingDirectory: string;
            timeout: number;
            skipPermissions: boolean;
            env?: Record<string, string> | undefined;
            worktree?: {
                enabled: boolean;
                branchPrefix: string;
                remoteName: string;
                basePath?: string | undefined;
            } | undefined;
        };
        tags: string[];
        createdAt: string;
        updatedAt: string;
        description?: string | undefined;
    }, {
        id: string;
        name: string;
        trigger: {
            type: "cron";
            expression: string;
            timezone?: string | undefined;
        };
        execution: {
            command: string;
            workingDirectory?: string | undefined;
            timeout?: number | undefined;
            env?: Record<string, string> | undefined;
            skipPermissions?: boolean | undefined;
            worktree?: {
                enabled?: boolean | undefined;
                basePath?: string | undefined;
                branchPrefix?: string | undefined;
                remoteName?: string | undefined;
            } | undefined;
        };
        createdAt: string;
        updatedAt: string;
        enabled?: boolean | undefined;
        description?: string | undefined;
        tags?: string[] | undefined;
    }>, "many">;
    /**
     * Global settings
     */
    settings: z.ZodOptional<z.ZodObject<{
        /**
         * Default timezone for cron tasks
         */
        defaultTimezone: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        /**
         * Log retention in days
         */
        logRetentionDays: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        /**
         * Maximum executions to keep in history per task
         */
        maxExecutionHistory: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        defaultTimezone: string;
        logRetentionDays: number;
        maxExecutionHistory: number;
    }, {
        defaultTimezone?: string | undefined;
        logRetentionDays?: number | undefined;
        maxExecutionHistory?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    version: 1;
    tasks: {
        enabled: boolean;
        id: string;
        name: string;
        trigger: {
            type: "cron";
            expression: string;
            timezone: string;
        };
        execution: {
            command: string;
            workingDirectory: string;
            timeout: number;
            skipPermissions: boolean;
            env?: Record<string, string> | undefined;
            worktree?: {
                enabled: boolean;
                branchPrefix: string;
                remoteName: string;
                basePath?: string | undefined;
            } | undefined;
        };
        tags: string[];
        createdAt: string;
        updatedAt: string;
        description?: string | undefined;
    }[];
    settings?: {
        defaultTimezone: string;
        logRetentionDays: number;
        maxExecutionHistory: number;
    } | undefined;
}, {
    version: 1;
    tasks: {
        id: string;
        name: string;
        trigger: {
            type: "cron";
            expression: string;
            timezone?: string | undefined;
        };
        execution: {
            command: string;
            workingDirectory?: string | undefined;
            timeout?: number | undefined;
            env?: Record<string, string> | undefined;
            skipPermissions?: boolean | undefined;
            worktree?: {
                enabled?: boolean | undefined;
                basePath?: string | undefined;
                branchPrefix?: string | undefined;
                remoteName?: string | undefined;
            } | undefined;
        };
        createdAt: string;
        updatedAt: string;
        enabled?: boolean | undefined;
        description?: string | undefined;
        tags?: string[] | undefined;
    }[];
    settings?: {
        defaultTimezone?: string | undefined;
        logRetentionDays?: number | undefined;
        maxExecutionHistory?: number | undefined;
    } | undefined;
}>;
export type SchedulesConfig = z.infer<typeof SchedulesConfigSchema>;
/**
 * Create an empty schedules config
 */
export declare function createEmptyConfig(): SchedulesConfig;
/**
 * Generate a new task ID
 */
export declare function generateTaskId(): string;
/**
 * Create a new scheduled task with defaults
 */
export declare function createTask(name: string, cronExpression: string, command: string, options?: Partial<{
    description: string;
    workingDirectory: string;
    timeout: number;
    timezone: string;
    tags: string[];
    skipPermissions: boolean;
}>): ScheduledTask;
//# sourceMappingURL=types.d.ts.map
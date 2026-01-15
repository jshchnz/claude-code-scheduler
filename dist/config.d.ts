import { SchedulesConfig, ScheduledTask } from './types.js';
/**
 * Get the global config directory (~/.claude)
 */
export declare function getGlobalConfigDir(): string;
/**
 * Get the global schedules.json path
 */
export declare function getGlobalSchedulesPath(): string;
/**
 * Get the project schedules.json path
 */
export declare function getProjectSchedulesPath(projectPath: string): string;
/**
 * Get the logs directory
 */
export declare function getLogsDir(): string;
/**
 * Get the log file path for a specific task
 */
export declare function getTaskLogPath(taskId: string): string;
/**
 * Get the worktree script path for a specific task
 */
export declare function getWorktreeScriptPath(taskId: string): string;
/**
 * Load a schedules config from a path, returning empty config if not found
 */
export declare function loadConfig(configPath: string): Promise<SchedulesConfig>;
/**
 * Load the global schedules config
 */
export declare function loadGlobalConfig(): Promise<SchedulesConfig>;
/**
 * Load the project schedules config
 */
export declare function loadProjectConfig(projectPath: string): Promise<SchedulesConfig>;
/**
 * Load and merge both global and project configs
 * Project tasks take precedence for same IDs
 */
export declare function loadMergedConfig(projectPath: string): Promise<{
    global: SchedulesConfig;
    project: SchedulesConfig;
    merged: ScheduledTask[];
}>;
/**
 * Save a schedules config to a path
 */
export declare function saveConfig(configPath: string, config: SchedulesConfig): Promise<void>;
/**
 * Save the global schedules config
 */
export declare function saveGlobalConfig(config: SchedulesConfig): Promise<void>;
/**
 * Save the project schedules config
 */
export declare function saveProjectConfig(projectPath: string, config: SchedulesConfig): Promise<void>;
/**
 * Add a task to a config
 */
export declare function addTask(config: SchedulesConfig, task: ScheduledTask): SchedulesConfig;
/**
 * Update a task in a config
 */
export declare function updateTask(config: SchedulesConfig, taskId: string, updates: Partial<Omit<ScheduledTask, 'id' | 'createdAt'>>): SchedulesConfig;
/**
 * Remove a task from a config
 */
export declare function removeTask(config: SchedulesConfig, taskId: string): SchedulesConfig;
/**
 * Find a task by ID or name
 */
export declare function findTask(config: SchedulesConfig, idOrName: string): ScheduledTask | undefined;
/**
 * Ensure the global config directory and files exist
 */
export declare function ensureGlobalConfigDir(): Promise<void>;
/**
 * Ensure the project config directory exists
 */
export declare function ensureProjectConfigDir(projectPath: string): Promise<void>;
//# sourceMappingURL=config.d.ts.map
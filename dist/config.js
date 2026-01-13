import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { SchedulesConfigSchema, createEmptyConfig, } from './types.js';
// =============================================================================
// Path Utilities
// =============================================================================
/**
 * Get the global config directory (~/.claude)
 */
export function getGlobalConfigDir() {
    return path.join(os.homedir(), '.claude');
}
/**
 * Get the global schedules.json path
 */
export function getGlobalSchedulesPath() {
    return path.join(getGlobalConfigDir(), 'schedules.json');
}
/**
 * Get the project schedules.json path
 */
export function getProjectSchedulesPath(projectPath) {
    return path.join(projectPath, '.claude', 'schedules.json');
}
/**
 * Get the logs directory
 */
export function getLogsDir() {
    return path.join(getGlobalConfigDir(), 'logs');
}
/**
 * Get the log file path for a specific task
 */
export function getTaskLogPath(taskId) {
    return path.join(getLogsDir(), `${taskId}.log`);
}
// =============================================================================
// Config Loading
// =============================================================================
/**
 * Load a schedules config from a path, returning empty config if not found
 */
export async function loadConfig(configPath) {
    try {
        if (await fs.pathExists(configPath)) {
            const content = await fs.readFile(configPath, 'utf-8');
            const parsed = JSON.parse(content);
            return SchedulesConfigSchema.parse(parsed);
        }
    }
    catch (error) {
        // Log error but return empty config
        console.error(`Warning: Failed to load config from ${configPath}:`, error);
    }
    return createEmptyConfig();
}
/**
 * Load the global schedules config
 */
export async function loadGlobalConfig() {
    return loadConfig(getGlobalSchedulesPath());
}
/**
 * Load the project schedules config
 */
export async function loadProjectConfig(projectPath) {
    return loadConfig(getProjectSchedulesPath(projectPath));
}
/**
 * Load and merge both global and project configs
 * Project tasks take precedence for same IDs
 */
export async function loadMergedConfig(projectPath) {
    const [global, project] = await Promise.all([
        loadGlobalConfig(),
        loadProjectConfig(projectPath),
    ]);
    // Merge tasks, project takes precedence
    const taskMap = new Map();
    for (const task of global.tasks) {
        taskMap.set(task.id, { ...task, scope: 'global' });
    }
    for (const task of project.tasks) {
        taskMap.set(task.id, { ...task, scope: 'project' });
    }
    const merged = Array.from(taskMap.values());
    return { global, project, merged };
}
// =============================================================================
// Config Saving
// =============================================================================
/**
 * Save a schedules config to a path
 */
export async function saveConfig(configPath, config) {
    // Ensure directory exists
    await fs.ensureDir(path.dirname(configPath));
    // Validate before saving
    SchedulesConfigSchema.parse(config);
    // Write with pretty formatting
    await fs.writeJson(configPath, config, { spaces: 2 });
}
/**
 * Save the global schedules config
 */
export async function saveGlobalConfig(config) {
    return saveConfig(getGlobalSchedulesPath(), config);
}
/**
 * Save the project schedules config
 */
export async function saveProjectConfig(projectPath, config) {
    return saveConfig(getProjectSchedulesPath(projectPath), config);
}
// =============================================================================
// Task Operations
// =============================================================================
/**
 * Add a task to a config
 */
export function addTask(config, task) {
    // Check for duplicate ID
    if (config.tasks.some((t) => t.id === task.id)) {
        throw new Error(`Task with ID "${task.id}" already exists`);
    }
    return {
        ...config,
        tasks: [...config.tasks, task],
    };
}
/**
 * Update a task in a config
 */
export function updateTask(config, taskId, updates) {
    const taskIndex = config.tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) {
        throw new Error(`Task with ID "${taskId}" not found`);
    }
    const updatedTask = {
        ...config.tasks[taskIndex],
        ...updates,
        updatedAt: new Date().toISOString(),
    };
    const tasks = [...config.tasks];
    tasks[taskIndex] = updatedTask;
    return { ...config, tasks };
}
/**
 * Remove a task from a config
 */
export function removeTask(config, taskId) {
    const taskIndex = config.tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) {
        throw new Error(`Task with ID "${taskId}" not found`);
    }
    return {
        ...config,
        tasks: config.tasks.filter((t) => t.id !== taskId),
    };
}
/**
 * Find a task by ID or name
 */
export function findTask(config, idOrName) {
    return config.tasks.find((t) => t.id === idOrName || t.name.toLowerCase() === idOrName.toLowerCase());
}
// =============================================================================
// Initialization
// =============================================================================
/**
 * Ensure the global config directory and files exist
 */
export async function ensureGlobalConfigDir() {
    const configDir = getGlobalConfigDir();
    const logsDir = getLogsDir();
    await fs.ensureDir(configDir);
    await fs.ensureDir(logsDir);
    // Create empty config if not exists
    const schedulesPath = getGlobalSchedulesPath();
    if (!(await fs.pathExists(schedulesPath))) {
        await saveConfig(schedulesPath, createEmptyConfig());
    }
}
/**
 * Ensure the project config directory exists
 */
export async function ensureProjectConfigDir(projectPath) {
    const claudeDir = path.join(projectPath, '.claude');
    await fs.ensureDir(claudeDir);
}
//# sourceMappingURL=config.js.map
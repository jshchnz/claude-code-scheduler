import { execa } from 'execa';
import * as fs from 'fs-extra';
import * as path from 'path';
import { BaseScheduler, SchedulerError } from './base.js';
import { getLogsDir } from '../config.js';
import { shellEscape } from '../utils/shell.js';
/**
 * Linux crontab scheduler implementation
 */
export class LinuxScheduler extends BaseScheduler {
    name = 'crontab';
    platform = 'linux';
    /**
     * Marker comment to identify our cron entries
     */
    MARKER_PREFIX = '# claude-scheduler:';
    /**
     * Get the path for a worktree script
     */
    getWorktreeScriptPath(taskId) {
        return path.join(getLogsDir(), `${taskId}.worktree.sh`);
    }
    async register(task) {
        try {
            const cronExpr = this.getCronExpression(task);
            const logDir = getLogsDir();
            const logPath = `${logDir}/${task.id}.log`;
            // Ensure logs directory exists
            await fs.ensureDir(logDir);
            // Determine the command to run
            let cronCommand;
            if (this.usesWorktree(task)) {
                // Generate and write worktree script
                const script = this.generateWorktreeScript(task, logDir);
                if (script) {
                    const scriptPath = this.getWorktreeScriptPath(task.id);
                    await fs.writeFile(scriptPath, script, { mode: 0o755 });
                    // Shell escape the script path for safe execution
                    cronCommand = `bash ${shellEscape(scriptPath)}`;
                }
                else {
                    // Fallback to direct execution with shell-escaped workDir
                    const command = this.getExecutionCommand(task);
                    const workDir = this.getWorkingDirectory(task);
                    cronCommand = `cd ${shellEscape(workDir)} && ${command}`;
                }
            }
            else {
                // Direct execution with shell-escaped workDir
                const command = this.getExecutionCommand(task);
                const workDir = this.getWorkingDirectory(task);
                cronCommand = `cd ${shellEscape(workDir)} && ${command}`;
            }
            // Get current crontab
            const currentCrontab = await this.getCurrentCrontab();
            // Remove existing entry for this task
            const lines = currentCrontab
                .split('\n')
                .filter((line) => !line.includes(`${this.MARKER_PREFIX}${task.id}`));
            // Add new entry
            const cronLine = `${cronExpr} ${cronCommand} >> "${logPath}" 2>&1 ${this.MARKER_PREFIX}${task.id}`;
            lines.push(cronLine);
            // Update crontab
            const newCrontab = lines.filter((l) => l.trim()).join('\n') + '\n';
            await this.setCrontab(newCrontab);
        }
        catch (error) {
            throw new SchedulerError(`Failed to register task "${task.name}" with crontab`, this.platform, 'register', error);
        }
    }
    async unregister(taskId) {
        try {
            const currentCrontab = await this.getCurrentCrontab();
            // Remove entry for this task
            const lines = currentCrontab
                .split('\n')
                .filter((line) => !line.includes(`${this.MARKER_PREFIX}${taskId}`));
            // Update crontab
            const newCrontab = lines.filter((l) => l.trim()).join('\n') + '\n';
            await this.setCrontab(newCrontab);
        }
        catch (error) {
            throw new SchedulerError(`Failed to unregister task "${taskId}" from crontab`, this.platform, 'unregister', error);
        }
    }
    async isRegistered(taskId) {
        const currentCrontab = await this.getCurrentCrontab();
        return currentCrontab.includes(`${this.MARKER_PREFIX}${taskId}`);
    }
    async getStatus() {
        const tasks = await this.listRegistered();
        return {
            healthy: true, // crontab is always healthy if we can read it
            taskCount: tasks.length,
            errors: [],
            platform: this.platform,
        };
    }
    async listRegistered() {
        const currentCrontab = await this.getCurrentCrontab();
        const taskIds = [];
        for (const line of currentCrontab.split('\n')) {
            const match = line.match(new RegExp(`${this.MARKER_PREFIX}(.+)$`));
            if (match) {
                taskIds.push(match[1].trim());
            }
        }
        return taskIds;
    }
    /**
     * Get the current user's crontab content
     */
    async getCurrentCrontab() {
        try {
            const { stdout } = await execa('crontab', ['-l']);
            return stdout;
        }
        catch (error) {
            // "no crontab for user" is not an error for us
            const err = error;
            if (err.stderr?.includes('no crontab')) {
                return '';
            }
            throw error;
        }
    }
    /**
     * Set the user's crontab content
     */
    async setCrontab(content) {
        await execa('crontab', ['-'], { input: content });
    }
}
//# sourceMappingURL=linux.js.map
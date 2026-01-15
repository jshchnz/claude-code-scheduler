import { execa } from 'execa';
import * as fs from 'fs-extra';
import * as path from 'path';
import { BaseScheduler, SchedulerError } from './base.js';
import { getLogsDir } from '../config.js';
/**
 * Windows Task Scheduler implementation
 */
export class WindowsScheduler extends BaseScheduler {
    name = 'Task Scheduler';
    platform = 'win32';
    /**
     * Task folder in Task Scheduler
     */
    TASK_FOLDER = '\\ClaudeScheduler';
    /**
     * Get the task name for Task Scheduler
     */
    getTaskName(taskId) {
        return `${this.TASK_FOLDER}\\${taskId}`;
    }
    /**
     * Get the path for a worktree script
     */
    getWorktreeScriptPath(taskId) {
        return path.join(getLogsDir(), `${taskId}.worktree.sh`);
    }
    async register(task) {
        try {
            const cronExpr = this.getCronExpression(task);
            const taskName = this.getTaskName(task.id);
            const logDir = getLogsDir();
            const logPath = `${logDir}\\${task.id}.log`;
            // Ensure logs directory exists
            await fs.ensureDir(logDir);
            // Determine the task run command
            let taskCommand;
            if (this.usesWorktree(task)) {
                // Generate and write worktree script
                const script = this.generateWorktreeScript(task, logDir);
                if (script) {
                    const scriptPath = this.getWorktreeScriptPath(task.id);
                    await fs.writeFile(scriptPath, script, { mode: 0o755 });
                    // Use Git Bash to run the script (Git must be installed for worktrees anyway)
                    // Convert Windows path to Unix-style for bash
                    const unixScriptPath = scriptPath.replace(/\\/g, '/');
                    taskCommand = `cmd /c "bash "${unixScriptPath}" >> "${logPath}" 2>&1"`;
                }
                else {
                    // Fallback to direct execution
                    const command = this.getExecutionCommand(task);
                    const workDir = this.getWorkingDirectory(task);
                    taskCommand = `cmd /c "cd /d "${workDir}" && ${command} >> "${logPath}" 2>&1"`;
                }
            }
            else {
                const command = this.getExecutionCommand(task);
                const workDir = this.getWorkingDirectory(task);
                taskCommand = `cmd /c "cd /d "${workDir}" && ${command} >> "${logPath}" 2>&1"`;
            }
            // Parse cron to schtasks format
            const { schedule, modifier, time, days } = this.cronToSchtasksArgs(cronExpr);
            // Delete existing task if present (ignore errors)
            try {
                await execa('schtasks', ['/Delete', '/TN', taskName, '/F']);
            }
            catch {
                // Ignore - might not exist
            }
            // Build schtasks command
            const args = [
                '/Create',
                '/TN',
                taskName,
                '/TR',
                taskCommand,
                '/SC',
                schedule,
            ];
            if (modifier) {
                args.push('/MO', modifier);
            }
            if (time) {
                args.push('/ST', time);
            }
            if (days) {
                args.push('/D', days);
            }
            // Create the task
            await execa('schtasks', args);
        }
        catch (error) {
            throw new SchedulerError(`Failed to register task "${task.name}" with Task Scheduler`, this.platform, 'register', error);
        }
    }
    async unregister(taskId) {
        try {
            const taskName = this.getTaskName(taskId);
            await execa('schtasks', ['/Delete', '/TN', taskName, '/F']);
        }
        catch (error) {
            const err = error;
            // Ignore "does not exist" errors
            if (!err.stderr?.includes('does not exist')) {
                throw new SchedulerError(`Failed to unregister task "${taskId}" from Task Scheduler`, this.platform, 'unregister', error);
            }
        }
    }
    async isRegistered(taskId) {
        try {
            const taskName = this.getTaskName(taskId);
            await execa('schtasks', ['/Query', '/TN', taskName]);
            return true;
        }
        catch {
            return false;
        }
    }
    async getStatus() {
        try {
            const tasks = await this.listRegistered();
            return {
                healthy: true,
                taskCount: tasks.length,
                errors: [],
                platform: this.platform,
            };
        }
        catch {
            return {
                healthy: false,
                taskCount: 0,
                errors: ['Failed to query Task Scheduler'],
                platform: this.platform,
            };
        }
    }
    async listRegistered() {
        try {
            const { stdout } = await execa('schtasks', [
                '/Query',
                '/FO',
                'CSV',
                '/NH',
            ]);
            const taskIds = [];
            const prefix = this.TASK_FOLDER + '\\';
            for (const line of stdout.split('\n')) {
                // CSV format: "TaskName","Next Run Time","Status"
                const match = line.match(/^"([^"]+)"/);
                if (match && match[1].startsWith(prefix)) {
                    taskIds.push(match[1].slice(prefix.length));
                }
            }
            return taskIds;
        }
        catch {
            return [];
        }
    }
    /**
     * Convert cron expression to schtasks arguments
     */
    cronToSchtasksArgs(expression) {
        const parts = expression.trim().split(/\s+/);
        if (parts.length !== 5) {
            throw new Error(`Invalid cron expression: ${expression}`);
        }
        const [minute, hour, day, _month, weekday] = parts;
        // Extract time if hour and minute are specific
        let time;
        if (minute !== '*' && hour !== '*') {
            const h = minute.includes('/') ? '00' : hour.padStart(2, '0');
            const m = minute.includes('/') ? '00' : minute.padStart(2, '0');
            time = `${h}:${m}`;
        }
        // Handle step values (*/N)
        if (minute.startsWith('*/')) {
            const interval = minute.slice(2);
            return { schedule: 'MINUTE', modifier: interval };
        }
        if (hour.startsWith('*/')) {
            const interval = hour.slice(2);
            return { schedule: 'HOURLY', modifier: interval };
        }
        // Weekly schedule (specific weekday)
        if (weekday !== '*' && day === '*') {
            const dayNames = {
                '0': 'SUN',
                '1': 'MON',
                '2': 'TUE',
                '3': 'WED',
                '4': 'THU',
                '5': 'FRI',
                '6': 'SAT',
                '7': 'SUN',
            };
            // Handle ranges like 1-5
            let days;
            if (weekday.includes('-')) {
                const [start, end] = weekday.split('-');
                const dayList = [];
                for (let i = Number(start); i <= Number(end); i++) {
                    dayList.push(dayNames[String(i)] || String(i));
                }
                days = dayList.join(',');
            }
            else {
                days = weekday
                    .split(',')
                    .map((d) => dayNames[d] || d)
                    .join(',');
            }
            return { schedule: 'WEEKLY', days, time };
        }
        // Monthly schedule (specific day)
        if (day !== '*') {
            return { schedule: 'MONTHLY', modifier: day, time };
        }
        // Default to daily
        return { schedule: 'DAILY', time };
    }
}
//# sourceMappingURL=windows.js.map
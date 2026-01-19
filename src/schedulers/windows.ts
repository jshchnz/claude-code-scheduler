import { execa } from 'execa';
import * as fs from 'fs-extra';
import * as path from 'path';
import { BaseScheduler, SchedulerStatus, SchedulerError } from './base.js';
import type { ScheduledTask } from '../types.js';
import { getLogsDir } from '../config.js';

/**
 * Windows Task Scheduler implementation
 */
export class WindowsScheduler extends BaseScheduler {
  readonly name = 'Task Scheduler';
  readonly platform = 'win32';

  /**
   * Task folder in Task Scheduler
   */
  private readonly TASK_FOLDER = '\\ClaudeScheduler';

  /**
   * Get the task name for Task Scheduler
   */
  private getTaskName(taskId: string): string {
    return `${this.TASK_FOLDER}\\${taskId}`;
  }

  /**
   * Get the path for a worktree script
   */
  private getWorktreeScriptPath(taskId: string): string {
    return path.join(getLogsDir(), `${taskId}.worktree.sh`);
  }

  /**
   * Escape a string for safe embedding in PowerShell single-quoted strings.
   * Single quotes in PowerShell are escaped by doubling them.
   */
  private escapePowerShell(str: string): string {
    return str.replace(/'/g, "''");
  }

  async register(task: ScheduledTask): Promise<void> {
    try {
      const cronExpr = this.getCronExpression(task);
      const taskName = this.getTaskName(task.id);
      const logDir = getLogsDir();
      const logPath = `${logDir}\\${task.id}.log`;

      // Ensure logs directory exists
      await fs.ensureDir(logDir);

      // Determine the task run command
      // Use PowerShell for reliable quoting and redirection
      let taskCommand: string;

      if (this.usesWorktree(task)) {
        // Generate and write worktree script
        const script = this.generateWorktreeScript(task, logDir);
        if (script) {
          const scriptPath = this.getWorktreeScriptPath(task.id);
          await fs.writeFile(scriptPath, script, { mode: 0o755 });
          // Use Git Bash to run the script via PowerShell
          // Convert Windows path to Unix-style for bash
          const unixScriptPath = scriptPath.replace(/\\/g, '/');
          const psScriptPath = this.escapePowerShell(unixScriptPath);
          const psLogPath = this.escapePowerShell(logPath);
          taskCommand = `powershell -NoProfile -Command "& bash '${psScriptPath}' *>> '${psLogPath}'"`;
        } else {
          // Fallback to direct execution
          const command = this.getExecutionCommand(task);
          const workDir = this.getWorkingDirectory(task);
          const psWorkDir = this.escapePowerShell(workDir);
          const psCommand = this.escapePowerShell(command);
          const psLogPath = this.escapePowerShell(logPath);
          taskCommand = `powershell -NoProfile -Command "Set-Location '${psWorkDir}'; ${psCommand} *>> '${psLogPath}'"`;
        }
      } else {
        const command = this.getExecutionCommand(task);
        const workDir = this.getWorkingDirectory(task);
        const psWorkDir = this.escapePowerShell(workDir);
        const psCommand = this.escapePowerShell(command);
        const psLogPath = this.escapePowerShell(logPath);
        taskCommand = `powershell -NoProfile -Command "Set-Location '${psWorkDir}'; ${psCommand} *>> '${psLogPath}'"`;
      }

      // Parse cron to schtasks format
      const { schedule, modifier, time, days } = this.cronToSchtasksArgs(cronExpr);

      // Delete existing task if present (ignore errors)
      try {
        await execa('schtasks', ['/Delete', '/TN', taskName, '/F']);
      } catch {
        // Ignore - might not exist
      }

      // Build schtasks command
      const args: string[] = [
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
    } catch (error) {
      throw new SchedulerError(
        `Failed to register task "${task.name}" with Task Scheduler`,
        this.platform,
        'register',
        error as Error
      );
    }
  }

  async unregister(taskId: string): Promise<void> {
    try {
      const taskName = this.getTaskName(taskId);
      await execa('schtasks', ['/Delete', '/TN', taskName, '/F']);
    } catch (error: unknown) {
      const err = error as { stderr?: string };
      // Ignore "does not exist" errors
      if (!err.stderr?.includes('does not exist')) {
        throw new SchedulerError(
          `Failed to unregister task "${taskId}" from Task Scheduler`,
          this.platform,
          'unregister',
          error as Error
        );
      }
    }
  }

  async isRegistered(taskId: string): Promise<boolean> {
    try {
      const taskName = this.getTaskName(taskId);
      await execa('schtasks', ['/Query', '/TN', taskName]);
      return true;
    } catch {
      return false;
    }
  }

  async getStatus(): Promise<SchedulerStatus> {
    try {
      const tasks = await this.listRegistered();

      return {
        healthy: true,
        taskCount: tasks.length,
        errors: [],
        platform: this.platform,
      };
    } catch {
      return {
        healthy: false,
        taskCount: 0,
        errors: ['Failed to query Task Scheduler'],
        platform: this.platform,
      };
    }
  }

  async listRegistered(): Promise<string[]> {
    try {
      const { stdout } = await execa('schtasks', [
        '/Query',
        '/FO',
        'CSV',
        '/NH',
      ]);

      const taskIds: string[] = [];
      const prefix = this.TASK_FOLDER + '\\';

      for (const line of stdout.split('\n')) {
        // CSV format: "TaskName","Next Run Time","Status"
        const match = line.match(/^"([^"]+)"/);
        if (match && match[1].startsWith(prefix)) {
          taskIds.push(match[1].slice(prefix.length));
        }
      }

      return taskIds;
    } catch {
      return [];
    }
  }

  /**
   * Convert cron expression to schtasks arguments
   */
  private cronToSchtasksArgs(expression: string): {
    schedule: string;
    modifier?: string;
    time?: string;
    days?: string;
  } {
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 5) {
      throw new Error(`Invalid cron expression: ${expression}`);
    }

    const [minute, hour, day, _month, weekday] = parts;

    // Extract time if hour and minute are specific
    let time: string | undefined;
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
      const dayNames: Record<string, string> = {
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
      let days: string;
      if (weekday.includes('-')) {
        const [start, end] = weekday.split('-');
        const dayList: string[] = [];
        for (let i = Number(start); i <= Number(end); i++) {
          dayList.push(dayNames[String(i)] || String(i));
        }
        days = dayList.join(',');
      } else {
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

import { execa } from 'execa';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { BaseScheduler, SchedulerStatus, SchedulerError } from './base.js';
import type { ScheduledTask } from '../types.js';
import { getLogsDir } from '../config.js';

/**
 * macOS launchd scheduler implementation
 */
export class DarwinScheduler extends BaseScheduler {
  readonly name = 'launchd';
  readonly platform = 'darwin';

  private readonly launchAgentsDir: string;

  constructor() {
    super();
    this.launchAgentsDir = path.join(os.homedir(), 'Library', 'LaunchAgents');
  }

  /**
   * Get the plist file path for a task
   */
  private getPlistPath(taskId: string): string {
    return path.join(this.launchAgentsDir, `${this.getTaskLabel(taskId)}.plist`);
  }

  /**
   * Get the path for a worktree script
   */
  private getWorktreeScriptPath(taskId: string): string {
    return path.join(getLogsDir(), `${taskId}.worktree.sh`);
  }

  async register(task: ScheduledTask): Promise<void> {
    try {
      // Ensure LaunchAgents directory exists
      await fs.ensureDir(this.launchAgentsDir);

      // Ensure logs directory exists
      const logDir = getLogsDir();
      await fs.ensureDir(logDir);

      // Generate and write worktree script if enabled
      if (this.usesWorktree(task)) {
        const script = this.generateWorktreeScript(task, logDir);
        if (script) {
          const scriptPath = this.getWorktreeScriptPath(task.id);
          await fs.writeFile(scriptPath, script, { mode: 0o755 });
        }
      }

      const plistContent = this.generatePlist(task);
      const plistPath = this.getPlistPath(task.id);

      // Unload existing if present (ignore errors)
      try {
        await execa('launchctl', ['unload', plistPath]);
      } catch {
        // Ignore - might not be loaded
      }

      // Write plist file
      await fs.writeFile(plistPath, plistContent, 'utf-8');

      // Load the agent
      await execa('launchctl', ['load', plistPath]);
    } catch (error) {
      throw new SchedulerError(
        `Failed to register task "${task.name}" with launchd`,
        this.platform,
        'register',
        error as Error
      );
    }
  }

  async unregister(taskId: string): Promise<void> {
    const plistPath = this.getPlistPath(taskId);

    try {
      // Unload agent (ignore errors if not loaded)
      try {
        await execa('launchctl', ['unload', plistPath]);
      } catch {
        // Ignore - might not be loaded
      }

      // Remove plist file
      if (await fs.pathExists(plistPath)) {
        await fs.remove(plistPath);
      }
    } catch (error) {
      throw new SchedulerError(
        `Failed to unregister task "${taskId}" from launchd`,
        this.platform,
        'unregister',
        error as Error
      );
    }
  }

  async isRegistered(taskId: string): Promise<boolean> {
    const plistPath = this.getPlistPath(taskId);
    return fs.pathExists(plistPath);
  }

  async getStatus(): Promise<SchedulerStatus> {
    const tasks = await this.listRegistered();
    const errors: string[] = [];

    for (const taskId of tasks) {
      try {
        const label = this.getTaskLabel(taskId);
        const { stdout } = await execa('launchctl', ['list', label]);
        if (stdout.includes('Could not find')) {
          errors.push(`Task ${taskId} plist exists but not loaded`);
        }
      } catch {
        errors.push(`Task ${taskId} check failed`);
      }
    }

    return {
      healthy: errors.length === 0,
      taskCount: tasks.length,
      errors,
      platform: this.platform,
    };
  }

  async listRegistered(): Promise<string[]> {
    try {
      if (!(await fs.pathExists(this.launchAgentsDir))) {
        return [];
      }

      const files = await fs.readdir(this.launchAgentsDir);
      const prefix = 'com.claude.scheduler.';
      const suffix = '.plist';

      return files
        .filter((f) => f.startsWith(prefix) && f.endsWith(suffix))
        .map((f) => f.slice(prefix.length, -suffix.length));
    } catch {
      return [];
    }
  }

  /**
   * Generate launchd plist content for a task
   */
  private generatePlist(task: ScheduledTask): string {
    const label = this.getTaskLabel(task.id);
    const cronExpr = this.getCronExpression(task);
    const calendarInterval = this.cronToCalendarInterval(cronExpr);
    const logDir = getLogsDir();

    // Determine the program arguments based on whether worktree is enabled
    let programArgs: string;
    if (this.usesWorktree(task)) {
      const scriptPath = this.getWorktreeScriptPath(task.id);
      programArgs = `    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>${this.escapeXml(scriptPath)}</string>
    </array>`;
    } else {
      const command = this.getExecutionCommand(task);
      const workDir = this.getWorkingDirectory(task);
      programArgs = `    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-c</string>
        <string>cd "${this.escapeXml(workDir)}" &amp;&amp; ${this.escapeXml(command)}</string>
    </array>`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${this.escapeXml(label)}</string>

${programArgs}

    ${calendarInterval}

    <key>StandardOutPath</key>
    <string>${logDir}/${task.id}.out.log</string>

    <key>StandardErrorPath</key>
    <string>${logDir}/${task.id}.err.log</string>

    <key>RunAtLoad</key>
    <false/>

    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin:${process.env.HOME}/.local/bin</string>
    </dict>
</dict>
</plist>`;
  }

  /**
   * Convert cron expression to launchd StartCalendarInterval
   */
  private cronToCalendarInterval(expression: string): string {
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 5) {
      throw new Error(`Invalid cron expression: ${expression}`);
    }

    const [minute, hour, day, month, weekday] = parts;

    // Parse each field with appropriate bounds
    const mins = minute !== '*' ? this.parseField(minute, 0, 59) : null;
    const hours = hour !== '*' ? this.parseField(hour, 0, 23) : null;
    const days = day !== '*' ? this.parseField(day, 1, 31) : null;
    const months = month !== '*' ? this.parseField(month, 1, 12) : null;
    const weekdays = weekday !== '*' ? this.parseField(weekday, 0, 6) : null;

    // Build the dict entries for a single interval
    const buildDict = (
      m: number | null,
      h: number | null,
      d: number | null,
      mo: number | null,
      wd: number | null
    ): string => {
      let dict = '    <dict>\n';
      if (m !== null) dict += `        <key>Minute</key>\n        <integer>${m}</integer>\n`;
      if (h !== null) dict += `        <key>Hour</key>\n        <integer>${h}</integer>\n`;
      if (d !== null) dict += `        <key>Day</key>\n        <integer>${d}</integer>\n`;
      if (mo !== null) dict += `        <key>Month</key>\n        <integer>${mo}</integer>\n`;
      if (wd !== null) dict += `        <key>Weekday</key>\n        <integer>${wd}</integer>\n`;
      dict += '    </dict>';
      return dict;
    };

    // Generate cartesian product of all field values
    const minValues = mins ?? [null];
    const hourValues = hours ?? [null];
    const dayValues = days ?? [null];
    const monthValues = months ?? [null];
    const weekdayValues = weekdays ?? [null];

    const dicts: string[] = [];
    for (const m of minValues) {
      for (const h of hourValues) {
        for (const d of dayValues) {
          for (const mo of monthValues) {
            for (const wd of weekdayValues) {
              dicts.push(buildDict(m, h, d, mo, wd));
            }
          }
        }
      }
    }

    // If only one interval, use dict format; otherwise use array format
    if (dicts.length === 1) {
      return `<key>StartCalendarInterval</key>\n${dicts[0]}`;
    }

    return `<key>StartCalendarInterval</key>\n    <array>\n${dicts.join('\n')}\n    </array>`;
  }

  /**
   * Parse a cron field to extract numeric values
   */
  private parseField(field: string, min: number, max: number): number[] {
    const values: number[] = [];

    for (const part of field.split(',')) {
      if (part.includes('/')) {
        // Handle step values like */15 or 0-30/5
        const [range, stepStr] = part.split('/');
        const step = Number(stepStr);
        let start = min;
        let end = max;

        if (range !== '*') {
          if (range.includes('-')) {
            [start, end] = range.split('-').map(Number);
          } else {
            start = Number(range);
          }
        }

        for (let i = start; i <= end; i += step) {
          values.push(i);
        }
      } else if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number);
        for (let i = start; i <= end; i++) {
          values.push(i);
        }
      } else {
        values.push(Number(part));
      }
    }

    return values;
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

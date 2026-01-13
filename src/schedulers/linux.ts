import { execa } from 'execa';
import { BaseScheduler, SchedulerStatus, SchedulerError } from './base.js';
import type { ScheduledTask } from '../types.js';
import { getLogsDir } from '../config.js';

/**
 * Linux crontab scheduler implementation
 */
export class LinuxScheduler extends BaseScheduler {
  readonly name = 'crontab';
  readonly platform = 'linux';

  /**
   * Marker comment to identify our cron entries
   */
  private readonly MARKER_PREFIX = '# claude-scheduler:';

  async register(task: ScheduledTask): Promise<void> {
    try {
      const cronExpr = this.getCronExpression(task);
      const command = this.getExecutionCommand(task);
      const workDir = this.getWorkingDirectory(task);
      const logPath = `${getLogsDir()}/${task.id}.log`;

      // Get current crontab
      const currentCrontab = await this.getCurrentCrontab();

      // Remove existing entry for this task
      const lines = currentCrontab
        .split('\n')
        .filter((line) => !line.includes(`${this.MARKER_PREFIX}${task.id}`));

      // Add new entry
      const cronLine = `${cronExpr} cd "${workDir}" && ${command} >> "${logPath}" 2>&1 ${this.MARKER_PREFIX}${task.id}`;
      lines.push(cronLine);

      // Update crontab
      const newCrontab = lines.filter((l) => l.trim()).join('\n') + '\n';
      await this.setCrontab(newCrontab);
    } catch (error) {
      throw new SchedulerError(
        `Failed to register task "${task.name}" with crontab`,
        this.platform,
        'register',
        error as Error
      );
    }
  }

  async unregister(taskId: string): Promise<void> {
    try {
      const currentCrontab = await this.getCurrentCrontab();

      // Remove entry for this task
      const lines = currentCrontab
        .split('\n')
        .filter((line) => !line.includes(`${this.MARKER_PREFIX}${taskId}`));

      // Update crontab
      const newCrontab = lines.filter((l) => l.trim()).join('\n') + '\n';
      await this.setCrontab(newCrontab);
    } catch (error) {
      throw new SchedulerError(
        `Failed to unregister task "${taskId}" from crontab`,
        this.platform,
        'unregister',
        error as Error
      );
    }
  }

  async isRegistered(taskId: string): Promise<boolean> {
    const currentCrontab = await this.getCurrentCrontab();
    return currentCrontab.includes(`${this.MARKER_PREFIX}${taskId}`);
  }

  async getStatus(): Promise<SchedulerStatus> {
    const tasks = await this.listRegistered();

    return {
      healthy: true, // crontab is always healthy if we can read it
      taskCount: tasks.length,
      errors: [],
      platform: this.platform,
    };
  }

  async listRegistered(): Promise<string[]> {
    const currentCrontab = await this.getCurrentCrontab();
    const taskIds: string[] = [];

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
  private async getCurrentCrontab(): Promise<string> {
    try {
      const { stdout } = await execa('crontab', ['-l']);
      return stdout;
    } catch (error: unknown) {
      // "no crontab for user" is not an error for us
      const err = error as { stderr?: string };
      if (err.stderr?.includes('no crontab')) {
        return '';
      }
      throw error;
    }
  }

  /**
   * Set the user's crontab content
   */
  private async setCrontab(content: string): Promise<void> {
    await execa('crontab', ['-'], { input: content });
  }
}

import type { ScheduledTask, CronTrigger } from '../types.js';

/**
 * Status of the native scheduler
 */
export interface SchedulerStatus {
  healthy: boolean;
  taskCount: number;
  errors: string[];
  platform: string;
}

/**
 * Abstract base class for platform-specific schedulers
 */
export abstract class BaseScheduler {
  /**
   * Human-readable name of the scheduler
   */
  abstract readonly name: string;

  /**
   * Platform identifier
   */
  abstract readonly platform: string;

  /**
   * Register a cron task with the native scheduler
   */
  abstract register(task: ScheduledTask): Promise<void>;

  /**
   * Unregister a task from the native scheduler
   */
  abstract unregister(taskId: string): Promise<void>;

  /**
   * Check if a task is registered
   */
  abstract isRegistered(taskId: string): Promise<boolean>;

  /**
   * Get current scheduler status
   */
  abstract getStatus(): Promise<SchedulerStatus>;

  /**
   * List all registered task IDs
   */
  abstract listRegistered(): Promise<string[]>;

  /**
   * Generate the command to execute Claude in non-interactive mode
   */
  protected getExecutionCommand(task: ScheduledTask): string {
    const command = task.execution.command;

    // Escape the command for shell execution
    const escapedCommand = command.replace(/"/g, '\\"');

    // Build the claude command
    // Note: timeout is handled by the native scheduler, not Claude CLI
    // The -p flag enables non-interactive print mode
    const flags: string[] = [];
    if (task.execution.skipPermissions) {
      flags.push('--dangerously-skip-permissions');
    }

    const flagStr = flags.length > 0 ? ` ${flags.join(' ')}` : '';
    return `claude -p "${escapedCommand}"${flagStr}`;
  }

  /**
   * Get the working directory for a task
   */
  protected getWorkingDirectory(task: ScheduledTask): string {
    return task.execution.workingDirectory || '.';
  }

  /**
   * Extract cron expression from task trigger
   */
  protected getCronExpression(task: ScheduledTask): string {
    if (task.trigger.type !== 'cron') {
      throw new Error(`Unsupported trigger type: ${task.trigger.type}`);
    }
    return (task.trigger as CronTrigger).expression;
  }

  /**
   * Get the task label/identifier for the native scheduler
   */
  protected getTaskLabel(taskId: string): string {
    return `com.claude.scheduler.${taskId}`;
  }
}

/**
 * Error thrown when scheduler operations fail
 */
export class SchedulerError extends Error {
  constructor(
    message: string,
    public readonly platform: string,
    public readonly operation: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'SchedulerError';
  }
}

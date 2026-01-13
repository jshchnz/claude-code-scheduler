/**
 * Abstract base class for platform-specific schedulers
 */
export class BaseScheduler {
    /**
     * Generate the command to execute Claude in non-interactive mode
     */
    getExecutionCommand(task) {
        const command = task.execution.command;
        // Escape the command for shell execution
        const escapedCommand = command.replace(/"/g, '\\"');
        // Build the claude command
        // Note: timeout is handled by the native scheduler, not Claude CLI
        // The -p flag enables non-interactive print mode
        const flags = [];
        if (task.execution.skipPermissions) {
            flags.push('--dangerously-skip-permissions');
        }
        const flagStr = flags.length > 0 ? ` ${flags.join(' ')}` : '';
        return `claude -p "${escapedCommand}"${flagStr}`;
    }
    /**
     * Get the working directory for a task
     */
    getWorkingDirectory(task) {
        return task.execution.workingDirectory || '.';
    }
    /**
     * Extract cron expression from task trigger
     */
    getCronExpression(task) {
        if (task.trigger.type !== 'cron') {
            throw new Error(`Unsupported trigger type: ${task.trigger.type}`);
        }
        return task.trigger.expression;
    }
    /**
     * Get the task label/identifier for the native scheduler
     */
    getTaskLabel(taskId) {
        return `com.claude.scheduler.${taskId}`;
    }
}
/**
 * Error thrown when scheduler operations fail
 */
export class SchedulerError extends Error {
    platform;
    operation;
    cause;
    constructor(message, platform, operation, cause) {
        super(message);
        this.platform = platform;
        this.operation = operation;
        this.cause = cause;
        this.name = 'SchedulerError';
    }
}
//# sourceMappingURL=base.js.map
import { BaseScheduler, SchedulerStatus } from './base.js';
import type { ScheduledTask } from '../types.js';
/**
 * Windows Task Scheduler implementation
 */
export declare class WindowsScheduler extends BaseScheduler {
    readonly name = "Task Scheduler";
    readonly platform = "win32";
    /**
     * Task folder in Task Scheduler
     */
    private readonly TASK_FOLDER;
    /**
     * Get the task name for Task Scheduler
     */
    private getTaskName;
    register(task: ScheduledTask): Promise<void>;
    unregister(taskId: string): Promise<void>;
    isRegistered(taskId: string): Promise<boolean>;
    getStatus(): Promise<SchedulerStatus>;
    listRegistered(): Promise<string[]>;
    /**
     * Convert cron expression to schtasks arguments
     */
    private cronToSchtasksArgs;
}
//# sourceMappingURL=windows.d.ts.map
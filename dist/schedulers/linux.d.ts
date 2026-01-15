import { BaseScheduler, SchedulerStatus } from './base.js';
import type { ScheduledTask } from '../types.js';
/**
 * Linux crontab scheduler implementation
 */
export declare class LinuxScheduler extends BaseScheduler {
    readonly name = "crontab";
    readonly platform = "linux";
    /**
     * Marker comment to identify our cron entries
     */
    private readonly MARKER_PREFIX;
    /**
     * Get the path for a worktree script
     */
    private getWorktreeScriptPath;
    register(task: ScheduledTask): Promise<void>;
    unregister(taskId: string): Promise<void>;
    isRegistered(taskId: string): Promise<boolean>;
    getStatus(): Promise<SchedulerStatus>;
    listRegistered(): Promise<string[]>;
    /**
     * Get the current user's crontab content
     */
    private getCurrentCrontab;
    /**
     * Set the user's crontab content
     */
    private setCrontab;
}
//# sourceMappingURL=linux.d.ts.map
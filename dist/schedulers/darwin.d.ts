import { BaseScheduler, SchedulerStatus } from './base.js';
import type { ScheduledTask } from '../types.js';
/**
 * macOS launchd scheduler implementation
 */
export declare class DarwinScheduler extends BaseScheduler {
    readonly name = "launchd";
    readonly platform = "darwin";
    private readonly launchAgentsDir;
    constructor();
    /**
     * Get the plist file path for a task
     */
    private getPlistPath;
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
     * Generate launchd plist content for a task
     */
    private generatePlist;
    /**
     * Convert cron expression to launchd StartCalendarInterval
     */
    private cronToCalendarInterval;
    /**
     * Parse a cron field to extract numeric values
     */
    private parseField;
    /**
     * Escape XML special characters
     */
    private escapeXml;
}
//# sourceMappingURL=darwin.d.ts.map
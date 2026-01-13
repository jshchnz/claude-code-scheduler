import * as os from 'os';
import { SchedulerError } from './base.js';
import { DarwinScheduler } from './darwin.js';
import { LinuxScheduler } from './linux.js';
import { WindowsScheduler } from './windows.js';
export { BaseScheduler, SchedulerError } from './base.js';
/**
 * Cached scheduler instance
 */
let cachedScheduler = null;
/**
 * Get the appropriate scheduler for the current platform
 */
export function getScheduler() {
    if (cachedScheduler) {
        return cachedScheduler;
    }
    const platform = os.platform();
    switch (platform) {
        case 'darwin':
            cachedScheduler = new DarwinScheduler();
            break;
        case 'linux':
            cachedScheduler = new LinuxScheduler();
            break;
        case 'win32':
            cachedScheduler = new WindowsScheduler();
            break;
        default:
            throw new SchedulerError(`Unsupported platform: ${platform}`, platform, 'init');
    }
    return cachedScheduler;
}
/**
 * Get the platform name
 */
export function getPlatformName() {
    const platform = os.platform();
    switch (platform) {
        case 'darwin':
            return 'macOS';
        case 'linux':
            return 'Linux';
        case 'win32':
            return 'Windows';
        default:
            return platform;
    }
}
/**
 * Get the native scheduler name for the current platform
 */
export function getSchedulerName() {
    const platform = os.platform();
    switch (platform) {
        case 'darwin':
            return 'launchd';
        case 'linux':
            return 'crontab';
        case 'win32':
            return 'Task Scheduler';
        default:
            return 'unknown';
    }
}
/**
 * Check if the current platform is supported
 */
export function isPlatformSupported() {
    const platform = os.platform();
    return ['darwin', 'linux', 'win32'].includes(platform);
}
//# sourceMappingURL=index.js.map
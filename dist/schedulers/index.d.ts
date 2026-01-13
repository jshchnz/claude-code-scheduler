import { BaseScheduler } from './base.js';
export { BaseScheduler, SchedulerError } from './base.js';
/**
 * Get the appropriate scheduler for the current platform
 */
export declare function getScheduler(): BaseScheduler;
/**
 * Get the platform name
 */
export declare function getPlatformName(): string;
/**
 * Get the native scheduler name for the current platform
 */
export declare function getSchedulerName(): string;
/**
 * Check if the current platform is supported
 */
export declare function isPlatformSupported(): boolean;
//# sourceMappingURL=index.d.ts.map
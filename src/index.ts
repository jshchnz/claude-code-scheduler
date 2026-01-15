// Types
export * from './types.js';

// Config utilities
export * from './config.js';

// Scheduler implementations
export {
  BaseScheduler,
  SchedulerError,
  getScheduler,
  getPlatformName,
  getSchedulerName,
  isPlatformSupported,
} from './schedulers/index.js';

// Cron utilities
export {
  validateCron,
  getNextRuns,
  getNextRun,
  naturalLanguageToCron,
  CRON_PRESETS,
} from './cron/parser.js';

export {
  cronToHuman,
  cronToHumanVerbose,
  formatDate,
  formatDuration,
  formatTimeAgo,
} from './cron/humanizer.js';

// Logging utilities
export {
  ensureLogsDir,
  readTaskLog,
  appendToLog,
  clearTaskLog,
  getLogSize,
  rotateLogIfNeeded,
  cleanupOldLogs,
} from './logs/index.js';

// Execution history
export {
  getHistoryPath,
  recordExecution,
  createHistoryRecord,
  completeHistoryRecord,
  getRecentExecutions,
  getExecutionById,
  getExecutionStats,
  cleanupOldHistory,
  formatProjectPath,
  getStatusIcon,
  // Log file scanning (primary method)
  scanExecutionLogs,
  getScannedExecutionByTaskId,
  readLogContent,
} from './history/index.js';
export type { HistoryQueryOptions, ScannedExecution } from './history/index.js';

// Git worktree utilities
export {
  isGitRepo,
  generateWorktreeName,
  getWorktreeBasePath,
  createWorktree,
  commitAndPush,
  removeWorktree,
  worktreeExists,
} from './vcs/index.js';
export type {
  WorktreeContext,
  CreateWorktreeParams,
  WorktreeResult,
} from './vcs/types.js';

// Shell utilities
export {
  shellEscape,
  sanitizeForComment,
  isSafeIdentifier,
  GIT_REF_PATTERN,
  GIT_REMOTE_PATTERN,
  SAFE_PATH_PATTERN,
} from './utils/shell.js';

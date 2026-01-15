/**
 * Git worktree operations
 */

import { execa } from 'execa';
import * as fs from 'fs-extra';
import * as path from 'path';
import type {
  WorktreeContext,
  CreateWorktreeParams,
  WorktreeResult,
} from './types.js';

export * from './types.js';

/**
 * Check if path is a git repository
 */
export async function isGitRepo(repoPath: string): Promise<boolean> {
  const gitPath = path.join(repoPath, '.git');
  return fs.pathExists(gitPath);
}

/**
 * Generate a unique worktree name from task ID and timestamp
 */
export function generateWorktreeName(taskId: string): string {
  const timestamp = Date.now();
  const shortId = taskId.slice(0, 8);
  return `task-${shortId}-${timestamp}`;
}

/**
 * Get the worktree base directory path
 */
export function getWorktreeBasePath(mainRepoPath: string, basePath?: string): string {
  if (basePath) {
    return basePath;
  }
  // Default: sibling .worktrees directory
  const parentDir = path.dirname(mainRepoPath);
  const repoName = path.basename(mainRepoPath);
  return path.join(parentDir, `.${repoName}-worktrees`);
}

/**
 * Create a git worktree
 */
export async function createWorktree(params: CreateWorktreeParams): Promise<WorktreeContext> {
  const { mainRepoPath, taskId, basePath, branchPrefix } = params;

  // Verify it's a git repo
  if (!(await isGitRepo(mainRepoPath))) {
    throw new Error(`Not a git repository: ${mainRepoPath}`);
  }

  const name = generateWorktreeName(taskId);
  const branchName = `${branchPrefix}${name}`;
  const worktreeBase = getWorktreeBasePath(mainRepoPath, basePath);
  const worktreePath = path.join(worktreeBase, name);

  // Ensure base directory exists
  await fs.ensureDir(worktreeBase);

  // Create worktree with new branch
  await execa('git', ['worktree', 'add', worktreePath, '-b', branchName], {
    cwd: mainRepoPath,
  });

  return {
    mainRepoPath,
    worktreePath,
    branchName,
    createdAt: new Date(),
  };
}

/**
 * Commit and push changes in a git worktree
 */
export async function commitAndPush(
  ctx: WorktreeContext,
  message: string,
  remote: string = 'origin'
): Promise<WorktreeResult> {
  const { worktreePath, branchName } = ctx;

  try {
    // Stage all changes
    await execa('git', ['add', '-A'], { cwd: worktreePath });

    // Check if there are staged changes
    const { stdout: status } = await execa('git', ['status', '--porcelain'], {
      cwd: worktreePath,
    });

    if (!status.trim()) {
      return { success: true, pushed: false, hadChanges: false };
    }

    // Commit changes
    await execa('git', ['commit', '-m', message], { cwd: worktreePath });

    // Get commit SHA
    const { stdout: sha } = await execa('git', ['rev-parse', 'HEAD'], {
      cwd: worktreePath,
    });

    // Push to remote
    await execa('git', ['push', '-u', remote, branchName], { cwd: worktreePath });

    return {
      success: true,
      commitSha: sha.trim(),
      pushed: true,
      hadChanges: true,
    };
  } catch (error) {
    return {
      success: false,
      pushed: false,
      hadChanges: true,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Remove a git worktree
 */
export async function removeWorktree(ctx: WorktreeContext): Promise<void> {
  const { mainRepoPath, worktreePath } = ctx;

  await execa('git', ['worktree', 'remove', worktreePath, '--force'], {
    cwd: mainRepoPath,
  });
}

/**
 * Check if a worktree exists
 */
export async function worktreeExists(ctx: WorktreeContext): Promise<boolean> {
  return fs.pathExists(ctx.worktreePath);
}

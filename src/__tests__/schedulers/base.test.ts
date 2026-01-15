import { describe, it, expect } from 'vitest';
import { BaseScheduler, SchedulerStatus } from '../../schedulers/base.js';
import type { ScheduledTask, WorktreeConfig } from '../../types.js';
import { createTask } from '../../types.js';

/**
 * Concrete implementation of BaseScheduler for testing
 */
class TestScheduler extends BaseScheduler {
  readonly name = 'test';
  readonly platform = 'test';

  async register(_task: ScheduledTask): Promise<void> {}
  async unregister(_taskId: string): Promise<void> {}
  async isRegistered(_taskId: string): Promise<boolean> {
    return false;
  }
  async getStatus(): Promise<SchedulerStatus> {
    return { healthy: true, taskCount: 0, errors: [], platform: 'test' };
  }
  async listRegistered(): Promise<string[]> {
    return [];
  }

  // Expose protected methods for testing
  public testGetExecutionCommand(task: ScheduledTask): string {
    return this.getExecutionCommand(task);
  }

  public testGenerateWorktreeScript(task: ScheduledTask, logDir: string): string | null {
    return this.generateWorktreeScript(task, logDir);
  }

  public testUsesWorktree(task: ScheduledTask): boolean {
    return this.usesWorktree(task);
  }
}

describe('BaseScheduler', () => {
  const scheduler = new TestScheduler();

  describe('getExecutionCommand', () => {
    it('generates basic claude command with single-quoted prompt', () => {
      const task = createTask('Test', '0 9 * * *', 'echo hello');
      const command = scheduler.testGetExecutionCommand(task);
      expect(command).toBe("claude -p 'echo hello'");
    });

    it('escapes single quotes in command', () => {
      const task = createTask('Test', '0 9 * * *', "echo 'hello'");
      const command = scheduler.testGetExecutionCommand(task);
      expect(command).toBe("claude -p 'echo '\\''hello'\\'''");
    });

    it('prevents shell expansion of backticks', () => {
      const task = createTask('Test', '0 9 * * *', 'check `date`');
      const command = scheduler.testGetExecutionCommand(task);
      // Backticks are safely inside single quotes
      expect(command).toBe("claude -p 'check `date`'");
    });

    it('prevents shell expansion of $()', () => {
      const task = createTask('Test', '0 9 * * *', 'check $(whoami)');
      const command = scheduler.testGetExecutionCommand(task);
      // $() is safely inside single quotes
      expect(command).toBe("claude -p 'check $(whoami)'");
    });

    it('adds skip permissions flag when enabled', () => {
      const task = createTask('Test', '0 9 * * *', 'echo hello', {
        skipPermissions: true,
      });
      const command = scheduler.testGetExecutionCommand(task);
      expect(command).toBe("claude -p 'echo hello' --dangerously-skip-permissions");
    });
  });

  describe('usesWorktree', () => {
    it('returns false when worktree not configured', () => {
      const task = createTask('Test', '0 9 * * *', 'echo');
      expect(scheduler.testUsesWorktree(task)).toBe(false);
    });

    it('returns false when worktree disabled', () => {
      const task = createTask('Test', '0 9 * * *', 'echo');
      task.execution.worktree = { enabled: false } as WorktreeConfig;
      expect(scheduler.testUsesWorktree(task)).toBe(false);
    });

    it('returns true when worktree enabled', () => {
      const task = createTask('Test', '0 9 * * *', 'echo');
      task.execution.worktree = { enabled: true } as WorktreeConfig;
      expect(scheduler.testUsesWorktree(task)).toBe(true);
    });
  });

  describe('generateWorktreeScript', () => {
    it('returns null when worktree not enabled', () => {
      const task = createTask('Test', '0 9 * * *', 'echo');
      const script = scheduler.testGenerateWorktreeScript(task, '/logs');
      expect(script).toBeNull();
    });

    it('generates script when worktree enabled', () => {
      const task = createTask('Test', '0 9 * * *', 'echo');
      task.execution.worktree = { enabled: true } as WorktreeConfig;
      const script = scheduler.testGenerateWorktreeScript(task, '/logs');
      expect(script).not.toBeNull();
      expect(script).toContain('#!/bin/bash');
    });

    it('includes task ID in script', () => {
      const task = createTask('Test', '0 9 * * *', 'echo');
      task.execution.worktree = { enabled: true } as WorktreeConfig;
      const script = scheduler.testGenerateWorktreeScript(task, '/logs');
      expect(script).toContain(task.id);
    });

    describe('security: shell escaping', () => {
      it('escapes task name with single quotes', () => {
        const task = createTask("Task's Name", '0 9 * * *', 'echo');
        task.execution.worktree = { enabled: true } as WorktreeConfig;
        const script = scheduler.testGenerateWorktreeScript(task, '/logs');

        // Should use shell escaping pattern: 'Task'\''s Name'
        expect(script).toContain("'Task'\\''s Name'");
      });

      it('prevents command injection via task name', () => {
        const task = createTask('test; rm -rf /', '0 9 * * *', 'echo');
        task.execution.worktree = { enabled: true } as WorktreeConfig;
        const script = scheduler.testGenerateWorktreeScript(task, '/logs');

        // The malicious name should be wrapped in single quotes
        // so it becomes a literal string, not executed
        expect(script).toContain("TASK_NAME='test; rm -rf /'");

        // Verify the assignment uses single-quoted value (safe)
        const taskNameLine = script!.split('\n').find((line) => line.startsWith('TASK_NAME='));
        expect(taskNameLine).toBeDefined();
        expect(taskNameLine).toMatch(/^TASK_NAME='.*'$/);
      });

      it('prevents command injection via backticks in task name', () => {
        const task = createTask('test`whoami`', '0 9 * * *', 'echo');
        task.execution.worktree = { enabled: true } as WorktreeConfig;
        const script = scheduler.testGenerateWorktreeScript(task, '/logs');

        // Backticks should be inside single quotes
        expect(script).toContain("'test`whoami`'");
      });

      it('prevents command injection via $() in task name', () => {
        const task = createTask('test$(id)', '0 9 * * *', 'echo');
        task.execution.worktree = { enabled: true } as WorktreeConfig;
        const script = scheduler.testGenerateWorktreeScript(task, '/logs');

        // $() should be inside single quotes
        expect(script).toContain("'test$(id)'");
      });

      it('sanitizes task name in comment line', () => {
        const task = createTask('test$(whoami)`id`', '0 9 * * *', 'echo');
        task.execution.worktree = { enabled: true } as WorktreeConfig;
        const script = scheduler.testGenerateWorktreeScript(task, '/logs');

        // Comment line should have sanitized name (shell metacharacters removed)
        const commentLine = script!.split('\n').find((line) => line.startsWith('# Task:'));
        expect(commentLine).toBeDefined();
        // $ and backticks should be removed ($ removed, parentheses kept)
        expect(commentLine).not.toContain('$');
        expect(commentLine).not.toContain('`');
        // Result should be "test(whoami)id"
        expect(commentLine).toContain('test(whoami)id');
      });

      it('escapes working directory path', () => {
        const task = createTask('Test', '0 9 * * *', 'echo');
        task.execution.workingDirectory = "/path/with'quotes";
        task.execution.worktree = { enabled: true } as WorktreeConfig;
        const script = scheduler.testGenerateWorktreeScript(task, '/logs');

        // Path should be properly escaped
        expect(script).toContain("'/path/with'\\''quotes'");
      });

      it('escapes log directory path', () => {
        const task = createTask('Test', '0 9 * * *', 'echo');
        task.execution.worktree = { enabled: true } as WorktreeConfig;
        const script = scheduler.testGenerateWorktreeScript(task, "/logs/with'quotes");

        // Log dir should be properly escaped
        expect(script).toContain("'/logs/with'\\''quotes'");
      });

      it('escapes branch prefix', () => {
        const task = createTask('Test', '0 9 * * *', 'echo');
        task.execution.worktree = {
          enabled: true,
          branchPrefix: "claude's-branch/",
        } as WorktreeConfig;
        const script = scheduler.testGenerateWorktreeScript(task, '/logs');

        // Branch prefix should be escaped
        expect(script).toContain("'claude'\\''s-branch/'");
      });

      it('escapes remote name', () => {
        const task = createTask('Test', '0 9 * * *', 'echo');
        task.execution.worktree = {
          enabled: true,
          remoteName: "my'remote",
        } as WorktreeConfig;
        const script = scheduler.testGenerateWorktreeScript(task, '/logs');

        // Remote name should be escaped
        expect(script).toContain("'my'\\''remote'");
      });

      it('escapes base path', () => {
        const task = createTask('Test', '0 9 * * *', 'echo');
        task.execution.worktree = {
          enabled: true,
          basePath: "/path/with'quotes",
        } as WorktreeConfig;
        const script = scheduler.testGenerateWorktreeScript(task, '/logs');

        // Base path should be escaped
        expect(script).toContain("'/path/with'\\''quotes'");
      });
    });
  });
});

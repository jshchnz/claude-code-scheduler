import { DarwinScheduler } from '../dist/schedulers/darwin.js';

const scheduler = new (DarwinScheduler as any)();

const mockTask = {
  id: 'test-task-123',
  name: 'Test Task',
  execution: {
    command: 'echo "Hello from Claude"',
    workingDirectory: process.cwd(),
    worktree: {
      enabled: true,
      branchPrefix: 'claude-task/',
      remoteName: 'origin',
    },
  },
  trigger: { type: 'cron', expression: '0 9 * * *' },
};

const script = scheduler.generateWorktreeScript(mockTask, '/tmp/logs');
console.log(script);

import { isGitRepo } from '../dist/vcs/index.js';

const repoPath = process.cwd();

async function test() {
  console.log('Testing git detection...\n');

  const isGit = await isGitRepo(repoPath);
  console.log('Is git repo:', isGit);

  console.log('\nWould create worktree with params:', {
    mainRepoPath: repoPath,
    taskId: 'test-123',
    branchPrefix: 'claude-task/',
  });
}

test().catch(console.error);

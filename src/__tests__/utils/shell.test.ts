import { describe, it, expect } from 'vitest';
import {
  shellEscape,
  sanitizeForComment,
  isSafeIdentifier,
  GIT_REF_PATTERN,
  GIT_REMOTE_PATTERN,
  SAFE_PATH_PATTERN,
} from '../../utils/shell.js';

describe('shellEscape', () => {
  it('wraps simple strings in single quotes', () => {
    expect(shellEscape('hello')).toBe("'hello'");
  });

  it('handles empty string', () => {
    expect(shellEscape('')).toBe("''");
  });

  it('escapes single quotes using the end-escape-start pattern', () => {
    expect(shellEscape("it's")).toBe("'it'\\''s'");
  });

  it('escapes multiple single quotes', () => {
    expect(shellEscape("it's a 'test'")).toBe("'it'\\''s a '\\''test'\\'''");
  });

  it('preserves double quotes inside single quotes', () => {
    expect(shellEscape('say "hello"')).toBe("'say \"hello\"'");
  });

  it('prevents command injection with semicolons', () => {
    const malicious = 'foo; rm -rf /';
    const escaped = shellEscape(malicious);
    expect(escaped).toBe("'foo; rm -rf /'");
    // When executed in bash, this is a literal string, not a command
  });

  it('prevents command injection with backticks', () => {
    const malicious = 'foo `whoami`';
    const escaped = shellEscape(malicious);
    expect(escaped).toBe("'foo `whoami`'");
  });

  it('prevents command injection with $() syntax', () => {
    const malicious = 'foo $(whoami)';
    const escaped = shellEscape(malicious);
    expect(escaped).toBe("'foo $(whoami)'");
  });

  it('prevents command injection with newlines', () => {
    const malicious = 'foo\nrm -rf /';
    const escaped = shellEscape(malicious);
    expect(escaped).toBe("'foo\nrm -rf /'");
  });

  it('handles complex injection attempts', () => {
    const malicious = '"; rm -rf / #';
    const escaped = shellEscape(malicious);
    expect(escaped).toBe("'\"; rm -rf / #'");
  });
});

describe('sanitizeForComment', () => {
  it('preserves alphanumeric characters', () => {
    expect(sanitizeForComment('Hello123')).toBe('Hello123');
  });

  it('preserves spaces', () => {
    expect(sanitizeForComment('Hello World')).toBe('Hello World');
  });

  it('preserves safe punctuation', () => {
    expect(sanitizeForComment('Hello, World!')).toBe('Hello, World!');
    expect(sanitizeForComment('Test task.')).toBe('Test task.');
    expect(sanitizeForComment('Is this a test?')).toBe('Is this a test?');
  });

  it('preserves colons, parentheses, and brackets', () => {
    expect(sanitizeForComment('Task: Run (daily)')).toBe('Task: Run (daily)');
    expect(sanitizeForComment('Config [v1.0]')).toBe('Config [v1.0]');
    expect(sanitizeForComment('Build {dev}')).toBe('Build {dev}');
  });

  it('removes shell metacharacters', () => {
    // $ is removed, parentheses kept
    expect(sanitizeForComment('test$(whoami)')).toBe('test(whoami)');
    // Backticks removed
    expect(sanitizeForComment('test`id`')).toBe('testid');
    // Other shell chars removed
    expect(sanitizeForComment('test|cat')).toBe('testcat');
    expect(sanitizeForComment('foo&bar')).toBe('foobar');
    expect(sanitizeForComment('test#comment')).toBe('testcomment');
  });

  it('replaces newlines with spaces', () => {
    expect(sanitizeForComment('line1\nline2')).toBe('line1 line2');
  });
});

describe('isSafeIdentifier', () => {
  describe('with GIT_REF_PATTERN', () => {
    it('accepts valid git ref patterns', () => {
      expect(isSafeIdentifier('claude-task/', GIT_REF_PATTERN)).toBe(true);
      expect(isSafeIdentifier('feature/my-branch', GIT_REF_PATTERN)).toBe(true);
      expect(isSafeIdentifier('v1.0.0', GIT_REF_PATTERN)).toBe(true);
    });

    it('rejects invalid git ref patterns', () => {
      expect(isSafeIdentifier('branch; rm -rf', GIT_REF_PATTERN)).toBe(false);
      expect(isSafeIdentifier('branch`id`', GIT_REF_PATTERN)).toBe(false);
      expect(isSafeIdentifier('branch name', GIT_REF_PATTERN)).toBe(false);
    });
  });

  describe('with GIT_REMOTE_PATTERN', () => {
    it('accepts valid git remote names', () => {
      expect(isSafeIdentifier('origin', GIT_REMOTE_PATTERN)).toBe(true);
      expect(isSafeIdentifier('upstream', GIT_REMOTE_PATTERN)).toBe(true);
      expect(isSafeIdentifier('my-remote_1', GIT_REMOTE_PATTERN)).toBe(true);
    });

    it('rejects invalid git remote names', () => {
      expect(isSafeIdentifier('origin; rm', GIT_REMOTE_PATTERN)).toBe(false);
      expect(isSafeIdentifier('remote/name', GIT_REMOTE_PATTERN)).toBe(false);
      expect(isSafeIdentifier('remote name', GIT_REMOTE_PATTERN)).toBe(false);
    });
  });

  describe('with SAFE_PATH_PATTERN', () => {
    it('accepts valid paths', () => {
      expect(isSafeIdentifier('/home/user/worktrees', SAFE_PATH_PATTERN)).toBe(true);
      expect(isSafeIdentifier('~/worktrees', SAFE_PATH_PATTERN)).toBe(true);
      expect(isSafeIdentifier('./relative/path', SAFE_PATH_PATTERN)).toBe(true);
      expect(isSafeIdentifier('path with spaces', SAFE_PATH_PATTERN)).toBe(true);
    });

    it('rejects paths with dangerous characters', () => {
      expect(isSafeIdentifier('/path; rm -rf', SAFE_PATH_PATTERN)).toBe(false);
      expect(isSafeIdentifier('/path$(whoami)', SAFE_PATH_PATTERN)).toBe(false);
      expect(isSafeIdentifier('/path`id`', SAFE_PATH_PATTERN)).toBe(false);
    });
  });
});

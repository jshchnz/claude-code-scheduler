/**
 * Shell escaping utilities for safe command generation
 */

/**
 * Escape a string for safe embedding in a single-quoted bash string.
 * Single quotes in bash prevent all expansion, making this the safest approach.
 *
 * Examples:
 *   shellEscape('foo')     -> "'foo'"
 *   shellEscape("it's")    -> "'it'\\''s'"
 *   shellEscape('$HOME')   -> "'$HOME'" (no expansion)
 *   shellEscape('"; rm -rf /') -> "'\"'; rm -rf /'"
 *
 * The technique: wrap in single quotes, escape any internal single quotes
 * by ending the string, adding an escaped quote, and starting a new string.
 * 'it'\''s' = 'it' + \' + 's' = it's
 */
export function shellEscape(str: string): string {
  // Replace each single quote with: end quote, escaped quote, start quote
  return "'" + str.replace(/'/g, "'\\''") + "'";
}

/**
 * Sanitize a string to contain only safe characters for display in comments.
 * Removes shell metacharacters and control characters while preserving
 * common punctuation used in task names.
 */
export function sanitizeForComment(str: string): string {
  // First replace newlines with spaces
  let result = str.replace(/\n/g, ' ');

  // Remove shell metacharacters: $ ` # \ | & < > and control chars
  // Keep: alphanumeric, spaces, common punctuation like : ; ( ) [ ] { } @ ' " - _ . , ! ?
  result = result.replace(/[$`#\\|&<>]/g, '');

  return result;
}

/**
 * Validate that a string matches a safe identifier pattern
 */
export function isSafeIdentifier(str: string, pattern: RegExp): boolean {
  return pattern.test(str);
}

// Validation patterns for git operations
export const GIT_REF_PATTERN = /^[a-zA-Z0-9/_.-]+$/;
export const GIT_REMOTE_PATTERN = /^[a-zA-Z0-9_.-]+$/;

// Validation pattern for filesystem paths (conservative)
export const SAFE_PATH_PATTERN = /^[a-zA-Z0-9/_. ~-]+$/;

#!/usr/bin/env node
/**
 * PreToolUse Hook: Gate git commits on code quality checks
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Intercepts `git commit` bash commands and:
 * - Scans staged files for console.log, debugger statements, hardcoded secrets
 * - Validates conventional commit message format
 * - Checks commit message length
 * - Returns exit code 2 (block) on critical issues, 0 (allow) otherwise
 */

'use strict';

const { execSync } = require('child_process');
const path = require('path');

const MAX_STDIN = 1024 * 1024;

const GIT_COMMIT_RE = /\bgit\s+commit\b/;
const CONVENTIONAL_COMMIT_RE = /^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\([^)]+\))?!?: .+/;

const SECRET_PATTERNS = [
  { re: /sk-[a-zA-Z0-9]{20,}/,            label: 'OpenAI API key' },
  { re: /ghp_[a-zA-Z0-9]{36}/,            label: 'GitHub personal access token' },
  { re: /AKIA[0-9A-Z]{16}/,              label: 'AWS access key ID' },
  { re: /AIza[0-9A-Za-z_-]{35}/,         label: 'Google API key' },
  { re: /eyJhbGciOi[a-zA-Z0-9_-]{50,}/,  label: 'JWT token' },
];

function getStagedFiles() {
  try {
    const out = execSync('git diff --cached --name-only --diff-filter=ACM', {
      encoding: 'utf8',
      timeout: 5000
    });
    return out.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function getStagedContent(filePath) {
  try {
    return execSync(`git show :${JSON.stringify(filePath).slice(1, -1)}`, {
      encoding: 'utf8',
      timeout: 5000
    });
  } catch {
    return '';
  }
}

function checkFile(filePath, issues) {
  const content = getStagedContent(filePath);
  if (!content) return;

  for (const { re, label } of SECRET_PATTERNS) {
    if (re.test(content)) {
      issues.push({ level: 'critical', msg: `Possible ${label} detected in ${filePath}` });
    }
  }

  if (/\.(js|ts|tsx|jsx|mjs|cjs)$/.test(filePath)) {
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (/console\.log\s*\(/.test(line)) {
        issues.push({ level: 'warn', msg: `console.log at ${filePath}:${idx + 1}` });
      }
      if (/\bdebugger\b/.test(line)) {
        issues.push({ level: 'warn', msg: `debugger statement at ${filePath}:${idx + 1}` });
      }
    });
  }
}

function extractCommitMessage(command) {
  const match = command.match(/-m\s+["']([^"']+)["']/);
  return match ? match[1] : null;
}

/**
 * @param {string} rawInput - Raw JSON string from stdin
 * @returns {{ exitCode: number, stdout: string } | string}
 */
function run(rawInput) {
  try {
    const input = JSON.parse(rawInput);
    const command = input.tool_input?.command || '';

    if (!GIT_COMMIT_RE.test(command)) {
      return rawInput;
    }

    const issues = [];
    const stagedFiles = getStagedFiles();

    for (const f of stagedFiles) {
      checkFile(f, issues);
    }

    const commitMsg = extractCommitMessage(command);
    if (commitMsg) {
      if (commitMsg.length > 72) {
        issues.push({ level: 'warn', msg: `Commit message too long: ${commitMsg.length} chars (max 72)` });
      }
      if (!CONVENTIONAL_COMMIT_RE.test(commitMsg)) {
        issues.push({ level: 'warn', msg: 'Commit message should follow conventional format: type(scope): description' });
      }
    }

    const critical = issues.filter(i => i.level === 'critical');
    const warnings = issues.filter(i => i.level === 'warn');

    if (warnings.length > 0) {
      process.stderr.write('[CommitQuality] Warnings:\n' + warnings.map(w => `  ! ${w.msg}`).join('\n') + '\n');
    }

    if (critical.length > 0) {
      process.stderr.write('[CommitQuality] BLOCKED — critical issues found:\n' +
        critical.map(c => `  ✗ ${c.msg}`).join('\n') + '\n');
      return { exitCode: 2, stdout: '' };
    }

  } catch {
    // Any failure is non-blocking
  }

  return rawInput;
}

if (require.main === module) {
  let data = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => {
    if (data.length < MAX_STDIN) data += chunk.substring(0, MAX_STDIN - data.length);
  });
  process.stdin.on('end', () => {
    const result = run(data);
    if (typeof result === 'string') {
      process.stdout.write(result);
      process.exit(0);
    } else {
      if (result.stdout) process.stdout.write(result.stdout);
      process.exit(result.exitCode || 0);
    }
  });
}

module.exports = { run };

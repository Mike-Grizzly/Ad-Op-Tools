#!/usr/bin/env node
/**
 * PostToolUse Hook: TypeScript type-check after editing .ts/.tsx files
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Walks up from the edited file's directory to find the nearest tsconfig.json,
 * runs tsc --noEmit, and reports only errors that mention the edited file.
 * Silently passes through for non-TypeScript files or when tsc is unavailable.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const MAX_STDIN = 1024 * 1024;
const MAX_LEVELS = 20;
const TIMEOUT_MS = 30000;
const MAX_ERROR_LINES = 10;

function findTsConfigDir(filePath) {
  let dir = path.dirname(path.resolve(filePath));
  for (let i = 0; i < MAX_LEVELS; i++) {
    if (fs.existsSync(path.join(dir, 'tsconfig.json'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * @param {string} rawInput - Raw JSON string from stdin
 * @returns {string} The original input (pass-through)
 */
function run(rawInput) {
  try {
    const input = JSON.parse(rawInput);
    const filePath = input.tool_input?.file_path;

    if (!filePath || !/\.(ts|tsx)$/.test(filePath)) {
      return rawInput;
    }

    const tsConfigDir = findTsConfigDir(filePath);
    if (!tsConfigDir) return rawInput;

    const isWin = process.platform === 'win32';
    const npx = isWin ? 'npx.cmd' : 'npx';

    const result = spawnSync(npx, ['tsc', '--noEmit'], {
      cwd: tsConfigDir,
      encoding: 'utf8',
      timeout: TIMEOUT_MS,
      // Avoid shell: true — safer against injection on Windows when using npx.cmd directly
    });

    if (result.status !== 0) {
      const resolvedPath = path.resolve(filePath);
      const relPath = path.relative(tsConfigDir, resolvedPath);
      const output = (result.stdout || '') + (result.stderr || '');

      const relevantLines = output.split('\n').filter(line =>
        line.includes(filePath) ||
        line.includes(resolvedPath) ||
        // Avoid bare basename match (false positives); require directory separator prefix
        (relPath && line.includes(path.sep + path.basename(relPath)) ||
         line.includes('/' + path.basename(relPath)))
      );

      if (relevantLines.length > 0) {
        process.stderr.write(
          '[TypeCheck] ' + relevantLines.slice(0, MAX_ERROR_LINES).join('\n') + '\n'
        );
      }
    }
  } catch {
    // tsc not installed or input malformed — non-blocking pass-through
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
    process.stdout.write(run(data));
    process.exit(0);
  });
}

module.exports = { run };

#!/usr/bin/env node
/**
 * Stop Hook: Batch format and typecheck all JS/TS files edited during the session
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Reads the accumulator file written by post-edit-accumulator.js, groups
 * files by project root for a single formatter invocation per root, and
 * groups .ts/.tsx files by tsconfig dir for a single tsc --noEmit per tsconfig.
 *
 * Total time budget: 270s (leaving headroom below the 300s Stop timeout).
 */

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { findProjectRoot, detectFormatter, resolveFormatterBin } = require('../lib/resolve-formatter');

const MAX_STDIN = 1024 * 1024;
const TOTAL_BUDGET_MS = 270000;
const MAX_LEVELS = 20;

// Shell metacharacters unsafe in cmd.exe
const UNSAFE_PATH_CHARS = /[&|<>^%!;`()$]/;

function getAccumFile() {
  const raw =
    process.env.CLAUDE_SESSION_ID ||
    crypto.createHash('sha1').update(process.cwd()).digest('hex').slice(0, 12);
  const sessionId = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  return path.join(os.tmpdir(), `ecc-edited-${sessionId}.txt`);
}

function parseAccumulator() {
  const accumFile = getAccumFile();
  if (!fs.existsSync(accumFile)) return [];
  try {
    const content = fs.readFileSync(accumFile, 'utf8');
    // Clear immediately so a second Stop invocation doesn't re-process
    try { fs.unlinkSync(accumFile); } catch { /* ignore */ }
    const seen = new Set();
    return content
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0 && !seen.has(l) && seen.add(l));
  } catch {
    return [];
  }
}

function findTsConfigDir(filePath) {
  let dir = path.dirname(path.resolve(filePath));
  for (let i = 0; i < MAX_LEVELS; i++) {
    if (fs.existsSync(path.join(dir, 'tsconfig.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function groupByProjectRoot(files) {
  const groups = new Map();
  for (const f of files) {
    const root = findProjectRoot(path.dirname(f));
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(f);
  }
  return groups;
}

function groupByTsConfig(files) {
  const groups = new Map();
  for (const f of files) {
    if (!/\.(ts|tsx)$/.test(f)) continue;
    const tsDir = findTsConfigDir(f);
    if (!tsDir) continue;
    if (!groups.has(tsDir)) groups.set(tsDir, { dir: tsDir, files: [] });
    groups.get(tsDir).files.push(f);
  }
  return groups;
}

function formatBatch(projectRoot, files, timeoutMs) {
  const formatter = detectFormatter(projectRoot);
  if (!formatter) return;
  const resolved = resolveFormatterBin(projectRoot, formatter);
  if (!resolved) return;

  try {
    const args = formatter === 'biome'
      ? [...resolved.prefix, 'check', '--write', ...files]
      : [...resolved.prefix, '--write', ...files];

    const isWin = process.platform === 'win32';
    if (isWin && resolved.bin.endsWith('.cmd')) {
      if (files.some(f => UNSAFE_PATH_CHARS.test(f))) {
        process.stderr.write('[StopHook] Skipping format batch: unsafe path characters detected\n');
        return;
      }
      spawnSync(resolved.bin, args, { cwd: projectRoot, shell: true, timeout: timeoutMs, stdio: 'pipe' });
    } else {
      spawnSync(resolved.bin, args, { cwd: projectRoot, timeout: timeoutMs, stdio: 'pipe' });
    }
  } catch {
    // Non-blocking
  }
}

function typecheckBatch(tsDir, files, timeoutMs) {
  const isWin = process.platform === 'win32';
  const npx = isWin ? 'npx.cmd' : 'npx';

  try {
    const result = spawnSync(npx, ['tsc', '--noEmit'], {
      cwd: tsDir,
      encoding: 'utf8',
      timeout: timeoutMs
    });

    if (result.status !== 0) {
      const output = (result.stdout || '') + (result.stderr || '');
      const relevant = output.split('\n').filter(line =>
        files.some(f => line.includes(f) || line.includes(path.resolve(f)))
      );
      if (relevant.length > 0) {
        process.stderr.write('[TypeCheck] ' + relevant.slice(0, 20).join('\n') + '\n');
      }
    }
  } catch {
    // tsc not installed — non-blocking
  }
}

/**
 * @param {string} rawInput - Raw JSON string from stdin
 * @returns {string} The original input (pass-through)
 */
function run(rawInput) {
  const files = parseAccumulator();
  if (files.length === 0) return rawInput || '';

  const projectGroups = groupByProjectRoot(files);
  const tsGroups = groupByTsConfig(files);
  const totalBatches = projectGroups.size + tsGroups.size;
  const batchTimeoutMs = totalBatches > 0
    ? Math.floor(TOTAL_BUDGET_MS / totalBatches)
    : TOTAL_BUDGET_MS;

  for (const [root, batchFiles] of projectGroups) {
    formatBatch(root, batchFiles, batchTimeoutMs);
  }

  for (const [, { dir, files: tsFiles }] of tsGroups) {
    typecheckBatch(dir, tsFiles, batchTimeoutMs);
  }

  return rawInput || '';
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

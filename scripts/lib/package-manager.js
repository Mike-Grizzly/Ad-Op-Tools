'use strict';

/**
 * Minimal package manager detection for hook scripts.
 * Checks lock files to determine which package manager the project uses.
 */

const fs = require('fs');
const path = require('path');

const EXEC_CMDS = { npm: 'npx', yarn: 'yarn', pnpm: 'pnpm', bun: 'bunx' };

function detectFromLockFile(dir) {
  if (fs.existsSync(path.join(dir, 'bun.lockb'))) return 'bun';
  if (fs.existsSync(path.join(dir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(dir, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(dir, 'package-lock.json'))) return 'npm';
  return null;
}

function detectFromPackageJson(dir) {
  try {
    const pkgPath = path.join(dir, 'package.json');
    if (!fs.existsSync(pkgPath)) return null;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkg.packageManager) {
      const pm = pkg.packageManager.split('@')[0];
      if (EXEC_CMDS[pm]) return pm;
    }
  } catch {
    // Ignore malformed package.json
  }
  return null;
}

function getPackageManager({ projectDir = process.cwd() } = {}) {
  const envPm = process.env.CLAUDE_PACKAGE_MANAGER;
  const pm = (envPm && EXEC_CMDS[envPm] ? envPm : null) ||
    detectFromLockFile(projectDir) ||
    detectFromPackageJson(projectDir) ||
    'npm';

  return {
    name: pm,
    config: { execCmd: EXEC_CMDS[pm] || 'npx' }
  };
}

module.exports = { getPackageManager };

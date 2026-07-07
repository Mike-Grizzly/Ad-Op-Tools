#!/usr/bin/env node
'use strict';

/**
 * SessionStart hook: injects the roadmap pointer and any pending user-action
 * alerts (docs/session-alerts.md) into context at the start of every session,
 * so the owner never has to re-paste kickoff instructions.
 * Remove an alert from docs/session-alerts.md once the owner confirms it done.
 */

const fs = require('fs');
const path = require('path');

const lines = [
  '[Roadmap] This project is built slice-by-slice from a committed plan. If the user says ' +
    '"continue the roadmap" / "next slice" (or gives no specific task), read ' +
    'docs/current-status.md -> "Next Session - Kickoff" and begin that slice. ' +
    'Sequencing source of truth: docs/architecture-blueprint.md section 4.',
];

try {
  const alerts = fs
    .readFileSync(path.join(process.cwd(), 'docs', 'session-alerts.md'), 'utf8')
    .trim();
  if (alerts) {
    lines.push(
      '[User-action alerts] Remind the user of the following at the start of your first ' +
        'reply this session (remove items from docs/session-alerts.md when the user says ' +
        'they are done):\n' +
        alerts
    );
  }
} catch {
  // no alerts file — nothing to surface
}

process.stdout.write(lines.join('\n\n') + '\n');

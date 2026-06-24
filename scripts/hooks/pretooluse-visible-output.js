#!/usr/bin/env node
'use strict';

function normalizeAdditionalContext(value) {
  if (Array.isArray(value)) {
    return value
      .map(item => String(item || '').trim())
      .filter(Boolean)
      .join('\n');
  }
  return String(value || '').trim();
}

function combineAdditionalContext(current, next) {
  const a = normalizeAdditionalContext(current);
  const b = normalizeAdditionalContext(next);
  if (!a) return b;
  if (!b) return a;
  return `${a}\n${b}`;
}

function buildPreToolUseAdditionalContext(value) {
  const normalized = normalizeAdditionalContext(value);
  if (!normalized) return '';
  return JSON.stringify({ hookEventName: 'PreToolUse', additionalContext: normalized });
}

module.exports = { normalizeAdditionalContext, combineAdditionalContext, buildPreToolUseAdditionalContext };

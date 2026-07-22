#!/usr/bin/env node
/**
 * Ensure passage_error_hunt_counter exercise items have structured
 * explanationContent. Item bodies are shared with passage_error_hunt_single
 * and were migrated in batch 21; this script is idempotent verification.
 *
 * Usage: node scripts/migrate-passage-error-hunt-counter-explanations.js
 */

import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SINGLE_SCRIPT = path.join(__dirname, 'migrate-passage-error-hunt-single-explanations.js');

const result = spawnSync('node', [SINGLE_SCRIPT], {
  cwd: ROOT,
  stdio: 'inherit'
});

if (result.status !== 0) {
  process.exit(result.status || 1);
}

console.log('passage_error_hunt_counter items verified via shared hunt migration.');

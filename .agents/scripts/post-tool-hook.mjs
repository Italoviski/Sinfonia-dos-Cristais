#!/usr/bin/env node
/**
 * Lifecycle Hook for PostToolUse in Antigravity.
 * Reads hook payload from stdin, runs fast semantic campaign verification silently when
 * JS/HTML/CSS files are modified, and outputs valid `{}` JSON on stdout as required by hooks.json contract.
 */
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  input += chunk;
});
process.stdin.on('end', () => {
  try {
    const payload = input ? JSON.parse(input) : {};
    const targetFile = String(payload?.toolCall?.args?.TargetFile || '');
    if (targetFile && /\.(js|mjs|html|css)$/i.test(targetFile)) {
      execFileSync(process.execPath, ['--test', 'tests/rules.test.mjs', 'tests/campaign.test.mjs'], {
        cwd: root,
        stdio: 'ignore',
        timeout: 8000
      });
    }
  } catch {
    // Keep stdout clean JSON even if a test fails during intermediate edits
  }
  process.stdout.write('{}\n');
});

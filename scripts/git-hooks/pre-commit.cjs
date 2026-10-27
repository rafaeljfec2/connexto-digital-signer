'use strict';

const { execFileSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');

/**
 * @param {ReadonlyArray<string>} args
 * @returns {string}
 */
function git(args) {
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
  }).trim();
}

/**
 * @param {string} filePath
 * @returns {boolean}
 */
function isBlockedEnvFile(filePath) {
  const base = path.basename(filePath);
  if (base === '.env.example') {
    return false;
  }
  return base === '.env' || base.startsWith('.env.');
}

/**
 * @param {ReadonlyArray<string>} stagedFiles
 * @returns {ReadonlySet<'api' | 'web'>}
 */
function detectTouchedApps(stagedFiles) {
  /** @type {Set<'api' | 'web'>} */
  const apps = new Set();
  for (const filePath of stagedFiles) {
    const normalized = filePath.replaceAll('\\', '/');
    if (normalized.startsWith('apps/api/')) {
      apps.add('api');
    }
    if (normalized.startsWith('apps/web/')) {
      apps.add('web');
    }
  }
  return apps;
}

/**
 * @param {string} filter
 * @param {string} script
 */
function runFilterScript(filter, script) {
  console.log(`[pre-commit] pnpm --filter ${filter} ${script}`);
  execFileSync('pnpm', ['--filter', filter, script], {
    cwd: ROOT,
    stdio: 'inherit',
  });
}

function main() {
  const stagedOutput = git(['diff', '--cached', '--name-only', '--diff-filter=ACMR']);
  const stagedFiles = stagedOutput === '' ? [] : stagedOutput.split('\n');

  const blocked = stagedFiles.filter((filePath) => isBlockedEnvFile(filePath));
  if (blocked.length > 0) {
    console.error('[pre-commit] Refusing to commit env files:');
    for (const filePath of blocked) {
      console.error(`  - ${filePath}`);
    }
    console.error('Use .env.example for templates. Never commit secrets.');
    process.exit(1);
  }

  const apps = detectTouchedApps(stagedFiles);
  if (apps.size === 0) {
    console.log('[pre-commit] No apps/api or apps/web changes staged; skipping lint/build.');
    return;
  }

  if (apps.has('api')) {
    runFilterScript('api', 'lint');
    runFilterScript('api', 'build');
  }
  if (apps.has('web')) {
    runFilterScript('web', 'lint');
    runFilterScript('web', 'build');
  }
}

main();

'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

const { APP_PACKAGE_PATHS, ROOT, bumpAppVersions } = require('./bump-app-versions.cjs');

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
 * @param {string} version
 * @returns {Readonly<[number, number, number]>}
 */
function parseSemver(version) {
  const parts = version.split('.').map((part) => Number(part));
  if (parts.length !== 3 || parts.some((part) => !Number.isInteger(part) || part < 0)) {
    throw new Error(`Invalid semver version: ${version}`);
  }
  return /** @type {Readonly<[number, number, number]>} */ ([parts[0], parts[1], parts[2]]);
}

/**
 * @param {string} left
 * @param {string} right
 * @returns {boolean}
 */
function isGreaterSemver(left, right) {
  const a = parseSemver(left);
  const b = parseSemver(right);
  for (let i = 0; i < 3; i += 1) {
    if (a[i] > b[i]) {
      return true;
    }
    if (a[i] < b[i]) {
      return false;
    }
  }
  return false;
}

/**
 * @param {string} packagePath
 * @returns {string}
 */
function readLocalVersion(packagePath) {
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  return typeof pkg.version === 'string' ? pkg.version : '0.0.0';
}

/**
 * @param {string} relativePath
 * @returns {string}
 */
function readOriginMainVersion(relativePath) {
  try {
    const raw = git(['show', `origin/main:${relativePath}`]);
    const pkg = JSON.parse(raw);
    return typeof pkg.version === 'string' ? pkg.version : '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/**
 * @returns {Promise<boolean>}
 */
function pushTargetsMain() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
    let targetsMain = false;

    rl.on('line', (line) => {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 4) {
        return;
      }
      const remoteRef = parts[2];
      if (remoteRef === 'refs/heads/main') {
        targetsMain = true;
      }
    });

    rl.on('close', () => {
      resolve(targetsMain);
    });
  });
}

async function main() {
  const targetsMain = await pushTargetsMain();
  if (!targetsMain) {
    console.log('[pre-push] Destination is not main; skipping version bump.');
    return;
  }

  const relativePaths = ['apps/api/package.json', 'apps/web/package.json'];
  const comparisons = relativePaths.map((relativePath, index) => {
    const localPath = APP_PACKAGE_PATHS[index];
    const local = readLocalVersion(localPath);
    const remote = readOriginMainVersion(relativePath);
    return { relativePath, local, remote, ahead: isGreaterSemver(local, remote) };
  });

  const allAhead = comparisons.every((item) => item.ahead);
  if (allAhead) {
    console.log('[pre-push] api and web versions already ahead of origin/main; push allowed.');
    for (const item of comparisons) {
      console.log(`  ${item.relativePath}: ${item.local} > ${item.remote}`);
    }
    return;
  }

  console.log('[pre-push] Bumping api and web patch versions for main deploy...');
  for (const item of comparisons) {
    console.log(`  ${item.relativePath}: local ${item.local} vs origin/main ${item.remote}`);
  }

  const results = bumpAppVersions();
  for (const result of results) {
    console.log(`  ${result.name}: ${result.previous} -> ${result.next}`);
  }

  git(['add', ...relativePaths]);
  git([
    'commit',
    '-m',
    'chore: bump api and web versions for main deploy',
  ]);

  console.error('');
  console.error('[pre-push] Version bump commit created.');
  console.error('[pre-push] Run `git push` again to publish main with the new versions.');
  process.exit(1);
}

main().catch((error) => {
  console.error('[pre-push] Failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});

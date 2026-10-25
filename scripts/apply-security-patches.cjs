'use strict';

/**
 * Applies security patches for CVEs that have upstream PRs but no npm release yet.
 * Kept as postinstall because this environment's pnpm ignores package.json
 * `pnpm.patchedDependencies` (and workspace patchedDependencies is not honored
 * by the active pnpm shim).
 *
 * - node-forge@1.4.0: CVE-2026-85393 / GHSA-86w9-cpqp-85rv (digitalbazaar/forge#1152)
 * - picomatch@4.0.7: CVE-2026-112366 / GHSA-fc5q-39xc-vjpf (micromatch/picomatch#237)
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

/** @type {ReadonlyArray<{ name: string; version: string; patch: string; marker: string; relativeFile: string }>} */
const PATCHES = [
  {
    name: 'node-forge',
    version: '1.4.0',
    patch: 'patches/node-forge@1.4.0.patch',
    marker: 'CVE-2026-85393',
    relativeFile: path.join('lib', 'rsa.js'),
  },
  {
    name: 'picomatch',
    version: '4.0.7',
    patch: 'patches/picomatch@4.0.7.patch',
    marker: 'isSelfRepeatingStarBranch',
    relativeFile: path.join('lib', 'parse.js'),
  },
];

/**
 * @param {string} name
 * @param {string} version
 * @returns {string[]}
 */
function findInstalledPackageDirs(name, version) {
  const pnpmDir = path.join(root, 'node_modules', '.pnpm');
  if (!fs.existsSync(pnpmDir)) {
    return [];
  }

  const prefix = `${name}@${version}`;
  return fs
    .readdirSync(pnpmDir)
    .filter((entry) => entry === prefix || entry.startsWith(`${prefix}_`))
    .map((entry) => path.join(pnpmDir, entry, 'node_modules', name))
    .filter((dir) => fs.existsSync(dir));
}

/**
 * @param {string} dir
 * @param {string} relativeFile
 * @param {string} marker
 */
function isAlreadyPatched(dir, relativeFile, marker) {
  const target = path.join(dir, relativeFile);
  if (!fs.existsSync(target)) {
    return false;
  }
  return fs.readFileSync(target, 'utf8').includes(marker);
}

/**
 * @param {string} dir
 * @param {string} patchFile
 */
function applyPatch(dir, patchFile) {
  execFileSync(
    'patch',
    ['-p1', '--forward', '--batch', '--reject-file=-', '-i', patchFile],
    { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] }
  );
}

let failures = 0;

for (const item of PATCHES) {
  const patchFile = path.join(root, item.patch);
  if (!fs.existsSync(patchFile)) {
    console.error(`[security-patches] missing ${item.patch}`);
    failures += 1;
    continue;
  }

  const dirs = findInstalledPackageDirs(item.name, item.version);
  if (dirs.length === 0) {
    console.log(`[security-patches] ${item.name}@${item.version} not installed; skip`);
    continue;
  }

  for (const dir of dirs) {
    if (isAlreadyPatched(dir, item.relativeFile, item.marker)) {
      console.log(`[security-patches] already applied: ${path.relative(root, dir)}`);
      continue;
    }

    try {
      applyPatch(dir, patchFile);
      if (!isAlreadyPatched(dir, item.relativeFile, item.marker)) {
        throw new Error('patch ran but marker not found');
      }
      console.log(`[security-patches] patched: ${path.relative(root, dir)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[security-patches] failed: ${path.relative(root, dir)} (${message})`);
      failures += 1;
    }
  }
}

if (failures > 0) {
  process.exitCode = 1;
}

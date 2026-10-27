'use strict';

/**
 * Applies security patches for CVEs that have upstream PRs but no npm release yet.
 * Kept as postinstall because this environment's pnpm ignores package.json
 * `pnpm.patchedDependencies` (and workspace patchedDependencies is not honored
 * by the active pnpm shim).
 *
 * Uses a pure-JS unified-diff applicator so installs work on Vercel/Alpine
 * without a system `patch` binary.
 *
 * - node-forge@1.4.0: CVE-2026-85393 / GHSA-86w9-cpqp-85rv (digitalbazaar/forge#1152)
 * - picomatch@4.0.7: CVE-2026-112366 / GHSA-fc5q-39xc-vjpf (micromatch/picomatch#237)
 */

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
 * @param {string} patchContent
 * @returns {Array<{ filePath: string; hunks: Array<{ oldStart: number; lines: string[] }> }>}
 */
function parseUnifiedDiff(patchContent) {
  const normalized = patchContent.replace(/\r\n/g, '\n');
  const files = [];
  let current = null;

  for (const line of normalized.split('\n')) {
    if (line.startsWith('--- ')) {
      current = { filePath: '', hunks: [] };
      continue;
    }
    if (line.startsWith('+++ ') && current) {
      const raw = line.slice(4).trim().split('\t')[0] ?? '';
      current.filePath = raw.replace(/^[ab]\//, '');
      files.push(current);
      continue;
    }
    const hunkMatch = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if (hunkMatch && current) {
      current.hunks.push({
        oldStart: Number(hunkMatch[1]),
        lines: [],
      });
      continue;
    }
    if (!current || current.hunks.length === 0) {
      continue;
    }
    if (line.startsWith('+') || line.startsWith('-') || line.startsWith(' ') || line === '\\ No newline at end of file') {
      current.hunks[current.hunks.length - 1].lines.push(line);
    }
  }

  return files;
}

/**
 * @param {string[]} originalLines
 * @param {Array<{ oldStart: number; lines: string[] }>} hunks
 * @returns {string[]}
 */
function applyHunks(originalLines, hunks) {
  let result = [...originalLines];
  let offset = 0;

  for (const hunk of hunks) {
    const oldLines = [];
    const newLines = [];
    for (const line of hunk.lines) {
      if (line === '\\ No newline at end of file') {
        continue;
      }
      const body = line.slice(1);
      if (line.startsWith(' ') || line.startsWith('-')) {
        oldLines.push(body);
      }
      if (line.startsWith(' ') || line.startsWith('+')) {
        newLines.push(body);
      }
    }

    const expectedStart = hunk.oldStart - 1 + offset;
    let start = expectedStart;
    const maxSearch = Math.min(result.length, expectedStart + 40);
    let found = false;

    for (let candidate = expectedStart; candidate <= maxSearch; candidate += 1) {
      if (matchesAt(result, candidate, oldLines)) {
        start = candidate;
        found = true;
        break;
      }
    }
    if (!found) {
      for (let candidate = Math.max(0, expectedStart - 40); candidate < expectedStart; candidate += 1) {
        if (matchesAt(result, candidate, oldLines)) {
          start = candidate;
          found = true;
          break;
        }
      }
    }
    if (!found) {
      throw new Error(`hunk at old line ${hunk.oldStart} did not match`);
    }

    result.splice(start, oldLines.length, ...newLines);
    offset += newLines.length - oldLines.length;
  }

  return result;
}

/**
 * @param {string[]} lines
 * @param {number} start
 * @param {string[]} expected
 */
function matchesAt(lines, start, expected) {
  if (start < 0 || start + expected.length > lines.length) {
    return false;
  }
  for (let i = 0; i < expected.length; i += 1) {
    if (lines[start + i] !== expected[i]) {
      return false;
    }
  }
  return true;
}

/**
 * @param {string} dir
 * @param {string} patchFile
 */
function applyPatch(dir, patchFile) {
  const patchContent = fs.readFileSync(patchFile, 'utf8');
  const files = parseUnifiedDiff(patchContent);
  if (files.length === 0) {
    throw new Error('no file hunks found in patch');
  }

  for (const file of files) {
    const targetPath = path.join(dir, file.filePath);
    if (!fs.existsSync(targetPath)) {
      throw new Error(`target missing: ${file.filePath}`);
    }
    const original = fs.readFileSync(targetPath, 'utf8');
    const endsWithNewline = original.endsWith('\n');
    const originalLines = original.split('\n');
    if (endsWithNewline && originalLines[originalLines.length - 1] === '') {
      originalLines.pop();
    }
    const updatedLines = applyHunks(originalLines, file.hunks);
    const updated = `${updatedLines.join('\n')}${endsWithNewline ? '\n' : ''}`;
    fs.writeFileSync(targetPath, updated, 'utf8');
  }
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

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');

const APP_PACKAGE_PATHS = Object.freeze([
  path.join(ROOT, 'apps', 'api', 'package.json'),
  path.join(ROOT, 'apps', 'web', 'package.json'),
]);

/**
 * @param {string} version
 * @returns {string}
 */
function bumpPatch(version) {
  const parts = version.split('.').map((part) => Number(part));
  if (parts.length !== 3 || parts.some((part) => !Number.isInteger(part) || part < 0)) {
    throw new Error(`Invalid semver version: ${version}`);
  }
  const [major, minor, patch] = parts;
  return `${String(major)}.${String(minor)}.${String(patch + 1)}`;
}

/**
 * @param {string} packagePath
 * @returns {{ readonly name: string; readonly previous: string; readonly next: string }}
 */
function bumpPackageFile(packagePath) {
  const raw = fs.readFileSync(packagePath, 'utf8');
  const pkg = JSON.parse(raw);
  const previous = typeof pkg.version === 'string' ? pkg.version : '0.0.0';
  const next = bumpPatch(previous);
  pkg.version = next;
  fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
  return {
    name: typeof pkg.name === 'string' ? pkg.name : path.basename(path.dirname(packagePath)),
    previous,
    next,
  };
}

/**
 * @returns {ReadonlyArray<{ readonly name: string; readonly previous: string; readonly next: string }>}
 */
function bumpAppVersions() {
  return APP_PACKAGE_PATHS.map((packagePath) => bumpPackageFile(packagePath));
}

module.exports = {
  APP_PACKAGE_PATHS,
  ROOT,
  bumpAppVersions,
  bumpPatch,
};

if (require.main === module) {
  const results = bumpAppVersions();
  for (const result of results) {
    console.log(`${result.name}: ${result.previous} -> ${result.next}`);
  }
}

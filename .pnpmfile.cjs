'use strict';

/**
 * Force patched releases for transitive dependencies flagged by Snyk OSS.
 * Prefer same-major bumps to limit breakage.
 */

/** @type {Readonly<Record<string, string>>} */
const EXACT_PINS = {
  'body-parser': '1.20.9',
  multer: '2.5.0',
  qs: '6.16.1',
  fflate: '0.8.3',
  'node-forge': '1.4.0',
  'fast-xml-parser': '5.11.2',
  'form-data': '4.0.6',
  'follow-redirects': '1.16.1',
  lodash: '4.18.1',
  'js-yaml': '4.3.2',
  postcss: '8.5.31',
  ioredis: '6.0.0',
  browserslist: '4.29.4',
  '@babel/core': '7.29.7',
};

/**
 * @param {string | undefined} range
 * @returns {number | null}
 */
function majorOf(range) {
  if (typeof range !== 'string') return null;
  const match = range.match(/(\d+)\./);
  return match ? Number(match[1]) : null;
}

/**
 * @param {Record<string, string> | undefined} deps
 * @param {string} name
 * @param {string} version
 */
function setDep(deps, name, version) {
  if (deps !== undefined && Object.prototype.hasOwnProperty.call(deps, name)) {
    deps[name] = version;
  }
}

/**
 * @param {{ name?: string; dependencies?: Record<string, string>; optionalDependencies?: Record<string, string>; peerDependencies?: Record<string, string> }} pkg
 */
function applyMajorAwarePins(pkg) {
  const deps = pkg.dependencies;
  if (deps === undefined) return;

  const nanoidMajor = majorOf(deps.nanoid);
  if (nanoidMajor === 3) deps.nanoid = '3.3.20';
  if (nanoidMajor === 5) deps.nanoid = '5.1.16';

  const braceMajor = majorOf(deps['brace-expansion']);
  if (braceMajor === 1) deps['brace-expansion'] = '1.1.21';
  if (braceMajor === 2) deps['brace-expansion'] = '2.1.7';
  if (braceMajor === 5) deps['brace-expansion'] = '5.0.12';

  const minimatchMajor = majorOf(deps.minimatch);
  if (minimatchMajor === 3) deps.minimatch = '3.1.2';
  if (minimatchMajor === 5) deps.minimatch = '5.1.6';
  if (minimatchMajor === 9) deps.minimatch = '9.0.9';

  const uuidMajor = majorOf(deps.uuid);
  // bull pulls uuid@^8.3.0 (8.3.2 vulnerable); advisory fix is >=11.1.1
  if (uuidMajor === 8) deps.uuid = '11.1.1';
  if (uuidMajor === 9) deps.uuid = '11.1.1';
  if (uuidMajor === 10) deps.uuid = '11.1.1';
  if (uuidMajor === 11) deps.uuid = '11.1.1';

  const pathToRegexp = deps['path-to-regexp'];
  if (
    typeof pathToRegexp === 'string' &&
    (pathToRegexp === '0.1.12' || pathToRegexp === '~0.1.12' || pathToRegexp.startsWith('~0.1.'))
  ) {
    deps['path-to-regexp'] = '0.1.13';
  }
}

/**
 * TypeORM/Bull still declare ioredis ^5; widen peers so the security pin to 6.0.0 can apply.
 * @param {{ name?: string; peerDependencies?: Record<string, string> }} pkg
 */
function widenIoredisPeers(pkg) {
  if (pkg.peerDependencies?.ioredis !== undefined) {
    pkg.peerDependencies.ioredis = '>=5.0.4';
  }
}

module.exports = {
  hooks: {
    readPackage(pkg) {
      for (const [name, version] of Object.entries(EXACT_PINS)) {
        setDep(pkg.dependencies, name, version);
        setDep(pkg.optionalDependencies, name, version);
      }
      widenIoredisPeers(pkg);
      applyMajorAwarePins(pkg);
      return pkg;
    },
  },
};

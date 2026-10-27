import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('loadLocalEnv', () => {
  const originalCwd = process.cwd();
  const originalEnv = process.env;
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'nexosign-env-'));
    process.chdir(tempDir);
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    process.env = originalEnv;
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should load ENABLE_SCHEDULER from .env without overriding process env', async () => {
    writeFileSync(join(tempDir, '.env'), 'ENABLE_SCHEDULER=false\nFROM_FILE=yes\n');
    process.env['FROM_FILE'] = 'already-set';

    const { loadLocalEnv } = await import('./load-local-env');
    loadLocalEnv();

    expect(process.env['ENABLE_SCHEDULER']).toBe('false');
    expect(process.env['FROM_FILE']).toBe('already-set');
  });
});

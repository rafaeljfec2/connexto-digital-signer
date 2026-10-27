import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'dotenv';

const ENV_FILES = [
  'apps/api/.env.local',
  'apps/api/.env',
  '.env.local',
  '.env',
] as const;

/**
 * Load the same env files as ConfigModule.forRoot into process.env before Nest
 * module graphs evaluate ENABLE_SCHEDULER (and similar boot flags).
 * Does not override variables already set in the process environment.
 */
export function loadLocalEnv(): void {
  for (const relativePath of ENV_FILES) {
    const absolutePath = resolve(process.cwd(), relativePath);
    if (!existsSync(absolutePath)) {
      continue;
    }
    const parsed = parse(readFileSync(absolutePath));
    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

loadLocalEnv();

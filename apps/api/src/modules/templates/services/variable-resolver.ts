import { BadRequestException } from '@nestjs/common';
import type { TemplateVariable } from '../entities/template-variable.entity';

const VARIABLE_PATTERN = /\{\{(\w+)\}\}/g;

export function resolveVariables(
  text: string,
  variables: Record<string, string>,
): string {
  return text.replaceAll(VARIABLE_PATTERN, (match, key: string) => {
    return variables[key] ?? match;
  });
}

export function validateRequiredVariables(
  definitions: ReadonlyArray<TemplateVariable>,
  provided: Record<string, string>,
): void {
  const missing: string[] = [];
  for (const def of definitions) {
    if (!def.required) continue;
    const value = provided[def.key];
    if (value === undefined || value === '') {
      if (def.defaultValue === null || def.defaultValue === '') {
        missing.push(def.key);
      }
    }
  }
  if (missing.length > 0) {
    throw new BadRequestException(
      `Missing required template variables: ${missing.join(', ')}`,
    );
  }
}

export function extractVariableKeys(text: string): string[] {
  const keys: string[] = [];
  let match: RegExpExecArray | null;
  const pattern = new RegExp(VARIABLE_PATTERN);
  while ((match = pattern.exec(text)) !== null) {
    const key = match[1];
    if (!keys.includes(key)) {
      keys.push(key);
    }
  }
  return keys;
}

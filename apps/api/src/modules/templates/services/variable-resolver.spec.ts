import { BadRequestException } from '@nestjs/common';
import {
  resolveVariables,
  validateRequiredVariables,
  extractVariableKeys,
} from './variable-resolver';
import type { TemplateVariable } from '../entities/template-variable.entity';
import { TemplateVariableType } from '../entities/template-variable.entity';

function buildVariable(
  overrides: Partial<TemplateVariable> = {},
): TemplateVariable {
  return {
    id: 'var-1',
    templateId: 'tmpl-1',
    key: 'company_name',
    label: 'Company Name',
    type: TemplateVariableType.TEXT,
    required: true,
    defaultValue: null,
    createdAt: new Date(),
    ...overrides,
  } as TemplateVariable;
}

describe('resolveVariables', () => {
  it('should replace known variables in text', () => {
    const result = resolveVariables(
      'NDA - {{company_name}} - {{start_date}}',
      { company_name: 'Acme Corp', start_date: '2026-03-01' },
    );
    expect(result).toBe('NDA - Acme Corp - 2026-03-01');
  });

  it('should leave unknown variables untouched', () => {
    const result = resolveVariables('Hello {{unknown}}', {});
    expect(result).toBe('Hello {{unknown}}');
  });

  it('should handle text with no variables', () => {
    const result = resolveVariables('No variables here', { foo: 'bar' });
    expect(result).toBe('No variables here');
  });

  it('should handle empty text', () => {
    const result = resolveVariables('', { foo: 'bar' });
    expect(result).toBe('');
  });

  it('should handle multiple occurrences of same variable', () => {
    const result = resolveVariables('{{name}} and {{name}}', { name: 'Test' });
    expect(result).toBe('Test and Test');
  });
});

describe('validateRequiredVariables', () => {
  it('should pass when all required variables are provided', () => {
    const defs = [buildVariable({ key: 'company_name', required: true })];
    expect(() =>
      validateRequiredVariables(defs, { company_name: 'Acme' }),
    ).not.toThrow();
  });

  it('should throw when a required variable is missing', () => {
    const defs = [buildVariable({ key: 'company_name', required: true })];
    expect(() =>
      validateRequiredVariables(defs, {}),
    ).toThrow(BadRequestException);
  });

  it('should throw when a required variable is empty string', () => {
    const defs = [buildVariable({ key: 'company_name', required: true })];
    expect(() =>
      validateRequiredVariables(defs, { company_name: '' }),
    ).toThrow(BadRequestException);
  });

  it('should not throw for optional variables', () => {
    const defs = [buildVariable({ key: 'notes', required: false })];
    expect(() =>
      validateRequiredVariables(defs, {}),
    ).not.toThrow();
  });

  it('should accept default value for required variable', () => {
    const defs = [buildVariable({ key: 'company_name', required: true, defaultValue: 'Default Co' })];
    expect(() =>
      validateRequiredVariables(defs, {}),
    ).not.toThrow();
  });

  it('should throw for multiple missing required variables', () => {
    const defs = [
      buildVariable({ key: 'a', required: true }),
      buildVariable({ key: 'b', required: true }),
    ];
    expect(() =>
      validateRequiredVariables(defs, {}),
    ).toThrow('Missing required template variables: a, b');
  });
});

describe('extractVariableKeys', () => {
  it('should extract unique variable keys from text', () => {
    const keys = extractVariableKeys('{{company_name}} - {{start_date}} - {{company_name}}');
    expect(keys).toEqual(['company_name', 'start_date']);
  });

  it('should return empty array for text without variables', () => {
    const keys = extractVariableKeys('No variables here');
    expect(keys).toEqual([]);
  });
});

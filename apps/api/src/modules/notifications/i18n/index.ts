import { emailMessages as ptBr } from './email.pt-br';
import { emailMessages as en } from './email.en';

export type EmailMessages = {
  [K in keyof typeof en]: {
    [P in keyof (typeof en)[K]]: string;
  };
};

const locales: Record<string, EmailMessages> = {
  'pt-br': ptBr,
  en,
};

export type EmailTemplateName = keyof typeof en;

export function getEmailMessages(locale: string): EmailMessages {
  return locales[locale] ?? locales['en'];
}

export function interpolate(
  template: string,
  values: Record<string, unknown>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = values[key];
    return value !== undefined && value !== null ? String(value) : '';
  });
}

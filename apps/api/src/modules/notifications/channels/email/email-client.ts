export interface EmailRecipient {
  readonly email: string;
  readonly name?: string;
}

export interface SendEmailInput {
  readonly to: EmailRecipient;
  readonly subject: string;
  readonly html: string;
  readonly text: string;
  readonly tags?: readonly string[];
  readonly fromName?: string;
}

export interface SendEmailResult {
  readonly id: string | null;
  readonly accepted: boolean;
}

export interface EmailClient {
  send(input: SendEmailInput): Promise<SendEmailResult>;
}

export const EMAIL_CLIENT = Symbol('EMAIL_CLIENT');

const sendMock = jest.fn();

jest.mock('mailersend', () => {
  class FakeSender {
    constructor(
      public readonly email: string,
      public readonly name: string,
    ) {}
  }
  class FakeRecipient {
    constructor(
      public readonly email: string,
      public readonly name: string,
    ) {}
  }
  class FakeEmailParams {
    public from?: FakeSender;
    public to?: FakeRecipient[];
    public subject?: string;
    public html?: string;
    public text?: string;
    public tags?: string[];

    setFrom(from: FakeSender): this {
      this.from = from;
      return this;
    }

    setTo(to: FakeRecipient[]): this {
      this.to = to;
      return this;
    }

    setSubject(subject: string): this {
      this.subject = subject;
      return this;
    }

    setHtml(html: string): this {
      this.html = html;
      return this;
    }

    setText(text: string): this {
      this.text = text;
      return this;
    }

    setTags(tags: string[]): this {
      this.tags = tags;
      return this;
    }
  }
  class FakeMailerSend {
    public readonly email = { send: sendMock };
    constructor(public readonly config: { readonly apiKey: string }) {}
  }
  return {
    MailerSend: FakeMailerSend,
    Sender: FakeSender,
    Recipient: FakeRecipient,
    EmailParams: FakeEmailParams,
  };
});

import { MailerSendEmailClient } from '../mailersend-email.client';

describe('MailerSendEmailClient', () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  it('should throw when apiKey is missing', () => {
    expect(
      () =>
        new MailerSendEmailClient({
          apiKey: '',
          fromEmail: 'noreply@connexto.com.br',
          fromName: 'NexoSign',
        }),
    ).toThrow(/MAILERSEND_API_KEY/);
  });

  it('should return accepted=true and extract x-message-id from response headers', async () => {
    sendMock.mockResolvedValueOnce({
      statusCode: 202,
      headers: { 'x-message-id': 'abc123' },
      body: {},
    });
    const client = new MailerSendEmailClient({
      apiKey: 'mlsn.test-key',
      fromEmail: 'noreply@connexto.com.br',
      fromName: 'NexoSign',
    });

    const result = await client.send({
      to: { email: 'user@example.com', name: 'User' },
      subject: 'Subject',
      html: '<p>html</p>',
      text: 'text',
      tags: ['invite'],
    });

    expect(result).toEqual({ id: 'abc123', accepted: true });
    expect(sendMock).toHaveBeenCalledTimes(1);
    const params = sendMock.mock.calls[0]?.[0] as {
      readonly subject: string;
      readonly html: string;
      readonly text: string;
      readonly tags: string[];
      readonly to: Array<{ readonly email: string }>;
      readonly from: { readonly email: string; readonly name: string };
    };
    expect(params.subject).toBe('Subject');
    expect(params.html).toBe('<p>html</p>');
    expect(params.text).toBe('text');
    expect(params.tags).toEqual(['invite']);
    expect(params.to[0]?.email).toBe('user@example.com');
    expect(params.from.email).toBe('noreply@connexto.com.br');
    expect(params.from.name).toBe('NexoSign');
  });

  it('should override display name when fromName is provided on send input', async () => {
    sendMock.mockResolvedValueOnce({ statusCode: 202, headers: {}, body: {} });
    const client = new MailerSendEmailClient({
      apiKey: 'mlsn.test-key',
      fromEmail: 'noreply@connexto.com.br',
      fromName: 'NexoSign',
    });

    await client.send({
      to: { email: 'user@example.com' },
      subject: 'S',
      html: 'h',
      text: 't',
      fromName: 'Acme Corp',
    });

    const params = sendMock.mock.calls[0]?.[0] as {
      readonly from: { readonly name: string };
    };
    expect(params.from.name).toBe('Acme Corp');
  });

  it('should return accepted=false when MailerSend responds with non-2xx', async () => {
    sendMock.mockResolvedValueOnce({ statusCode: 422, headers: {}, body: { errors: ['x'] } });
    const client = new MailerSendEmailClient({
      apiKey: 'mlsn.test-key',
      fromEmail: 'noreply@connexto.com.br',
      fromName: 'NexoSign',
    });

    const result = await client.send({
      to: { email: 'user@example.com' },
      subject: 'S',
      html: 'h',
      text: 't',
    });

    expect(result.accepted).toBe(false);
    expect(result.id).toBeNull();
  });

  it('should rethrow network errors raised by the SDK', async () => {
    sendMock.mockRejectedValueOnce(new Error('network down'));
    const client = new MailerSendEmailClient({
      apiKey: 'mlsn.test-key',
      fromEmail: 'noreply@connexto.com.br',
      fromName: 'NexoSign',
    });

    await expect(
      client.send({ to: { email: 'u@x.com' }, subject: 'S', html: 'h', text: 't' }),
    ).rejects.toThrow(/network down/);
  });
});

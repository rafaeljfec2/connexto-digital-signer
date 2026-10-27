import { Logger } from '@nestjs/common';
import { LoggerEmailClient } from '../logger-email.client';

describe('LoggerEmailClient', () => {
  it('should return accepted=true without calling an external API', async () => {
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const client = new LoggerEmailClient();

    const result = await client.send({
      to: { email: 'user@example.com', name: 'User' },
      subject: 'Invite',
      html: '<p>hi</p>',
      text: 'hi',
    });

    expect(result).toEqual({ id: null, accepted: true });
    warnSpy.mockRestore();
  });

  it('should log recipient and subject', async () => {
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const client = new LoggerEmailClient();

    await client.send({
      to: { email: 'user@example.com' },
      subject: 'Invite to sign',
      html: '<p>x</p>',
      text: 'x',
    });

    expect(warnSpy).toHaveBeenCalled();
    const message = String(warnSpy.mock.calls[0]?.[0] ?? '');
    expect(message).toContain('user@example.com');
    expect(message).toContain('Invite to sign');
    warnSpy.mockRestore();
  });
});

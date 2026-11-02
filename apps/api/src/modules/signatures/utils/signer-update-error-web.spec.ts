import { resolveSignerUpdateErrorKey } from '../../../../../web/src/features/documents/utils/signer-update-error';

describe('signer-update-error (web wizard mapping)', () => {
  test('maps API rejection for notified signers to notifiedEmail key', () => {
    expect(
      resolveSignerUpdateErrorKey(
        'Cannot change signer email after an invitation was sent; use resend to the existing address',
      ),
    ).toBe('notifiedEmail');
  });

  test('maps signed signer API message', () => {
    expect(
      resolveSignerUpdateErrorKey('Cannot edit a signer who has already signed'),
    ).toBe('signed');
  });

  test('uses generic key for unknown API messages', () => {
    expect(resolveSignerUpdateErrorKey('Unexpected failure')).toBe('generic');
    expect(resolveSignerUpdateErrorKey(null)).toBe('generic');
  });
});

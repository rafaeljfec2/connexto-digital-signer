import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CreateSignerInviteDeliveryAttempts1730000000026 } from './migrations/1730000000026-create-signer-invite-delivery-attempts';

describe('Increment 7 migration', () => {
  test('CreateSignerInviteDeliveryAttempts1730000000026 is registered with expected name', () => {
    const migration = new CreateSignerInviteDeliveryAttempts1730000000026();
    expect(migration.name).toBe('CreateSignerInviteDeliveryAttempts1730000000026');
  });

  test('legacy backfill uses per-signer attempt_number allocation', () => {
    const source = readFileSync(
      join(__dirname, 'migrations/1730000000026-create-signer-invite-delivery-attempts.ts'),
      'utf8',
    );
    expect(source).toContain('COALESCE');
    expect(source).toContain('MAX(a."attempt_number")');
    expect(source).toContain('legacy_backfill');
  });
});

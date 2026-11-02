import { AddCancelledStatus1730000000024 } from './migrations/1730000000024-add-cancelled-status';
import { CreatePasswordResetTokens1730000000025 } from './migrations/1730000000025-create-password-reset-tokens';

describe('Increment 4 migrations', () => {
  test('AddCancelledStatus1730000000024 is registered with expected name', () => {
    const migration = new AddCancelledStatus1730000000024();
    expect(migration.name).toBe('AddCancelledStatus1730000000024');
  });

  test('CreatePasswordResetTokens1730000000025 is registered with expected name', () => {
    const migration = new CreatePasswordResetTokens1730000000025();
    expect(migration.name).toBe('CreatePasswordResetTokens1730000000025');
  });
});

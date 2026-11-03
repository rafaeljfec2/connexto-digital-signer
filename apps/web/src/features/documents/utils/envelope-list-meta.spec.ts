import {
  formatExpiresAtDisplay,
  formatPendingSignersDisplay,
} from './envelope-list-meta';

const labels = {
  pendingCount: (count: number) => `${String(count)} pending`,
  noPending: 'No pending signers',
  notApplicable: '—',
  noDeadline: 'No deadline',
};

describe('envelope-list-meta', () => {
  it('should show pending count when signers are waiting', () => {
    const result = formatPendingSignersDisplay(2, 'pending_signatures', labels);
    expect(result).toEqual({ kind: 'count', value: '2 pending' });
  });

  it('should show no pending for sent envelopes without pending signers', () => {
    const result = formatPendingSignersDisplay(0, 'pending_signatures', labels);
    expect(result).toEqual({ kind: 'none', value: 'No pending signers' });
  });

  it('should show dash for draft envelopes without pending emphasis', () => {
    const result = formatPendingSignersDisplay(0, 'draft', labels);
    expect(result).toEqual({ kind: 'dash', value: '—' });
  });

  it('should format expiry date when present', () => {
    const formatted = formatExpiresAtDisplay(
      '2030-01-15T00:00:00.000Z',
      (value) => value.slice(0, 10),
      labels.noDeadline,
    );
    expect(formatted).toBe('2030-01-15');
  });

  it('should show no deadline label when expiresAt is null', () => {
    expect(formatExpiresAtDisplay(null, () => 'x', labels.noDeadline)).toBe('No deadline');
  });
});

import {
  inviteDeliveryStatusTranslationKey,
  shouldShowHistoricalEstimateNote,
} from './invite-delivery-display';

describe('invite-delivery-display', () => {
  test('should map null status to empty translation key', () => {
    expect(inviteDeliveryStatusTranslationKey(null)).toBe('empty');
  });

  test('should map delivery statuses to translation keys', () => {
    expect(inviteDeliveryStatusTranslationKey('sent')).toBe('sent');
    expect(inviteDeliveryStatusTranslationKey('failed')).toBe('failed');
    expect(inviteDeliveryStatusTranslationKey('queued')).toBe('queued');
  });

  test('should show historical note only when estimate flag is set', () => {
    expect(shouldShowHistoricalEstimateNote(true, 1)).toBe(true);
    expect(shouldShowHistoricalEstimateNote(false, 1)).toBe(false);
    expect(shouldShowHistoricalEstimateNote(true, 0)).toBe(false);
  });
});

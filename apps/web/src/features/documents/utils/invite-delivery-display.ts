import type { InviteDeliveryStatus } from '../api';

export const inviteDeliveryStatusTranslationKey = (
  status: InviteDeliveryStatus | null,
): string => {
  if (status === null) {
    return 'empty';
  }
  return status;
};

export const shouldShowHistoricalEstimateNote = (
  isHistoricalEstimate: boolean,
  attemptCount: number,
): boolean => isHistoricalEstimate && attemptCount > 0;

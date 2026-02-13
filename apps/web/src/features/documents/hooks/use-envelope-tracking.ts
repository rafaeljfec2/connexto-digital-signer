import { useQuery } from '@tanstack/react-query';
import { getEnvelopeTracking } from '../api';

export const useEnvelopeTracking = (envelopeId: string | null) =>
  useQuery({
    queryKey: ['envelopes', envelopeId, 'tracking'],
    queryFn: () => getEnvelopeTracking(envelopeId!),
    enabled: envelopeId !== null,
    refetchInterval: 30_000,
  });

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { resendSignerInvite } from '../api';

export function useResendSignerInvite(envelopeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (signerId: string) => resendSignerInvite(envelopeId, signerId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['envelopes', envelopeId, 'tracking'],
      });
    },
  });
}

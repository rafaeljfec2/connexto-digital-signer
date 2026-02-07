import { useQuery, useMutation } from '@tanstack/react-query';
import {
  getSignerByToken,
  getSignerPdf,
  getSignerFields,
  acceptSignature,
} from './api';
import type { AcceptSignatureInput } from './api';

export const useSignerData = (token: string) =>
  useQuery({
    queryKey: ['signer', token],
    queryFn: () => getSignerByToken(token),
    enabled: token.length > 0,
    retry: false,
  });

export const useSignerPdf = (token: string) =>
  useQuery({
    queryKey: ['signer-pdf', token],
    queryFn: () => getSignerPdf(token),
    enabled: token.length > 0,
    retry: false,
  });

export const useSignerFields = (token: string) =>
  useQuery({
    queryKey: ['signer-fields', token],
    queryFn: () => getSignerFields(token),
    enabled: token.length > 0,
    retry: false,
  });

export const useAcceptSignature = (token: string) =>
  useMutation({
    mutationFn: (input: AcceptSignatureInput) =>
      acceptSignature(token, input),
  });

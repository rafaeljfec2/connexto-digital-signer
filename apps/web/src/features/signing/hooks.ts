import { useQuery, useMutation } from '@tanstack/react-query';
import {
  getSignerByToken,
  getSignerPdfUrl,
  getSignerFields,
  acceptSignature,
  identifySigner,
  sendVerificationCode,
  verifyCode,
  getSignerSummary,
} from './api';
import type { AcceptSignatureInput, IdentifySignerInput } from './api';

export const useSignerData = (token: string) =>
  useQuery({
    queryKey: ['signer', token],
    queryFn: () => getSignerByToken(token),
    enabled: token.length > 0,
    retry: false,
  });

export const useSignerPdfUrl = (token: string, documentId?: string) =>
  useQuery({
    queryKey: ['signer-pdf-url', token, documentId],
    queryFn: () => getSignerPdfUrl(token, documentId),
    enabled: token.length > 0 && (documentId === undefined || documentId.length > 0),
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

export const useIdentifySigner = (token: string) =>
  useMutation({
    mutationFn: (input: IdentifySignerInput) =>
      identifySigner(token, input),
  });

export const useSendVerificationCode = (token: string) =>
  useMutation({
    mutationFn: () => sendVerificationCode(token),
  });

export const useVerifyCode = (token: string) =>
  useMutation({
    mutationFn: (code: string) => verifyCode(token, code),
  });

export const useSignerSummary = (token: string) =>
  useQuery({
    queryKey: ['signer-summary', token],
    queryFn: () => getSignerSummary(token),
    enabled: token.length > 0,
    retry: false,
  });

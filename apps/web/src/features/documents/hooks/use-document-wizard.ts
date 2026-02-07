import { useMutation, useQuery } from '@tanstack/react-query';
import {
  addSigner,
  batchUpdateFields,
  getDocument,
  getDocumentFile,
  listFields,
  listSigners,
  previewEmail,
  removeSigner,
  sendDocument,
  updateSigner,
  uploadDocumentFile,
  updateDocument,
  type CreateSignerInput,
  type UpdateSignerInput,
  type SendDocumentInput,
  type SignatureFieldInput,
  type UploadDocumentFileInput,
  type UpdateDocumentInput,
} from '../api';

export const useDocument = (id: string) =>
  useQuery({
    queryKey: ['documents', 'detail', id],
    queryFn: () => getDocument(id),
    enabled: id.length > 0,
  });

export const useDocumentFile = (id: string) =>
  useQuery({
    queryKey: ['documents', 'file', id],
    queryFn: () => getDocumentFile(id),
    enabled: id.length > 0,
  });

export const useSigners = (documentId: string) =>
  useQuery({
    queryKey: ['documents', documentId, 'signers'],
    queryFn: () => listSigners(documentId),
    enabled: documentId.length > 0,
  });

export const useAddSigner = (documentId: string) =>
  useMutation({
    mutationFn: (input: CreateSignerInput) => addSigner(documentId, input),
  });

export const useUpdateSigner = (documentId: string) =>
  useMutation({
    mutationFn: ({ signerId, input }: { signerId: string; input: UpdateSignerInput }) =>
      updateSigner(documentId, signerId, input),
  });

export const useRemoveSigner = (documentId: string) =>
  useMutation({
    mutationFn: (signerId: string) => removeSigner(documentId, signerId),
  });

export const useSignatureFields = (documentId: string) =>
  useQuery({
    queryKey: ['documents', documentId, 'fields'],
    queryFn: () => listFields(documentId),
    enabled: documentId.length > 0,
  });

export const useBatchUpdateFields = (documentId: string) =>
  useMutation({
    mutationFn: (fields: SignatureFieldInput[]) => batchUpdateFields(documentId, fields),
  });

export const useSendDocument = (documentId: string) =>
  useMutation({
    mutationFn: (input: SendDocumentInput) => sendDocument(documentId, input),
  });

export const useEmailPreview = (documentId: string) =>
  useMutation({
    mutationFn: (input: SendDocumentInput) => previewEmail(documentId, input),
  });

export const useUpdateDocument = (documentId: string) =>
  useMutation({
    mutationFn: (input: UpdateDocumentInput) => updateDocument(documentId, input),
  });

export const useUploadDocumentFile = (documentId: string) =>
  useMutation({
    mutationFn: (input: UploadDocumentFileInput) => uploadDocumentFile(documentId, input),
  });

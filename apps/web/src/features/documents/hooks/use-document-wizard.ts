import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addSigner,
  batchUpdateFields,
  createDocument,
  deleteDocument,
  getDocument,
  getDocumentFileUrl,
  getEnvelope,
  getEnvelopeAuditSummary,
  listDocumentsByEnvelope,
  listFields,
  listSigners,
  previewEmail,
  removeSigner,
  sendEnvelope,
  suggestFields,
  updateSigner,
  uploadDocumentFile,
  updateDocument,
  updateEnvelope,
  type CreateDocumentInput,
  type CreateSignerInput,
  type UpdateSignerInput,
  type SendDocumentInput,
  type SignatureFieldInput,
  type UpdateDocumentInput,
  type UpdateEnvelopeInput,
} from '../api';

export const useDocument = (id: string) =>
  useQuery({
    queryKey: ['documents', 'detail', id],
    queryFn: () => getDocument(id),
    enabled: id.length > 0,
  });

export const useEnvelope = (id: string) =>
  useQuery({
    queryKey: ['envelopes', 'detail', id],
    queryFn: () => getEnvelope(id),
    enabled: id.length > 0,
  });

export const useDocumentFileUrl = (id: string) =>
  useQuery({
    queryKey: ['documents', 'file-url', id],
    queryFn: () => getDocumentFileUrl(id),
    enabled: id.length > 0,
  });

export const useSigners = (envelopeId: string) =>
  useQuery({
    queryKey: ['envelopes', envelopeId, 'signers'],
    queryFn: () => listSigners(envelopeId),
    enabled: envelopeId.length > 0,
  });

export const useAddSigner = (envelopeId: string) =>
  useMutation({
    mutationFn: (input: CreateSignerInput) => addSigner(envelopeId, input),
  });

export const useUpdateSigner = (envelopeId: string) =>
  useMutation({
    mutationFn: ({ signerId, input }: { signerId: string; input: UpdateSignerInput }) =>
      updateSigner(envelopeId, signerId, input),
  });

export const useRemoveSigner = (envelopeId: string) =>
  useMutation({
    mutationFn: (signerId: string) => removeSigner(envelopeId, signerId),
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

export const useSendEnvelope = (envelopeId: string) =>
  useMutation({
    mutationFn: (input: SendDocumentInput) => sendEnvelope(envelopeId, input),
  });

export const useEmailPreview = (envelopeId: string) =>
  useMutation({
    mutationFn: (input: SendDocumentInput) => previewEmail(envelopeId, input),
  });

export const useUpdateDocument = (documentId: string) =>
  useMutation({
    mutationFn: (input: UpdateDocumentInput) => updateDocument(documentId, input),
  });

export const useUpdateEnvelope = (envelopeId: string) =>
  useMutation({
    mutationFn: (input: UpdateEnvelopeInput) => updateEnvelope(envelopeId, input),
  });

export const useUploadDocumentFile = (documentId: string) =>
  useMutation({
    mutationFn: (file: File) => uploadDocumentFile(documentId, file),
  });

export const useSuggestFields = (documentId: string) =>
  useMutation({
    mutationFn: (signerCount: number) => suggestFields(documentId, signerCount),
  });

export const useEnvelopeDocuments = (envelopeId: string) =>
  useQuery({
    queryKey: ['envelopes', envelopeId, 'documents'],
    queryFn: () => listDocumentsByEnvelope(envelopeId),
    enabled: envelopeId.length > 0,
  });

export const useAddDocumentToEnvelope = (envelopeId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const title = file.name.replace(/\.pdf$/i, '');
      const doc = await createDocument(
        { title, envelopeId } satisfies CreateDocumentInput,
        file,
      );
      return doc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['envelopes', envelopeId, 'documents'] });
    },
  });
};

export const useRemoveDocument = (envelopeId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => deleteDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['envelopes', envelopeId, 'documents'] });
    },
  });
};

export const useAllEnvelopeFields = (documentIds: readonly string[]) =>
  useQuery({
    queryKey: ['documents', 'all-fields', [...documentIds].sort((a, b) => a.localeCompare(b))],
    queryFn: () =>
      Promise.all(documentIds.map((id) => listFields(id))).then((results) =>
        results.flat(),
      ),
    enabled: documentIds.length > 0,
  });

export const useEnvelopeAuditSummary = (envelopeId: string) =>
  useQuery({
    queryKey: ['envelopes', envelopeId, 'audit-summary'],
    queryFn: () => getEnvelopeAuditSummary(envelopeId),
    enabled: envelopeId.length > 0,
  });

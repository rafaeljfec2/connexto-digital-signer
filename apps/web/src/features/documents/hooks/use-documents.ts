import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createDocument,
  createEnvelope,
  deleteDocument,
  deleteEnvelope,
  getEnvelopesStats,
  getFolderTree,
  listAllSigners,
  listEnvelopes,
  type CreateDocumentInput,
  type CreateEnvelopeInput,
  type DocumentSummary,
  type ListEnvelopesParams,
  type ListSignersParams,
} from '../api';

export const useDocumentsStats = () =>
  useQuery({
    queryKey: ['envelopes', 'stats'],
    queryFn: getEnvelopesStats,
  });

export const useEnvelopesList = (params: ListEnvelopesParams) =>
  useQuery({
    queryKey: ['envelopes', 'list', params],
    queryFn: () => listEnvelopes(params),
    placeholderData: (previous) => previous,
  });

export const useSignersList = (params: ListSignersParams) =>
  useQuery({
    queryKey: ['signers', 'list', params],
    queryFn: () => listAllSigners(params),
    placeholderData: (previous) => previous,
  });

export const useDeleteEnvelope = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (envelopeId: string) => deleteEnvelope(envelopeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['envelopes'] });
    },
  });
};

export const useDeleteDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => deleteDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['envelopes', 'documents'] });
    },
  });
};

export const useCreateDraft = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string }): Promise<DocumentSummary> => {
      const tree = await getFolderTree();
      const folderId = tree[0]?.id;
      if (!folderId) {
        throw new Error('No folder available');
      }
      const envelope = await createEnvelope({
        title: input.title,
        folderId,
      } satisfies CreateEnvelopeInput);
      const document = await createDocument({
        title: input.title,
        envelopeId: envelope.id,
      } satisfies CreateDocumentInput);
      return document;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['envelopes', 'documents'] });
    },
  });
};

export const useUploadDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; file: File }): Promise<DocumentSummary> => {
      const tree = await getFolderTree();
      const folderId = tree[0]?.id;
      if (!folderId) {
        throw new Error('No folder available');
      }
      const envelope = await createEnvelope({
        title: input.title,
        folderId,
      } satisfies CreateEnvelopeInput);
      const document = await createDocument(
        {
          title: input.title,
          envelopeId: envelope.id,
        } satisfies CreateDocumentInput,
        input.file
      );
      return document;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['envelopes', 'documents'] });
    },
  });
};

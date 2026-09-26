import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createEnvelopeDraft,
  deleteDocument,
  deleteEnvelope,
  getEnvelopesStats,
  listAllSigners,
  listEnvelopes,
  uploadDocumentFile,
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
    mutationFn: (input: { title: string }): Promise<DocumentSummary> =>
      createEnvelopeDraft(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['envelopes'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
};

export const useUploadDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; file: File }): Promise<DocumentSummary> => {
      const draft = await createEnvelopeDraft({ title: input.title });
      await uploadDocumentFile(draft.id, input.file);
      return draft;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['envelopes'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
};

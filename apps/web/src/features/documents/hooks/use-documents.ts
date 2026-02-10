import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createDraftDocument,
  deleteDocument,
  getDocumentsStats,
  listAllSigners,
  listDocuments,
  uploadDocument,
  type CreateDraftInput,
  type ListDocumentsParams,
  type ListSignersParams,
  type UploadDocumentInput,
} from '../api';

export const useDocumentsStats = () =>
  useQuery({
    queryKey: ['documents', 'stats'],
    queryFn: getDocumentsStats,
  });

export const useDocumentsList = (params: ListDocumentsParams) =>
  useQuery({
    queryKey: ['documents', 'list', params],
    queryFn: () => listDocuments(params),
    placeholderData: (previous) => previous,
  });

export const useUploadDocument = () =>
  useMutation({
    mutationFn: (input: UploadDocumentInput) => uploadDocument(input),
  });

export const useCreateDraft = () =>
  useMutation({
    mutationFn: (input: CreateDraftInput) => createDraftDocument(input),
  });

export const useSignersList = (params: ListSignersParams) =>
  useQuery({
    queryKey: ['signers', 'list', params],
    queryFn: () => listAllSigners(params),
    placeholderData: (previous) => previous,
  });

export const useDeleteDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => deleteDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
};

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createDraftDocument,
  deleteDocument,
  getDocumentsStats,
  listDocuments,
  uploadDocument,
  type CreateDraftInput,
  type ListDocumentsParams,
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

export const useDeleteDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => deleteDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
};

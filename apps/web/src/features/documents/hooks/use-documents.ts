import { useMutation, useQuery } from '@tanstack/react-query';
import {
  getDocumentsStats,
  listDocuments,
  uploadDocument,
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

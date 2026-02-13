import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createFolder,
  deleteFolder,
  getFolderTree,
  updateEnvelope,
  updateFolder,
  type CreateFolderInput,
  type UpdateFolderInput,
} from '../api';

export const useFolderTree = () =>
  useQuery({
    queryKey: ['folders', 'tree'],
    queryFn: getFolderTree,
  });

export const useCreateFolder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFolderInput) => createFolder(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
};

export const useUpdateFolder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      readonly id: string;
      readonly input: UpdateFolderInput;
    }) => updateFolder(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
};

export const useDeleteFolder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFolder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['envelopes'] });
    },
  });
};

export const useMoveEnvelopeToFolder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      envelopeId,
      folderId,
    }: {
      readonly envelopeId: string;
      readonly folderId: string;
    }) => updateEnvelope(envelopeId, { folderId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['envelopes'] });
    },
  });
};

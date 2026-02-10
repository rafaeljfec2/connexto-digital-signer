import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getCertificateStatus,
  uploadCertificate,
  removeCertificate,
} from '../api';

const CERTIFICATE_QUERY_KEY = ['settings', 'certificate'] as const;

export const useCertificateStatus = () =>
  useQuery({
    queryKey: CERTIFICATE_QUERY_KEY,
    queryFn: getCertificateStatus,
  });

export const useUploadCertificate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, password }: { readonly file: File; readonly password: string }) =>
      uploadCertificate(file, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CERTIFICATE_QUERY_KEY });
    },
  });
};

export const useRemoveCertificate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeCertificate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CERTIFICATE_QUERY_KEY });
    },
  });
};

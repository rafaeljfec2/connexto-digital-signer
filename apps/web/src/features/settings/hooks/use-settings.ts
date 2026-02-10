import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getBranding,
  updateBranding,
  uploadLogo,
  getDefaults,
  updateDefaults,
  getNotifications,
  updateNotifications,
  getApiKeyStatus,
  regenerateApiKey,
  type DefaultsData,
  type NotificationsData,
} from '../api';

const BRANDING_KEY = ['settings', 'branding'] as const;
const DEFAULTS_KEY = ['settings', 'defaults'] as const;
const NOTIFICATIONS_KEY = ['settings', 'notifications'] as const;
const API_KEY_KEY = ['settings', 'api-key'] as const;

export const useBranding = () =>
  useQuery({ queryKey: BRANDING_KEY, queryFn: getBranding });

export const useUpdateBranding = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { readonly name?: string; readonly primaryColor?: string }) =>
      updateBranding(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BRANDING_KEY });
    },
  });
};

export const useUploadLogo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadLogo(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BRANDING_KEY });
    },
  });
};

export const useDefaults = () =>
  useQuery({ queryKey: DEFAULTS_KEY, queryFn: getDefaults });

export const useUpdateDefaults = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<DefaultsData>) => updateDefaults(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEFAULTS_KEY });
    },
  });
};

export const useNotifications = () =>
  useQuery({ queryKey: NOTIFICATIONS_KEY, queryFn: getNotifications });

export const useUpdateNotifications = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NotificationsData) => updateNotifications(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
};

export const useApiKeyStatus = () =>
  useQuery({ queryKey: API_KEY_KEY, queryFn: getApiKeyStatus });

export const useRegenerateApiKey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: regenerateApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: API_KEY_KEY });
    },
  });
};

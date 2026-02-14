import { apiClient } from '@/shared/api/client';

export interface LoginResponse {
  readonly accessToken: string;
  readonly expiresIn: number;
  readonly user: {
    readonly id: string;
    readonly name: string;
    readonly email: string;
    readonly role: string;
    readonly tenantId: string;
  };
}

export interface LoginInput {
  readonly email: string;
  readonly password: string;
}

export interface SignUpInput {
  readonly name: string;
  readonly slug: string;
  readonly ownerName: string;
  readonly ownerEmail: string;
  readonly ownerPassword: string;
}

export interface SignUpResponse {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
}

export const checkEmail = async (email: string): Promise<{ exists: boolean }> => {
  const { data } = await apiClient.post<{ exists: boolean }>('/auth/check-email', { email });
  return data;
};

export const loginWithEmail = async (payload: LoginInput): Promise<LoginResponse> => {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', payload);
  return data;
};

export const logoutFromApi = async (): Promise<void> => {
  await apiClient.post('/auth/logout');
};

export const createTenant = async (payload: SignUpInput): Promise<SignUpResponse> => {
  const { data } = await apiClient.post<SignUpResponse>('/tenants', payload);
  return data;
};

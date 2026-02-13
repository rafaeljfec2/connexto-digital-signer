import axios from 'axios';

const baseURL =
  process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000/digital-signer/v1';

const publicClient = axios.create({ baseURL });

export type SignerWithEnvelope = {
  readonly signer: {
    readonly id: string;
    readonly name: string;
    readonly email: string;
    readonly phone: string | null;
    readonly status: 'pending' | 'signed';
    readonly envelopeId: string;
    readonly signedAt: string | null;
    readonly authMethod: string;
    readonly requestEmail: boolean;
    readonly requestCpf: boolean;
    readonly requestPhone: boolean;
  };
  readonly envelope: {
    readonly id: string;
    readonly title: string;
    readonly status: string;
    readonly signingLanguage: string;
    readonly expiresAt: string | null;
  };
  readonly documents: ReadonlyArray<{
    readonly id: string;
    readonly title: string;
    readonly status: string;
    readonly position: number;
  }>;
};

export type SignerField = {
  readonly id: string;
  readonly type: string;
  readonly page: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly required: boolean;
  readonly value: string | null;
};

export type AcceptSignatureInput = {
  readonly consent: string;
  readonly fields: ReadonlyArray<{
    readonly fieldId: string;
    readonly value: string;
  }>;
  readonly signatureData?: string;
};

export type IdentifySignerInput = {
  readonly email?: string;
  readonly cpf?: string;
  readonly phone?: string;
};

export const identifySigner = async (
  token: string,
  input: IdentifySignerInput,
): Promise<{ readonly identified: boolean }> => {
  const response = await publicClient.post<{ readonly identified: boolean }>(
    `/sign/${token}/identify`,
    input,
  );
  return response.data;
};

export const getSignerByToken = async (
  token: string
): Promise<SignerWithEnvelope> => {
  const response = await publicClient.get<SignerWithEnvelope>(`/sign/${token}`);
  return response.data;
};

export const getSignerPdf = async (token: string, documentId?: string): Promise<Blob> => {
  const params = documentId ? { documentId } : {};
  const response = await publicClient.get(`/sign/${token}/pdf`, {
    responseType: 'blob',
    params,
  });
  return response.data as Blob;
};

export const getSignerFields = async (
  token: string,
  documentId?: string,
): Promise<SignerField[]> => {
  const params = documentId ? { documentId } : {};
  const response = await publicClient.get<SignerField[]>(
    `/sign/${token}/fields`,
    { params },
  );
  return response.data;
};

export const acceptSignature = async (
  token: string,
  input: AcceptSignatureInput
): Promise<void> => {
  await publicClient.post(`/sign/${token}/accept`, input);
};

export const getSignerSignedPdf = async (token: string, documentId?: string): Promise<Blob | null> => {
  try {
    const params = documentId ? { documentId } : {};
    const response = await publicClient.get(`/sign/${token}/signed-pdf`, {
      responseType: 'blob',
      params,
    });
    return response.data as Blob;
  } catch {
    return null;
  }
};

export const getSignerSummary = async (
  token: string
): Promise<import('@/features/documents/api').DocumentAuditSummary> => {
  const response = await publicClient.get<import('@/features/documents/api').DocumentAuditSummary>(
    `/sign/${token}/summary`
  );
  return response.data;
};

export const sendVerificationCode = async (
  token: string
): Promise<{ readonly sent: boolean }> => {
  const response = await publicClient.post<{ readonly sent: boolean }>(
    `/sign/${token}/send-code`
  );
  return response.data;
};

export const verifyCode = async (
  token: string,
  code: string
): Promise<{ readonly verified: boolean }> => {
  const response = await publicClient.post<{ readonly verified: boolean }>(
    `/sign/${token}/verify-code`,
    { code }
  );
  return response.data;
};

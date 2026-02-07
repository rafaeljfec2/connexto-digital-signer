import axios from 'axios';

const baseURL =
  process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000/digital-signer/v1';

const publicClient = axios.create({ baseURL });

export type SignerWithDocument = {
  readonly signer: {
    readonly id: string;
    readonly name: string;
    readonly email: string;
    readonly status: 'pending' | 'signed';
    readonly documentId: string;
    readonly signedAt: string | null;
    readonly authMethod: string;
  };
  readonly document: {
    readonly id: string;
    readonly title: string;
    readonly status: string;
    readonly signingLanguage: string;
  };
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
};

export const getSignerByToken = async (
  token: string
): Promise<SignerWithDocument> => {
  const response = await publicClient.get<SignerWithDocument>(`/sign/${token}`);
  return response.data;
};

export const getSignerPdf = async (token: string): Promise<Blob> => {
  const response = await publicClient.get(`/sign/${token}/pdf`, {
    responseType: 'blob',
  });
  return response.data as Blob;
};

export const getSignerFields = async (
  token: string
): Promise<SignerField[]> => {
  const response = await publicClient.get<SignerField[]>(
    `/sign/${token}/fields`
  );
  return response.data;
};

export const acceptSignature = async (
  token: string,
  input: AcceptSignatureInput
): Promise<void> => {
  await publicClient.post(`/sign/${token}/accept`, input);
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

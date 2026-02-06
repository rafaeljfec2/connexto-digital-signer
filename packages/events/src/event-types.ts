export interface SignatureCompletedEvent {
  documentId: string;
  tenantId: string;
  signerId: string;
  signedAt: Date;
}

export interface DocumentCompletedEvent {
  documentId: string;
  tenantId: string;
  completedAt: Date;
}

export interface DocumentExpiredEvent {
  documentId: string;
  tenantId: string;
  expiredAt: Date;
}

export interface DocumentCreatedEvent {
  documentId: string;
  tenantId: string;
  title: string;
  createdAt: Date;
}

export interface SignerAddedEvent {
  documentId: string;
  documentTitle: string;
  tenantId: string;
  signerId: string;
  signerEmail: string;
  signerName: string;
  accessToken: string;
}

export type DomainEvent =
  | { type: 'signature.completed'; payload: SignatureCompletedEvent }
  | { type: 'document.completed'; payload: DocumentCompletedEvent }
  | { type: 'document.expired'; payload: DocumentExpiredEvent }
  | { type: 'document.created'; payload: DocumentCreatedEvent }
  | { type: 'signer.added'; payload: SignerAddedEvent };

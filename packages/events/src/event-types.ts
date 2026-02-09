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

export interface DocumentSentEvent {
  documentId: string;
  tenantId: string;
  signingMode: 'parallel' | 'sequential';
  sentAt: Date;
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

export interface UserLoginSuccessEvent {
  tenantId: string;
  userId: string;
  email: string;
  ipAddress: string;
  userAgent: string;
  loginAt: Date;
}

export interface UserLoginFailedEvent {
  email: string;
  ipAddress: string;
  userAgent: string;
  reason: string;
  attemptedAt: Date;
}

export interface UserLogoutEvent {
  tenantId: string;
  userId: string;
  email: string;
  logoutAt: Date;
}

export interface TenantCreatedEvent {
  tenantId: string;
  ownerEmail: string;
  ownerName: string;
  createdAt: Date;
}

export interface AiFieldsSuggestedEvent {
  documentId: string;
  tenantId: string;
  fieldCount: number;
  documentType: string;
  confidence: number;
  tokensUsed: number;
  suggestedAt: Date;
}

export interface AiUsageLimitReachedEvent {
  tenantId: string;
  currentTokens: number;
  limitTokens: number;
  periodYear: number;
  periodMonth: number;
}

export type DomainEvent =
  | { type: 'signature.completed'; payload: SignatureCompletedEvent }
  | { type: 'document.completed'; payload: DocumentCompletedEvent }
  | { type: 'document.expired'; payload: DocumentExpiredEvent }
  | { type: 'document.created'; payload: DocumentCreatedEvent }
  | { type: 'document.sent'; payload: DocumentSentEvent }
  | { type: 'signer.added'; payload: SignerAddedEvent }
  | { type: 'user.login.success'; payload: UserLoginSuccessEvent }
  | { type: 'user.login.failed'; payload: UserLoginFailedEvent }
  | { type: 'user.logout'; payload: UserLogoutEvent }
  | { type: 'tenant.created'; payload: TenantCreatedEvent }
  | { type: 'ai.fields.suggested'; payload: AiFieldsSuggestedEvent }
  | { type: 'ai.usage.limit_reached'; payload: AiUsageLimitReachedEvent };

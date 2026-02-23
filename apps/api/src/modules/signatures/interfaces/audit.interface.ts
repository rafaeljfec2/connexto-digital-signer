export interface SigningContext {
  readonly ipAddress: string;
  readonly userAgent: string;
  readonly latitude?: number;
  readonly longitude?: number;
}

export interface AuditTimelineEvent {
  readonly type: 'sent' | 'signed' | 'completed' | 'verified';
  readonly actorName: string;
  readonly actorEmail: string;
  readonly timestamp: Date;
}

export interface AuditSignerInfo {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly status: string;
  readonly authMethod: string;
  readonly notifiedAt: Date | null;
  readonly signedAt: Date | null;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly verifiedAt: Date | null;
  readonly signatureData: string | null;
}

export interface DocumentAuditSummary {
  readonly document: {
    readonly id: string;
    readonly title: string;
    readonly status: string;
    readonly signingMode: string;
    readonly createdAt: Date;
    readonly expiresAt: Date | null;
    readonly completedAt: Date | null;
    readonly originalHash: string | null;
    readonly finalHash: string | null;
  };
  readonly signers: AuditSignerInfo[];
  readonly timeline: AuditTimelineEvent[];
}

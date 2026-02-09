export interface SuggestedField {
  readonly type: 'signature' | 'name' | 'date' | 'initials' | 'text';
  readonly page: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly label: string;
  readonly signerIndex: number;
}

export interface SuggestFieldsResponse {
  readonly fields: ReadonlyArray<SuggestedField>;
  readonly detectedSigners: number;
  readonly documentType: string;
  readonly confidence: number;
}

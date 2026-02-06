export interface RequestWithHeaders {
  headers: { [key: string]: string | string[] | undefined };
}

export interface RequestWithTenantId extends RequestWithHeaders {
  query?: { [key: string]: string | string[] | undefined };
}

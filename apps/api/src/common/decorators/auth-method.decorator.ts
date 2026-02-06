import { SetMetadata } from '@nestjs/common';

export type AuthMethod = 'jwt' | 'api_key';

export const AUTH_METHOD_KEY = 'authMethod';

export const RequireAuthMethod = (method: AuthMethod): ReturnType<typeof SetMetadata> =>
  SetMetadata(AUTH_METHOD_KEY, method);

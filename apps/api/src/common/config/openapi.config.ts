/**
 * Decide whether the OpenAPI endpoints (Swagger UI and Scalar reference) are
 * registered.
 *
 * Registration used to depend on NODE_ENV, which made the developer portal
 * documentation unreachable in production while the API interceptor still
 * assumed those routes existed. An explicit flag lets each environment opt in
 * without coupling documentation exposure to the runtime mode.
 */
export function isOpenApiEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env['API_DOCS_ENABLED'] === 'true';
}

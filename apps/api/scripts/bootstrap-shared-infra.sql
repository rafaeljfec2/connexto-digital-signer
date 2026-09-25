-- Run once against the shared Outcoders Postgres (container name: postgres).
-- Replace SIGNER_DB_PASSWORD with a strong secret before executing.
-- Do not enable the vector extension in this wave.

CREATE USER connexto_signer WITH PASSWORD 'SIGNER_DB_PASSWORD';
CREATE DATABASE connexto_signer OWNER connexto_signer;

\connect connexto_signer

-- Required by TypeORM migrations (uuid DEFAULT uuid_generate_v4()).
-- Must run as a superuser (axiom on Outcoders). connexto_signer cannot CREATE EXTENSION.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

GRANT ALL ON SCHEMA public TO connexto_signer;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO connexto_signer;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO connexto_signer;

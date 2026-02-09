import 'reflect-metadata';
import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',
  host: process.env['DB_HOST'] ?? 'localhost',
  port: Number.parseInt(process.env['DB_PORT'] ?? '5432', 10),
  username: process.env['DB_USERNAME'] ?? 'postgres',
  password: process.env['DB_PASSWORD'] ?? 'postgres',
  database: process.env['DB_DATABASE'] ?? 'connexto_signer',
  entities: ['src/**/*.entity.ts', 'dist/**/*.entity.js'],
  migrations: [
    'src/database/migrations/*{.ts,.js}',
    'dist/database/migrations/*{.js}',
  ],
  synchronize: false,
  logging: process.env['DB_LOGGING'] === 'true',
});

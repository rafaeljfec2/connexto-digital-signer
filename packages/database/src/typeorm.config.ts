import { DataSource, DataSourceOptions, EntitySchema } from 'typeorm';

export interface TypeOrmConfigOptions {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  entities: (Function | EntitySchema)[];
  migrations?: string[];
  synchronize?: boolean;
  logging?: boolean;
}

export function getTypeOrmConfig(options: TypeOrmConfigOptions): DataSourceOptions {
  return {
    type: 'postgres',
    host: options.host,
    port: options.port,
    username: options.username,
    password: options.password,
    database: options.database,
    entities: options.entities,
    migrations: options.migrations ?? [],
    synchronize: options.synchronize ?? false,
    logging: options.logging ?? false,
  };
}

export function createDataSource(options: DataSourceOptions): DataSource {
  return new DataSource(options);
}

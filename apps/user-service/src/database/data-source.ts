import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { config as loadEnvFile } from 'dotenv';
import { DataSource } from 'typeorm';

function resolveUserServiceEnvFilePaths(): string[] {
  const cwd = process.cwd().replace(/\\/g, '/');
  const runningFromAppDir = cwd.endsWith('/apps/user-service');
  const appRoot = runningFromAppDir
    ? process.cwd()
    : join(process.cwd(), 'apps', 'user-service');

  return [
    join(appRoot, '.env.local'),
    join(appRoot, '.env'),
    join(appRoot, '.env.example'),
  ];
}

for (const envFilePath of resolveUserServiceEnvFilePaths()) {
  if (existsSync(envFilePath)) {
    loadEnvFile({ path: envFilePath, override: false });
  }
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run user-service migrations');
}

export default new DataSource({
  type: 'postgres',
  url: databaseUrl,
  entities: [
    join(
      __dirname,
      '..',
      'modules',
      'user',
      'infrastructure',
      'persistence',
      'entities',
      '*.entity.{ts,js}',
    ),
  ],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  synchronize: false,
});

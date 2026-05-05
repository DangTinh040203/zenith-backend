import { join } from 'node:path';

export function resolveUserServiceEnvFilePaths(): string[] {
  const cwd = process.cwd().replace(/\\/g, '/');
  const runningFromAppDir = cwd.endsWith('/apps/user-service');
  const appRoot = runningFromAppDir
    ? process.cwd()
    : join(process.cwd(), 'apps', 'user-service');

  // Nest merges so earlier entries win over later; keep .env.local > .env > .env.example.
  return [
    join(appRoot, '.env.local'),
    join(appRoot, '.env'),
    join(appRoot, '.env.example'),
  ];
}

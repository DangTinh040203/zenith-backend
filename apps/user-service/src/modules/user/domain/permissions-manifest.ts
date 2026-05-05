import manifest from '@/modules/user/domain/permissions.manifest.json';

export interface PermissionsManifest {
  permissions: string[];
}

export const permissionsManifest: PermissionsManifest = manifest;

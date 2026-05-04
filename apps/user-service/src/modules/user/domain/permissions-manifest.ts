import manifest from '@/modules/user/domain/permissions.manifest.json';

export type PermissionsManifest = {
  permissions: string[];
};

export const permissionsManifest: PermissionsManifest = manifest;

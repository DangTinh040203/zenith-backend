import manifest from '@/rbac/permissions.manifest.json';

export type PermissionsManifest = {
  permissions: string[];
};

/** Canonical list of permission slugs: `resource:action` (see `permissions.manifest.json`). */
export const permissionsManifest: PermissionsManifest = manifest;

/** Read model for API / messaging — not a TypeORM entity. */
export type UserProfile = {
  id: string;
  externalId: string | null;
  displayName: string | null;
  avatar: string | null;
  email: string;
};

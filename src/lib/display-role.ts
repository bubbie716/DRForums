export type DisplayRole = {
  name: string;
  color: string | null;
};

export function withDisplayRole<T extends { id: string }>(
  user: T,
  roles: Map<string, DisplayRole | null | undefined>
): T & { displayRole: DisplayRole | null } {
  return {
    ...user,
    displayRole: roles.get(user.id) ?? null,
  };
}

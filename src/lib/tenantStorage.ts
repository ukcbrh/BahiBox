export function tenantScopedKey(baseKey: string, tenantId: string | null | undefined): string {
  return tenantId ? `${baseKey}__${tenantId}` : baseKey;
}

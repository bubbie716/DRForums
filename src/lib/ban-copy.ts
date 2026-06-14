export const FORUM_BAN_SCOPE_NOTE =
  "This only blocks the person on the website. They can still join the Minecraft server.";

export const BAN_RESTRICTED_MESSAGE =
  "Your forum account is banned and cannot perform this action. This does not affect your access to the Minecraft server.";

export function formatBanExpiry(expiresAt: Date | null): string {
  if (!expiresAt) {
    return "Permanent";
  }
  return expiresAt.toLocaleString();
}

export function formatLoginBanMessage(
  reason: string,
  expiresAt: Date | null
): string {
  return `This account is banned. Reason: ${reason}. Expires: ${formatBanExpiry(expiresAt)}.`;
}

import { getSessionUser } from "@/lib/auth";
import { getActiveBan, formatBanExpiry } from "@/lib/bans";

export async function BanBanner() {
  const user = await getSessionUser();
  if (!user) return null;

  const ban = await getActiveBan(user.id);
  if (!ban) return null;

  return (
    <div className="bg-red-600 text-white px-4 py-3 text-center text-sm font-semibold">
      Your forum account is banned from posting, replying, and DMs. This does not affect Minecraft server access. Reason: {ban.reason}. Expires: {formatBanExpiry(ban.expiresAt)}.
    </div>
  );
}

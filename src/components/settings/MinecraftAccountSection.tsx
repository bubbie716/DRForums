import { formatDate } from "@/lib/utils";
import { LinkMinecraftForm } from "./LinkMinecraftForm";

type MinecraftAccountSectionProps = {
  minecraftUuid: string | null;
  minecraftUsername: string | null;
  minecraftLinkedAt: Date | null;
};

export function MinecraftAccountSection({
  minecraftUuid,
  minecraftUsername,
  minecraftLinkedAt,
}: MinecraftAccountSectionProps) {
  const isLinked = Boolean(minecraftUuid && minecraftUsername && minecraftLinkedAt);

  return (
    <div className="mt-8 bg-white border border-border rounded-2xl shadow-warm overflow-hidden">
      <div className="px-6 py-4 bg-surface border-b border-border">
        <h2 className="text-sm font-bold text-text-secondary uppercase tracking-widest">
          Minecraft Account
        </h2>
      </div>

      <div className="px-6 py-6">
        {isLinked ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-yellow/40 text-accent-dark border border-yellow">
                Verified
              </span>
            </div>

            <div className="divide-y divide-border/60 border border-border/60 rounded-xl overflow-hidden">
              <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-cream/40">
                <div>
                  <p className="text-sm font-bold text-text-dark">
                    Minecraft username
                  </p>
                  <p className="text-xs text-text-secondary mt-1">
                    Linked from the game server.
                  </p>
                </div>
                <p className="text-sm font-semibold text-text-dark">
                  {minecraftUsername}
                </p>
              </div>

              <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-text-dark">Linked on</p>
                  <p className="text-xs text-text-secondary mt-1">
                    When your account was verified.
                  </p>
                </div>
                <p className="text-sm font-semibold text-text-dark">
                  {formatDate(minecraftLinkedAt!)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <LinkMinecraftForm />
        )}
      </div>
    </div>
  );
}

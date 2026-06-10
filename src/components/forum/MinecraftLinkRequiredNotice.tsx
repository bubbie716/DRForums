import Link from "next/link";

type MinecraftLinkRequiredNoticeProps = {
  action?: "create threads" | "post replies" | "post";
};

export function MinecraftLinkRequiredNotice({
  action = "post",
}: MinecraftLinkRequiredNoticeProps) {
  return (
    <div className="bg-white border border-border rounded-2xl shadow-warm px-6 py-8 text-center">
      <p className="text-text-secondary leading-relaxed">
        You must link your Minecraft account before you can {action}. Join the
        server, run{" "}
        <code className="px-1.5 py-0.5 rounded-md bg-yellow/40 text-accent-dark font-semibold text-xs">
          /forumsverify
        </code>
        , then enter your code in{" "}
        <Link
          href="/settings"
          className="text-accent font-semibold hover:underline"
        >
          Settings
        </Link>
        .
      </p>
    </div>
  );
}

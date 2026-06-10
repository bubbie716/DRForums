import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Breadcrumbs } from "@/components/forum/Breadcrumbs";
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";
import { MinecraftAccountSection } from "@/components/settings/MinecraftAccountSection";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      username: true,
      createdAt: true,
      minecraftUuid: true,
      minecraftUsername: true,
      minecraftLinkedAt: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="bg-surface min-h-full">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 lg:py-14">
        <Breadcrumbs
          items={[
            { label: "Forums", href: "/" },
            { label: "Settings" },
          ]}
        />

        <div className="mt-6">
          <h1 className="text-3xl font-extrabold text-text-dark">Settings</h1>
          <p className="text-text-secondary mt-2">
            Manage your account preferences.
          </p>
        </div>

        <div className="mt-8 bg-white border border-border rounded-2xl shadow-warm overflow-hidden">
          <div className="px-6 py-4 bg-surface border-b border-border">
            <h2 className="text-sm font-bold text-text-secondary uppercase tracking-widest">
              Account
            </h2>
          </div>

          <div className="divide-y divide-border/60">
            <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-text-dark">Username</p>
                <p className="text-xs text-text-secondary mt-1">
                  Your public display name on the forum.
                </p>
              </div>
              <p className="text-sm font-semibold text-text-dark">{user.username}</p>
            </div>

            <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-text-dark">Member since</p>
                <p className="text-xs text-text-secondary mt-1">
                  When you joined District Roleplay.
                </p>
              </div>
              <p className="text-sm font-semibold text-text-dark">
                {formatDate(user.createdAt)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white border border-border rounded-2xl shadow-warm overflow-hidden">
          <div className="px-6 py-4 bg-surface border-b border-border">
            <h2 className="text-sm font-bold text-text-secondary uppercase tracking-widest">
              Password
            </h2>
          </div>
          <div className="px-6 py-6">
            <ChangePasswordForm />
          </div>
        </div>

        <MinecraftAccountSection
          minecraftUuid={user.minecraftUuid}
          minecraftUsername={user.minecraftUsername}
          minecraftLinkedAt={user.minecraftLinkedAt}
        />
      </div>
    </div>
  );
}

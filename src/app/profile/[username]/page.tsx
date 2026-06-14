import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getPublicProfile } from "@/lib/forum/queries";
import { canEditBio } from "@/lib/profile/permissions";
import { formatDate } from "@/lib/utils";
import { RoleBadge } from "@/components/forum/RoleBadge";
import { Breadcrumbs } from "@/components/forum/Breadcrumbs";
import { UserAvatar } from "@/components/profile/UserAvatar";
import { ProfileBanner } from "@/components/profile/ProfileBanner";
import { ProfileBio } from "@/components/profile/ProfileBio";
import { RecentPostsFeed } from "@/components/profile/RecentPostsFeed";

type ProfilePageProps = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  return { title: `${username}'s Profile` };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const viewer = await getSessionUser();
  const [profile, biosEnabled] = await Promise.all([
    getPublicProfile(username, viewer?.id ?? null),
    canEditBio(),
  ]);

  if (!profile) {
    notFound();
  }

  return (
    <div className="bg-surface min-h-full">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 lg:py-14">
        <Breadcrumbs
          items={[
            { label: "Forums", href: "/" },
            { label: profile.username },
          ]}
        />

        <div className="mt-6 bg-white border border-border rounded-2xl shadow-warm overflow-hidden">
          <div className="relative">
            <ProfileBanner bannerUrl={profile.bannerUrl} className="relative z-0" />

            <div className="absolute left-6 sm:left-8 bottom-0 z-10 translate-y-1/2">
              <UserAvatar
                seed={profile.id}
                avatarUrl={profile.avatarUrl}
                minecraftUsername={profile.minecraftUsername}
                size={88}
                square
                imageClassName="ring-4 ring-white shadow-warm"
              />
            </div>
          </div>

          <div className="px-6 sm:px-8 pt-12 sm:pt-14 pb-8">
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-extrabold text-text-dark">
                  {profile.username}
                </h1>
                {profile.displayRole && (
                  <RoleBadge displayRole={profile.displayRole} />
                )}
              </div>
              <p className="text-text-secondary mt-2">
                Joined {formatDate(profile.createdAt)}
              </p>
              {profile.minecraftUsername && (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <p className="text-sm text-text-secondary">
                    Minecraft:{" "}
                    <span className="font-semibold text-text-dark">
                      {profile.minecraftUsername}
                    </span>
                  </p>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-yellow/40 text-accent-dark border border-yellow">
                    Verified
                  </span>
                </div>
              )}
            </div>

            {biosEnabled && profile.bio ? (
              <div className="mt-6">
                <ProfileBio bio={profile.bio} />
              </div>
            ) : null}

            <div className="mt-6 flex gap-8 text-sm">
              <div>
                <span className="font-bold text-text-dark tabular-nums">
                  {profile._count.threads}
                </span>{" "}
                <span className="text-text-secondary">threads</span>
              </div>
              <div>
                <span className="font-bold text-text-dark tabular-nums">
                  {profile._count.posts}
                </span>{" "}
                <span className="text-text-secondary">posts</span>
              </div>
              <div>
                <span
                  className={`font-bold tabular-nums ${
                    profile.reactionRatio > 0
                      ? "text-accent"
                      : profile.reactionRatio < 0
                        ? "text-red-600"
                        : "text-text-dark"
                  }`}
                >
                  {profile.reactionRatio > 0
                    ? `+${profile.reactionRatio}`
                    : profile.reactionRatio}
                </span>{" "}
                <span className="text-text-secondary">reaction ratio</span>
              </div>
            </div>
          </div>
        </div>

        <RecentPostsFeed posts={profile.recentPosts} />
      </div>
    </div>
  );
}

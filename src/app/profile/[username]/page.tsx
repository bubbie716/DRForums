import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicProfile } from "@/lib/forum/queries";
import { formatDate } from "@/lib/utils";
import { RoleBadge } from "@/components/forum/RoleBadge";
import { Breadcrumbs } from "@/components/forum/Breadcrumbs";
import { MinecraftHead } from "@/components/forum/MinecraftHead";
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
  const profile = await getPublicProfile(username);

  if (!profile) {
    notFound();
  }

  return (
    <div className="bg-surface min-h-full">
      <div className="max-w-3xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
        <Breadcrumbs
          items={[
            { label: "Forums", href: "/" },
            { label: profile.username },
          ]}
        />

        <div className="mt-6 bg-white border border-border rounded-2xl shadow-warm p-8">
          <div className="flex items-start gap-4">
            <MinecraftHead
              seed={profile.id}
              minecraftUsername={profile.minecraftUsername}
              size={64}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-extrabold text-text-dark">
                  {profile.username}
                </h1>
                <RoleBadge role={profile.role} />
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
          </div>

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

        <RecentPostsFeed posts={profile.recentPosts} />
      </div>
    </div>
  );
}

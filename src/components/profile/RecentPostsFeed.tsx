import Link from "next/link";
import { formatRelativeDate } from "@/lib/utils";
import type { UserRecentPost } from "@/lib/forum/queries";

type RecentPostsFeedProps = {
  posts: UserRecentPost[];
};

function truncateContent(content: string, maxLength = 160): string {
  const trimmed = content.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength).trimEnd()}…`;
}

export function RecentPostsFeed({ posts }: RecentPostsFeedProps) {
  return (
    <div className="mt-8 bg-white border border-border rounded-2xl shadow-warm overflow-hidden">
      <div className="px-6 py-4 bg-surface border-b border-border">
        <h2 className="text-sm font-bold text-text-secondary uppercase tracking-widest">
          Recent Posts
        </h2>
      </div>

      {posts.length > 0 ? (
        <div className="divide-y divide-border/60">
          {posts.map((post) => (
            <article key={post.id} className="px-6 py-5 hover:bg-hover transition-colors">
              <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                <Link
                  href={`/forum/${post.thread.forum.slug}`}
                  className="font-semibold hover:text-accent transition-colors"
                >
                  {post.thread.forum.name}
                </Link>
                <span className="text-border">·</span>
                <time dateTime={post.createdAt.toISOString()}>
                  {formatRelativeDate(post.createdAt)}
                </time>
                {post.isOriginalPost && (
                  <>
                    <span className="text-border">·</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-yellow/40 text-accent-dark border border-yellow">
                      Thread
                    </span>
                  </>
                )}
              </div>

              <Link
                href={`/thread/${post.thread.id}#post-${post.id}`}
                className="forum-title-link block mt-2 font-bold text-text-dark hover:text-accent transition-colors"
              >
                {post.thread.title}
              </Link>

              <p className="mt-2 text-sm text-text-secondary leading-relaxed line-clamp-3 whitespace-pre-wrap">
                {truncateContent(post.content)}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <div className="px-6 py-12 text-center text-text-secondary text-sm">
          No posts yet.
        </div>
      )}
    </div>
  );
}

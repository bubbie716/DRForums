import Link from "next/link";
import { cn, formatRelativeDate } from "@/lib/utils";
import { UserProfileLink } from "@/components/profile/UserProfileLink";
import type { ForumIndexForum } from "@/lib/forum/queries";

type ForumRowProps = {
  forum: ForumIndexForum;
};

export function ForumRow({ forum }: ForumRowProps) {
  const { latestPost } = forum;
  const hasDescription = Boolean(forum.description);

  return (
    <>
      <div className="md:hidden px-4 py-4 border-b border-border/60 last:border-b-0 bg-white hover:bg-hover transition-colors duration-200">
        <div
          className={cn(
            "flex gap-3 min-w-0",
            hasDescription ? "items-start" : "items-center"
          )}
        >
          <div className="w-10 h-10 rounded-xl bg-yellow/50 border-2 border-accent/40 flex items-center justify-center text-accent shrink-0">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.12-6.24.356C3.352 3.574 2.25 4.978 2.25 6.637v4.286c0 1.136.847 2.1 1.98 2.193.34.027.68.052 1.02.072v3.091l3-3z"
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <Link
              href={`/forum/${forum.slug}`}
              className="forum-title-link inline-block font-bold text-text-dark text-base transition-colors duration-200 hover:text-accent break-words"
            >
              {forum.name}
            </Link>
            {forum.description && (
              <p className="text-sm text-text-secondary mt-1.5 line-clamp-2 leading-relaxed break-words">
                {forum.description}
              </p>
            )}
            <div className="flex flex-wrap gap-4 mt-3 text-xs text-text-secondary">
              <span>
                <span className="font-bold text-accent tabular-nums">
                  {forum.threadCount.toLocaleString()}
                </span>{" "}
                threads
              </span>
              <span>
                <span className="font-bold text-accent tabular-nums">
                  {forum.postCount.toLocaleString()}
                </span>{" "}
                posts
              </span>
            </div>
            {latestPost ? (
              <div className="mt-3 pt-3 border-t border-border/50">
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Latest post
                </p>
                <Link
                  href={`/thread/${latestPost.thread.id}#post-${latestPost.id}`}
                  className="forum-title-link inline-block text-sm font-semibold text-text-dark transition-colors duration-200 hover:text-accent line-clamp-2 break-words"
                >
                  {latestPost.thread.title}
                </Link>
                <p className="text-xs text-text-secondary mt-1">
                  by{" "}
                  <UserProfileLink
                    username={latestPost.author.username}
                    className="font-medium"
                  />
                  <span className="mx-1.5">·</span>
                  <time dateTime={latestPost.createdAt.toISOString()}>
                    {formatRelativeDate(latestPost.createdAt)}
                  </time>
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-text-muted italic">No posts yet</p>
            )}
          </div>
        </div>
      </div>

      <div className="hidden md:grid group grid-cols-12 gap-4 px-4 md:px-7 py-5 md:py-6 border-b border-border/60 last:border-b-0 bg-white hover:bg-hover transition-all duration-200">
        <div
          className={cn(
            "col-span-12 md:col-span-5 flex gap-4 min-w-0",
            hasDescription ? "items-start" : "items-center"
          )}
        >
          <div className="w-11 h-11 rounded-2xl bg-yellow/50 border-2 border-accent/40 flex items-center justify-center text-accent shrink-0 group-hover:bg-yellow group-hover:border-accent transition-all duration-200">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.12-6.24.356C3.352 3.574 2.25 4.978 2.25 6.637v4.286c0 1.136.847 2.1 1.98 2.193.34.027.68.052 1.02.072v3.091l3-3z"
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <Link
              href={`/forum/${forum.slug}`}
              className="forum-title-link inline-block font-bold text-text-dark text-base transition-colors duration-200 hover:text-accent break-words"
            >
              {forum.name}
            </Link>
            {forum.description && (
              <p className="text-sm text-text-secondary mt-1.5 line-clamp-2 leading-relaxed break-words">
                {forum.description}
              </p>
            )}
          </div>
        </div>

        <div className="col-span-1 flex items-center justify-center">
          <span className="text-base font-bold text-text-dark tabular-nums">
            {forum.threadCount.toLocaleString()}
          </span>
        </div>

        <div className="col-span-1 flex items-center justify-center">
          <span className="text-base font-bold text-text-dark tabular-nums">
            {forum.postCount.toLocaleString()}
          </span>
        </div>

        <div className="col-span-5 flex items-center min-w-0">
          {latestPost ? (
            <div className="min-w-0 w-full text-right">
              <Link
                href={`/thread/${latestPost.thread.id}#post-${latestPost.id}`}
                className="forum-title-link inline-block w-full text-sm font-semibold text-text-dark transition-colors duration-200 hover:text-accent line-clamp-1 break-words"
              >
                {latestPost.thread.title}
              </Link>
              <p className="text-xs text-text-secondary mt-1.5">
                by{" "}
                <UserProfileLink
                  username={latestPost.author.username}
                  className="font-medium"
                />
                <span className="mx-2 text-border">·</span>
                <time dateTime={latestPost.createdAt.toISOString()}>
                  {formatRelativeDate(latestPost.createdAt)}
                </time>
              </p>
            </div>
          ) : (
            <span className="text-sm text-text-muted w-full text-right italic">
              No posts yet
            </span>
          )}
        </div>
      </div>
    </>
  );
}

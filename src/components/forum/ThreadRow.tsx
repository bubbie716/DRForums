import Link from "next/link";
import { formatDate, formatRelativeDate } from "@/lib/utils";
import type { ForumThreadRow } from "@/lib/forum/queries";
import { UserProfileLink } from "@/components/profile/UserProfileLink";
import { MinecraftHead } from "./MinecraftHead";

type ThreadRowProps = {
  thread: ForumThreadRow;
};

export function ThreadRow({ thread }: ThreadRowProps) {
  return (
    <div className="grid grid-cols-12 gap-4 px-6 py-5 border-b border-border/60 last:border-b-0 bg-white hover:bg-hover transition-colors duration-200">
      <div className="profile-author-block col-span-12 lg:col-span-5 flex items-start gap-3 min-w-0">
        <MinecraftHead
          seed={thread.author.id}
          minecraftUsername={thread.author.minecraftUsername}
          profileUsername={thread.author.username}
          size={44}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1.5">
            <div className="flex flex-col items-center gap-0.5 shrink-0 mt-1">
              {thread.isPinned && (
                <svg
                  className="w-3.5 h-3.5 text-accent"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-label="Pinned"
                >
                  <path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z" />
                </svg>
              )}
              {thread.isLocked && (
                <svg
                  className="w-3.5 h-3.5 text-text-secondary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-label="Locked"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              )}
            </div>
            <div className="min-w-0">
              <Link
                href={`/thread/${thread.id}`}
                className="forum-title-link inline-block font-bold text-text-dark transition-colors duration-200 line-clamp-2"
              >
                {thread.title}
              </Link>
              <p className="text-xs text-text-secondary mt-1.5">
                by{" "}
                <UserProfileLink
                  username={thread.author.username}
                  className="font-medium"
                />
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex col-span-1 items-center justify-center">
        <span className="text-sm font-semibold text-text-dark tabular-nums">
          {thread.replyCount}
        </span>
      </div>

      <div className="hidden lg:flex col-span-1 items-center justify-center">
        <span className="text-sm font-semibold text-text-dark tabular-nums">
          {thread.viewCount}
        </span>
      </div>

      <div className="hidden lg:flex col-span-2 items-center justify-center">
        <time
          dateTime={thread.createdAt.toISOString()}
          className="text-xs text-text-secondary"
        >
          {formatDate(thread.createdAt).split(",")[0]}
        </time>
      </div>

      <div className="col-span-12 lg:col-span-3 flex lg:items-center min-w-0 lg:text-right">
        {thread.latestReply ? (
          <div className="min-w-0 w-full">
            <p className="text-xs text-text-secondary">
              <UserProfileLink
                username={thread.latestReply.author.username}
                className="font-medium"
              />
              <span className="mx-1.5">·</span>
              <time dateTime={thread.latestReply.createdAt.toISOString()}>
                {formatRelativeDate(thread.latestReply.createdAt)}
              </time>
            </p>
          </div>
        ) : (
          <span className="text-xs text-text-muted italic">No replies</span>
        )}
        <div className="flex gap-4 mt-1 lg:hidden text-xs text-text-secondary">
          <span>{thread.replyCount} replies</span>
          <span>{thread.viewCount} views</span>
        </div>
      </div>
    </div>
  );
}

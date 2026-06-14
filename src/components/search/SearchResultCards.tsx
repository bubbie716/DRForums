import Link from "next/link";
import { RoleBadge } from "@/components/forum/RoleBadge";
import { UserAvatar } from "@/components/profile/UserAvatar";
import { highlightSearchTerms } from "@/lib/search/snippets";
import type {
  PostSearchResult,
  ThreadSearchResult,
  UserSearchResult,
} from "@/lib/search/types";
import { formatDate, formatRelativeDate } from "@/lib/utils";

function ForumBadge({
  categoryName,
  forumName,
}: {
  categoryName: string;
  forumName: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-yellow/40 text-accent-dark border border-yellow">
      {categoryName}
      <span className="text-text-secondary/60">/</span>
      {forumName}
    </span>
  );
}

export function ThreadSearchResultCard({
  result,
  query,
}: {
  result: ThreadSearchResult;
  query: string;
}) {
  return (
    <Link
      href={`/thread/${result.id}`}
      className="block bg-white border border-border rounded-2xl shadow-warm p-5 hover:bg-hover hover:shadow-warm-lg transition-all duration-200 group"
    >
      <div className="flex items-start gap-4">
        <UserAvatar
          seed={result.author.id}
          avatarUrl={result.author.avatarUrl}
          minecraftUsername={result.author.minecraftUsername}
          size={44}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <ForumBadge
              categoryName={result.category.name}
              forumName={result.forum.name}
            />
          </div>
          <h3 className="font-bold text-text-dark group-hover:text-accent transition-colors duration-200 line-clamp-2">
            {result.title}
          </h3>
          {result.snippet && (
            <p
              className="text-sm text-text-secondary mt-2 line-clamp-2"
              dangerouslySetInnerHTML={{
                __html: highlightSearchTerms(result.snippet, query),
              }}
            />
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-text-secondary">
            <span>
              by{" "}
              <span className="font-medium text-text-dark">
                {result.author.username}
              </span>
            </span>
            <span>
              <span className="font-semibold text-text-dark tabular-nums">
                {result.replyCount}
              </span>{" "}
              replies
            </span>
            <span>
              <span className="font-semibold text-text-dark tabular-nums">
                {result.viewCount}
              </span>{" "}
              views
            </span>
            <time dateTime={result.createdAt.toISOString()}>
              {formatRelativeDate(result.createdAt)}
            </time>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function PostSearchResultCard({
  result,
  query,
}: {
  result: PostSearchResult;
  query: string;
}) {
  return (
    <Link
      href={`/thread/${result.thread.id}#post-${result.id}`}
      className="block bg-white border border-border rounded-2xl shadow-warm p-5 hover:bg-hover hover:shadow-warm-lg transition-all duration-200 group"
    >
      <div className="flex items-start gap-4">
        <UserAvatar
          seed={result.author.id}
          avatarUrl={result.author.avatarUrl}
          minecraftUsername={result.author.minecraftUsername}
          size={44}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <ForumBadge
              categoryName={result.category.name}
              forumName={result.forum.name}
            />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            In thread
          </p>
          <h3 className="font-bold text-text-dark group-hover:text-accent transition-colors duration-200 line-clamp-1 mt-0.5">
            {result.thread.title}
          </h3>
          {result.snippet && (
            <p
              className="text-sm text-text-secondary mt-2 line-clamp-3"
              dangerouslySetInnerHTML={{
                __html: highlightSearchTerms(result.snippet, query),
              }}
            />
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-text-secondary">
            <span>
              by{" "}
              <span className="font-medium text-text-dark">
                {result.author.username}
              </span>
            </span>
            <time dateTime={result.createdAt.toISOString()}>
              {formatDate(result.createdAt)}
            </time>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function UserSearchResultCard({ result }: { result: UserSearchResult }) {
  return (
    <Link
      href={`/profile/${result.username}`}
      className="block bg-white border border-border rounded-2xl shadow-warm p-5 hover:bg-hover hover:shadow-warm-lg transition-all duration-200 group"
    >
      <div className="flex items-center gap-4">
        <UserAvatar
          seed={result.id}
          avatarUrl={result.avatarUrl}
          minecraftUsername={result.minecraftUsername}
          size={52}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-lg text-text-dark group-hover:text-accent transition-colors duration-200">
              {result.username}
            </h3>
            {result.displayRole && (
              <RoleBadge displayRole={result.displayRole} />
            )}
          </div>
          {result.minecraftUsername && (
            <p className="text-sm text-text-secondary mt-1">
              Minecraft:{" "}
              <span className="font-medium text-text-dark">
                {result.minecraftUsername}
              </span>
            </p>
          )}
          <p className="text-xs text-text-secondary mt-2">
            Joined {formatDate(result.createdAt)}
          </p>
        </div>
      </div>
    </Link>
  );
}

export const SEARCH_PAGE_SIZE = 20;
export const SEARCH_ALL_USERS_LIMIT = 5;

export type SearchType = "all" | "threads" | "posts" | "users";
export type SearchSort = "relevance" | "newest" | "oldest";

export type SearchForumOption = {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  categoryName: string;
};

export type SearchCategoryOption = {
  id: string;
  name: string;
};

export type ParsedSearchInput = {
  q: string;
  type: SearchType;
  sort: SearchSort;
  page: number;
  forumId?: string;
  categoryId?: string;
  from?: Date;
  to?: Date;
  includeHidden: boolean;
};

export type ThreadSearchResult = {
  kind: "thread";
  id: string;
  title: string;
  snippet: string;
  forum: { id: string; name: string; slug: string };
  category: { id: string; name: string };
  author: {
    id: string;
    username: string;
    minecraftUsername: string | null;
  };
  replyCount: number;
  viewCount: number;
  createdAt: Date;
  sortDate: Date;
};

export type PostSearchResult = {
  kind: "post";
  id: string;
  content: string;
  snippet: string;
  thread: { id: string; title: string };
  forum: { id: string; name: string; slug: string };
  category: { id: string; name: string };
  author: {
    id: string;
    username: string;
    minecraftUsername: string | null;
  };
  createdAt: Date;
  sortDate: Date;
};

export type UserSearchResult = {
  kind: "user";
  id: string;
  username: string;
  minecraftUsername: string | null;
  minecraftUuid: string | null;
  createdAt: Date;
  displayRole: { name: string; color: string | null } | null;
};

export type SearchResults = {
  query: string;
  type: SearchType;
  sort: SearchSort;
  page: number;
  pageSize: number;
  threads: ThreadSearchResult[];
  posts: PostSearchResult[];
  users: UserSearchResult[];
  totalThreads: number;
  totalPosts: number;
  totalUsers: number;
  totalPages: number;
};

export type SearchPageData = SearchResults & {
  forums: SearchForumOption[];
  categories: SearchCategoryOption[];
  canIncludeHidden: boolean;
  includeHidden: boolean;
};

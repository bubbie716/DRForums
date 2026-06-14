import { z } from "zod";
import type { ParsedSearchInput, SearchSort, SearchType } from "@/lib/search/types";

const SEARCH_TYPES = ["all", "threads", "posts", "users"] as const;
const SEARCH_SORTS = ["relevance", "newest", "oldest"] as const;

const optionalDate = z
  .string()
  .optional()
  .transform((value) => {
    if (!value?.trim()) {
      return undefined;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  });

export const searchParamsSchema = z
  .object({
    q: z
      .string()
      .optional()
      .transform((value) => (value ?? "").trim()),
    type: z.enum(SEARCH_TYPES).optional().default("all"),
    sort: z.enum(SEARCH_SORTS).optional().default("relevance"),
    page: z
      .string()
      .optional()
      .transform((value) => {
        const parsed = Number.parseInt(value ?? "1", 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
      }),
    forum: z.string().optional(),
    category: z.string().optional(),
    from: optionalDate,
    to: optionalDate,
    hidden: z
      .string()
      .optional()
      .transform((value) => value === "1" || value === "true"),
  })
  .superRefine((data, ctx) => {
    if (data.q.length > 0 && data.q.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Search must be at least 2 characters.",
        path: ["q"],
      });
    }

    if (data.q.length > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Search must be at most 100 characters.",
        path: ["q"],
      });
    }

    if (data.from && data.to && data.from > data.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Start date must be before end date.",
        path: ["from"],
      });
    }
  });

export type RawSearchParams = z.input<typeof searchParamsSchema>;

export function parseSearchParams(
  raw: RawSearchParams,
  options: { allowIncludeHidden?: boolean } = {}
): { success: true; data: ParsedSearchInput } | { success: false; error: string } {
  const parsed = searchParamsSchema.safeParse(raw);

  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ?? "Invalid search parameters.";
    return { success: false, error: message };
  }

  const data = parsed.data;

  return {
    success: true,
    data: {
      q: data.q,
      type: data.type as SearchType,
      sort: data.sort as SearchSort,
      page: data.page,
      forumId: data.forum?.trim() || undefined,
      categoryId: data.category?.trim() || undefined,
      from: data.from,
      to: data.to,
      includeHidden: options.allowIncludeHidden ? data.hidden : false,
    },
  };
}

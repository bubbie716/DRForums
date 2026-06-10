export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function generateThreadSlug(title: string): string {
  const base = slugify(title).slice(0, 60) || "thread";
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

export function generateForumSlug(name: string, categoryName?: string): string {
  const forumSlug = slugify(name);
  if (!categoryName) return forumSlug;
  return `${slugify(categoryName)}-${forumSlug}`;
}

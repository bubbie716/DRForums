export function getCategoryDeleteConfirmMessage(
  name: string,
  forumCount: number,
  threadCount: number
): string {
  if (forumCount === 0) {
    return `Delete category "${name}"? This cannot be undone.`;
  }

  const forumLabel =
    forumCount === 1 ? "1 subcategory" : `${forumCount} subcategories`;
  const threadLabel = threadCount === 1 ? "1 thread" : `${threadCount} threads`;

  return `Delete category "${name}"?\n\nThis will permanently delete ${forumLabel} and ${threadLabel} inside it, including all posts. This cannot be undone.`;
}

export function getCategoryDeleteSuccessMessage(
  name: string,
  forumCount: number,
  threadCount: number
): string {
  if (forumCount === 0) {
    return `Category "${name}" was deleted.`;
  }

  const forumLabel =
    forumCount === 1 ? "1 subcategory" : `${forumCount} subcategories`;
  const threadLabel = threadCount === 1 ? "1 thread" : `${threadCount} threads`;

  return `Category "${name}" was deleted along with ${forumLabel} and ${threadLabel}.`;
}

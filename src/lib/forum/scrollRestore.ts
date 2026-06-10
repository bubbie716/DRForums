const SCROLL_POSITION_KEY = "forum-index-scroll-y";
const SCROLL_RESTORE_FLAG_KEY = "forum-index-restore-scroll";

export function saveForumIndexScrollPosition(scrollY: number): void {
  sessionStorage.setItem(SCROLL_POSITION_KEY, String(scrollY));
}

export function markForumIndexScrollRestore(): void {
  sessionStorage.setItem(SCROLL_RESTORE_FLAG_KEY, "1");
}

export function consumeForumIndexScrollRestore(): number | null {
  if (sessionStorage.getItem(SCROLL_RESTORE_FLAG_KEY) !== "1") {
    return null;
  }

  sessionStorage.removeItem(SCROLL_RESTORE_FLAG_KEY);

  const saved = sessionStorage.getItem(SCROLL_POSITION_KEY);
  sessionStorage.removeItem(SCROLL_POSITION_KEY);

  if (!saved) {
    return null;
  }

  const scrollY = Number.parseInt(saved, 10);
  return Number.isFinite(scrollY) ? scrollY : null;
}

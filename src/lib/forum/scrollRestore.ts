const SCROLL_POSITION_KEY = "forum-index-scroll-y";
const FORUMS_RELATIVE_OFFSET_KEY = "forum-index-forums-offset-y";
const SCROLL_RESTORE_FLAG_KEY = "forum-index-restore-scroll";
const SCROLL_RESTORE_POSITION_KEY = "forum-index-restore-scroll-y";
const SCROLL_RESTORE_FORUMS_OFFSET_KEY = "forum-index-restore-forums-offset-y";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function saveForumIndexScrollPosition(scrollY: number): void {
  if (!isBrowser()) {
    return;
  }

  sessionStorage.setItem(SCROLL_POSITION_KEY, String(scrollY));

  const forums = document.getElementById("forums");
  if (forums) {
    sessionStorage.setItem(
      FORUMS_RELATIVE_OFFSET_KEY,
      String(Math.max(0, scrollY - forums.offsetTop))
    );
  }
}

export function isForumIndexScrollRestorePending(): boolean {
  if (!isBrowser()) {
    return false;
  }

  return sessionStorage.getItem(SCROLL_RESTORE_FLAG_KEY) === "1";
}

export function markForumIndexScrollRestore(): void {
  if (!isBrowser()) {
    return;
  }

  const savedScrollY = sessionStorage.getItem(SCROLL_POSITION_KEY);
  const savedForumsOffset = sessionStorage.getItem(FORUMS_RELATIVE_OFFSET_KEY);

  if (savedScrollY) {
    sessionStorage.setItem(SCROLL_RESTORE_POSITION_KEY, savedScrollY);
  }

  if (savedForumsOffset) {
    sessionStorage.setItem(
      SCROLL_RESTORE_FORUMS_OFFSET_KEY,
      savedForumsOffset
    );
  }

  sessionStorage.setItem(SCROLL_RESTORE_FLAG_KEY, "1");
}

export function getPendingForumIndexScrollRestore(): number | null {
  if (!isBrowser() || !isForumIndexScrollRestorePending()) {
    return null;
  }

  const forums = document.getElementById("forums");
  const forumsOffset = sessionStorage.getItem(SCROLL_RESTORE_FORUMS_OFFSET_KEY);

  if (forums && forumsOffset) {
    const relativeOffset = Number.parseInt(forumsOffset, 10);
    if (Number.isFinite(relativeOffset)) {
      return forums.offsetTop + relativeOffset;
    }
  }

  const savedScrollY = sessionStorage.getItem(SCROLL_RESTORE_POSITION_KEY);
  if (!savedScrollY) {
    return null;
  }

  const scrollY = Number.parseInt(savedScrollY, 10);
  return Number.isFinite(scrollY) ? scrollY : null;
}

export function clearForumIndexScrollRestore(): void {
  if (!isBrowser()) {
    return;
  }

  sessionStorage.removeItem(SCROLL_RESTORE_FLAG_KEY);
  sessionStorage.removeItem(SCROLL_RESTORE_POSITION_KEY);
  sessionStorage.removeItem(SCROLL_RESTORE_FORUMS_OFFSET_KEY);
}

export function restoreForumIndexScrollInstant(scrollY: number): void {
  if (!isBrowser()) {
    return;
  }

  const { documentElement: html, body } = document;
  const htmlBehavior = html.style.scrollBehavior;
  const bodyBehavior = body.style.scrollBehavior;
  const previousHistoryRestoration = history.scrollRestoration;

  html.style.scrollBehavior = "auto";
  body.style.scrollBehavior = "auto";
  history.scrollRestoration = "manual";
  window.scrollTo(0, scrollY);

  html.style.scrollBehavior = htmlBehavior;
  body.style.scrollBehavior = bodyBehavior;
  history.scrollRestoration = previousHistoryRestoration;
}

export function isForumIndexScrollRestoreReady(scrollY: number): boolean {
  if (!isBrowser()) {
    return false;
  }

  const maxScrollY = Math.max(
    0,
    document.documentElement.scrollHeight - window.innerHeight
  );

  return maxScrollY + 2 >= scrollY;
}

export function hasForumIndexScrollRestoreSettled(
  scrollY: number,
  tolerance = 12
): boolean {
  if (!isBrowser()) {
    return false;
  }

  return Math.abs(window.scrollY - scrollY) <= tolerance;
}

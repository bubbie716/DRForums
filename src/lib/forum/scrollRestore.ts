const SCROLL_POSITION_KEY = "forum-index-scroll-y";
const FORUMS_RELATIVE_OFFSET_KEY = "forum-index-forums-offset-y";
const FORUMS_ANCHOR_TOP_KEY = "forum-index-forums-anchor-top";
const SCROLL_RESTORE_FLAG_KEY = "forum-index-restore-scroll";
const SCROLL_RESTORE_POSITION_KEY = "forum-index-restore-scroll-y";
const SCROLL_RESTORE_FORUMS_OFFSET_KEY = "forum-index-restore-forums-offset-y";
const SCROLL_RESTORE_FORUMS_ANCHOR_TOP_KEY = "forum-index-restore-forums-anchor-top";

const FORUMS_LAYOUT_TOLERANCE_PX = 100;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function getForumsElement(): HTMLElement | null {
  return document.getElementById("forums");
}

function getForumsDocumentTop(forums: HTMLElement): number {
  return forums.getBoundingClientRect().top + window.scrollY;
}

function getMaxScrollY(): number {
  return Math.max(
    0,
    document.documentElement.scrollHeight - window.innerHeight
  );
}

function getForumsRelativeOffset(scrollY: number): number | null {
  const forums = getForumsElement();
  if (!forums) {
    return null;
  }

  return Math.max(0, scrollY - getForumsDocumentTop(forums));
}

function saveForumsAnchor(scrollY: number): void {
  const forums = getForumsElement();
  if (!forums) {
    return;
  }

  const relativeOffset = getForumsRelativeOffset(scrollY);
  if (relativeOffset === null || relativeOffset <= 0) {
    return;
  }

  sessionStorage.setItem(FORUMS_ANCHOR_TOP_KEY, String(getForumsDocumentTop(forums)));
  sessionStorage.setItem(FORUMS_RELATIVE_OFFSET_KEY, String(relativeOffset));
}

function isForumsLayoutSettled(forums: HTMLElement): boolean {
  const savedAnchor = sessionStorage.getItem(SCROLL_RESTORE_FORUMS_ANCHOR_TOP_KEY);
  if (!savedAnchor) {
    return true;
  }

  const anchor = Number.parseInt(savedAnchor, 10);
  if (!Number.isFinite(anchor) || anchor <= 0) {
    return true;
  }

  return (
    Math.abs(getForumsDocumentTop(forums) - anchor) <= FORUMS_LAYOUT_TOLERANCE_PX
  );
}

function withInstantScrollRestore(run: () => void): void {
  const { documentElement: html, body } = document;
  const htmlBehavior = html.style.scrollBehavior;
  const bodyBehavior = body.style.scrollBehavior;
  const previousHistoryRestoration = history.scrollRestoration;

  html.style.scrollBehavior = "auto";
  body.style.scrollBehavior = "auto";
  history.scrollRestoration = "manual";

  run();

  html.style.scrollBehavior = htmlBehavior;
  body.style.scrollBehavior = bodyBehavior;
  history.scrollRestoration = previousHistoryRestoration;
}

export function saveForumIndexScrollPosition(scrollY: number): void {
  if (!isBrowser() || scrollY <= 0) {
    return;
  }

  sessionStorage.setItem(SCROLL_POSITION_KEY, String(scrollY));
  saveForumsAnchor(scrollY);
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

  const savedScrollY = Number.parseInt(
    sessionStorage.getItem(SCROLL_POSITION_KEY) ?? "0",
    10
  );

  if (!Number.isFinite(savedScrollY) || savedScrollY <= 0) {
    return;
  }

  const restoreForumsOffset = sessionStorage.getItem(FORUMS_RELATIVE_OFFSET_KEY);
  let restoreForumsAnchorTop = sessionStorage.getItem(FORUMS_ANCHOR_TOP_KEY);

  if (!restoreForumsAnchorTop && restoreForumsOffset) {
    const relativeOffset = Number.parseInt(restoreForumsOffset, 10);
    if (Number.isFinite(relativeOffset) && relativeOffset > 0) {
      restoreForumsAnchorTop = String(savedScrollY - relativeOffset);
    }
  }

  sessionStorage.setItem(SCROLL_RESTORE_POSITION_KEY, String(savedScrollY));

  if (restoreForumsOffset !== null) {
    sessionStorage.setItem(
      SCROLL_RESTORE_FORUMS_OFFSET_KEY,
      restoreForumsOffset
    );
  }

  if (restoreForumsAnchorTop !== null) {
    sessionStorage.setItem(
      SCROLL_RESTORE_FORUMS_ANCHOR_TOP_KEY,
      restoreForumsAnchorTop
    );
  }

  sessionStorage.setItem(SCROLL_RESTORE_FLAG_KEY, "1");
}

export function getPendingForumIndexRelativeOffset(): number | null {
  if (!isBrowser() || !isForumIndexScrollRestorePending()) {
    return null;
  }

  const forumsOffset = sessionStorage.getItem(SCROLL_RESTORE_FORUMS_OFFSET_KEY);
  if (!forumsOffset) {
    return null;
  }

  const relativeOffset = Number.parseInt(forumsOffset, 10);
  return Number.isFinite(relativeOffset) && relativeOffset > 0
    ? relativeOffset
    : null;
}

export function getPendingForumIndexScrollRestore(): number | null {
  if (!isBrowser() || !isForumIndexScrollRestorePending()) {
    return null;
  }

  const relativeOffset = getPendingForumIndexRelativeOffset();
  if (relativeOffset !== null) {
    const forums = getForumsElement();
    if (!forums || !isForumsLayoutSettled(forums)) {
      return null;
    }

    return getForumsDocumentTop(forums) + relativeOffset;
  }

  const savedScrollY = sessionStorage.getItem(SCROLL_RESTORE_POSITION_KEY);
  if (!savedScrollY) {
    return null;
  }

  const scrollY = Number.parseInt(savedScrollY, 10);
  return Number.isFinite(scrollY) && scrollY > 0 ? scrollY : null;
}

export function clearForumIndexScrollRestore(): void {
  if (!isBrowser()) {
    return;
  }

  sessionStorage.removeItem(SCROLL_RESTORE_FLAG_KEY);
  sessionStorage.removeItem(SCROLL_RESTORE_POSITION_KEY);
  sessionStorage.removeItem(SCROLL_RESTORE_FORUMS_OFFSET_KEY);
  sessionStorage.removeItem(SCROLL_RESTORE_FORUMS_ANCHOR_TOP_KEY);
}

export function restoreForumIndexScrollInstant(scrollY: number): void {
  if (!isBrowser()) {
    return;
  }

  const maxScrollY = getMaxScrollY();
  const target = Math.min(Math.max(0, scrollY), maxScrollY);

  withInstantScrollRestore(() => {
    window.scrollTo(0, target);
  });
}

export function restoreForumIndexScrollByAnchor(): boolean {
  if (!isBrowser() || !isForumIndexScrollRestorePending()) {
    return false;
  }

  const relativeOffset = getPendingForumIndexRelativeOffset();
  const forums = getForumsElement();

  if (relativeOffset !== null && forums && isForumsLayoutSettled(forums)) {
    const forumsTop = getForumsDocumentTop(forums);
    const maxScrollY = getMaxScrollY();
    const target = Math.min(forumsTop + relativeOffset, maxScrollY);

    withInstantScrollRestore(() => {
      window.scrollTo(0, target);
    });

    return true;
  }

  const scrollY = getPendingForumIndexScrollRestore();
  if (scrollY === null) {
    return false;
  }

  restoreForumIndexScrollInstant(scrollY);
  return true;
}

export function isForumIndexScrollRestoreReady(scrollY: number): boolean {
  if (!isBrowser()) {
    return false;
  }

  return getMaxScrollY() + 2 >= scrollY;
}

export function hasForumIndexScrollRestoreSettled(
  scrollY: number,
  tolerance = 12
): boolean {
  if (!isBrowser()) {
    return false;
  }

  return (
    isForumIndexScrollRestoreReady(scrollY) &&
    Math.abs(window.scrollY - scrollY) <= tolerance
  );
}

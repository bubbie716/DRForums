export function restoreScrollPosition(scrollX: number, scrollY: number) {
  window.scrollTo(scrollX, scrollY);
  requestAnimationFrame(() => {
    window.scrollTo(scrollX, scrollY);
  });
}

export function preserveWindowScroll(action: () => void) {
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  action();
  restoreScrollPosition(scrollX, scrollY);
}

function syncElementHeight(element: HTMLElement, minHeightPx: number) {
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const currentHeight = element.offsetHeight;
  let nextHeight = Math.max(element.scrollHeight, minHeightPx);

  if (nextHeight < currentHeight) {
    element.style.height = "auto";
    nextHeight = Math.max(element.scrollHeight, minHeightPx);
  }

  if (Math.abs(nextHeight - currentHeight) < 1) {
    if (element.style.height === "auto" && currentHeight > 0) {
      element.style.height = `${currentHeight}px`;
    }
    return;
  }

  element.style.height = `${nextHeight}px`;
  restoreScrollPosition(scrollX, scrollY);
}

export function syncTextareaHeight(textarea: HTMLTextAreaElement) {
  syncElementHeight(textarea, 0);
}

export function syncEditableHeight(
  element: HTMLElement,
  minHeightPx = 0
) {
  syncElementHeight(element, minHeightPx);
}

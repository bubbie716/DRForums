const MIRROR_STYLE_PROPERTIES = [
  "direction",
  "box-sizing",
  "width",
  "height",
  "overflow-x",
  "overflow-y",
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "font-style",
  "font-variant",
  "font-weight",
  "font-stretch",
  "font-size",
  "font-size-adjust",
  "line-height",
  "font-family",
  "text-align",
  "text-transform",
  "text-indent",
  "text-decoration",
  "letter-spacing",
  "word-spacing",
  "tab-size",
] as const;

export function getTextareaCaretOffset(
  textarea: HTMLTextAreaElement,
  position: number
): { top: number; left: number } {
  const mirror = document.createElement("div");
  const computed = window.getComputedStyle(textarea);

  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.wordWrap = "break-word";
  mirror.style.overflow = "hidden";

  for (const property of MIRROR_STYLE_PROPERTIES) {
    mirror.style.setProperty(property, computed.getPropertyValue(property));
  }

  mirror.style.width = `${textarea.clientWidth}px`;

  const textBefore = textarea.value.slice(0, position);
  const textAfter = textarea.value.slice(position) || "\u200b";

  mirror.textContent = textBefore;

  const marker = document.createElement("span");
  marker.textContent = textAfter[0];
  mirror.appendChild(marker);

  document.body.appendChild(mirror);

  const top = marker.offsetTop - textarea.scrollTop;
  const left = marker.offsetLeft + marker.offsetWidth - textarea.scrollLeft;

  document.body.removeChild(mirror);

  return { top, left };
}

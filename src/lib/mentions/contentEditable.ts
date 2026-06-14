type TextPosition = {
  node: Text;
  offset: number;
};

function getTextNodes(root: HTMLElement): Text[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  let node = walker.nextNode();
  while (node) {
    nodes.push(node as Text);
    node = walker.nextNode();
  }

  return nodes;
}

export function getContentEditablePlainText(root: HTMLElement): string {
  return getTextNodes(root)
    .map((node) => node.textContent ?? "")
    .join("");
}

function findTextPosition(root: HTMLElement, targetOffset: number): TextPosition | null {
  const nodes = getTextNodes(root);
  let offset = 0;

  for (const node of nodes) {
    const length = node.textContent?.length ?? 0;

    if (offset + length >= targetOffset) {
      return {
        node,
        offset: targetOffset - offset,
      };
    }

    offset += length;
  }

  const lastNode = nodes[nodes.length - 1];
  if (lastNode) {
    return {
      node: lastNode,
      offset: lastNode.textContent?.length ?? 0,
    };
  }

  return null;
}

export function getContentEditableCaretOffset(root: HTMLElement): number | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer)) {
    return null;
  }

  const nodes = getTextNodes(root);
  let offset = 0;

  for (const node of nodes) {
    if (node === range.startContainer) {
      return offset + range.startOffset;
    }

    offset += node.textContent?.length ?? 0;
  }

  return offset;
}

export function getTextOffsetCaretRect(
  root: HTMLElement,
  textOffset: number
): DOMRect | null {
  const position = findTextPosition(root, textOffset);
  if (!position) {
    return null;
  }

  const range = document.createRange();
  range.setStart(position.node, position.offset);
  range.collapse(true);

  const rects = range.getClientRects();
  if (rects.length > 0) {
    return rects[rects.length - 1];
  }

  return range.getBoundingClientRect();
}

export function replaceTextRangeInContentEditable(
  root: HTMLElement,
  startOffset: number,
  endOffset: number,
  replacement: string
): void {
  const start = findTextPosition(root, startOffset);
  const end = findTextPosition(root, endOffset);

  if (!start || !end) {
    return;
  }

  const range = document.createRange();
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset);
  range.deleteContents();

  const textNode = document.createTextNode(replacement);
  range.insertNode(textNode);

  const selection = window.getSelection();
  if (!selection) {
    return;
  }

  const caretRange = document.createRange();
  caretRange.setStart(textNode, textNode.textContent?.length ?? 0);
  caretRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(caretRange);
}

"use client";

import { useId, useRef, useState } from "react";
import { formInputClassName } from "@/components/ui/fieldStyles";
import {
  DropdownPortal,
  dropdownPanelClassName,
  useAnchoredFixedPosition,
  useDismissOnOutside,
} from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";
import type { PostCategoryOption } from "@/components/forum/CreatePostForm";

type ForumPickerProps = {
  categories: PostCategoryOption[];
  value: string;
  onChange: (slug: string) => void;
};

function findForumLabel(categories: PostCategoryOption[], slug: string) {
  for (const category of categories) {
    const forum = category.forums.find((item) => item.slug === slug);
    if (forum) {
      return { categoryName: category.name, forumName: forum.name };
    }
  }
  return null;
}

export function ForumPicker({
  categories,
  value,
  onChange,
}: ForumPickerProps) {
  const listboxId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);

  const selected = findForumLabel(categories, value);
  const position = useAnchoredFixedPosition({
    anchorRef: triggerRef,
    enabled: open,
    maxHeight: 224,
  });

  useDismissOnOutside(open, () => setOpen(false), triggerRef, panelRef);

  function selectForum(slug: string) {
    onChange(slug);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          formInputClassName,
          "form-field-trigger flex items-center justify-between gap-3 text-left",
          open && "border-accent ring-2 ring-accent/20",
          !open && "hover:border-accent/40"
        )}
      >
        <span className="min-w-0">
          {selected ? (
            <>
              <span className="block text-sm font-semibold text-text-dark truncate">
                {selected.forumName}
              </span>
              <span className="block text-xs text-text-secondary truncate">
                {selected.categoryName}
              </span>
            </>
          ) : (
            <span className="text-text-muted">Choose a forum…</span>
          )}
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
          className={cn(
            "w-5 h-5 shrink-0 text-text-secondary transition-transform duration-200",
            open && "rotate-180"
          )}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.25a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && position && (
        <DropdownPortal>
          <ul
            ref={panelRef}
            id={listboxId}
            role="listbox"
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: position.width,
              maxHeight: position.maxHeight,
            }}
            className={cn(dropdownPanelClassName, "rounded-xl")}
          >
            {categories.map((category) => (
              <li key={category.name}>
                <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-text-secondary bg-surface border-b border-border/60 sticky top-0">
                  {category.name}
                </div>
                <ul>
                  {category.forums.map((forum) => {
                    const isSelected = forum.slug === value;

                    return (
                      <li key={forum.slug} role="option" aria-selected={isSelected}>
                        <button
                          type="button"
                          onMouseDown={() => selectForum(forum.slug)}
                          onTouchEnd={(event) => {
                            event.preventDefault();
                            selectForum(forum.slug);
                          }}
                          className={cn(
                            "flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors",
                            isSelected
                              ? "bg-yellow/30 text-accent-dark font-semibold"
                              : "text-text-dark hover:bg-hover"
                          )}
                        >
                          <span>{forum.name}</span>
                          {isSelected && (
                            <svg
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="w-4 h-4 shrink-0 text-accent"
                              aria-hidden="true"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.25 7.25a1 1 0 0 1-1.414 0l-3.25-3.25a1 1 0 1 1 1.414-1.414l2.543 2.543 6.543-6.543a1 1 0 0 1 1.414 0Z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </DropdownPortal>
      )}
    </div>
  );
}

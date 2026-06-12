"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  CreatePostForm,
  type PostCategoryOption,
} from "@/components/forum/CreatePostForm";
import { MinecraftLinkRequiredNotice } from "@/components/forum/MinecraftLinkRequiredNotice";

type PostButtonProps = {
  categories: PostCategoryOption[];
  isLoggedIn: boolean;
  canPost: boolean;
  canCreatePoll?: boolean;
};

export function PostButton({
  categories,
  isLoggedIn,
  canPost,
  canCreatePoll = false,
}: PostButtonProps) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const hasForums = categories.some((category) => category.forums.length > 0);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  function handleBackdropClick(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      setOpen(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!hasForums}
        className={cn(
          "w-full sm:w-auto shrink-0 min-h-11 px-8 py-3 bg-gradient-orange text-white font-bold rounded-xl hover:shadow-warm-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200",
          !hasForums && "opacity-60 cursor-not-allowed"
        )}
      >
        Post
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text-dark/40 backdrop-blur-sm"
          onClick={handleBackdropClick}
          role="presentation"
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-post-title"
            className="w-full max-w-2xl max-h-[90dvh] overflow-y-auto overflow-x-hidden bg-white border border-border rounded-2xl shadow-warm-lg p-4 sm:p-6 lg:p-8 [-webkit-overflow-scrolling:touch]"
          >
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2
                  id="create-post-title"
                  className="text-2xl font-extrabold text-text-dark"
                >
                  Create Post
                </h2>
                <p className="text-text-secondary mt-1">
                  Choose a forum and share your thoughts
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="shrink-0 inline-flex items-center justify-center min-h-11 min-w-11 rounded-xl text-text-secondary hover:bg-hover hover:text-text-dark transition-colors"
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-5 h-5"
                  aria-hidden="true"
                >
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            {!isLoggedIn ? (
              <div className="text-center py-8">
                <p className="text-text-secondary mb-6">
                  Sign in to create a post.
                </p>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="inline-flex px-8 py-3 bg-gradient-orange text-white font-bold rounded-xl hover:shadow-warm-lg transition-all duration-200"
                >
                  Log In
                </Link>
              </div>
            ) : canPost ? (
              <CreatePostForm
                categories={categories}
                canCreatePoll={canCreatePoll}
              />
            ) : (
              <MinecraftLinkRequiredNotice action="create threads" />
            )}
          </div>
        </div>
      )}
    </>
  );
}

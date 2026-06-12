"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { PublicFormRenderer } from "@/components/forms/PublicFormRenderer";
import type { PublicFormView } from "@/lib/form/types";

type FormForumSectionProps = {
  form: PublicFormView;
  isLoggedIn: boolean;
  editFormHref?: string;
};

export function FormForumSection({
  form,
  isLoggedIn,
  editFormHref,
}: FormForumSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!showForm) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowForm(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [showForm]);

  if (!form.isOpen && !showForm) {
    return (
      <p className="text-sm text-text-secondary font-medium">
        This form is closed and no longer accepting submissions.
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto shrink-0">
        {editFormHref ? (
          <Link
            href={editFormHref}
            className="w-full sm:w-auto inline-flex items-center justify-center min-h-11 px-6 py-3 text-sm font-semibold rounded-xl border border-border bg-white text-text-secondary hover:text-accent hover:border-accent/40 transition-colors"
          >
            Edit form
          </Link>
        ) : null}
        <button
          type="button"
          onClick={() => setShowForm(true)}
          disabled={!form.isOpen}
          className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center min-h-11 px-6 py-3 bg-gradient-orange text-white font-bold rounded-xl hover:shadow-warm-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-60"
        >
          {form.buttonLabel}
        </button>
      </div>

      {portalReady && showForm
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex flex-col bg-surface"
              role="dialog"
              aria-modal="true"
              aria-labelledby="form-fullscreen-title"
            >
              <header className="shrink-0 border-b border-border bg-cream/80 backdrop-blur-sm">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
                      New submission
                    </p>
                    <h2
                      id="form-fullscreen-title"
                      className="text-xl sm:text-2xl font-extrabold text-text-dark mt-1 break-words"
                    >
                      {form.title}
                    </h2>
                    {form.description ? (
                      <p className="text-sm text-text-secondary mt-2 leading-relaxed">
                        {form.description}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    aria-label="Close form"
                    className="shrink-0 inline-flex items-center justify-center min-h-11 min-w-11 rounded-xl text-text-secondary hover:bg-hover hover:text-text-dark transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-5 h-5"
                      aria-hidden="true"
                    >
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </button>
                </div>
              </header>

              <main className="flex-1 overflow-y-auto overflow-x-hidden [-webkit-overflow-scrolling:touch]">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 md:py-10 pb-12">
                  <PublicFormRenderer
                    form={form}
                    isLoggedIn={isLoggedIn}
                    variant="fullscreen"
                    onSubmitted={() => setShowForm(false)}
                    onCancel={() => setShowForm(false)}
                  />
                </div>
              </main>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

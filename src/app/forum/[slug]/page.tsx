import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUser, needsMinecraftLink } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { isFormsEnabled } from "@/lib/settings";
import { getForumBySlug, getForumThreads } from "@/lib/forum/queries";
import { getPublicFormByForumId } from "@/lib/form/queries";
import { FORM_CITIZEN_REQUIRED_MESSAGE } from "@/lib/form/types";
import {
  canCreateThread,
  canReadForum,
  canViewForum,
} from "@/lib/forumAccess";
import { Breadcrumbs } from "@/components/forum/Breadcrumbs";
import { FormForumSection } from "@/components/forum/FormForumSection";
import { ForumAccessRestricted } from "@/components/forum/ForumAccessRestricted";
import { ThreadRow } from "@/components/forum/ThreadRow";

type ForumPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: ForumPageProps): Promise<Metadata> {
  const { slug } = await params;
  const forum = await getForumBySlug(slug);
  return {
    title: forum ? forum.name : "Forum",
  };
}

export default async function ForumPage({ params }: ForumPageProps) {
  const { slug } = await params;
  const [forum, user] = await Promise.all([
    getForumBySlug(slug),
    getSessionUser(),
  ]);

  if (!forum) {
    notFound();
  }

  const [canView, canRead, formsEnabled] = await Promise.all([
    canViewForum(user?.id ?? null, forum.id),
    canReadForum(user?.id ?? null, forum.id),
    isFormsEnabled(),
  ]);

  if (!canView) {
    notFound();
  }

  if (!canRead) {
    return (
      <ForumAccessRestricted
        forumName={forum.name}
        categoryName={forum.category.name}
        canView
      />
    );
  }

  const form = formsEnabled
    ? await getPublicFormByForumId(forum.id)
    : null;

  const threads = await getForumThreads(forum.id, user?.id ?? null);
  const canCreate = user ? await canCreateThread(user.id, forum.id) : false;
  const canSubmitForm =
    !!form &&
    form.isOpen &&
    !!user &&
    !needsMinecraftLink(user) &&
    (await hasPermission(user.id, "form.respond"));
  const canEditForm =
    !!form && !!user && (await hasPermission(user.id, "form.create"));
  const editFormHref = canEditForm ? `/admin/forms/${form!.id}/edit` : null;

  const editFormButton = editFormHref ? (
    <Link
      href={editFormHref}
      className="w-full sm:w-auto inline-flex items-center justify-center min-h-11 px-6 py-3 text-sm font-semibold rounded-xl border border-border bg-white text-text-secondary hover:text-accent hover:border-accent/40 transition-colors"
    >
      Edit form
    </Link>
  ) : null;

  return (
    <div className="bg-surface min-h-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 lg:py-14">
        <Breadcrumbs
          items={[
            { label: "Forums", href: "/", restoreScroll: true },
            { label: forum.category.name },
            { label: forum.name },
          ]}
        />

        <div className="mt-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-text-dark break-words">
                {forum.name}
              </h1>
              {forum.isLocked && (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-surface text-text-secondary border border-border">
                  Locked
                </span>
              )}
            </div>
            {forum.description && (
              <p className="text-text-secondary mt-2 max-w-2xl leading-relaxed">
                {forum.description}
              </p>
            )}
          </div>

          {form ? (
            user ? (
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto shrink-0 sm:items-center">
                {!canSubmitForm ? editFormButton : null}
                {forum.isLocked ? (
                  <p className="text-sm text-text-secondary font-medium">
                    This forum is locked. No new submissions can be created.
                  </p>
                ) : needsMinecraftLink(user) ? (
                  <Link
                    href="/settings"
                    className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center min-h-11 px-6 py-3 bg-yellow text-text-dark font-bold rounded-xl hover:shadow-warm hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                  >
                    Link Minecraft to Post
                  </Link>
                ) : canSubmitForm ? (
                  <FormForumSection
                    form={form}
                    isLoggedIn
                    editFormHref={editFormHref ?? undefined}
                  />
                ) : (
                  <p className="text-sm text-text-secondary font-medium max-w-sm">
                    {FORM_CITIZEN_REQUIRED_MESSAGE}
                  </p>
                )}
              </div>
            ) : (
              <Link
                href={`/login?next=/forum/${forum.slug}`}
                className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center min-h-11 px-6 py-3 bg-gradient-orange text-white font-bold rounded-xl hover:shadow-warm-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                Sign in to {form.buttonLabel.toLowerCase()}
              </Link>
            )
          ) : user ? (
            forum.isLocked ? (
              <p className="text-sm text-text-secondary font-medium">
                This forum is locked. No new threads can be created.
              </p>
            ) : needsMinecraftLink(user) ? (
              <Link
                href="/settings"
                className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center min-h-11 px-6 py-3 bg-yellow text-text-dark font-bold rounded-xl hover:shadow-warm hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                Link Minecraft to Post
              </Link>
            ) : !canCreate ? (
              <p className="text-sm text-text-secondary font-medium">
                You do not have permission to create threads here.
              </p>
            ) : (
              <Link
                href={`/forum/${forum.slug}/new`}
                className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center min-h-11 px-6 py-3 bg-gradient-orange text-white font-bold rounded-xl hover:shadow-warm-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                Create Thread
              </Link>
            )
          ) : null}
        </div>

        <div className="mt-8 bg-cream border border-border rounded-2xl shadow-warm overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-4 px-4 md:px-6 py-3.5 bg-surface border-b border-border text-xs font-bold text-text-secondary uppercase tracking-widest">
            <div className="col-span-5">
              {form ? "Submission" : "Thread"}
            </div>
            <div className="col-span-1 text-center">Replies</div>
            <div className="col-span-1 text-center">Views</div>
            <div className="col-span-2 text-center">Started</div>
            <div className="col-span-3 text-right">Last Reply</div>
          </div>

          {threads.length > 0 ? (
            threads.map((thread) => (
              <ThreadRow key={thread.id} thread={thread} />
            ))
          ) : (
            <div className="px-6 py-16 text-center">
              <p className="text-text-secondary">
                {form ? "No submissions yet." : "No threads yet."}
              </p>
              {user &&
                !forum.isLocked &&
                (form ? (
                  needsMinecraftLink(user) ? (
                    <Link
                      href="/settings"
                      className="inline-block mt-4 text-accent font-semibold hover:underline"
                    >
                      Link Minecraft to submit the first form
                    </Link>
                  ) : canSubmitForm ? (
                    <p className="mt-4 text-sm text-text-secondary">
                      Use the {form.buttonLabel.toLowerCase()} button above to
                      submit.
                    </p>
                  ) : null
                ) : needsMinecraftLink(user) ? (
                  <Link
                    href="/settings"
                    className="inline-block mt-4 text-accent font-semibold hover:underline"
                  >
                    Link Minecraft to start the first discussion
                  </Link>
                ) : canCreate ? (
                  <Link
                    href={`/forum/${forum.slug}/new`}
                    className="inline-block mt-4 text-accent font-semibold hover:underline"
                  >
                    Start the first discussion
                  </Link>
                ) : null)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

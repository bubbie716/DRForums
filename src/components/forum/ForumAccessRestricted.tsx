import Link from "next/link";

type ForumAccessRestrictedProps = {
  forumName: string;
  categoryName: string;
  canView: boolean;
};

export function ForumAccessRestricted({
  forumName,
  categoryName,
  canView,
}: ForumAccessRestrictedProps) {
  return (
    <div className="bg-surface min-h-full">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 lg:py-14">
        <div className="bg-white border border-border rounded-2xl shadow-warm px-6 py-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto mb-5 text-text-secondary">
            <svg
              className="w-7 h-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-extrabold text-text-dark break-words">
            {canView ? "Access Restricted" : "Forum Not Found"}
          </h1>

          {canView ? (
            <>
              <p className="mt-3 text-text-secondary leading-relaxed">
                You can see that <span className="font-semibold">{forumName}</span>{" "}
                in <span className="font-semibold">{categoryName}</span> exists, but
                you do not have permission to read threads in this forum.
              </p>
              <Link
                href="/"
                className="inline-flex items-center justify-center mt-6 min-h-11 px-6 py-3 bg-gradient-orange text-white font-bold rounded-xl hover:shadow-warm-lg transition-all duration-200"
              >
                Back to Forums
              </Link>
            </>
          ) : (
            <p className="mt-3 text-text-secondary">
              This forum is not available to your account.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

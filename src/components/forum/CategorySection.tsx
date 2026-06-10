import { ForumRow } from "./ForumRow";
import type { ForumIndexCategory } from "@/lib/forum/queries";

type CategorySectionProps = {
  category: ForumIndexCategory;
};

export function CategorySection({ category }: CategorySectionProps) {
  return (
    <section className="bg-cream border border-border rounded-2xl shadow-warm overflow-hidden">
      <div className="px-7 py-6 flex items-center justify-between gap-6 border-b border-border bg-gradient-to-r from-cream via-surface to-yellow/20">
        <div className="flex items-center gap-5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-orange flex items-center justify-center text-white shrink-0 shadow-warm">
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
              />
            </svg>
          </div>
          <h2 className="font-extrabold text-text-dark text-xl min-w-0">
            {category.name}
          </h2>
        </div>
      </div>

      <div className="hidden sm:grid grid-cols-12 gap-4 px-7 py-3.5 bg-surface border-b border-border text-xs font-bold text-text-secondary uppercase tracking-widest">
        <div className="col-span-5">Title</div>
        <div className="col-span-1 text-center">Threads</div>
        <div className="col-span-1 text-center">Posts</div>
        <div className="col-span-5 text-right">Latest Post</div>
      </div>

      {category.forums.length > 0 ? (
        category.forums.map((forum) => (
          <ForumRow key={forum.id} forum={forum} />
        ))
      ) : (
        <div className="px-7 py-14 text-center text-text-secondary text-sm">
          No forums in this category yet.
        </div>
      )}
    </section>
  );
}

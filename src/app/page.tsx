import { getForumIndex } from "@/lib/forum/queries";
import { CategorySection } from "@/components/forum/CategorySection";
import { PostButton } from "@/components/forum/PostButton";
import { HeroSection } from "@/components/home/HeroSection";
import { ForumScrollTracker } from "@/components/forum/ForumScrollTracker";
import { canPost, getSessionUser } from "@/lib/auth";

export default async function ForumIndexPage() {
  const [categories, user] = await Promise.all([
    getForumIndex(),
    getSessionUser(),
  ]);

  const postCategories = categories
    .map((category) => ({
      name: category.name,
      forums: category.forums.map((forum) => ({
        slug: forum.slug,
        name: forum.name,
      })),
    }))
    .filter((category) => category.forums.length > 0);

  return (
    <>
      <ForumScrollTracker />
      <HeroSection />

      <div id="forums" className="bg-surface scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-14 lg:py-20">
          <div className="mb-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">
                Community
              </p>
              <h2 className="text-3xl font-extrabold text-text-dark">
                Explore the Forums
              </h2>
              <p className="text-text-secondary mt-3 max-w-2xl text-lg leading-relaxed">
                Browse departments, city services, and community boards. Select
                a forum to view threads and join the discussion.
              </p>
            </div>
            <PostButton
              categories={postCategories}
              isLoggedIn={!!user}
              canPost={user ? canPost(user) : false}
            />
          </div>

          {categories.length > 0 ? (
            <div className="space-y-8">
              {categories.map((category) => (
                <CategorySection key={category.id} category={category} />
              ))}
            </div>
          ) : (
            <div className="bg-cream border border-border rounded-2xl px-10 py-24 text-center shadow-warm">
              <div className="w-16 h-16 rounded-2xl bg-yellow/50 border-2 border-accent/40 flex items-center justify-center mx-auto mb-6 text-accent">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-text-dark mb-2">
                No forums yet
              </h3>
              <p className="text-text-secondary max-w-md mx-auto">
                The forum structure hasn&apos;t been set up yet. Run the database
                seed to populate categories and forums.
              </p>
              <code className="inline-block mt-6 px-5 py-2.5 text-sm bg-yellow/30 border border-border rounded-xl text-text-secondary font-mono">
                npm run db:seed
              </code>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

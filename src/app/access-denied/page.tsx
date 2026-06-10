import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export default async function AccessDeniedPage() {
  const user = await getSessionUser();

  if (user && (await hasPermission(user.id, "admin.dashboard.view"))) {
    redirect("/admin");
  }

  return (
    <div className="bg-surface min-h-full">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="bg-white border border-border rounded-2xl shadow-warm px-6 py-10 md:px-10 md:py-12 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">
            Access Denied
          </p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-text-dark">
            You can&apos;t access this page
          </h1>
          <p className="mt-4 text-text-secondary leading-relaxed">
            Your account doesn&apos;t have access here. Ask an admin if you think
            you should.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center min-h-11 mt-8 px-6 py-3 bg-gradient-orange text-white font-bold rounded-xl hover:shadow-warm-lg transition-all duration-200"
          >
            Back to Forums
          </Link>
        </div>
      </div>
    </div>
  );
}

import { AuthBrand } from "./AuthBrand";

type AuthCardProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
};

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="w-full max-w-[440px]">
      <div className="mb-6 sm:mb-10">
        <AuthBrand />
      </div>

      <div className="bg-white border border-border rounded-2xl shadow-warm-lg overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-accent via-yellow to-accent" aria-hidden="true" />

        <div className="px-4 sm:px-8 pt-7 sm:pt-9 pb-7 sm:pb-9">
          <div className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-extrabold text-text-dark">{title}</h2>
            <p className="text-sm text-text-secondary mt-2">{subtitle}</p>
          </div>

          {children}
        </div>

        <div className="px-4 sm:px-8 py-4 sm:py-5 border-t border-border bg-surface text-center text-sm text-text-secondary">
          {footer}
        </div>
      </div>
    </div>
  );
}

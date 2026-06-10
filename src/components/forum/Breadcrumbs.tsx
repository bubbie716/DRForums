import Link from "next/link";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center gap-2 text-sm text-text-secondary flex-wrap">
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-2">
          {index > 0 && <span className="text-border">/</span>}
          {item.href ? (
            <Link
              href={item.href}
              className="hover:text-accent transition-colors font-medium"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-text-dark font-semibold">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

type AdminPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export function AdminPageHeader({
  eyebrow = "Administration",
  title,
  description,
  actions,
}: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-2">
          {eyebrow}
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-text-dark">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 text-text-secondary max-w-2xl leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0 flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}

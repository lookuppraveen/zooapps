import { cn } from "@/lib/utils";

type PageContainerProps = {
  children: React.ReactNode;
  className?: string;
  title?: string;
  eyebrow?: string;
  description?: string;
  actions?: React.ReactNode;
};

export function PageContainer({
  children,
  className,
  title,
  eyebrow,
  description,
  actions,
}: PageContainerProps) {
  return (
    <div className={cn("mx-auto w-full max-w-7xl px-6 py-6", className)}>
      {(title || eyebrow || description || actions) && (
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            {eyebrow && (
              <p className="text-xs font-medium uppercase tracking-wide text-brand">{eyebrow}</p>
            )}
            {title && (
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-nav">
                {title}
              </h1>
            )}
            {description && (
              <p className="mt-1 max-w-2xl text-sm text-slate-600">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

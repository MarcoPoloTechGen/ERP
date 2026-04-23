import type { PropsWithChildren, ReactNode } from "react";
import { useLang } from "@/lib/i18n";

export const controlClassName =
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Card({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return (
    <section
      className={`rounded-2xl border border-card-border bg-card shadow-sm ${className}`.trim()}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}

export function ErrorState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-6 py-8">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function PrimaryButton({
  children,
  type = "button",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  type = "button",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60 ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

export function IconButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  error,
  required,
  children,
}: PropsWithChildren<{ label: string; error?: string | null; required?: boolean }>) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </label>
  );
}

export function PaginationControls({
  page,
  pageCount,
  total,
  itemLabel,
  onPageChange,
  previousLabel,
  nextLabel,
}: {
  page: number;
  pageCount: number;
  total: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
  previousLabel?: string;
  nextLabel?: string;
}) {
  const { t } = useLang();

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {total} {itemLabel}
      </p>
      <div className="flex items-center gap-2">
        <SecondaryButton onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          {previousLabel ?? t.previous}
        </SecondaryButton>
        <span className="min-w-[90px] text-center text-sm text-foreground">
          {page} / {pageCount}
        </span>
        <SecondaryButton onClick={() => onPageChange(page + 1)} disabled={page >= pageCount}>
          {nextLabel ?? t.next}
        </SecondaryButton>
      </div>
    </div>
  );
}

export function Modal({
  title,
  children,
  onClose,
}: PropsWithChildren<{ title: string; onClose: () => void }>) {
  const { t } = useLang();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-card-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <IconButton onClick={onClose} aria-label={t.close}>
            x
          </IconButton>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

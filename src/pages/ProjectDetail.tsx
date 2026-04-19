import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { ArrowLeft, FileText } from "lucide-react";
import { Card, EmptyState } from "@/components/ui-kit";
import { erpKeys, getProject, listInvoices } from "@/lib/erp";
import { formatCurrency, formatDate, statusColors } from "@/lib/format";
import { useLang } from "@/lib/i18n";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const { t } = useLang();

  const { data: project, isLoading } = useQuery({
    queryKey: erpKeys.project(projectId),
    queryFn: () => getProject(projectId),
    enabled: Number.isFinite(projectId),
  });

  const { data: invoices } = useQuery({
    queryKey: erpKeys.invoices,
    queryFn: listInvoices,
  });

  const relatedInvoices = invoices?.filter((invoice) => invoice.projectId === projectId) ?? [];

  if (isLoading || !project) {
    return isLoading ? (
      <div className="h-32 animate-pulse rounded-2xl border border-card-border bg-card" />
    ) : (
      <EmptyState title={t.notFound} />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/projects">
          <div className="cursor-pointer rounded-xl border border-border bg-background p-2 text-foreground transition hover:bg-muted">
            <ArrowLeft size={18} />
          </div>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-semibold text-foreground">{project.name}</h1>
            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusColors(project.status)}`}>
              {t[project.status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{project.client ?? t.noClient}</p>
        </div>
      </div>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-foreground">{t.projectInfo}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">{t.location}</p>
            <p className="mt-1 text-sm font-medium text-foreground">{project.location ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t.budget}</p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {project.budget != null ? formatCurrency(project.budget) : "-"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t.startDate}</p>
            <p className="mt-1 text-sm font-medium text-foreground">{formatDate(project.startDate)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t.endDate}</p>
            <p className="mt-1 text-sm font-medium text-foreground">{formatDate(project.endDate)}</p>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <FileText size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">{t.relatedInvoices_count(relatedInvoices.length)}</h2>
        </div>

        {!relatedInvoices.length ? (
          <div className="p-5">
            <EmptyState title={t.noInvoicesForProject} />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {relatedInvoices.map((invoice) => (
              <Link href={`/invoices/${invoice.id}`} key={invoice.id}>
                <div className="cursor-pointer px-5 py-4 transition hover:bg-muted/40">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{invoice.number}</p>
                      <p className="text-xs text-muted-foreground">
                        {invoice.supplierName ?? t.noSupplier} · {formatDate(invoice.invoiceDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(invoice.totalAmount)}</p>
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusColors(invoice.status)}`}>
                        {t[invoice.status]}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

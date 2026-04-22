import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { ArrowLeft, FileText } from "lucide-react";
import { Card, EmptyState } from "@/components/ui-kit";
import { erpKeys, getProject, listInvoices, listProjectBuildings } from "@/lib/erp";
import { formatCurrency, formatDate, statusColors } from "@/lib/format";
import { useLang } from "@/lib/i18n";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const { t } = useLang();
  const buildingsTitle = t.buildingsTitle ?? "Buildings";
  const noBuildings = t.noBuildings ?? "No buildings configured for this project.";
  const buildingCountLabel = t.building_count ?? ((count: number) => `${count} building${count > 1 ? "s" : ""}`);
  const projectGlobalCost = t.projectGlobalCost ?? "Project global cost";

  const { data: project, isLoading } = useQuery({
    queryKey: erpKeys.project(projectId),
    queryFn: () => getProject(projectId),
    enabled: Number.isFinite(projectId),
  });

  const { data: invoices } = useQuery({
    queryKey: erpKeys.invoices,
    queryFn: listInvoices,
  });

  const { data: buildings } = useQuery({
    queryKey: erpKeys.projectBuildings(projectId),
    queryFn: () => listProjectBuildings(projectId),
    enabled: Number.isFinite(projectId),
  });

  const relatedInvoices = invoices?.filter((invoice) => invoice.projectId === projectId) ?? [];
  const globalInvoices = relatedInvoices.filter((invoice) => invoice.buildingId == null);

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
          <div>
            <p className="text-xs text-muted-foreground">{buildingsTitle}</p>
            <p className="mt-1 text-sm font-medium text-foreground">{buildingCountLabel(buildings?.length ?? 0)}</p>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">{buildingsTitle}</h2>
        </div>

        {!buildings?.length ? (
          <div className="p-5">
            <EmptyState title={noBuildings} />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {buildings.map((building) => {
              const buildingInvoices = relatedInvoices.filter((invoice) => invoice.buildingId === building.id);
              const total = buildingInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);

              return (
                <div key={building.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{building.name}</p>
                      <p className="text-xs text-muted-foreground">{t.relatedInvoices_count(buildingInvoices.length)}</p>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(total)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <FileText size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
            {`${relatedInvoices.length} expenses`}
          </h2>
        </div>

        {!relatedInvoices.length ? (
          <div className="p-5">
            <EmptyState title="No expenses for this project" />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {globalInvoices.length ? (
              <div className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {projectGlobalCost}
              </div>
            ) : null}
            {relatedInvoices.map((invoice) => (
              <Link href={`/expenses/${invoice.id}`} key={invoice.id}>
                <div className="cursor-pointer px-5 py-4 transition hover:bg-muted/40">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{invoice.number}</p>
                      <p className="text-xs text-muted-foreground">
                        {[invoice.supplierName ?? t.noSupplier, invoice.buildingName ?? projectGlobalCost, formatDate(invoice.invoiceDate)]
                          .filter(Boolean)
                          .join(" | ")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">
                        {formatCurrency(invoice.totalAmount, invoice.currency)}
                      </p>
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

import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { AlertTriangle, Banknote, FolderKanban, Truck, Users } from "lucide-react";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui-kit";
import { erpKeys, getDashboardOverview } from "@/lib/erp";
import { formatCurrency, statusColors } from "@/lib/format";
import { useLang } from "@/lib/i18n";

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{value}</p>
        </div>
        <div className={`rounded-2xl p-3 ${accent}`}>
          <Icon size={20} />
        </div>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { t } = useLang();
  const { data, isLoading } = useQuery({
    queryKey: erpKeys.dashboard,
    queryFn: getDashboardOverview,
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title={t.dashboardTitle} subtitle={t.dashboardSub} />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-2xl border border-card-border bg-card" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t.dashboardTitle} subtitle={t.dashboardSub} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t.totalWorkers}
          value={data.totalWorkers}
          icon={Users}
          accent="bg-amber-100 text-amber-800"
        />
        <StatCard
          label={t.activeProjects}
          value={data.activeProjects}
          icon={FolderKanban}
          accent="bg-sky-100 text-sky-800"
        />
        <StatCard
          label={t.totalSuppliers}
          value={data.totalSuppliers}
          icon={Truck}
          accent="bg-emerald-100 text-emerald-800"
        />
        <StatCard
          label={t.unpaidInvoices}
          value={data.invoicesUnpaid}
          icon={AlertTriangle}
          accent="bg-rose-100 text-rose-800"
        />
      </div>

      <Card>
        <CardHeader title={t.financialSummary} subtitle={t.paymentProgress} />
        <div className="space-y-6 px-5 py-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-muted/60 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {t.totalInvoiced}
              </p>
              <p className="mt-2 text-xl font-semibold text-foreground">
                {formatCurrency(data.totalInvoiceAmount)}
              </p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-emerald-700">{t.amountPaid}</p>
              <p className="mt-2 text-xl font-semibold text-emerald-800">
                {formatCurrency(data.totalPaidAmount)}
              </p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-amber-700">{t.remaining}</p>
              <p className="mt-2 text-xl font-semibold text-amber-900">
                {formatCurrency(data.remainingAmount)}
              </p>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
              <span>{t.paymentProgress}</span>
              <span>
                {data.totalInvoiceAmount > 0
                  ? Math.round((data.totalPaidAmount / data.totalInvoiceAmount) * 100)
                  : 0}
                %
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width: `${Math.min(
                    100,
                    data.totalInvoiceAmount > 0
                      ? (data.totalPaidAmount / data.totalInvoiceAmount) * 100
                      : 0,
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="overflow-hidden">
          <CardHeader title={t.projectsSummary} />
          {data.projectsSummary.length === 0 ? (
            <div className="p-5">
              <EmptyState title={t.noneYet} />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {data.projectsSummary.slice(0, 6).map((project) => (
                <Link href={`/projects/${project.id}`} key={project.id}>
                  <div className="cursor-pointer px-5 py-4 transition hover:bg-muted/40">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{project.name}</p>
                        <span
                          className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusColors(project.status)}`}
                        >
                          {t[project.status]}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">{formatCurrency(project.totalInvoiced)}</p>
                        <p className="text-xs text-muted-foreground">
                          {project.invoiceCount} invoices
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="overflow-hidden">
          <CardHeader title={t.workersSummary} />
          {data.workersSummary.length === 0 ? (
            <div className="p-5">
              <EmptyState title={t.noneYet} />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {data.workersSummary.slice(0, 6).map((worker) => (
                <Link href={`/workers/${worker.id}`} key={worker.id}>
                  <div className="cursor-pointer px-5 py-4 transition hover:bg-muted/40">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{worker.name}</p>
                        <p className="text-xs text-muted-foreground">{worker.role}</p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-semibold ${
                            worker.balance >= 0 ? "text-emerald-700" : "text-rose-700"
                          }`}
                        >
                          {formatCurrency(worker.balance)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(worker.totalCredit)} / {formatCurrency(worker.totalDebit)}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="overflow-hidden">
          <CardHeader title={t.invoicesSummary} />
          {data.invoicesSummary.length === 0 ? (
            <div className="p-5">
              <EmptyState title={t.noneYet} />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {data.invoicesSummary.slice(0, 6).map((invoice) => (
                <Link href={`/expenses/${invoice.id}`} key={invoice.id}>
                  <div className="cursor-pointer px-5 py-4 transition hover:bg-muted/40">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-foreground">{invoice.number}</p>
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusColors(invoice.status)}`}
                          >
                            {t[invoice.status]}
                          </span>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {invoice.supplierName ?? t.noSupplier}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">
                          {formatCurrency(invoice.totalAmount)}
                        </p>
                        <p className="text-xs text-rose-700">
                          {formatCurrency(invoice.remaining)}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-primary/10 p-3 text-primary">
            <Banknote size={20} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Vercel and Supabase are connected
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              The data layer is centralized. Pages now use the same mappings and field conventions,
              which reduces bugs caused by mismatched columns.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

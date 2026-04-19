import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { ArrowLeft, CheckCircle2, Image as ImageIcon } from "lucide-react";
import { Card, EmptyState, PrimaryButton } from "@/components/ui-kit";
import { erpKeys, getInvoice, markInvoicePaid } from "@/lib/erp";
import { formatCurrency, formatDate, statusColors } from "@/lib/format";
import { useLang } from "@/lib/i18n";

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const invoiceId = Number(id);
  const { t } = useLang();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const { data: invoice, isLoading } = useQuery({
    queryKey: erpKeys.invoice(invoiceId),
    queryFn: () => getInvoice(invoiceId),
    enabled: Number.isFinite(invoiceId),
  });

  const markPaidMutation = useMutation({
    mutationFn: async () => {
      if (!invoice) {
        return;
      }
      await markInvoicePaid(invoice.id, invoice.totalAmount);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: erpKeys.invoice(invoiceId) }),
        queryClient.invalidateQueries({ queryKey: erpKeys.invoices }),
        queryClient.invalidateQueries({ queryKey: erpKeys.dashboard }),
      ]);
    },
  });

  if (isLoading || !invoice) {
    return isLoading ? (
      <div className="h-32 animate-pulse rounded-2xl border border-card-border bg-card" />
    ) : (
      <EmptyState title={t.notFound} />
    );
  }

  const remaining = Math.max(0, invoice.totalAmount - invoice.paidAmount);
  const progress = invoice.totalAmount > 0 ? Math.min(100, (invoice.paidAmount / invoice.totalAmount) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/invoices">
          <div className="cursor-pointer rounded-xl border border-border bg-background p-2 text-foreground transition hover:bg-muted">
            <ArrowLeft size={18} />
          </div>
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-semibold text-foreground">{invoice.number}</h1>
            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusColors(invoice.status)}`}>
              {t[invoice.status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{invoice.supplierName ?? t.noSupplier}</p>
        </div>

        {invoice.status !== "paid" ? (
          <PrimaryButton onClick={() => markPaidMutation.mutate()} disabled={markPaidMutation.isPending}>
            <CheckCircle2 size={16} />
            {t.markPaid}
          </PrimaryButton>
        ) : null}
      </div>

      {invoice.imageUrl ? (
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <ImageIcon size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">{t.invoiceImage}</h2>
          </div>
          <img
            src={invoice.imageUrl}
            alt={t.invoiceImage}
            onClick={() => setExpanded((current) => !current)}
            className={`cursor-zoom-in rounded-2xl border border-border object-contain transition ${
              expanded ? "max-h-[70vh] w-full" : "max-h-56"
            }`}
          />
        </Card>
      ) : null}

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-foreground">{t.invoiceDetails}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">{t.supplierOption}</p>
            <p className="mt-1 text-sm font-medium text-foreground">{invoice.supplierName ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t.projectOption}</p>
            <p className="mt-1 text-sm font-medium text-foreground">{invoice.projectName ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t.invoiceDate}</p>
            <p className="mt-1 text-sm font-medium text-foreground">{formatDate(invoice.invoiceDate)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t.dueDate}</p>
            <p className="mt-1 text-sm font-medium text-foreground">{formatDate(invoice.dueDate)}</p>
          </div>
        </div>

        {invoice.notes ? (
          <div className="mt-4">
            <p className="text-xs text-muted-foreground">{t.notes}</p>
            <p className="mt-1 text-sm text-foreground">{invoice.notes}</p>
          </div>
        ) : null}
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-foreground">{t.financialSummaryInv}</h2>
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between rounded-2xl bg-muted/60 px-4 py-3">
            <span className="text-sm text-muted-foreground">{t.totalAmount}</span>
            <span className="text-sm font-semibold text-foreground">{formatCurrency(invoice.totalAmount)}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3">
            <span className="text-sm text-emerald-700">{t.alreadyPaid}</span>
            <span className="text-sm font-semibold text-emerald-800">{formatCurrency(invoice.paidAmount)}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-amber-50 px-4 py-3">
            <span className="text-sm text-amber-700">{t.remaining_label}</span>
            <span className="text-sm font-semibold text-amber-900">{formatCurrency(remaining)}</span>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
              <span>{t.progress}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

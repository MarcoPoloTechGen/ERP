import { useQuery } from "@tanstack/react-query";
import { erpKeys, listInvoiceHistory, listInvoices } from "@/lib/erp";

export function useInvoices() {
  return useQuery({
    queryKey: erpKeys.invoices,
    queryFn: listInvoices,
  });
}

export function useInvoiceHistory(invoiceId: number | null | undefined) {
  return useQuery({
    queryKey: invoiceId == null ? ["invoice", "history", "missing"] : erpKeys.invoiceHistory(invoiceId),
    queryFn: () => listInvoiceHistory(invoiceId ?? 0),
    enabled: invoiceId != null,
  });
}

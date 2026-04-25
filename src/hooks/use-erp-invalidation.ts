import { useMemo } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { erpKeys } from "@/lib/erp/shared";

const allProjectBuildingsKey = ["projectBuildings"] as const;

function invalidateGroup(queryClient: ReturnType<typeof useQueryClient>, queryKeys: QueryKey[]) {
  return Promise.all(queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

export function useErpInvalidation() {
  const queryClient = useQueryClient();

  return useMemo(
    () => ({
      appSettings: () => invalidateGroup(queryClient, [erpKeys.appSettings]),
      calendar: (calendarEventsKey: QueryKey) =>
        invalidateGroup(queryClient, [
          calendarEventsKey,
          erpKeys.dashboard,
          erpKeys.invoices,
          erpKeys.incomes,
          erpKeys.incomeHistory,
          erpKeys.workers,
          erpKeys.workerTransactionsList,
        ]),
      dashboard: () => invalidateGroup(queryClient, [erpKeys.dashboard]),
      income: () => invalidateGroup(queryClient, [erpKeys.incomes, erpKeys.incomeHistory, erpKeys.dashboard]),
      invoiceDetail: (invoiceId: number) =>
        invalidateGroup(queryClient, [
          erpKeys.invoice(invoiceId),
          erpKeys.invoiceHistory(invoiceId),
          erpKeys.invoices,
          erpKeys.workers,
          erpKeys.workerTransactionsList,
          erpKeys.suppliers,
          erpKeys.supplierBalances,
          erpKeys.supplierTransactionsList,
          erpKeys.dashboard,
        ]),
      invoices: () =>
        invalidateGroup(queryClient, [
          erpKeys.invoices,
          erpKeys.dashboard,
          erpKeys.workers,
          erpKeys.workerTransactionsList,
          erpKeys.suppliers,
          erpKeys.supplierBalances,
          erpKeys.supplierTransactionsList,
        ]),
      products: () => invalidateGroup(queryClient, [erpKeys.products, erpKeys.dashboard]),
      projects: () =>
        invalidateGroup(queryClient, [
          erpKeys.projects,
          allProjectBuildingsKey,
          erpKeys.dashboard,
          erpKeys.invoices,
          erpKeys.incomes,
          erpKeys.products,
        ]),
      suppliers: () =>
        invalidateGroup(queryClient, [
          erpKeys.suppliers,
          erpKeys.supplierBalances,
          erpKeys.supplierTransactionsList,
          erpKeys.invoices,
        ]),
      supplierDetail: (supplierId: number) =>
        invalidateGroup(queryClient, [
          erpKeys.supplier(supplierId),
          erpKeys.supplierTransactions(supplierId),
          erpKeys.supplierTransactionsList,
          erpKeys.supplierBalances,
          erpKeys.suppliers,
          erpKeys.dashboard,
        ]),
      projectScope: () =>
        invalidateGroup(queryClient, [erpKeys.dashboard, erpKeys.invoices, erpKeys.incomes, erpKeys.products]),
      users: () => invalidateGroup(queryClient, [erpKeys.profile, erpKeys.users, erpKeys.projectMemberships]),
      workerDetail: (workerId: number) =>
        invalidateGroup(queryClient, [
          erpKeys.worker(workerId),
          erpKeys.workerTransactions(workerId),
          erpKeys.workers,
          erpKeys.dashboard,
        ]),
      workers: () =>
        invalidateGroup(queryClient, [erpKeys.workers, erpKeys.workerTransactionsList, erpKeys.dashboard]),
    }),
    [queryClient],
  );
}

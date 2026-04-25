import { useQuery } from "@tanstack/react-query";
import { erpKeys, listIncomeTransactionHistory, listIncomeTransactions } from "@/lib/erp";

export function useIncomeTransactions() {
  return useQuery({
    queryKey: erpKeys.incomes,
    queryFn: listIncomeTransactions,
  });
}

export function useIncomeTransactionHistory() {
  return useQuery({
    queryKey: erpKeys.incomeHistory,
    queryFn: listIncomeTransactionHistory,
  });
}

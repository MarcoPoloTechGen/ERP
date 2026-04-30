import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  listAllExpenses, 
  listExpensesByWorker, 
  listExpensesBySupplier, 
  listExpensesByProject,
  erpKeys,
} from "@/lib/erp-core";

export function useAllExpenses(options?: {
  partyType?: "worker" | "supplier";
  partyId?: number;
  projectId?: number;
}) {
  return useQuery({
    queryKey: options 
      ? options.partyType && options.partyId 
        ? erpKeys.expensesByParty(options.partyType, options.partyId)
        : options.projectId
          ? erpKeys.expensesByProject(options.projectId)
          : erpKeys.allExpenses
      : erpKeys.allExpenses,
    queryFn: () => listAllExpenses(options),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useExpensesByWorker(workerId: number) {
  return useQuery({
    queryKey: erpKeys.expensesByParty("worker", workerId),
    queryFn: () => listExpensesByWorker(workerId),
    staleTime: 1000 * 60 * 5,
  });
}

export function useExpensesBySupplier(supplierId: number) {
  return useQuery({
    queryKey: erpKeys.expensesByParty("supplier", supplierId),
    queryFn: () => listExpensesBySupplier(supplierId),
    staleTime: 1000 * 60 * 5,
  });
}

export function useExpensesByProject(projectId: number) {
  return useQuery({
    queryKey: erpKeys.expensesByProject(projectId),
    queryFn: () => listExpensesByProject(projectId),
    staleTime: 1000 * 60 * 5,
  });
}

export function useInvalidateExpenses() {
  const queryClient = useQueryClient();
  
  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: erpKeys.allExpenses }),
    invalidateByWorker: (workerId: number) => 
      queryClient.invalidateQueries({ queryKey: erpKeys.expensesByParty("worker", workerId) }),
    invalidateBySupplier: (supplierId: number) => 
      queryClient.invalidateQueries({ queryKey: erpKeys.expensesByParty("supplier", supplierId) }),
    invalidateByProject: (projectId: number) => 
      queryClient.invalidateQueries({ queryKey: erpKeys.expensesByProject(projectId) }),
  };
}

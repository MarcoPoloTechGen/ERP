import { useQuery } from "@tanstack/react-query";
import { erpKeys, listWorkerTransactions, listWorkers } from "@/lib/erp";

export function useWorkers() {
  return useQuery({
    queryKey: erpKeys.workers,
    queryFn: listWorkers,
  });
}

export function useWorkerTransactions(workerId?: number | null) {
  return useQuery({
    queryKey: workerId == null ? erpKeys.workerTransactionsList : erpKeys.workerTransactions(workerId),
    queryFn: () => listWorkerTransactions(workerId ?? undefined),
  });
}

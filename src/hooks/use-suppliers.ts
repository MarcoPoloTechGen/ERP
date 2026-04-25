import { useQuery } from "@tanstack/react-query";
import { erpKeys, listSupplierBalances, listSuppliers } from "@/lib/erp";

export function useSuppliers() {
  return useQuery({
    queryKey: erpKeys.suppliers,
    queryFn: listSuppliers,
  });
}

export function useSupplierBalances() {
  return useQuery({
    queryKey: erpKeys.supplierBalances,
    queryFn: listSupplierBalances,
  });
}

import { useQuery } from "@tanstack/react-query";
import { erpKeys, listProducts } from "@/lib/erp";

export function useProducts() {
  return useQuery({
    queryKey: erpKeys.products,
    queryFn: listProducts,
  });
}

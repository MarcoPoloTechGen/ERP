import type { IResourceItem } from "@refinedev/core";

export const refineResources: IResourceItem[] = [
  { name: "workers", list: "/workers", show: "/workers/:id" },
  { name: "projects", list: "/projects", show: "/projects/:id" },
  { name: "suppliers", list: "/suppliers", show: "/suppliers/:id" },
  { name: "products", list: "/products" },
  { name: "income_transactions", list: "/income" },
  { name: "invoices", list: "/expenses", show: "/expenses/:id" },
  { name: "party_transactions" },
  { name: "worker_transactions" },
];

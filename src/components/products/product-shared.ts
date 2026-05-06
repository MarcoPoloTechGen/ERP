export type ProductRow = {
  id: number | null;
  name: string | null;
  supplier_id: number | null;
  supplier_name: string | null;
  supplier_ids?: number[] | null;
  supplier_names?: string[] | null;
  project_id: number | null;
  project_name: string | null;
  building_id: number | null;
  building_name: string | null;
  unit: string | null;
  unit_price: number | null;
  currency: string | null;
  unit_price_usd: number | null;
  unit_price_iqd: number | null;
  created_at: string | null;
};

export type ProductFormValues = {
  name: string;
  supplierId?: number;
  projectId?: number;
  buildingId?: number;
  unit?: string;
  unitPriceUsd?: number;
  unitPriceIqd?: number;
};

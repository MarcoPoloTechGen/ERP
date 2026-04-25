export type IncomeRow = {
  id: number | null;
  project_id: number | null;
  project_name: string | null;
  amount: number | null;
  currency: string | null;
  amount_usd: number | null;
  amount_iqd: number | null;
  description: string | null;
  date: string | null;
  record_status: string | null;
  created_by_name: string | null;
};

export type IncomeFormValues = {
  projectId: number;
  amountUsd?: number;
  amountIqd?: number;
  description?: string;
  date?: string;
};

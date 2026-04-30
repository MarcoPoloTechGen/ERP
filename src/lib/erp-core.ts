import {
  createSignedInvoiceImageUrl,
  createSignedInvoiceImageUrls,
  getPublicBrandingAssetUrl,
  resolveInvoiceImagePath,
  supabase,
} from "@/lib/supabase";
import type { Database, Tables, TablesInsert, TablesUpdate } from "@/lib/database.types";
import {
  assertNonNegativeAmount,
  assertPositiveDualCurrencyAmount,
  deriveInvoiceStatus,
  deriveDualCurrencyInvoiceStatus,
  normalizeOptionalText,
  validateDualCurrencyInvoiceInput,
  validateProjectInput as validateProjectPayload,
} from "@/lib/validation";
import { asExpenseType, type ExpenseType } from "@/lib/expense-types";

type Row = Record<string, unknown>;
type TableName = keyof Database["public"]["Tables"];
type ViewName = keyof Database["public"]["Views"];
type RpcName = keyof Database["public"]["Functions"];

type TableRow<Name extends TableName> = Tables<Name>;
type ViewRow<Name extends ViewName> = Tables<Name>;
type TableInsertPayload<Name extends TableName> = TablesInsert<Name>;
type TableUpdatePayload<Name extends TableName> = TablesUpdate<Name>;
type RpcArgs<Name extends RpcName> = Database["public"]["Functions"][Name]["Args"];
type RpcReturns<Name extends RpcName> = Database["public"]["Functions"][Name]["Returns"];

type ProfileRow = TableRow<"profiles">;
type AppSettingsRow = TableRow<"app_settings">;
type ProjectMembershipRow = TableRow<"project_memberships">;
type WorkerRow = ViewRow<"app_workers">;
type SupplierRow = ViewRow<"app_suppliers">;
type ProjectBuildingRow = TableRow<"project_buildings">;
type AppProjectRow = ViewRow<"app_projects">;
type AppProductRow = ViewRow<"app_products">;
type AppInvoiceRow = ViewRow<"app_invoices">;
type AppInvoiceHistoryRow = ViewRow<"app_invoice_history">;
type AppSupplierTransactionRow = ViewRow<"app_supplier_transactions">;
type AppPartyTransactionRow = ViewRow<"app_party_transactions">;
type AppAllExpenseRow = ViewRow<"all_expenses">;
type AppIncomeTransactionHistoryRow = ViewRow<"app_income_transaction_history">;
type AppIncomeTransactionRow = ViewRow<"app_income_transactions">;

type WorkerWritePayload = Pick<TableInsertPayload<"workers">, "name" | "role" | "category" | "phone">;
type SupplierWritePayload = Pick<
  TableInsertPayload<"suppliers">,
  "name" | "contact" | "phone" | "email" | "address"
>;
type ProductWritePayload = Pick<
  TableInsertPayload<"materials">,
  | "name"
  | "supplier_id"
  | "project_id"
  | "building_id"
  | "unit"
  | "unit_price"
  | "currency"
  | "unit_price_usd"
  | "unit_price_iqd"
>;
type PartyTransactionWritePayload = {
  entry_type: "debt" | "payment";
  entity_type: "worker" | "supplier" | "other";
  worker_id: number | null;
  supplier_id: number | null;
  building_id: number | null;
  amount: number;
  currency: Currency;
  amount_usd: number;
  amount_iqd: number;
  description: string;
  notes: string | null;
  date: string;
  created_by?: string | null;
  updated_by?: string | null;
};
type IncomeTransactionWritePayload = {
  project_id: number;
  amount: number;
  currency: Currency;
  amount_usd: number;
  amount_iqd: number;
  description: string | null;
  date: string;
};
type IncomeTransactionCreatePayload = IncomeTransactionWritePayload &
  Pick<TableInsertPayload<"income_transactions">, "created_by">;
type SoftDeletePayload = {
  deleted_at: string;
  deleted_by: string | null;
};
type AppSettingsUpsertPayload = Pick<
  TableInsertPayload<"app_settings">,
  | "id"
  | "company_logo_path"
  | "exchange_rate_iqd_per_100_usd"
  | "transaction_amount_min_usd"
  | "transaction_amount_max_usd"
  | "transaction_amount_min_iqd"
  | "transaction_amount_max_iqd"
  | "updated_by"
  | "updated_at"
>;
type ProfileRoleUpdatePayload = Pick<TableUpdatePayload<"profiles">, "role">;
type ProfileNameUpdatePayload = Pick<TableUpdatePayload<"profiles">, "full_name">;
type ProfileSelectedProjectUpdatePayload = Pick<TableUpdatePayload<"profiles">, "selected_project_id">;
type InvoicePaidUpdatePayload = {
  entry_type: "payment";
  amount: number;
  currency: Currency;
  amount_usd: number;
  amount_iqd: number;
  updated_by: string | null;
};
type ReplaceUserProjectMembershipsArgs = RpcArgs<"replace_user_project_memberships">;
type DashboardOverviewRpcResult = RpcReturns<"get_dashboard_overview">;

export type ProjectStatus = "active" | "completed" | "paused";
export type InvoiceStatus = "unpaid" | "partial" | "paid";
export type InvoiceHistoryAction = "created" | "updated";
export type IncomeTransactionHistoryAction = "created" | "updated" | "deleted";
export type TransactionType = "credit" | "debit";
export type PartyType = "worker" | "supplier";
export type Currency = "USD" | "IQD";
export const CURRENCIES: Currency[] = ["USD", "IQD"];
export type UserRole = "super_admin" | "admin" | "user";
export type RecordStatus = "active" | "deleted";

export interface AppUserProfile {
  id: string;
  email: string | null;
  fullName: string | null;
  role: UserRole;
  selectedProjectId: number | null;
  createdAt: string | null;
}

export interface AppSettings {
  id: string;
  companyLogoPath: string | null;
  companyLogoUrl: string | null;
  exchangeRateIqdPer100Usd: number | null;
  transactionAmountMinUsd: number | null;
  transactionAmountMaxUsd: number | null;
  transactionAmountMinIqd: number | null;
  transactionAmountMaxIqd: number | null;
  updatedAt: string | null;
}

export type TransactionAmountLimitsInput = {
  transactionAmountMinUsd: number | null;
  transactionAmountMaxUsd: number | null;
  transactionAmountMinIqd: number | null;
  transactionAmountMaxIqd: number | null;
};

export interface ProjectMembership {
  id: number;
  projectId: number;
  userId: string;
  createdAt: string | null;
}

export interface Worker {
  id: number;
  name: string;
  role: string;
  category: string | null;
  phone: string | null;
  balance: number;
  balanceUsd: number;
  balanceIqd: number;
  createdAt: string | null;
}

export interface Supplier {
  id: number;
  name: string;
  contact: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  createdAt: string | null;
}

export interface SupplierBalance {
  supplierId: number;
  balanceUsd: number;
  balanceIqd: number;
}

export interface WorkerBalance {
  workerId: number;
  balanceUsd: number;
  balanceIqd: number;
}

export interface Project {
  id: number;
  name: string;
  client: string | null;
  location: string | null;
  status: ProjectStatus;
  budget: number | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string | null;
  buildingCount: number;
}

export interface ProjectBuilding {
  id: number;
  projectId: number;
  name: string;
  createdAt: string | null;
}

export interface Product {
  id: number;
  name: string;
  supplierId: number | null;
  supplierName: string | null;
  projectId: number | null;
  projectName: string | null;
  buildingId: number | null;
  buildingName: string | null;
  unit: string | null;
  unitPrice: number | null;
  currency: Currency;
  unitPriceUsd: number;
  unitPriceIqd: number;
  createdAt: string | null;
}

export interface Invoice {
  id: number;
  number: string;
  expenseType: ExpenseType;
  laborWorkerId: number | null;
  laborWorkerName: string | null;
  laborPersonName: string | null;
  status: InvoiceStatus;
  recordStatus: RecordStatus;
  supplierId: number | null;
  supplierName: string | null;
  projectId: number | null;
  projectName: string | null;
  buildingId: number | null;
  buildingName: string | null;
  productId: number | null;
  productName: string | null;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  currency: Currency;
  totalAmountUsd: number;
  paidAmountUsd: number;
  remainingAmountUsd: number;
  totalAmountIqd: number;
  paidAmountIqd: number;
  remainingAmountIqd: number;
  invoiceDate: string | null;
  dueDate: string | null;
  notes: string | null;
  imagePath: string | null;
  imageUrl: string | null;
  createdBy: string | null;
  createdByName: string | null;
  deletedBy: string | null;
  deletedAt: string | null;
  createdAt: string | null;
}

export interface InvoiceHistoryEntry {
  id: number;
  invoiceId: number;
  action: InvoiceHistoryAction;
  number: string;
  expenseType: ExpenseType;
  laborWorkerId: number | null;
  laborWorkerName: string | null;
  laborPersonName: string | null;
  status: InvoiceStatus;
  supplierId: number | null;
  supplierName: string | null;
  projectId: number | null;
  projectName: string | null;
  buildingId: number | null;
  buildingName: string | null;
  productId: number | null;
  productName: string | null;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  currency: Currency;
  totalAmountUsd: number;
  paidAmountUsd: number;
  remainingAmountUsd: number;
  totalAmountIqd: number;
  paidAmountIqd: number;
  remainingAmountIqd: number;
  invoiceDate: string | null;
  dueDate: string | null;
  notes: string | null;
  imagePath: string | null;
  imageUrl: string | null;
  changedBy: string | null;
  changedByName: string | null;
  changedAt: string | null;
}

export interface WorkerTransaction {
  id: number;
  workerId: number;
  type: TransactionType;
  amount: number;
  currency: Currency;
  amountUsd: number;
  amountIqd: number;
  description: string | null;
  date: string | null;
  projectId: number | null;
  projectName: string | null;
  sourceInvoiceId: number | null;
  sourceKind: string | null;
  createdBy: string | null;
  createdByName: string | null;
  canManage: boolean;
  createdAt: string | null;
}

export interface SupplierTransaction {
  id: number;
  supplierId: number;
  type: TransactionType;
  amount: number;
  currency: Currency;
  amountUsd: number;
  amountIqd: number;
  description: string | null;
  date: string | null;
  projectId: number | null;
  projectName: string | null;
  sourceInvoiceId: number | null;
  sourceKind: string | null;
  createdBy: string | null;
  createdByName: string | null;
  canManage: boolean;
  createdAt: string | null;
}

export interface IncomeTransaction {
  id: number;
  projectId: number;
  projectName: string | null;
  amount: number;
  currency: Currency;
  amountUsd: number;
  amountIqd: number;
  description: string | null;
  date: string | null;
  recordStatus: RecordStatus;
  createdBy: string | null;
  createdByName: string | null;
  deletedBy: string | null;
  deletedAt: string | null;
  createdAt: string | null;
}

export interface AllExpense {
  id: number;
  expenseSource: "invoice" | "transaction";
  reference: string;
  category: string;
  amount: number;
  currency: Currency;
  amountUsd: number;
  amountIqd: number;
  notes: string | null;
  date: string | null;
  projectId: number | null;
  projectName: string | null;
  supplierId: number | null;
  supplierName: string | null;
  laborWorkerId: number | null;
  laborWorkerName: string | null;
  status: string;
  partyType: PartyType;
  totalAmount: number | null;
  paidAmount: number | null;
  remainingAmount: number | null;
  dueDate: string | null;
  imagePath: string | null;
  createdBy: string | null;
  createdByName: string | null;
  recordStatus: RecordStatus;
  createdAt: string | null;
}

export interface IncomeTransactionHistoryEntry {
  id: number;
  incomeTransactionId: number;
  action: IncomeTransactionHistoryAction;
  projectId: number | null;
  projectName: string | null;
  amount: number;
  currency: Currency;
  amountUsd: number;
  amountIqd: number;
  description: string | null;
  date: string | null;
  recordStatus: RecordStatus;
  changedBy: string | null;
  changedByName: string | null;
  changedAt: string | null;
}

export interface DashboardProjectSummary {
  id: number;
  name: string;
  status: ProjectStatus;
  invoiceCount: number;
  totalInvoiced: number;
  totalPaid: number;
  remaining: number;
  totalInvoicedUsd: number;
  totalPaidUsd: number;
  remainingUsd: number;
  totalInvoicedIqd: number;
  totalPaidIqd: number;
  remainingIqd: number;
}

export interface DashboardWorkerSummary {
  id: number;
  name: string;
  role: string;
  balance: number;
  totalCredit: number;
  totalDebit: number;
  balanceUsd: number;
  balanceIqd: number;
  totalCreditUsd: number;
  totalDebitUsd: number;
  totalCreditIqd: number;
  totalDebitIqd: number;
}

export interface DashboardInvoiceSummary {
  id: number;
  number: string;
  status: InvoiceStatus;
  supplierName: string | null;
  projectName: string | null;
  totalAmount: number;
  paidAmount: number;
  remaining: number;
  totalAmountUsd: number;
  paidAmountUsd: number;
  remainingUsd: number;
  totalAmountIqd: number;
  paidAmountIqd: number;
  remainingIqd: number;
}

export interface DashboardOverview {
  totalWorkers: number;
  activeProjects: number;
  totalSuppliers: number;
  invoicesUnpaid: number;
  totalInvoiceAmount: number;
  totalPaidAmount: number;
  remainingAmount: number;
  totalInvoiceAmountUsd: number;
  totalPaidAmountUsd: number;
  remainingAmountUsd: number;
  totalInvoiceAmountIqd: number;
  totalPaidAmountIqd: number;
  remainingAmountIqd: number;
  projectsSummary: DashboardProjectSummary[];
  workersSummary: DashboardWorkerSummary[];
  invoicesSummary: DashboardInvoiceSummary[];
}

export interface WorkerInput {
  name: string;
  role: string;
  category: string | null;
  phone: string | null;
}

export interface SupplierInput {
  name: string;
  contact: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
}

export interface ProjectInput {
  name: string;
  client: string | null;
  location: string | null;
  status: ProjectStatus;
  budget: number | null;
  startDate: string | null;
  endDate: string | null;
  buildings: string[];
}

export interface ProductInput {
  name: string;
  supplierId: number | null;
  projectId: number | null;
  buildingId: number | null;
  unit: string | null;
  unitPrice?: number | null;
  currency?: Currency;
  unitPriceUsd: number;
  unitPriceIqd: number;
}

export interface InvoiceInput {
  number: string;
  expenseType: ExpenseType;
  laborWorkerId: number | null;
  laborPersonName: string | null;
  supplierId: number | null;
  projectId: number | null;
  buildingId: number | null;
  productId: number | null;
  totalAmount?: number;
  paidAmount?: number;
  currency?: Currency;
  totalAmountUsd: number;
  paidAmountUsd: number;
  totalAmountIqd: number;
  paidAmountIqd: number;
  status: InvoiceStatus;
  invoiceDate: string | null;
  dueDate: string | null;
  notes: string | null;
  imagePath: string | null;
}

export interface WorkerTransactionInput {
  workerId: number;
  type: TransactionType;
  amount?: number;
  currency?: Currency;
  amountUsd: number;
  amountIqd: number;
  description: string | null;
  date: string | null;
  projectId: number | null;
}

export interface SupplierTransactionInput {
  supplierId: number;
  type: TransactionType;
  amount?: number;
  currency?: Currency;
  amountUsd: number;
  amountIqd: number;
  description: string | null;
  date: string | null;
  projectId: number | null;
}

export interface IncomeTransactionInput {
  projectId: number;
  amount?: number;
  currency?: Currency;
  amountUsd: number;
  amountIqd: number;
  description: string | null;
  date: string | null;
}

export const erpKeys = {
  profile: ["profile"] as const,
  appSettings: ["appSettings"] as const,
  users: ["users"] as const,
  projectMemberships: ["projectMemberships"] as const,
  dashboard: ["dashboard"] as const,
  workers: ["workers"] as const,
  worker: (id: number) => ["worker", id] as const,
  workerTransactionsList: ["workerTransactions"] as const,
  workerTransactions: (workerId: number) => ["workerTransactions", workerId] as const,
  suppliers: ["suppliers"] as const,
  supplier: (id: number) => ["supplier", id] as const,
  supplierTransactionsList: ["supplierTransactions"] as const,
  supplierTransactions: (supplierId: number) => ["supplierTransactions", supplierId] as const,
  supplierBalances: ["supplierBalances"] as const,
  workerBalances: ["workerBalances"] as const,
  projects: ["projects"] as const,
  project: (id: number) => ["project", id] as const,
  projectBuildings: (projectId: number) => ["projectBuildings", projectId] as const,
  products: ["products"] as const,
  invoices: ["invoices"] as const,
  invoice: (id: number) => ["invoice", id] as const,
  invoiceHistory: (id: number) => ["invoice", id, "history"] as const,
  incomes: ["incomes"] as const,
  incomeHistory: ["incomeHistory"] as const,
  allExpenses: ["allExpenses"] as const,
  expensesByParty: (partyType: PartyType, partyId: number) => ["expenses", partyType, partyId] as const,
  expensesByProject: (projectId: number) => ["expenses", "project", projectId] as const,
};

function asRow(value: unknown): Row {
  return typeof value === "object" && value !== null ? (value as Row) : {};
}

function readValue(row: Row, ...keys: string[]) {
  for (const key of keys) {
    if (key in row && row[key] != null) {
      return row[key];
    }
  }

  return null;
}

function readString(row: Row, ...keys: string[]) {
  const value = readValue(row, ...keys);
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return null;
}

function readNumber(row: Row, ...keys: string[]) {
  const value = readValue(row, ...keys);
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function readDate(row: Row, ...keys: string[]) {
  return readString(row, ...keys);
}

function readId(row: Row, ...keys: string[]) {
  return readNumber(row, ...keys) ?? 0;
}

function toProjectStatus(value: unknown): ProjectStatus {
  return value === "completed" || value === "paused" ? value : "active";
}

function toInvoiceStatus(value: unknown, totalAmount = 0, paidAmount = 0): InvoiceStatus {
  if (value === "paid" || value === "partial" || value === "unpaid") {
    return value;
  }

  return deriveInvoiceStatus(totalAmount, paidAmount);
}

function toDualCurrencyInvoiceStatus(
  value: unknown,
  totalAmountUsd = 0,
  paidAmountUsd = 0,
  totalAmountIqd = 0,
  paidAmountIqd = 0,
): InvoiceStatus {
  if (value === "paid" || value === "partial" || value === "unpaid") {
    return value;
  }

  return deriveDualCurrencyInvoiceStatus(totalAmountUsd, paidAmountUsd, totalAmountIqd, paidAmountIqd);
}

function toInvoiceHistoryAction(value: unknown): InvoiceHistoryAction {
  return value === "updated" ? "updated" : "created";
}

function toIncomeTransactionHistoryAction(value: unknown): IncomeTransactionHistoryAction {
  if (value === "updated" || value === "deleted") {
    return value;
  }

  return "created";
}

function toRecordStatus(value: unknown): RecordStatus {
  return value === "deleted" ? "deleted" : "active";
}

function toTransactionType(value: unknown): TransactionType {
  return value === "debit" ? "debit" : "credit";
}

function toCurrency(value: unknown): Currency {
  return value === "IQD" ? "IQD" : "USD";
}

function readDualCurrencyAmount(
  row: Row,
  usdKeys: string[],
  iqdKeys: string[],
  legacyKeys: string[],
  legacyCurrency: Currency,
) {
  const legacyAmount = readNumber(row, ...legacyKeys) ?? 0;
  const amountUsd = readNumber(row, ...usdKeys);
  const amountIqd = readNumber(row, ...iqdKeys);

  return {
    amountUsd: amountUsd ?? (legacyCurrency === "USD" ? legacyAmount : 0),
    amountIqd: amountIqd ?? (legacyCurrency === "IQD" ? legacyAmount : 0),
  };
}

function pickPrimaryCurrency(amountUsd: number, amountIqd: number): Currency {
  return amountUsd !== 0 || amountIqd === 0 ? "USD" : "IQD";
}

function pickPrimaryAmount(amountUsd: number, amountIqd: number) {
  return pickPrimaryCurrency(amountUsd, amountIqd) === "USD" ? amountUsd : amountIqd;
}

function toUserRole(value: unknown): UserRole {
  if (value === "super_admin") {
    return "super_admin";
  }

  return value === "admin" ? "admin" : "user";
}

function normalizeProfile(row: ProfileRow): AppUserProfile {
  return {
    id: readString(row, "id") ?? "",
    email: readString(row, "email"),
    fullName: readString(row, "full_name", "fullName"),
    role: toUserRole(readString(row, "role")),
    selectedProjectId: readNumber(row, "selected_project_id", "selectedProjectId"),
    createdAt: readDate(row, "created_at", "createdAt"),
  };
}

function normalizeAppSettings(row: AppSettingsRow): AppSettings {
  const companyLogoPath = readString(row, "company_logo_path", "companyLogoPath");
  const updatedAt = readDate(row, "updated_at", "updatedAt");
  const companyLogoUrl = companyLogoPath ? getPublicBrandingAssetUrl(companyLogoPath) : null;

  return {
    id: readString(row, "id") ?? "default",
    companyLogoPath,
    companyLogoUrl:
      companyLogoUrl && updatedAt
        ? `${companyLogoUrl}${companyLogoUrl.includes("?") ? "&" : "?"}v=${encodeURIComponent(updatedAt)}`
        : companyLogoUrl,
    exchangeRateIqdPer100Usd: readNumber(row, "exchange_rate_iqd_per_100_usd", "exchangeRateIqdPer100Usd"),
    transactionAmountMinUsd: readNumber(row, "transaction_amount_min_usd", "transactionAmountMinUsd"),
    transactionAmountMaxUsd: readNumber(row, "transaction_amount_max_usd", "transactionAmountMaxUsd"),
    transactionAmountMinIqd: readNumber(row, "transaction_amount_min_iqd", "transactionAmountMinIqd"),
    transactionAmountMaxIqd: readNumber(row, "transaction_amount_max_iqd", "transactionAmountMaxIqd"),
    updatedAt,
  };
}

function normalizeProjectMembership(row: ProjectMembershipRow): ProjectMembership {
  return {
    id: readId(row, "id"),
    projectId: readId(row, "project_id", "projectId"),
    userId: readString(row, "user_id", "userId") ?? "",
    createdAt: readDate(row, "created_at", "createdAt"),
  };
}

function normalizeWorker(row: WorkerRow): Worker {
  const balance = readNumber(row, "balance") ?? 0;

  return {
    id: readId(row, "id"),
    name: readString(row, "name") ?? "Unnamed worker",
    role: readString(row, "role") ?? "-",
    category: readString(row, "category"),
    phone: readString(row, "phone"),
    balance,
    balanceUsd: readNumber(row, "balance_usd", "balanceUsd") ?? balance,
    balanceIqd: readNumber(row, "balance_iqd", "balanceIqd") ?? 0,
    createdAt: readDate(row, "created_at", "createdAt"),
  };
}

function normalizeSupplier(row: SupplierRow): Supplier {
  return {
    id: readId(row, "id"),
    name: readString(row, "name") ?? "Unnamed supplier",
    contact: readString(row, "contact"),
    phone: readString(row, "phone"),
    email: readString(row, "email"),
    address: readString(row, "address"),
    createdAt: readDate(row, "created_at", "createdAt"),
  };
}

function normalizeProject(row: AppProjectRow): Project {
  return {
    id: readId(row, "id"),
    name: readString(row, "name") ?? "Unnamed project",
    client: readString(row, "client"),
    location: readString(row, "location"),
    status: toProjectStatus(readString(row, "status")),
    budget: readNumber(row, "budget"),
    startDate: readDate(row, "start_date", "startDate"),
    endDate: readDate(row, "end_date", "endDate"),
    createdAt: readDate(row, "created_at", "createdAt"),
    buildingCount: readNumber(row, "building_count", "buildingCount") ?? 0,
  };
}

function normalizeProjectBuilding(row: ProjectBuildingRow): ProjectBuilding {
  return {
    id: readId(row, "id"),
    projectId: readId(row, "project_id", "projectId"),
    name: readString(row, "name") ?? "Building",
    createdAt: readDate(row, "created_at", "createdAt"),
  };
}

function normalizeProduct(row: AppProductRow): Product {
  const currency = toCurrency(readString(row, "currency"));
  const { amountUsd: unitPriceUsd, amountIqd: unitPriceIqd } = readDualCurrencyAmount(
    row,
    ["unit_price_usd", "unitPriceUsd"],
    ["unit_price_iqd", "unitPriceIqd"],
    ["unit_price", "unitPrice"],
    currency,
  );

  return {
    id: readId(row, "id"),
    name: readString(row, "name") ?? "Unnamed product",
    supplierId: readNumber(row, "supplier_id", "supplierId"),
    supplierName: readString(row, "supplier_name", "supplierName"),
    projectId: readNumber(row, "project_id", "projectId"),
    projectName: readString(row, "project_name", "projectName"),
    buildingId: readNumber(row, "building_id", "buildingId"),
    buildingName: readString(row, "building_name", "buildingName"),
    unit: readString(row, "unit"),
    unitPrice: readNumber(row, "unit_price", "unitPrice"),
    currency,
    unitPriceUsd,
    unitPriceIqd,
    createdAt: readDate(row, "created_at", "createdAt"),
  };
}

function readInvoiceImage(row: Row) {
  const rawImageValue = readString(row, "image_path", "imagePath", "image_url", "imageUrl");
  const imagePath = resolveInvoiceImagePath(rawImageValue);

  return {
    imagePath,
    imageUrl: rawImageValue && !imagePath ? rawImageValue : null,
  };
}

function normalizeInvoice(row: AppInvoiceRow): Invoice {
  const currency = toCurrency(readString(row, "currency"));
  const totalAmount = readNumber(row, "total_amount", "totalAmount") ?? 0;
  const paidAmount = readNumber(row, "paid_amount", "paidAmount") ?? 0;
  const { amountUsd: totalAmountUsd, amountIqd: totalAmountIqd } = readDualCurrencyAmount(
    row,
    ["total_amount_usd", "totalAmountUsd"],
    ["total_amount_iqd", "totalAmountIqd"],
    ["total_amount", "totalAmount"],
    currency,
  );
  const { amountUsd: paidAmountUsd, amountIqd: paidAmountIqd } = readDualCurrencyAmount(
    row,
    ["paid_amount_usd", "paidAmountUsd"],
    ["paid_amount_iqd", "paidAmountIqd"],
    ["paid_amount", "paidAmount"],
    currency,
  );
  const remainingAmountUsd =
    readNumber(row, "remaining_amount_usd", "remainingAmountUsd") ?? Math.max(0, totalAmountUsd - paidAmountUsd);
  const remainingAmountIqd =
    readNumber(row, "remaining_amount_iqd", "remainingAmountIqd") ?? Math.max(0, totalAmountIqd - paidAmountIqd);
  const { imagePath, imageUrl } = readInvoiceImage(row);

  return {
    id: readId(row, "id"),
    number: readString(row, "number") ?? "INV",
    expenseType: asExpenseType(readString(row, "expense_type", "expenseType")),
    laborWorkerId: readNumber(row, "labor_worker_id", "laborWorkerId"),
    laborWorkerName: readString(row, "labor_worker_name", "laborWorkerName"),
    laborPersonName: readString(row, "labor_person_name", "laborPersonName"),
    status: toDualCurrencyInvoiceStatus(
      readString(row, "status"),
      totalAmountUsd,
      paidAmountUsd,
      totalAmountIqd,
      paidAmountIqd,
    ),
    recordStatus: toRecordStatus(readString(row, "record_status", "recordStatus")),
    supplierId: readNumber(row, "supplier_id", "supplierId"),
    supplierName: readString(row, "supplier_name", "supplierName"),
    projectId: readNumber(row, "project_id", "projectId"),
    projectName: readString(row, "project_name", "projectName"),
    buildingId: readNumber(row, "building_id", "buildingId"),
    buildingName: readString(row, "building_name", "buildingName"),
    productId: readNumber(row, "product_id", "productId"),
    productName: readString(row, "product_name", "productName"),
    totalAmount,
    paidAmount,
    remainingAmount:
      readNumber(row, "remaining_amount", "remainingAmount") ?? Math.max(0, totalAmount - paidAmount),
    currency,
    totalAmountUsd,
    paidAmountUsd,
    remainingAmountUsd,
    totalAmountIqd,
    paidAmountIqd,
    remainingAmountIqd,
    invoiceDate: readDate(row, "invoice_date", "invoiceDate"),
    dueDate: readDate(row, "due_date", "dueDate"),
    notes: readString(row, "notes"),
    imagePath,
    imageUrl,
    createdBy: readString(row, "created_by", "createdBy"),
    createdByName: readString(row, "created_by_name", "createdByName"),
    deletedBy: readString(row, "deleted_by", "deletedBy"),
    deletedAt: readDate(row, "deleted_at", "deletedAt"),
    createdAt: readDate(row, "created_at", "createdAt"),
  };
}

function normalizeInvoiceHistoryEntry(row: AppInvoiceHistoryRow): InvoiceHistoryEntry {
  const currency = toCurrency(readString(row, "currency"));
  const totalAmount = readNumber(row, "total_amount", "totalAmount") ?? 0;
  const paidAmount = readNumber(row, "paid_amount", "paidAmount") ?? 0;
  const { amountUsd: totalAmountUsd, amountIqd: totalAmountIqd } = readDualCurrencyAmount(
    row,
    ["total_amount_usd", "totalAmountUsd"],
    ["total_amount_iqd", "totalAmountIqd"],
    ["total_amount", "totalAmount"],
    currency,
  );
  const { amountUsd: paidAmountUsd, amountIqd: paidAmountIqd } = readDualCurrencyAmount(
    row,
    ["paid_amount_usd", "paidAmountUsd"],
    ["paid_amount_iqd", "paidAmountIqd"],
    ["paid_amount", "paidAmount"],
    currency,
  );
  const remainingAmountUsd =
    readNumber(row, "remaining_amount_usd", "remainingAmountUsd") ?? Math.max(0, totalAmountUsd - paidAmountUsd);
  const remainingAmountIqd =
    readNumber(row, "remaining_amount_iqd", "remainingAmountIqd") ?? Math.max(0, totalAmountIqd - paidAmountIqd);
  const { imagePath, imageUrl } = readInvoiceImage(row);

  return {
    id: readId(row, "id"),
    invoiceId: readId(row, "invoice_id", "invoiceId"),
    action: toInvoiceHistoryAction(readString(row, "change_type", "changeType", "action")),
    number: readString(row, "number") ?? "INV",
    expenseType: asExpenseType(readString(row, "expense_type", "expenseType")),
    laborWorkerId: readNumber(row, "labor_worker_id", "laborWorkerId"),
    laborWorkerName: readString(row, "labor_worker_name", "laborWorkerName"),
    laborPersonName: readString(row, "labor_person_name", "laborPersonName"),
    status: toDualCurrencyInvoiceStatus(
      readString(row, "status"),
      totalAmountUsd,
      paidAmountUsd,
      totalAmountIqd,
      paidAmountIqd,
    ),
    supplierId: readNumber(row, "supplier_id", "supplierId"),
    supplierName: readString(row, "supplier_name", "supplierName"),
    projectId: readNumber(row, "project_id", "projectId"),
    projectName: readString(row, "project_name", "projectName"),
    buildingId: readNumber(row, "building_id", "buildingId"),
    buildingName: readString(row, "building_name", "buildingName"),
    productId: readNumber(row, "product_id", "productId"),
    productName: readString(row, "product_name", "productName"),
    totalAmount,
    paidAmount,
    remainingAmount:
      readNumber(row, "remaining_amount", "remainingAmount") ?? Math.max(0, totalAmount - paidAmount),
    currency,
    totalAmountUsd,
    paidAmountUsd,
    remainingAmountUsd,
    totalAmountIqd,
    paidAmountIqd,
    remainingAmountIqd,
    invoiceDate: readDate(row, "invoice_date", "invoiceDate"),
    dueDate: readDate(row, "due_date", "dueDate"),
    notes: readString(row, "notes"),
    imagePath,
    imageUrl,
    changedBy: readString(row, "changed_by", "changedBy"),
    changedByName: readString(row, "changed_by_name", "changedByName"),
    changedAt: readDate(row, "changed_at", "changedAt"),
  };
}

function normalizePartyTransactionRow(row: AppPartyTransactionRow): WorkerTransaction {
  const currency = toCurrency(readString(row, "currency"));
  const { amountUsd, amountIqd } = readDualCurrencyAmount(
    row,
    ["amount_usd", "amountUsd"],
    ["amount_iqd", "amountIqd"],
    ["amount", "amount"],
    currency,
  );

  return {
    id: readId(row, "id"),
    workerId: readId(row, "worker_id", "workerId"),
    type: toTransactionType(readString(row, "type")),
    amount: readNumber(row, "amount") ?? 0,
    currency,
    amountUsd,
    amountIqd,
    description: readString(row, "description"),
    date: readDate(row, "date"),
    projectId: readNumber(row, "project_id", "projectId"),
    projectName: readString(row, "project_name", "projectName"),
    sourceInvoiceId: readNumber(row, "source_invoice_id", "sourceInvoiceId"),
    sourceKind: readString(row, "source_kind", "sourceKind"),
    createdBy: readString(row, "created_by", "createdBy"),
    createdByName: readString(row, "created_by_name", "createdByName"),
    canManage: readValue(row, "can_manage", "canManage") === true,
    createdAt: readDate(row, "created_at", "createdAt"),
  };
}

function normalizeSupplierTransaction(row: AppSupplierTransactionRow): SupplierTransaction {
  const currency = toCurrency(readString(row, "currency"));
  const { amountUsd, amountIqd } = readDualCurrencyAmount(
    row,
    ["amount_usd", "amountUsd"],
    ["amount_iqd", "amountIqd"],
    ["amount"],
    currency,
  );

  return {
    id: readId(row, "id"),
    supplierId: readId(row, "supplier_id", "supplierId"),
    type: toTransactionType(readString(row, "type")),
    amount: readNumber(row, "amount") ?? 0,
    currency,
    amountUsd,
    amountIqd,
    description: readString(row, "description"),
    date: readDate(row, "date"),
    projectId: readNumber(row, "project_id", "projectId"),
    projectName: readString(row, "project_name", "projectName"),
    sourceInvoiceId: readNumber(row, "source_invoice_id", "sourceInvoiceId"),
    sourceKind: readString(row, "source_kind", "sourceKind"),
    createdBy: readString(row, "created_by", "createdBy"),
    createdByName: readString(row, "created_by_name", "createdByName"),
    canManage: readValue(row, "can_manage", "canManage") === true,
    createdAt: readDate(row, "created_at", "createdAt"),
  };
}

function normalizeAllExpense(row: AppAllExpenseRow): AllExpense {
  const currency = toCurrency(readString(row, "currency"));
  const { amountUsd, amountIqd } = readDualCurrencyAmount(
    row,
    ["amount_usd", "amountUsd"],
    ["amount_iqd", "amountIqd"],
    ["amount", "amount"],
    currency,
  );

  return {
    id: readId(row, "id"),
    expenseSource: readString(row, "expense_source") === "invoice" ? "invoice" : "transaction",
    reference: readString(row, "reference") ?? "",
    category: readString(row, "category") ?? "general",
    amount: pickPrimaryAmount(amountUsd, amountIqd),
    currency,
    amountUsd,
    amountIqd,
    notes: readString(row, "notes"),
    date: readDate(row, "date"),
    projectId: readNumber(row, "project_id", "projectId"),
    projectName: readString(row, "project_name", "projectName"),
    supplierId: readNumber(row, "supplier_id", "supplierId"),
    supplierName: readString(row, "supplier_name", "supplierName"),
    laborWorkerId: readNumber(row, "labor_worker_id", "laborWorkerId"),
    laborWorkerName: readString(row, "labor_worker_name", "laborWorkerName"),
    status: readString(row, "status") ?? "unknown",
    partyType: toPartyType(readString(row, "party_type")),
    totalAmount: readNumber(row, "total_amount", "totalAmount"),
    paidAmount: readNumber(row, "paid_amount", "paidAmount"),
    remainingAmount: readNumber(row, "remaining_amount", "remainingAmount"),
    dueDate: readDate(row, "due_date", "dueDate"),
    imagePath: readString(row, "image_path", "imagePath"),
    createdBy: readString(row, "created_by", "createdBy"),
    createdByName: readString(row, "created_by_name", "createdByName"),
    recordStatus: toRecordStatus(readString(row, "record_status", "recordStatus")),
    createdAt: readDate(row, "created_at", "createdAt"),
  };
}

function toPartyType(value: unknown): PartyType {
  return value === "supplier" ? "supplier" : "worker";
}

function normalizeIncomeTransaction(row: AppIncomeTransactionRow): IncomeTransaction {
  const currency = toCurrency(readString(row, "currency"));
  const { amountUsd, amountIqd } = readDualCurrencyAmount(
    row,
    ["amount_usd", "amountUsd"],
    ["amount_iqd", "amountIqd"],
    ["amount"],
    currency,
  );

  return {
    id: readId(row, "id"),
    projectId: readId(row, "project_id", "projectId"),
    projectName: readString(row, "project_name", "projectName"),
    amount: readNumber(row, "amount") ?? 0,
    currency,
    amountUsd,
    amountIqd,
    description: readString(row, "description"),
    date: readDate(row, "date"),
    recordStatus: toRecordStatus(readString(row, "record_status", "recordStatus")),
    createdBy: readString(row, "created_by", "createdBy"),
    createdByName: readString(row, "created_by_name", "createdByName"),
    deletedBy: readString(row, "deleted_by", "deletedBy"),
    deletedAt: readDate(row, "deleted_at", "deletedAt"),
    createdAt: readDate(row, "created_at", "createdAt"),
  };
}

function normalizeIncomeTransactionHistoryEntry(
  row: AppIncomeTransactionHistoryRow,
): IncomeTransactionHistoryEntry {
  const currency = toCurrency(readString(row, "currency"));
  const { amountUsd, amountIqd } = readDualCurrencyAmount(
    row,
    ["amount_usd", "amountUsd"],
    ["amount_iqd", "amountIqd"],
    ["amount"],
    currency,
  );

  return {
    id: readId(row, "id"),
    incomeTransactionId: readId(row, "income_transaction_id", "incomeTransactionId"),
    action: toIncomeTransactionHistoryAction(readString(row, "change_type", "changeType", "action")),
    projectId: readNumber(row, "project_id", "projectId"),
    projectName: readString(row, "project_name", "projectName"),
    amount: readNumber(row, "amount") ?? 0,
    currency,
    amountUsd,
    amountIqd,
    description: readString(row, "description"),
    date: readDate(row, "date"),
    recordStatus: toRecordStatus(readString(row, "record_status", "recordStatus")),
    changedBy: readString(row, "changed_by", "changedBy"),
    changedByName: readString(row, "changed_by_name", "changedByName"),
    changedAt: readDate(row, "changed_at", "changedAt"),
  };
}

function normalizeDashboardOverview(row: Row): DashboardOverview {
  const projectsSummary = Array.isArray(readValue(row, "projectsSummary"))
    ? (readValue(row, "projectsSummary") as unknown[]).map((item) => {
        const data = asRow(item);
        return {
          id: readId(data, "id"),
          name: readString(data, "name") ?? "Unnamed project",
          status: toProjectStatus(readString(data, "status")),
          invoiceCount: readNumber(data, "invoiceCount", "invoice_count") ?? 0,
          totalInvoiced: readNumber(data, "totalInvoiced", "total_invoiced") ?? 0,
          totalPaid: readNumber(data, "totalPaid", "total_paid") ?? 0,
          remaining: readNumber(data, "remaining") ?? 0,
          totalInvoicedUsd:
            readNumber(data, "totalInvoicedUsd", "total_invoiced_usd") ??
            readNumber(data, "totalInvoiced", "total_invoiced") ??
            0,
          totalPaidUsd:
            readNumber(data, "totalPaidUsd", "total_paid_usd") ??
            readNumber(data, "totalPaid", "total_paid") ??
            0,
          remainingUsd:
            readNumber(data, "remainingUsd", "remaining_usd") ?? readNumber(data, "remaining") ?? 0,
          totalInvoicedIqd: readNumber(data, "totalInvoicedIqd", "total_invoiced_iqd") ?? 0,
          totalPaidIqd: readNumber(data, "totalPaidIqd", "total_paid_iqd") ?? 0,
          remainingIqd: readNumber(data, "remainingIqd", "remaining_iqd") ?? 0,
        };
      })
    : [];
  const workersSummary = Array.isArray(readValue(row, "workersSummary"))
    ? (readValue(row, "workersSummary") as unknown[]).map((item) => {
        const data = asRow(item);
        return {
          id: readId(data, "id"),
          name: readString(data, "name") ?? "Unnamed worker",
          role: readString(data, "role") ?? "-",
          balance: readNumber(data, "balance") ?? 0,
          totalCredit: readNumber(data, "totalCredit", "total_credit") ?? 0,
          totalDebit: readNumber(data, "totalDebit", "total_debit") ?? 0,
          balanceUsd: readNumber(data, "balanceUsd", "balance_usd") ?? readNumber(data, "balance") ?? 0,
          balanceIqd: readNumber(data, "balanceIqd", "balance_iqd") ?? 0,
          totalCreditUsd:
            readNumber(data, "totalCreditUsd", "total_credit_usd") ??
            readNumber(data, "totalCredit", "total_credit") ??
            0,
          totalDebitUsd:
            readNumber(data, "totalDebitUsd", "total_debit_usd") ??
            readNumber(data, "totalDebit", "total_debit") ??
            0,
          totalCreditIqd: readNumber(data, "totalCreditIqd", "total_credit_iqd") ?? 0,
          totalDebitIqd: readNumber(data, "totalDebitIqd", "total_debit_iqd") ?? 0,
        };
      })
    : [];
  const invoicesSummary = Array.isArray(readValue(row, "invoicesSummary"))
    ? (readValue(row, "invoicesSummary") as unknown[]).map((item) => {
        const data = asRow(item);
        return {
          id: readId(data, "id"),
          number: readString(data, "number") ?? "INV",
          status: toInvoiceStatus(readString(data, "status")),
          supplierName: readString(data, "supplierName", "supplier_name"),
          projectName: readString(data, "projectName", "project_name"),
          totalAmount: readNumber(data, "totalAmount", "total_amount") ?? 0,
          paidAmount: readNumber(data, "paidAmount", "paid_amount") ?? 0,
          remaining: readNumber(data, "remaining") ?? 0,
          totalAmountUsd:
            readNumber(data, "totalAmountUsd", "total_amount_usd") ??
            readNumber(data, "totalAmount", "total_amount") ??
            0,
          paidAmountUsd:
            readNumber(data, "paidAmountUsd", "paid_amount_usd") ??
            readNumber(data, "paidAmount", "paid_amount") ??
            0,
          remainingUsd: readNumber(data, "remainingUsd", "remaining_usd") ?? readNumber(data, "remaining") ?? 0,
          totalAmountIqd: readNumber(data, "totalAmountIqd", "total_amount_iqd") ?? 0,
          paidAmountIqd: readNumber(data, "paidAmountIqd", "paid_amount_iqd") ?? 0,
          remainingIqd: readNumber(data, "remainingIqd", "remaining_iqd") ?? 0,
        };
      })
    : [];

  return {
    totalWorkers: readNumber(row, "totalWorkers") ?? 0,
    activeProjects: readNumber(row, "activeProjects") ?? 0,
    totalSuppliers: readNumber(row, "totalSuppliers") ?? 0,
    invoicesUnpaid: readNumber(row, "invoicesUnpaid") ?? 0,
    totalInvoiceAmount: readNumber(row, "totalInvoiceAmount") ?? 0,
    totalPaidAmount: readNumber(row, "totalPaidAmount") ?? 0,
    remainingAmount: readNumber(row, "remainingAmount") ?? 0,
    totalInvoiceAmountUsd: readNumber(row, "totalInvoiceAmountUsd") ?? readNumber(row, "totalInvoiceAmount") ?? 0,
    totalPaidAmountUsd: readNumber(row, "totalPaidAmountUsd") ?? readNumber(row, "totalPaidAmount") ?? 0,
    remainingAmountUsd: readNumber(row, "remainingAmountUsd") ?? readNumber(row, "remainingAmount") ?? 0,
    totalInvoiceAmountIqd: readNumber(row, "totalInvoiceAmountIqd") ?? 0,
    totalPaidAmountIqd: readNumber(row, "totalPaidAmountIqd") ?? 0,
    remainingAmountIqd: readNumber(row, "remainingAmountIqd") ?? 0,
    projectsSummary,
    workersSummary,
    invoicesSummary,
  };
}

async function executeSelect<TRow extends Row, T>(
  query: PromiseLike<{ data: TRow[] | null; error: { message: string } | null }>,
  normalize: (row: TRow) => T,
) {
  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => normalize(row));
}

async function executeSingle<TRow extends Row, T>(
  query: PromiseLike<{ data: TRow | null; error: { message: string } | null }>,
  normalize: (row: TRow) => T,
) {
  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return normalize(data as TRow);
}

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }

  return data.user?.id ?? null;
}

async function currentUserIsSuperAdmin() {
  const { data, error } = await supabase.rpc("is_super_admin");
  if (error) {
    throw new Error(error.message);
  }

  return data === true;
}

async function resolveBuildingId(projectId: number | null, buildingId: number | null) {
  if (buildingId != null) {
    return buildingId;
  }

  if (projectId == null) {
    throw new Error("Project is required for this transaction.");
  }

  const { data, error } = await supabase
    .from("project_buildings")
    .select("id")
    .eq("project_id", projectId)
    .order("is_default", { ascending: false })
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const id = readNumber(asRow(data), "id");
  if (id == null) {
    throw new Error("Project has no building configured.");
  }

  return id;
}

async function replaceTransactionPhoto(transactionId: number, imagePath: string | null, userId: string | null) {
  const { error: deleteError } = await supabase
    .from("transaction_photos")
    .delete()
    .eq("transaction_id", transactionId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (!imagePath) {
    return;
  }

  const { error: insertError } = await supabase.from("transaction_photos").insert({
    transaction_id: transactionId,
    storage_path: imagePath,
    created_by: userId,
  });

  if (insertError) {
    throw new Error(insertError.message);
  }
}

async function hydrateInvoices(invoices: Invoice[]) {
  const urlsByPath = await createSignedInvoiceImageUrls(invoices.map((invoice) => invoice.imagePath));

  return invoices.map((invoice) => ({
    ...invoice,
    imageUrl: invoice.imageUrl ?? (invoice.imagePath ? urlsByPath.get(invoice.imagePath) ?? null : null),
  }));
}

async function hydrateInvoiceHistory(entries: InvoiceHistoryEntry[]) {
  const urlsByPath = await createSignedInvoiceImageUrls(entries.map((entry) => entry.imagePath));

  return entries.map((entry) => ({
    ...entry,
    imageUrl: entry.imageUrl ?? (entry.imagePath ? urlsByPath.get(entry.imagePath) ?? null : null),
  }));
}

async function getDashboardOverviewFallback(projectId?: number | null): Promise<DashboardOverview> {
  const [workers, projects, suppliers, invoices, transactions] = await Promise.all([
    listWorkers(),
    listProjects(),
    listSuppliers(),
    listInvoices(),
    listWorkerTransactions(),
  ]);

  const visibleProjects = projectId == null ? projects : projects.filter((project) => project.id === projectId);
  const activeInvoices = invoices.filter(
    (invoice) => invoice.recordStatus === "active" && (projectId == null || invoice.projectId === projectId),
  );
  const visibleTransactions = transactions.filter(
    (transaction) => projectId == null || transaction.projectId === projectId,
  );
  const totalInvoiceAmount = activeInvoices.reduce((total, invoice) => total + invoice.totalAmount, 0);
  const totalPaidAmount = activeInvoices.reduce((total, invoice) => total + invoice.paidAmount, 0);
  const remainingAmount = activeInvoices.reduce((total, invoice) => total + invoice.remainingAmount, 0);
  const totalInvoiceAmountUsd = activeInvoices.reduce((total, invoice) => total + invoice.totalAmountUsd, 0);
  const totalPaidAmountUsd = activeInvoices.reduce((total, invoice) => total + invoice.paidAmountUsd, 0);
  const remainingAmountUsd = activeInvoices.reduce((total, invoice) => total + invoice.remainingAmountUsd, 0);
  const totalInvoiceAmountIqd = activeInvoices.reduce((total, invoice) => total + invoice.totalAmountIqd, 0);
  const totalPaidAmountIqd = activeInvoices.reduce((total, invoice) => total + invoice.paidAmountIqd, 0);
  const remainingAmountIqd = activeInvoices.reduce((total, invoice) => total + invoice.remainingAmountIqd, 0);

  const projectsSummary = visibleProjects
    .map((project) => {
      const relatedInvoices = activeInvoices.filter((invoice) => invoice.projectId === project.id);
      const totalInvoiced = relatedInvoices.reduce((total, invoice) => total + invoice.totalAmount, 0);
      const totalPaid = relatedInvoices.reduce((total, invoice) => total + invoice.paidAmount, 0);
      const totalInvoicedUsd = relatedInvoices.reduce((total, invoice) => total + invoice.totalAmountUsd, 0);
      const totalPaidUsd = relatedInvoices.reduce((total, invoice) => total + invoice.paidAmountUsd, 0);
      const totalInvoicedIqd = relatedInvoices.reduce((total, invoice) => total + invoice.totalAmountIqd, 0);
      const totalPaidIqd = relatedInvoices.reduce((total, invoice) => total + invoice.paidAmountIqd, 0);

      return {
        id: project.id,
        name: project.name,
        status: project.status,
        invoiceCount: relatedInvoices.length,
        totalInvoiced,
        totalPaid,
        remaining: Math.max(0, totalInvoiced - totalPaid),
        totalInvoicedUsd,
        totalPaidUsd,
        remainingUsd: Math.max(0, totalInvoicedUsd - totalPaidUsd),
        totalInvoicedIqd,
        totalPaidIqd,
        remainingIqd: Math.max(0, totalInvoicedIqd - totalPaidIqd),
      };
    })
    .sort(
      (left, right) =>
        right.remainingUsd - left.remainingUsd ||
        right.remainingIqd - left.remainingIqd ||
        left.name.localeCompare(right.name),
    );

  const workersSummary = workers
    .map((worker) => {
      const relatedTransactions = visibleTransactions.filter((transaction) => transaction.workerId === worker.id);
      return {
        id: worker.id,
        name: worker.name,
        role: worker.role,
        balance: worker.balance,
        balanceUsd: worker.balanceUsd,
        balanceIqd: worker.balanceIqd,
        totalCredit: relatedTransactions
          .filter((transaction) => transaction.type === "credit")
          .reduce((total, transaction) => total + transaction.amount, 0),
        totalDebit: relatedTransactions
          .filter((transaction) => transaction.type === "debit")
          .reduce((total, transaction) => total + transaction.amount, 0),
        totalCreditUsd: relatedTransactions
          .filter((transaction) => transaction.type === "credit")
          .reduce((total, transaction) => total + transaction.amountUsd, 0),
        totalDebitUsd: relatedTransactions
          .filter((transaction) => transaction.type === "debit")
          .reduce((total, transaction) => total + transaction.amountUsd, 0),
        totalCreditIqd: relatedTransactions
          .filter((transaction) => transaction.type === "credit")
          .reduce((total, transaction) => total + transaction.amountIqd, 0),
        totalDebitIqd: relatedTransactions
          .filter((transaction) => transaction.type === "debit")
          .reduce((total, transaction) => total + transaction.amountIqd, 0),
      };
    })
    .sort(
      (left, right) =>
        Math.abs(right.balanceUsd) - Math.abs(left.balanceUsd) ||
        Math.abs(right.balanceIqd) - Math.abs(left.balanceIqd),
    );

  const invoicesSummary = [...activeInvoices]
    .sort(
      (left, right) =>
        right.remainingAmountUsd - left.remainingAmountUsd ||
        right.remainingAmountIqd - left.remainingAmountIqd ||
        left.number.localeCompare(right.number),
    )
    .map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      supplierName: invoice.supplierName,
      projectName: invoice.projectName,
      totalAmount: invoice.totalAmount,
      paidAmount: invoice.paidAmount,
      remaining: invoice.remainingAmount,
      totalAmountUsd: invoice.totalAmountUsd,
      paidAmountUsd: invoice.paidAmountUsd,
      remainingUsd: invoice.remainingAmountUsd,
      totalAmountIqd: invoice.totalAmountIqd,
      paidAmountIqd: invoice.paidAmountIqd,
      remainingIqd: invoice.remainingAmountIqd,
    }));

  return {
    totalWorkers: workers.length,
    activeProjects: visibleProjects.filter((project) => project.status === "active").length,
    totalSuppliers: suppliers.length,
    invoicesUnpaid: activeInvoices.filter((invoice) => invoice.status !== "paid").length,
    totalInvoiceAmount,
    totalPaidAmount,
    remainingAmount,
    totalInvoiceAmountUsd,
    totalPaidAmountUsd,
    remainingAmountUsd,
    totalInvoiceAmountIqd,
    totalPaidAmountIqd,
    remainingAmountIqd,
    projectsSummary,
    workersSummary,
    invoicesSummary,
  };
}

function normalizeWorkerInput(input: WorkerInput): WorkerWritePayload {
  return {
    name: input.name.trim(),
    role: input.role.trim(),
    category: normalizeOptionalText(input.category),
    phone: normalizeOptionalText(input.phone),
  };
}

function normalizeSupplierInput(input: SupplierInput): SupplierWritePayload {
  return {
    name: input.name.trim(),
    contact: normalizeOptionalText(input.contact),
    phone: normalizeOptionalText(input.phone),
    email: normalizeOptionalText(input.email),
    address: normalizeOptionalText(input.address),
  };
}

function normalizeProjectInput(input: ProjectInput) {
  validateProjectPayload({
    budget: input.budget,
    startDate: input.startDate,
    endDate: input.endDate,
  });

  return {
    name: input.name.trim(),
    client: normalizeOptionalText(input.client),
    location: normalizeOptionalText(input.location),
    status: input.status,
    budget: input.budget,
    startDate: input.startDate,
    endDate: input.endDate,
    buildings: input.buildings.map((building) => building.trim()).filter(Boolean),
  };
}

function normalizeProductInput(input: ProductInput): ProductWritePayload {
  const unitPriceUsd = input.unitPriceUsd ?? 0;
  const unitPriceIqd = input.unitPriceIqd ?? 0;
  const currency = pickPrimaryCurrency(unitPriceUsd, unitPriceIqd);
  const unitPrice =
    unitPriceUsd === 0 && unitPriceIqd === 0 ? input.unitPrice ?? null : pickPrimaryAmount(unitPriceUsd, unitPriceIqd);

  assertNonNegativeAmount(unitPriceUsd, "Unit price USD");
  assertNonNegativeAmount(unitPriceIqd, "Unit price IQD");

  return {
    name: input.name.trim(),
    supplier_id: input.supplierId,
    project_id: input.projectId,
    building_id: input.buildingId,
    unit: normalizeOptionalText(input.unit),
    unit_price: unitPrice,
    currency,
    unit_price_usd: unitPriceUsd,
    unit_price_iqd: unitPriceIqd,
  };
}

function normalizeInvoiceInput(input: InvoiceInput) {
  const invoiceDate = input.invoiceDate ?? new Date().toISOString().slice(0, 10);
  const totalAmountUsd = input.totalAmountUsd ?? 0;
  const paidAmountUsd = input.paidAmountUsd ?? 0;
  const totalAmountIqd = input.totalAmountIqd ?? 0;
  const paidAmountIqd = input.paidAmountIqd ?? 0;
  const currency = pickPrimaryCurrency(totalAmountUsd, totalAmountIqd);
  const totalAmount = pickPrimaryAmount(totalAmountUsd, totalAmountIqd);
  const paidAmount = currency === "USD" ? paidAmountUsd : paidAmountIqd;

  validateDualCurrencyInvoiceInput({
    totalAmountUsd,
    paidAmountUsd,
    totalAmountIqd,
    paidAmountIqd,
    invoiceDate,
    dueDate: input.dueDate,
  });

  const laborPersonName = normalizeOptionalText(input.laborPersonName);
  if (input.expenseType === "labor" && input.laborWorkerId == null) {
    throw new Error("Worker is required.");
  }

  if (input.expenseType === "products" && input.supplierId == null) {
    throw new Error("Supplier is required.");
  }

  return {
    number: input.number.trim(),
    expenseType: input.expenseType,
    laborWorkerId: input.expenseType === "labor" ? input.laborWorkerId : null,
    laborPersonName: input.expenseType === "labor" ? laborPersonName : null,
    supplierId: input.expenseType === "products" ? input.supplierId : null,
    projectId: input.projectId,
    buildingId: input.buildingId,
    productId: input.expenseType === "products" ? input.productId : null,
    totalAmount,
    paidAmount,
    currency,
    totalAmountUsd,
    paidAmountUsd,
    totalAmountIqd,
    paidAmountIqd,
    status: deriveDualCurrencyInvoiceStatus(
      totalAmountUsd,
      paidAmountUsd,
      totalAmountIqd,
      paidAmountIqd,
      input.status,
    ),
    invoiceDate,
    dueDate: input.dueDate,
    notes: normalizeOptionalText(input.notes),
    imagePath: normalizeOptionalText(input.imagePath),
  };
}

async function buildInvoiceTransactionPayload(
  input: InvoiceInput,
  userId: string | null,
  action: "create" | "update",
) {
  const normalized = normalizeInvoiceInput(input);
  const buildingId = await resolveBuildingId(normalized.projectId, normalized.buildingId);
  const entryType: PartyTransactionWritePayload["entry_type"] =
    normalized.status === "paid" ? "payment" : "debt";

  const payload: PartyTransactionWritePayload = {
    entry_type: entryType,
    entity_type:
      normalized.expenseType === "labor"
        ? "worker"
        : normalized.expenseType === "products"
          ? "supplier"
          : "other",
    worker_id: normalized.expenseType === "labor" ? normalized.laborWorkerId : null,
    supplier_id: normalized.expenseType === "products" ? normalized.supplierId : null,
    building_id: buildingId,
    amount: normalized.totalAmount,
    currency: normalized.currency,
    amount_usd: normalized.totalAmountUsd,
    amount_iqd: normalized.totalAmountIqd,
    description: normalized.number,
    notes: normalized.notes,
    date: normalized.invoiceDate,
    ...(action === "create" ? { created_by: userId } : { updated_by: userId }),
  };

  return {
    payload,
    imagePath: normalized.imagePath,
  };
}

function normalizePartyTransactionInput(input: {
  partyId: number;
  partyType: PartyType;
  type: TransactionType;
  amountUsd: number;
  amountIqd: number;
  description: string | null;
  date: string | null;
  buildingId: number;
}) {
  const amountUsd = input.amountUsd ?? 0;
  const amountIqd = input.amountIqd ?? 0;
  const currency = pickPrimaryCurrency(amountUsd, amountIqd);

  assertPositiveDualCurrencyAmount(amountUsd, amountIqd, "Transaction amount");

  const payload: PartyTransactionWritePayload = {
    entry_type: input.type === "credit" ? "debt" : "payment",
    entity_type: input.partyType,
    worker_id: input.partyType === "worker" ? input.partyId : null,
    supplier_id: input.partyType === "supplier" ? input.partyId : null,
    building_id: input.buildingId,
    amount: pickPrimaryAmount(amountUsd, amountIqd),
    currency,
    amount_usd: amountUsd,
    amount_iqd: amountIqd,
    description: normalizeOptionalText(input.description) ?? defaultTransactionDescription(input.type),
    notes: null,
    date: input.date ?? new Date().toISOString().slice(0, 10),
  };

  return payload;
}

function defaultTransactionDescription(transactionType: TransactionType): string {
  return transactionType === "credit" ? "Credit" : "Debit";
}

function assertAmountWithinLimit(
  amount: number,
  min: number | null,
  max: number | null,
  label: string,
) {
  if (amount <= 0) {
    return;
  }

  if (min != null && amount < min) {
    throw new Error(`${label} must be at least ${min}.`);
  }

  if (max != null && amount > max) {
    throw new Error(`${label} must be at most ${max}.`);
  }
}

function assertTransactionAmountLimits(input: {
  amountUsd: number;
  amountIqd: number;
  settings: AppSettings;
}) {
  assertAmountWithinLimit(
    input.amountUsd,
    input.settings.transactionAmountMinUsd,
    input.settings.transactionAmountMaxUsd,
    "Transaction amount USD",
  );
  assertAmountWithinLimit(
    input.amountIqd,
    input.settings.transactionAmountMinIqd,
    input.settings.transactionAmountMaxIqd,
    "Transaction amount IQD",
  );
}

function normalizeIncomeTransactionInput(input: IncomeTransactionInput) {
  const amountUsd = input.amountUsd ?? 0;
  const amountIqd = input.amountIqd ?? 0;
  const currency = pickPrimaryCurrency(amountUsd, amountIqd);

  assertPositiveDualCurrencyAmount(amountUsd, amountIqd, "Income amount");

  const payload: IncomeTransactionWritePayload = {
    project_id: input.projectId,
    amount: pickPrimaryAmount(amountUsd, amountIqd),
    currency,
    amount_usd: amountUsd,
    amount_iqd: amountIqd,
    description: normalizeOptionalText(input.description),
    date: input.date ?? new Date().toISOString().slice(0, 10),
  };

  return payload;
}

export async function getMyProfile() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return null;
  }

  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }

  return data ? normalizeProfile(data) : null;
}

export async function getAppSettings() {
  const { data, error } = await supabase
    .from("app_settings")
    .select("*")
    .eq("id", "default")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const fallbackSettingsRow: AppSettingsRow = {
    id: "default",
    company_logo_path: null,
    exchange_rate_iqd_per_100_usd: null,
    transaction_amount_min_usd: null,
    transaction_amount_max_usd: null,
    transaction_amount_min_iqd: null,
    transaction_amount_max_iqd: null,
    updated_at: "",
    updated_by: null,
  };

  return normalizeAppSettings(data ?? fallbackSettingsRow);
}

export async function updateCompanyLogoPath(companyLogoPath: string | null) {
  const currentUserId = await getCurrentUserId();
  const payload: AppSettingsUpsertPayload = {
    id: "default",
    company_logo_path: companyLogoPath,
    exchange_rate_iqd_per_100_usd: undefined,
    transaction_amount_min_usd: undefined,
    transaction_amount_max_usd: undefined,
    transaction_amount_min_iqd: undefined,
    transaction_amount_max_iqd: undefined,
    updated_by: currentUserId,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("app_settings").upsert(payload, {
    onConflict: "id",
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateExchangeRateIqdPer100Usd(exchangeRateIqdPer100Usd: number | null) {
  if (
    exchangeRateIqdPer100Usd == null ||
    exchangeRateIqdPer100Usd < 100_000 ||
    exchangeRateIqdPer100Usd > 1_000_000
  ) {
    throw new Error("Exchange rate must be between 100,000 and 1,000,000 IQD.");
  }

  const currentUserId = await getCurrentUserId();
  const payload: AppSettingsUpsertPayload = {
    id: "default",
    company_logo_path: undefined,
    exchange_rate_iqd_per_100_usd: exchangeRateIqdPer100Usd,
    transaction_amount_min_usd: undefined,
    transaction_amount_max_usd: undefined,
    transaction_amount_min_iqd: undefined,
    transaction_amount_max_iqd: undefined,
    updated_by: currentUserId,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("app_settings").upsert(payload, {
    onConflict: "id",
  });

  if (error) {
    throw new Error(error.message);
  }
}

function validateTransactionAmountLimits(input: TransactionAmountLimitsInput) {
  const entries = [
    ["Minimum USD", input.transactionAmountMinUsd],
    ["Maximum USD", input.transactionAmountMaxUsd],
    ["Minimum IQD", input.transactionAmountMinIqd],
    ["Maximum IQD", input.transactionAmountMaxIqd],
  ] as const;

  for (const [label, value] of entries) {
    if (value != null && (!Number.isFinite(value) || value < 0)) {
      throw new Error(`${label} must be zero or greater.`);
    }
  }

  if (
    input.transactionAmountMinUsd != null &&
    input.transactionAmountMaxUsd != null &&
    input.transactionAmountMinUsd > input.transactionAmountMaxUsd
  ) {
    throw new Error("Minimum USD cannot be greater than maximum USD.");
  }

  if (
    input.transactionAmountMinIqd != null &&
    input.transactionAmountMaxIqd != null &&
    input.transactionAmountMinIqd > input.transactionAmountMaxIqd
  ) {
    throw new Error("Minimum IQD cannot be greater than maximum IQD.");
  }
}

export async function updateTransactionAmountLimits(input: TransactionAmountLimitsInput) {
  validateTransactionAmountLimits(input);

  const currentUserId = await getCurrentUserId();
  const payload: AppSettingsUpsertPayload = {
    id: "default",
    company_logo_path: undefined,
    exchange_rate_iqd_per_100_usd: undefined,
    transaction_amount_min_usd: input.transactionAmountMinUsd,
    transaction_amount_max_usd: input.transactionAmountMaxUsd,
    transaction_amount_min_iqd: input.transactionAmountMinIqd,
    transaction_amount_max_iqd: input.transactionAmountMaxIqd,
    updated_by: currentUserId,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("app_settings").upsert(payload, {
    onConflict: "id",
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function listProfiles() {
  return executeSelect(
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    normalizeProfile,
  );
}

export async function updateProfileRole(id: string, role: UserRole) {
  const payload: ProfileRoleUpdatePayload = { role };
  const { error } = await supabase.from("profiles").update(payload).eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function updateProfileName(id: string, fullName: string) {
  const trimmedFullName = fullName.trim();
  if (!trimmedFullName) {
    throw new Error("Full name is required.");
  }

  const payload: ProfileNameUpdatePayload = { full_name: trimmedFullName };
  const { error } = await supabase.from("profiles").update(payload).eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function updateMySelectedProjectId(projectId: number | null) {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    throw new Error("User is not authenticated.");
  }

  const payload: ProfileSelectedProjectUpdatePayload = { selected_project_id: projectId };
  const { error } = await supabase.from("profiles").update(payload).eq("id", currentUserId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function listProjectMemberships() {
  return executeSelect(
    supabase.from("project_memberships").select("*").order("created_at", { ascending: false }),
    normalizeProjectMembership,
  );
}

export async function replaceUserProjectMemberships(userId: string, projectIds: number[]) {
  const args: ReplaceUserProjectMembershipsArgs = {
    p_user_id: userId,
    p_project_ids: projectIds,
  };
  const { error } = await supabase.rpc("replace_user_project_memberships", args);
  if (error) {
    throw new Error(error.message);
  }
}

export async function listWorkers() {
  return executeSelect(
    supabase.from("app_workers").select("*").order("created_at", { ascending: false }),
    normalizeWorker,
  );
}

export async function getWorker(id: number): Promise<Worker> {
  // Fetch worker data
  const worker = await executeSingle(
    supabase.from("app_workers").select("*").eq("id", id).single(),
    normalizeWorker
  );

  // Fetch worker transactions to calculate balance
  const transactions = await listWorkerTransactions(id);

  // Calculate balance from transactions (credit - debit)
  const balanceUsd = transactions.reduce(
    (sum, t) => sum + (t.type === "credit" ? t.amountUsd : -t.amountUsd),
    0
  );
  const balanceIqd = transactions.reduce(
    (sum, t) => sum + (t.type === "credit" ? t.amountIqd : -t.amountIqd),
    0
  );

  return {
    ...worker,
    balance: balanceUsd, // Legacy single currency balance
    balanceUsd,
    balanceIqd,
  };
}

export async function createWorker(input: WorkerInput) {
  const payload = normalizeWorkerInput(input);
  const { error } = await supabase.from("workers").insert(payload);
  if (error) {
    throw new Error(error.message);
  }
}

export async function updateWorker(id: number, input: WorkerInput) {
  const payload = normalizeWorkerInput(input);
  const { error } = await supabase.from("workers").update(payload).eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteWorker(id: number) {
  const { error } = await supabase.from("workers").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function listSuppliers() {
  return executeSelect(
    supabase.from("app_suppliers").select("*").order("created_at", { ascending: false }),
    normalizeSupplier,
  );
}

export async function getSupplier(id: number) {
  return executeSingle(supabase.from("app_suppliers").select("*").eq("id", id).single(), normalizeSupplier);
}

export async function listSupplierBalances(): Promise<SupplierBalance[]> {
  const transactionBalances = await executeSelect(
    supabase
      .from("app_supplier_transactions")
      .select("supplier_id,type,amount_usd,amount_iqd"),
    (row: Row) => ({
      supplierId: readNumber(row, "supplier_id", "supplierId"),
      balanceUsd:
        (readString(row, "type") === "debit" ? -1 : 1) *
        (readNumber(row, "amount_usd", "amountUsd") ?? 0),
      balanceIqd:
        (readString(row, "type") === "debit" ? -1 : 1) *
        (readNumber(row, "amount_iqd", "amountIqd") ?? 0),
    }),
  );
  const balancesBySupplier = new Map<number, { balanceUsd: number; balanceIqd: number }>();

  for (const balance of transactionBalances) {
    if (balance.supplierId == null) {
      continue;
    }

    const current = balancesBySupplier.get(balance.supplierId) ?? { balanceUsd: 0, balanceIqd: 0 };
    balancesBySupplier.set(balance.supplierId, {
      balanceUsd: current.balanceUsd + balance.balanceUsd,
      balanceIqd: current.balanceIqd + balance.balanceIqd,
    });
  }

  return Array.from(balancesBySupplier, ([supplierId, balance]) => ({
    supplierId,
    balanceUsd: balance.balanceUsd,
    balanceIqd: balance.balanceIqd,
  }));
}

export async function listWorkerBalances(): Promise<WorkerBalance[]> {
  const transactionBalances = await executeSelect(
    supabase
      .from("app_party_transactions")
      .select("worker_id,type,amount_usd,amount_iqd")
      .eq("party_type", "worker"),
    (row: Row) => ({
      workerId: readNumber(row, "worker_id", "workerId"),
      balanceUsd:
        (readString(row, "type") === "credit" ? 1 : -1) *
        (readNumber(row, "amount_usd", "amountUsd") ?? 0),
      balanceIqd:
        (readString(row, "type") === "credit" ? 1 : -1) *
        (readNumber(row, "amount_iqd", "amountIqd") ?? 0),
    }),
  );
  const balancesByWorker = new Map<number, { balanceUsd: number; balanceIqd: number }>();

  for (const balance of transactionBalances) {
    if (balance.workerId == null) {
      continue;
    }

    const current = balancesByWorker.get(balance.workerId) ?? { balanceUsd: 0, balanceIqd: 0 };
    balancesByWorker.set(balance.workerId, {
      balanceUsd: current.balanceUsd + balance.balanceUsd,
      balanceIqd: current.balanceIqd + balance.balanceIqd,
    });
  }

  return Array.from(balancesByWorker, ([workerId, balance]) => ({
    workerId,
    balanceUsd: balance.balanceUsd,
    balanceIqd: balance.balanceIqd,
  }));
}

export async function createSupplier(input: SupplierInput) {
  const payload = normalizeSupplierInput(input);
  const { error } = await supabase.from("suppliers").insert(payload);
  if (error) {
    throw new Error(error.message);
  }
}

export async function updateSupplier(id: number, input: SupplierInput) {
  const payload = normalizeSupplierInput(input);
  const { error } = await supabase.from("suppliers").update(payload).eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteSupplier(id: number) {
  const { error } = await supabase.from("suppliers").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function listProjects() {
  return executeSelect(
    supabase.from("app_projects").select("*").order("created_at", { ascending: false }),
    normalizeProject,
  );
}

export async function getProject(id: number) {
  return executeSingle(supabase.from("app_projects").select("*").eq("id", id).single(), normalizeProject);
}

export async function listProjectBuildings(projectId?: number) {
  let query: any = supabase
    .from("project_buildings")
    .select("*")
    .order("created_at", { ascending: true });

  if (projectId != null) {
    query = query.eq("project_id", projectId);
  }

  return executeSelect(query, normalizeProjectBuilding);
}

export async function createProject(input: ProjectInput) {
  const payload = normalizeProjectInput(input);
  const { error } = await supabase.rpc("save_project_with_buildings", {
    p_id: null,
    p_name: payload.name,
    p_client: payload.client,
    p_location: payload.location,
    p_status: payload.status,
    p_budget: payload.budget,
    p_start_date: payload.startDate,
    p_end_date: payload.endDate,
    p_building_names: payload.buildings,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateProject(id: number, input: ProjectInput) {
  const payload = normalizeProjectInput(input);
  const { error } = await supabase.rpc("save_project_with_buildings", {
    p_id: id,
    p_name: payload.name,
    p_client: payload.client,
    p_location: payload.location,
    p_status: payload.status,
    p_budget: payload.budget,
    p_start_date: payload.startDate,
    p_end_date: payload.endDate,
    p_building_names: payload.buildings,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteProject(id: number) {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function listWorkerTransactions(workerId?: number) {
  let query: any = supabase
    .from("app_party_transactions")
    .select("*")
    .eq("party_type", "worker")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (workerId != null) {
    query = query.eq("worker_id", workerId);
  }

  return executeSelect(query, normalizePartyTransactionRow);
}

export async function createWorkerTransaction(input: WorkerTransactionInput) {
  const settings = await getAppSettings();
  assertTransactionAmountLimits({
    amountUsd: input.amountUsd,
    amountIqd: input.amountIqd,
    settings,
  });
  const buildingId = await resolveBuildingId(input.projectId, null);
  const payload = normalizePartyTransactionInput({
    partyId: input.workerId,
    partyType: "worker",
    type: input.type,
    amountUsd: input.amountUsd,
    amountIqd: input.amountIqd,
    description: input.description,
    date: input.date,
    buildingId,
  });
  const { error } = await supabase.from("party_transactions").insert(payload);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateWorkerTransaction(id: number, input: WorkerTransactionInput) {
  const currentUserId = await getCurrentUserId();
  const buildingId = await resolveBuildingId(input.projectId, null);
  const payload = normalizePartyTransactionInput({
    partyId: input.workerId,
    partyType: "worker",
    type: input.type,
    amountUsd: input.amountUsd,
    amountIqd: input.amountIqd,
    description: input.description,
    date: input.date,
    buildingId,
  });
  const { error } = await supabase
    .from("party_transactions")
    .update({ ...payload, updated_by: currentUserId })
    .eq("id", id)
    .eq("entity_type", "worker")
    .is("deleted_at", null);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteWorkerTransaction(id: number) {
  const currentUserId = await getCurrentUserId();
  const { error } = await supabase
    .from("party_transactions")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: currentUserId,
    } satisfies SoftDeletePayload)
    .eq("id", id)
    .eq("entity_type", "worker")
    .is("deleted_at", null);

  if (error) {
    throw new Error(error.message);
  }
}

export async function listSupplierTransactions(supplierId?: number) {
  let query: any = supabase
    .from("app_supplier_transactions")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (supplierId != null) {
    query = query.eq("supplier_id", supplierId);
  }

  return executeSelect(query, normalizeSupplierTransaction);
}

export async function createSupplierTransaction(input: SupplierTransactionInput) {
  const settings = await getAppSettings();
  assertTransactionAmountLimits({
    amountUsd: input.amountUsd,
    amountIqd: input.amountIqd,
    settings,
  });
  const buildingId = await resolveBuildingId(input.projectId, null);
  const payload = normalizePartyTransactionInput({
    partyId: input.supplierId,
    partyType: "supplier",
    type: input.type,
    amountUsd: input.amountUsd,
    amountIqd: input.amountIqd,
    description: input.description,
    date: input.date,
    buildingId,
  });
  const { error } = await supabase.from("party_transactions").insert(payload);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateSupplierTransaction(id: number, input: SupplierTransactionInput) {
  const currentUserId = await getCurrentUserId();
  const buildingId = await resolveBuildingId(input.projectId, null);
  const payload = normalizePartyTransactionInput({
    partyId: input.supplierId,
    partyType: "supplier",
    type: input.type,
    amountUsd: input.amountUsd,
    amountIqd: input.amountIqd,
    description: input.description,
    date: input.date,
    buildingId,
  });
  const { error } = await supabase
    .from("party_transactions")
    .update({ ...payload, updated_by: currentUserId })
    .eq("id", id)
    .eq("entity_type", "supplier")
    .is("deleted_at", null);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteSupplierTransaction(id: number) {
  const currentUserId = await getCurrentUserId();
  const { error } = await supabase
    .from("party_transactions")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: currentUserId,
    } satisfies SoftDeletePayload)
    .eq("id", id)
    .eq("entity_type", "supplier")
    .is("deleted_at", null);

  if (error) {
    throw new Error(error.message);
  }
}

export async function listProducts() {
  return executeSelect(
    supabase.from("app_products").select("*").order("created_at", { ascending: false }),
    normalizeProduct,
  );
}

export async function createProduct(input: ProductInput) {
  const payload = normalizeProductInput(input);
  const { error } = await supabase.from("materials").insert(payload);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateProduct(id: number, input: ProductInput) {
  const payload = normalizeProductInput(input);
  const { error } = await supabase.from("materials").update(payload).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteProduct(id: number) {
  const { error } = await supabase.from("materials").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function listInvoices() {
  const rows = await executeSelect(
    supabase
      .from("app_invoices")
      .select("*")
      .order("invoice_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
    normalizeInvoice,
  );

  return hydrateInvoices(rows);
}

export async function getInvoice(id: number) {
  const invoice = await executeSingle(
    supabase.from("app_invoices").select("*").eq("id", id).single(),
    normalizeInvoice,
  );

  if (!invoice.imageUrl && invoice.imagePath) {
    return {
      ...invoice,
      imageUrl: await createSignedInvoiceImageUrl(invoice.imagePath),
    };
  }

  return invoice;
}

export async function listInvoiceHistory(invoiceId: number) {
  const rows = await executeSelect(
    supabase
      .from("app_invoice_history")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("changed_at", { ascending: true })
      .order("id", { ascending: true }),
    normalizeInvoiceHistoryEntry,
  );

  return hydrateInvoiceHistory(rows);
}

export async function createInvoice(input: InvoiceInput) {
  const currentUserId = await getCurrentUserId();
  const { payload, imagePath } = await buildInvoiceTransactionPayload(input, currentUserId, "create");
  const { data, error } = await supabase
    .from("party_transactions")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const transactionId = readNumber(asRow(data), "id");
  if (transactionId != null) {
    await replaceTransactionPhoto(transactionId, imagePath, currentUserId);
  }
}

export async function updateInvoice(id: number, input: InvoiceInput) {
  const currentUserId = await getCurrentUserId();
  const { payload, imagePath } = await buildInvoiceTransactionPayload(input, currentUserId, "update");
  const { error } = await supabase
    .from("party_transactions")
    .update(payload)
    .eq("id", id)
    .is("deleted_at", null);

  if (error) {
    throw new Error(error.message);
  }

  await replaceTransactionPhoto(id, imagePath, currentUserId);
}

export async function markInvoicePaid(id: number, amounts: { totalAmountUsd: number; totalAmountIqd: number }) {
  const currentUserId = await getCurrentUserId();
  const currency = pickPrimaryCurrency(amounts.totalAmountUsd, amounts.totalAmountIqd);
  const payload: InvoicePaidUpdatePayload = {
    entry_type: "payment",
    amount: pickPrimaryAmount(amounts.totalAmountUsd, amounts.totalAmountIqd),
    currency,
    amount_usd: amounts.totalAmountUsd,
    amount_iqd: amounts.totalAmountIqd,
    updated_by: currentUserId,
  };
  const { error } = await supabase
    .from("party_transactions")
    .update(payload)
    .eq("id", id)
    .is("deleted_at", null);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteInvoice(id: number) {
  if (await currentUserIsSuperAdmin()) {
    await replaceTransactionPhoto(id, null, null);
    const { error } = await supabase.from("party_transactions").delete().eq("id", id);
    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  const currentUserId = await getCurrentUserId();
  const payload: SoftDeletePayload = {
    deleted_at: new Date().toISOString(),
    deleted_by: currentUserId,
  };
  const { error } = await supabase
    .from("party_transactions")
    .update(payload)
    .eq("id", id)
    .is("deleted_at", null);
  if (error) {
    throw new Error(error.message);
  }
}

export async function listIncomeTransactions() {
  return executeSelect(
    supabase
      .from("app_income_transactions")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
    normalizeIncomeTransaction,
  );
}

export async function listIncomeTransactionHistory() {
  return executeSelect(
    supabase
      .from("app_income_transaction_history")
      .select("*")
      .order("changed_at", { ascending: false })
      .order("id", { ascending: false }),
    normalizeIncomeTransactionHistoryEntry,
  );
}

export async function createIncomeTransaction(input: IncomeTransactionInput) {
  const currentUserId = await getCurrentUserId();
  const settings = await getAppSettings();
  assertTransactionAmountLimits({
    amountUsd: input.amountUsd,
    amountIqd: input.amountIqd,
    settings,
  });
  const payload: IncomeTransactionCreatePayload = {
    ...normalizeIncomeTransactionInput(input),
    created_by: currentUserId,
  };
  const { error } = await supabase.from("income_transactions").insert(payload);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateIncomeTransaction(id: number, input: IncomeTransactionInput) {
  const currentUserId = await getCurrentUserId();
  const settings = await getAppSettings();
  assertTransactionAmountLimits({
    amountUsd: input.amountUsd,
    amountIqd: input.amountIqd,
    settings,
  });
  const payload = normalizeIncomeTransactionInput(input);
  const { error } = await supabase
    .from("income_transactions")
    .update({ ...payload, updated_by: currentUserId })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteIncomeTransaction(id: number) {
  if (await currentUserIsSuperAdmin()) {
    const { error } = await supabase.from("income_transactions").delete().eq("id", id);
    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  const currentUserId = await getCurrentUserId();
  const payload: SoftDeletePayload = {
    deleted_at: new Date().toISOString(),
    deleted_by: currentUserId,
  };
  const { error } = await supabase
    .from("income_transactions")
    .update(payload)
    .eq("id", id)
    .is("deleted_at", null);

  if (error) {
    throw new Error(error.message);
  }
}

// Unified expense functions
export async function listAllExpenses(options?: {
  partyType?: PartyType;
  partyId?: number;
  projectId?: number;
}) {
  let query: any = supabase
    .from("all_expenses")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (options?.partyType && options?.partyId != null) {
    query = query.eq("party_type", options.partyType).eq(options.partyType === "worker" ? "labor_worker_id" : "supplier_id", options.partyId);
  }

  if (options?.projectId != null) {
    query = query.eq("project_id", options.projectId);
  }

  return executeSelect(query, normalizeAllExpense);
}

export async function listExpensesByWorker(workerId: number) {
  return listAllExpenses({ partyType: "worker", partyId: workerId });
}

export async function listExpensesBySupplier(supplierId: number) {
  return listAllExpenses({ partyType: "supplier", partyId: supplierId });
}

export async function listExpensesByProject(projectId: number) {
  return listAllExpenses({ projectId });
}

export async function getDashboardOverview(projectId?: number | null): Promise<DashboardOverview> {
  if (projectId != null) {
    return getDashboardOverviewFallback(projectId);
  }

  const { data, error } = await supabase.rpc("get_dashboard_overview");

  if (error) {
    return getDashboardOverviewFallback();
  }

  const overview = data as DashboardOverviewRpcResult;
  return normalizeDashboardOverview(asRow(overview));
}

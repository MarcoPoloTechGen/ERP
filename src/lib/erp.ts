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
  assertPositiveAmount,
  deriveInvoiceStatus,
  normalizeOptionalText,
  validateInvoiceInput,
  validateProjectInput as validateProjectPayload,
} from "@/lib/validation";

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
type WorkerRow = TableRow<"workers">;
type SupplierRow = TableRow<"suppliers">;
type ProjectBuildingRow = TableRow<"project_buildings">;
type AppProjectRow = ViewRow<"app_projects">;
type AppProductRow = ViewRow<"app_products">;
type AppInvoiceRow = ViewRow<"app_invoices">;
type AppInvoiceHistoryRow = ViewRow<"app_invoice_history">;
type AppWorkerTransactionRow = ViewRow<"app_worker_transactions">;
type AppIncomeTransactionRow = ViewRow<"app_income_transactions">;

type WorkerWritePayload = Pick<TableInsertPayload<"workers">, "name" | "role" | "category" | "phone">;
type SupplierWritePayload = Pick<
  TableInsertPayload<"suppliers">,
  "name" | "contact" | "phone" | "email" | "address"
>;
type ProductWritePayload = Pick<
  TableInsertPayload<"products">,
  "name" | "supplier_id" | "project_id" | "building_id" | "unit" | "unit_price" | "currency"
>;
type InvoiceWritePayload = Required<
  Pick<
    TableUpdatePayload<"invoices">,
    | "number"
    | "supplier_id"
    | "project_id"
    | "building_id"
    | "product_id"
    | "total_amount"
    | "paid_amount"
    | "currency"
    | "status"
    | "invoice_date"
    | "due_date"
    | "notes"
    | "image_path"
  >
>;
type InvoiceCreatePayload = InvoiceWritePayload & Pick<TableInsertPayload<"invoices">, "created_by">;
type InvoiceRecordStatusUpdatePayload = Pick<
  TableUpdatePayload<"invoices">,
  "record_status" | "deleted_at" | "deleted_by"
>;
type WorkerTransactionWritePayload = Required<
  Pick<
    TableInsertPayload<"worker_transactions">,
    "worker_id" | "type" | "amount" | "currency" | "description" | "date" | "project_id"
  >
>;
type IncomeTransactionWritePayload = Required<
  Pick<TableInsertPayload<"income_transactions">, "project_id" | "amount" | "currency" | "description" | "date">
>;
type IncomeTransactionCreatePayload = IncomeTransactionWritePayload &
  Pick<TableInsertPayload<"income_transactions">, "created_by">;
type IncomeTransactionUpdatePayload = Pick<
  TableUpdatePayload<"income_transactions">,
  "record_status" | "deleted_at" | "deleted_by"
>;
type AppSettingsUpsertPayload = Pick<
  TableInsertPayload<"app_settings">,
  "id" | "company_logo_path" | "updated_by" | "updated_at"
>;
type ProfileRoleUpdatePayload = Pick<TableUpdatePayload<"profiles">, "role">;
type ProfileNameUpdatePayload = Pick<TableUpdatePayload<"profiles">, "full_name">;
type InvoicePaidUpdatePayload = Pick<TableUpdatePayload<"invoices">, "paid_amount" | "status">;
type ReplaceUserProjectMembershipsArgs = RpcArgs<"replace_user_project_memberships">;
type DashboardOverviewRpcResult = RpcReturns<"get_dashboard_overview">;

export type ProjectStatus = "active" | "completed" | "paused";
export type InvoiceStatus = "unpaid" | "partial" | "paid";
export type InvoiceHistoryAction = "created" | "updated";
export type TransactionType = "credit" | "debit";
export type Currency = "USD" | "IQD";
export type UserRole = "admin" | "user";
export type RecordStatus = "active" | "deleted";

export interface AppUserProfile {
  id: string;
  email: string | null;
  fullName: string | null;
  role: UserRole;
  createdAt: string | null;
}

export interface AppSettings {
  id: string;
  companyLogoPath: string | null;
  companyLogoUrl: string | null;
  updatedAt: string | null;
}

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
  createdAt: string | null;
}

export interface Invoice {
  id: number;
  number: string;
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
  description: string | null;
  date: string | null;
  projectId: number | null;
  projectName: string | null;
  createdAt: string | null;
}

export interface IncomeTransaction {
  id: number;
  projectId: number;
  projectName: string | null;
  amount: number;
  currency: Currency;
  description: string | null;
  date: string | null;
  recordStatus: RecordStatus;
  createdBy: string | null;
  createdByName: string | null;
  deletedBy: string | null;
  deletedAt: string | null;
  createdAt: string | null;
}

export interface DashboardProjectSummary {
  id: number;
  name: string;
  status: ProjectStatus;
  invoiceCount: number;
  totalInvoiced: number;
  totalPaid: number;
  remaining: number;
}

export interface DashboardWorkerSummary {
  id: number;
  name: string;
  role: string;
  balance: number;
  totalCredit: number;
  totalDebit: number;
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
}

export interface DashboardOverview {
  totalWorkers: number;
  activeProjects: number;
  totalSuppliers: number;
  invoicesUnpaid: number;
  totalInvoiceAmount: number;
  totalPaidAmount: number;
  remainingAmount: number;
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
  unitPrice: number | null;
  currency: Currency;
}

export interface InvoiceInput {
  number: string;
  supplierId: number | null;
  projectId: number | null;
  buildingId: number | null;
  productId: number | null;
  totalAmount: number;
  paidAmount: number;
  currency: Currency;
  status: InvoiceStatus;
  invoiceDate: string | null;
  dueDate: string | null;
  notes: string | null;
  imagePath: string | null;
}

export interface WorkerTransactionInput {
  workerId: number;
  type: TransactionType;
  amount: number;
  currency: Currency;
  description: string | null;
  date: string | null;
  projectId: number | null;
}

export interface IncomeTransactionInput {
  projectId: number;
  amount: number;
  currency: Currency;
  description: string | null;
  date: string | null;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface WorkersPageFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
}

export interface SuppliersPageFilters {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface ProjectsPageFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: "all" | ProjectStatus;
}

export interface ProductsPageFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  projectId?: number | null;
  supplierId?: number | null;
  currency?: Currency | "all";
}

export interface InvoicesPageFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: "all" | InvoiceStatus;
  projectId?: number | null;
  supplierId?: number | null;
  currency?: Currency | "all";
  dateFrom?: string | null;
  dateTo?: string | null;
}

export interface IncomePageFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  projectId?: number | null;
  currency?: Currency | "all";
  dateFrom?: string | null;
  dateTo?: string | null;
}

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

export const erpKeys = {
  profile: ["profile"] as const,
  appSettings: ["appSettings"] as const,
  users: ["users"] as const,
  projectMemberships: ["projectMemberships"] as const,
  dashboard: ["dashboard"] as const,
  workers: ["workers"] as const,
  workersPage: (filters: WorkersPageFilters) => ["workers", "page", filters] as const,
  worker: (id: number) => ["worker", id] as const,
  workerTransactions: (workerId: number) => ["workerTransactions", workerId] as const,
  suppliers: ["suppliers"] as const,
  suppliersPage: (filters: SuppliersPageFilters) => ["suppliers", "page", filters] as const,
  projects: ["projects"] as const,
  projectsPage: (filters: ProjectsPageFilters) => ["projects", "page", filters] as const,
  project: (id: number) => ["project", id] as const,
  projectBuildings: (projectId: number) => ["projectBuildings", projectId] as const,
  products: ["products"] as const,
  productsPage: (filters: ProductsPageFilters) => ["products", "page", filters] as const,
  invoices: ["invoices"] as const,
  invoicesPage: (filters: InvoicesPageFilters) => ["invoices", "page", filters] as const,
  invoice: (id: number) => ["invoice", id] as const,
  invoiceHistory: (id: number) => ["invoice", id, "history"] as const,
  incomes: ["incomes"] as const,
  incomesPage: (filters: IncomePageFilters) => ["incomes", "page", filters] as const,
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

function toInvoiceHistoryAction(value: unknown): InvoiceHistoryAction {
  return value === "updated" ? "updated" : "created";
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

function toUserRole(value: unknown): UserRole {
  return value === "admin" ? "admin" : "user";
}

function normalizeProfile(row: ProfileRow): AppUserProfile {
  return {
    id: readString(row, "id") ?? "",
    email: readString(row, "email"),
    fullName: readString(row, "full_name", "fullName"),
    role: toUserRole(readString(row, "role")),
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
  return {
    id: readId(row, "id"),
    name: readString(row, "name") ?? "Unnamed worker",
    role: readString(row, "role") ?? "-",
    category: readString(row, "category"),
    phone: readString(row, "phone"),
    balance: readNumber(row, "balance") ?? 0,
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
    currency: toCurrency(readString(row, "currency")),
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
  const totalAmount = readNumber(row, "total_amount", "totalAmount") ?? 0;
  const paidAmount = readNumber(row, "paid_amount", "paidAmount") ?? 0;
  const { imagePath, imageUrl } = readInvoiceImage(row);

  return {
    id: readId(row, "id"),
    number: readString(row, "number") ?? "INV",
    status: toInvoiceStatus(readString(row, "status"), totalAmount, paidAmount),
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
    currency: toCurrency(readString(row, "currency")),
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
  const totalAmount = readNumber(row, "total_amount", "totalAmount") ?? 0;
  const paidAmount = readNumber(row, "paid_amount", "paidAmount") ?? 0;
  const { imagePath, imageUrl } = readInvoiceImage(row);

  return {
    id: readId(row, "id"),
    invoiceId: readId(row, "invoice_id", "invoiceId"),
    action: toInvoiceHistoryAction(readString(row, "change_type", "changeType", "action")),
    number: readString(row, "number") ?? "INV",
    status: toInvoiceStatus(readString(row, "status"), totalAmount, paidAmount),
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
    currency: toCurrency(readString(row, "currency")),
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

function normalizeWorkerTransaction(row: AppWorkerTransactionRow): WorkerTransaction {
  return {
    id: readId(row, "id"),
    workerId: readId(row, "worker_id", "workerId"),
    type: toTransactionType(readString(row, "type")),
    amount: readNumber(row, "amount") ?? 0,
    currency: toCurrency(readString(row, "currency")),
    description: readString(row, "description"),
    date: readDate(row, "date"),
    projectId: readNumber(row, "project_id", "projectId"),
    projectName: readString(row, "project_name", "projectName"),
    createdAt: readDate(row, "created_at", "createdAt"),
  };
}

function normalizeIncomeTransaction(row: AppIncomeTransactionRow): IncomeTransaction {
  return {
    id: readId(row, "id"),
    projectId: readId(row, "project_id", "projectId"),
    projectName: readString(row, "project_name", "projectName"),
    amount: readNumber(row, "amount") ?? 0,
    currency: toCurrency(readString(row, "currency")),
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
    projectsSummary,
    workersSummary,
    invoicesSummary,
  };
}

function buildPaginatedResult<T>(items: T[], total: number, page: number, pageSize: number): PaginatedResult<T> {
  return {
    items,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

function getPagination(options?: { page?: number; pageSize?: number }) {
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.max(1, Math.min(MAX_PAGE_SIZE, options?.pageSize ?? DEFAULT_PAGE_SIZE));

  return {
    page,
    pageSize,
    from: (page - 1) * pageSize,
    to: page * pageSize - 1,
  };
}

function applySearch(query: any, search: string | undefined, columns: string[]) {
  const trimmed = search?.trim();
  if (!trimmed) {
    return query;
  }

  const safeSearch = trimmed.replace(/,/g, " ");
  return query.or(columns.map((column) => `${column}.ilike.%${safeSearch}%`).join(","));
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

async function executePaged<TRow extends Row, T>(
  query: {
    range: (
      from: number,
      to: number,
    ) => PromiseLike<{ data: TRow[] | null; error: { message: string } | null; count: number | null }>;
  },
  normalize: (row: TRow) => T,
  page?: number,
  pageSize?: number,
) {
  const pagination = getPagination({ page, pageSize });
  const { data, error, count } = await query.range(pagination.from, pagination.to);
  if (error) {
    throw new Error(error.message);
  }

  const items = (data ?? []).map((row) => normalize(row));
  return buildPaginatedResult(items, count ?? items.length, pagination.page, pagination.pageSize);
}

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }

  return data.user?.id ?? null;
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

async function getDashboardOverviewFallback(): Promise<DashboardOverview> {
  const [workers, projects, suppliers, invoices, transactions] = await Promise.all([
    listWorkers(),
    listProjects(),
    listSuppliers(),
    listInvoices(),
    listWorkerTransactions(),
  ]);

  const activeInvoices = invoices.filter((invoice) => invoice.recordStatus === "active");
  const totalInvoiceAmount = activeInvoices.reduce((total, invoice) => total + invoice.totalAmount, 0);
  const totalPaidAmount = activeInvoices.reduce((total, invoice) => total + invoice.paidAmount, 0);
  const remainingAmount = activeInvoices.reduce((total, invoice) => total + invoice.remainingAmount, 0);

  const projectsSummary = projects
    .map((project) => {
      const relatedInvoices = activeInvoices.filter((invoice) => invoice.projectId === project.id);
      const totalInvoiced = relatedInvoices.reduce((total, invoice) => total + invoice.totalAmount, 0);
      const totalPaid = relatedInvoices.reduce((total, invoice) => total + invoice.paidAmount, 0);

      return {
        id: project.id,
        name: project.name,
        status: project.status,
        invoiceCount: relatedInvoices.length,
        totalInvoiced,
        totalPaid,
        remaining: Math.max(0, totalInvoiced - totalPaid),
      };
    })
    .sort((left, right) => right.remaining - left.remaining || left.name.localeCompare(right.name));

  const workersSummary = workers
    .map((worker) => {
      const relatedTransactions = transactions.filter((transaction) => transaction.workerId === worker.id);
      return {
        id: worker.id,
        name: worker.name,
        role: worker.role,
        balance: worker.balance,
        totalCredit: relatedTransactions
          .filter((transaction) => transaction.type === "credit")
          .reduce((total, transaction) => total + transaction.amount, 0),
        totalDebit: relatedTransactions
          .filter((transaction) => transaction.type === "debit")
          .reduce((total, transaction) => total + transaction.amount, 0),
      };
    })
    .sort((left, right) => Math.abs(right.balance) - Math.abs(left.balance));

  const invoicesSummary = [...activeInvoices]
    .sort((left, right) => right.remainingAmount - left.remainingAmount || left.number.localeCompare(right.number))
    .map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      supplierName: invoice.supplierName,
      projectName: invoice.projectName,
      totalAmount: invoice.totalAmount,
      paidAmount: invoice.paidAmount,
      remaining: invoice.remainingAmount,
    }));

  return {
    totalWorkers: workers.length,
    activeProjects: projects.filter((project) => project.status === "active").length,
    totalSuppliers: suppliers.length,
    invoicesUnpaid: activeInvoices.filter((invoice) => invoice.status !== "paid").length,
    totalInvoiceAmount,
    totalPaidAmount,
    remainingAmount,
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
  assertNonNegativeAmount(input.unitPrice, "Unit price");

  return {
    name: input.name.trim(),
    supplier_id: input.supplierId,
    project_id: input.projectId,
    building_id: input.buildingId,
    unit: normalizeOptionalText(input.unit),
    unit_price: input.unitPrice,
    currency: input.currency,
  };
}

function normalizeInvoiceInput(input: InvoiceInput) {
  const invoiceDate = input.invoiceDate ?? new Date().toISOString().slice(0, 10);

  validateInvoiceInput({
    totalAmount: input.totalAmount,
    paidAmount: input.paidAmount,
    invoiceDate,
    dueDate: input.dueDate,
  });

  const payload: InvoiceWritePayload = {
    number: input.number.trim(),
    supplier_id: input.supplierId,
    project_id: input.projectId,
    building_id: input.buildingId,
    product_id: input.productId,
    total_amount: input.totalAmount,
    paid_amount: input.paidAmount,
    currency: input.currency,
    status: deriveInvoiceStatus(input.totalAmount, input.paidAmount, input.status),
    invoice_date: invoiceDate,
    due_date: input.dueDate,
    notes: normalizeOptionalText(input.notes),
    image_path: normalizeOptionalText(input.imagePath),
  };

  return payload;
}

function normalizeWorkerTransactionInput(input: WorkerTransactionInput) {
  assertPositiveAmount(input.amount, "Transaction amount");

  const payload: WorkerTransactionWritePayload = {
    worker_id: input.workerId,
    type: input.type,
    amount: input.amount,
    currency: input.currency,
    description: normalizeOptionalText(input.description),
    date: input.date,
    project_id: input.projectId,
  };

  return payload;
}

function normalizeIncomeTransactionInput(input: IncomeTransactionInput) {
  assertPositiveAmount(input.amount, "Income amount");

  const payload: IncomeTransactionWritePayload = {
    project_id: input.projectId,
    amount: input.amount,
    currency: input.currency,
    description: normalizeOptionalText(input.description),
    date: input.date,
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
    supabase.from("workers").select("*").order("created_at", { ascending: false }),
    normalizeWorker,
  );
}

export async function listWorkersPage(filters: WorkersPageFilters = {}) {
  let query: any = supabase
    .from("workers")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  query = applySearch(query, filters.search, ["name", "role", "category", "phone"]);

  if (filters.category && filters.category !== "all") {
    query = query.eq("category", filters.category);
  }

  return executePaged(query, normalizeWorker, filters.page, filters.pageSize);
}

export async function getWorker(id: number) {
  return executeSingle(supabase.from("workers").select("*").eq("id", id).single(), normalizeWorker);
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
    supabase.from("suppliers").select("*").order("created_at", { ascending: false }),
    normalizeSupplier,
  );
}

export async function listSuppliersPage(filters: SuppliersPageFilters = {}) {
  let query: any = supabase
    .from("suppliers")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  query = applySearch(query, filters.search, ["name", "contact", "phone", "email", "address"]);

  return executePaged(query, normalizeSupplier, filters.page, filters.pageSize);
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

export async function listProjectsPage(filters: ProjectsPageFilters = {}) {
  let query: any = supabase
    .from("app_projects")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  query = applySearch(query, filters.search, ["name", "client", "location"]);

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  return executePaged(query, normalizeProject, filters.page, filters.pageSize);
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
    .from("app_worker_transactions")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (workerId != null) {
    query = query.eq("worker_id", workerId);
  }

  return executeSelect(query, normalizeWorkerTransaction);
}

export async function createWorkerTransaction(input: WorkerTransactionInput) {
  const payload = normalizeWorkerTransactionInput(input);
  const { error } = await supabase.from("worker_transactions").insert(payload);

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

export async function listProductsPage(filters: ProductsPageFilters = {}) {
  let query: any = supabase
    .from("app_products")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  query = applySearch(query, filters.search, [
    "name",
    "supplier_name",
    "project_name",
    "building_name",
    "unit",
  ]);

  if (filters.projectId != null) {
    query = query.eq("project_id", filters.projectId);
  }

  if (filters.supplierId != null) {
    query = query.eq("supplier_id", filters.supplierId);
  }

  if (filters.currency && filters.currency !== "all") {
    query = query.eq("currency", filters.currency);
  }

  return executePaged(query, normalizeProduct, filters.page, filters.pageSize);
}

export async function createProduct(input: ProductInput) {
  const payload = normalizeProductInput(input);
  const { error } = await supabase.from("products").insert(payload);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateProduct(id: number, input: ProductInput) {
  const payload = normalizeProductInput(input);
  const { error } = await supabase.from("products").update(payload).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteProduct(id: number) {
  const { error } = await supabase.from("products").delete().eq("id", id);
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

export async function listInvoicesPage(filters: InvoicesPageFilters = {}) {
  let query: any = supabase
    .from("app_invoices")
    .select("*", { count: "exact" })
    .order("invoice_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  query = applySearch(query, filters.search, [
    "number",
    "supplier_name",
    "project_name",
    "building_name",
    "product_name",
    "created_by_name",
    "notes",
  ]);

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.projectId != null) {
    query = query.eq("project_id", filters.projectId);
  }

  if (filters.supplierId != null) {
    query = query.eq("supplier_id", filters.supplierId);
  }

  if (filters.currency && filters.currency !== "all") {
    query = query.eq("currency", filters.currency);
  }

  if (filters.dateFrom) {
    query = query.gte("invoice_date", filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte("invoice_date", filters.dateTo);
  }

  const page = await executePaged(query, normalizeInvoice, filters.page, filters.pageSize);
  return {
    ...page,
    items: await hydrateInvoices(page.items),
  };
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
  const payload: InvoiceCreatePayload = {
    ...normalizeInvoiceInput(input),
    created_by: currentUserId,
  };
  const { error } = await supabase.from("invoices").insert(payload);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateInvoice(id: number, input: InvoiceInput) {
  const payload: InvoiceWritePayload = normalizeInvoiceInput(input);
  const { error } = await supabase
    .from("invoices")
    .update(payload)
    .eq("id", id)
    .eq("record_status", "active");

  if (error) {
    throw new Error(error.message);
  }
}

export async function markInvoicePaid(id: number, totalAmount: number) {
  const payload: InvoicePaidUpdatePayload = { paid_amount: totalAmount, status: "paid" };
  const { error } = await supabase
    .from("invoices")
    .update(payload)
    .eq("id", id)
    .eq("record_status", "active");

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteInvoice(id: number) {
  const currentUserId = await getCurrentUserId();
  const payload: InvoiceRecordStatusUpdatePayload = {
    record_status: "deleted",
    deleted_at: new Date().toISOString(),
    deleted_by: currentUserId,
  };
  const { error } = await supabase
    .from("invoices")
    .update(payload)
    .eq("id", id)
    .eq("record_status", "active");
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

export async function listIncomeTransactionsPage(filters: IncomePageFilters = {}) {
  let query: any = supabase
    .from("app_income_transactions")
    .select("*", { count: "exact" })
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  query = applySearch(query, filters.search, ["project_name", "description", "created_by_name"]);

  if (filters.projectId != null) {
    query = query.eq("project_id", filters.projectId);
  }

  if (filters.currency && filters.currency !== "all") {
    query = query.eq("currency", filters.currency);
  }

  if (filters.dateFrom) {
    query = query.gte("date", filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte("date", filters.dateTo);
  }

  return executePaged(query, normalizeIncomeTransaction, filters.page, filters.pageSize);
}

export async function createIncomeTransaction(input: IncomeTransactionInput) {
  const currentUserId = await getCurrentUserId();
  const payload: IncomeTransactionCreatePayload = {
    ...normalizeIncomeTransactionInput(input),
    created_by: currentUserId,
  };
  const { error } = await supabase.from("income_transactions").insert(payload);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteIncomeTransaction(id: number) {
  const currentUserId = await getCurrentUserId();
  const payload: IncomeTransactionUpdatePayload = {
    record_status: "deleted",
    deleted_at: new Date().toISOString(),
    deleted_by: currentUserId,
  };
  const { error } = await supabase
    .from("income_transactions")
    .update(payload)
    .eq("id", id)
    .eq("record_status", "active");

  if (error) {
    throw new Error(error.message);
  }
}

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const { data, error } = await supabase.rpc("get_dashboard_overview");

  if (error) {
    return getDashboardOverviewFallback();
  }

  const overview = data as DashboardOverviewRpcResult;
  return normalizeDashboardOverview(asRow(overview));
}

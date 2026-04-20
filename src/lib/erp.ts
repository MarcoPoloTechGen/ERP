import { supabase } from "@/lib/supabase";

type Row = Record<string, unknown>;

export type ProjectStatus = "active" | "completed" | "paused";
export type InvoiceStatus = "unpaid" | "partial" | "paid";
export type TransactionType = "credit" | "debit";
export type Currency = "USD" | "IQD";
export type UserRole = "admin" | "user";

export interface AppUserProfile {
  id: string;
  email: string | null;
  fullName: string | null;
  role: UserRole;
  createdAt: string | null;
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
  currency: Currency;
  invoiceDate: string | null;
  dueDate: string | null;
  notes: string | null;
  imageUrl: string | null;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string | null;
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
  createdBy: string | null;
  createdByName: string | null;
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
  imageUrl: string | null;
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

export const erpKeys = {
  profile: ["profile"] as const,
  users: ["users"] as const,
  projectMemberships: ["projectMemberships"] as const,
  dashboard: ["dashboard"] as const,
  workers: ["workers"] as const,
  worker: (id: number) => ["worker", id] as const,
  workerTransactions: (workerId: number) => ["workerTransactions", workerId] as const,
  suppliers: ["suppliers"] as const,
  projects: ["projects"] as const,
  project: (id: number) => ["project", id] as const,
  projectBuildings: (projectId: number) => ["projectBuildings", projectId] as const,
  products: ["products"] as const,
  invoices: ["invoices"] as const,
  invoice: (id: number) => ["invoice", id] as const,
  incomes: ["incomes"] as const,
};

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
    return trimmed.length > 0 ? trimmed : null;
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
  if (totalAmount > 0 && paidAmount >= totalAmount) {
    return "paid";
  }
  if (paidAmount > 0) {
    return "partial";
  }
  return "unpaid";
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

function asRow(value: unknown): Row {
  return typeof value === "object" && value !== null ? (value as Row) : {};
}

function computeWorkerBalance(
  storedBalance: number | null,
  transactions: WorkerTransaction[],
) {
  if (storedBalance != null) {
    return storedBalance;
  }

  return transactions.reduce((total, transaction) => {
    return total + (transaction.type === "credit" ? transaction.amount : -transaction.amount);
  }, 0);
}

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }
  return data.user?.id ?? null;
}

async function getCurrentUserProfile() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return null;
  }

  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) {
    throw error;
  }

  return data ? normalizeProfile(asRow(data)) : null;
}

async function getAccessibleProjectIds() {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    return [];
  }
  if (profile.role === "admin") {
    return null;
  }

  const { data, error } = await supabase
    .from("project_memberships")
    .select("project_id")
    .eq("user_id", profile.id);
  if (error) {
    throw error;
  }

  return ((data ?? []) as Row[]).map((row) => readId(row, "project_id", "projectId"));
}

function filterRowsByProjectIds(rows: Row[], projectIds: number[] | null, key = "project_id") {
  if (projectIds == null) {
    return rows;
  }
  const allowed = new Set(projectIds);
  return rows.filter((row) => {
    const projectId = readNumber(row, key, key.replace("_id", "Id"));
    return projectId != null && allowed.has(projectId);
  });
}

async function requireProjectAccess(projectId: number | null | undefined) {
  if (projectId == null) {
    return;
  }
  const projectIds = await getAccessibleProjectIds();
  if (projectIds == null) {
    return;
  }
  if (!projectIds.includes(projectId)) {
    throw new Error("You do not have access to this project.");
  }
}

function normalizeWorker(row: Row, transactions: WorkerTransaction[] = []): Worker {
  const storedBalance = readNumber(row, "balance");
  return {
    id: readId(row, "id"),
    name: readString(row, "name") ?? "Sans nom",
    role: readString(row, "role") ?? "-",
    category: readString(row, "category"),
    phone: readString(row, "phone"),
    balance: computeWorkerBalance(storedBalance, transactions),
    createdAt: readDate(row, "created_at", "createdAt"),
  };
}

function normalizeProfile(row: Row): AppUserProfile {
  return {
    id: readString(row, "id") ?? "",
    email: readString(row, "email"),
    fullName: readString(row, "full_name", "fullName"),
    role: toUserRole(readString(row, "role")),
    createdAt: readDate(row, "created_at", "createdAt"),
  };
}

function normalizeProjectMembership(row: Row): ProjectMembership {
  return {
    id: readId(row, "id"),
    projectId: readId(row, "project_id", "projectId"),
    userId: readString(row, "user_id", "userId") ?? "",
    createdAt: readDate(row, "created_at", "createdAt"),
  };
}

function normalizeSupplier(row: Row): Supplier {
  return {
    id: readId(row, "id"),
    name: readString(row, "name") ?? "Sans nom",
    contact: readString(row, "contact"),
    phone: readString(row, "phone"),
    email: readString(row, "email"),
    address: readString(row, "address"),
    createdAt: readDate(row, "created_at", "createdAt"),
  };
}

function normalizeProject(row: Row): Project {
  return {
    id: readId(row, "id"),
    name: readString(row, "name") ?? "Sans nom",
    client: readString(row, "client"),
    location: readString(row, "location"),
    status: toProjectStatus(readString(row, "status")),
    budget: readNumber(row, "budget"),
    startDate: readDate(row, "start_date", "startDate"),
    endDate: readDate(row, "end_date", "endDate"),
    createdAt: readDate(row, "created_at", "createdAt"),
  };
}

function normalizeProduct(
  row: Row,
  suppliersById: Map<number, Supplier>,
  projectsById: Map<number, Project>,
  buildingsById: Map<number, ProjectBuilding>,
): Product {
  const supplierId = readNumber(row, "supplier_id", "supplierId");
  const projectId = readNumber(row, "project_id", "projectId");
  const buildingId = readNumber(row, "building_id", "buildingId");
  return {
    id: readId(row, "id"),
    name: readString(row, "name") ?? "Sans nom",
    supplierId,
    supplierName:
      readString(row, "supplier_name", "supplierName") ??
      (supplierId != null ? suppliersById.get(supplierId)?.name ?? null : null),
    projectId,
    projectName:
      readString(row, "project_name", "projectName") ??
      (projectId != null ? projectsById.get(projectId)?.name ?? null : null),
    buildingId,
    buildingName:
      readString(row, "building_name", "buildingName") ??
      (buildingId != null ? buildingsById.get(buildingId)?.name ?? null : null),
    unit: readString(row, "unit"),
    unitPrice: readNumber(row, "unit_price", "unitPrice"),
    currency: toCurrency(readString(row, "currency")),
    createdAt: readDate(row, "created_at", "createdAt"),
  };
}

function normalizeProjectBuilding(row: Row): ProjectBuilding {
  return {
    id: readId(row, "id"),
    projectId: readId(row, "project_id", "projectId"),
    name: readString(row, "name") ?? "Building",
    createdAt: readDate(row, "created_at", "createdAt"),
  };
}

function normalizeInvoice(
  row: Row,
  suppliersById: Map<number, Supplier>,
  projectsById: Map<number, Project>,
  buildingsById: Map<number, ProjectBuilding>,
  productsById: Map<number, Product>,
  profilesById: Map<string, AppUserProfile>,
): Invoice {
  const supplierId = readNumber(row, "supplier_id", "supplierId");
  const projectId = readNumber(row, "project_id", "projectId");
  const buildingId = readNumber(row, "building_id", "buildingId");
  const productId = readNumber(row, "product_id", "productId");
  const createdBy = readString(row, "created_by", "createdBy");
  const totalAmount = readNumber(row, "total_amount", "totalAmount") ?? 0;
  const paidAmount = readNumber(row, "paid_amount", "paidAmount") ?? 0;

  return {
    id: readId(row, "id"),
    number: readString(row, "number") ?? "FACT",
    status: toInvoiceStatus(readString(row, "status"), totalAmount, paidAmount),
    supplierId,
    supplierName:
      readString(row, "supplier_name", "supplierName") ??
      (supplierId != null ? suppliersById.get(supplierId)?.name ?? null : null),
    projectId,
    projectName:
      readString(row, "project_name", "projectName") ??
      (projectId != null ? projectsById.get(projectId)?.name ?? null : null),
    buildingId,
    buildingName:
      readString(row, "building_name", "buildingName") ??
      (buildingId != null ? buildingsById.get(buildingId)?.name ?? null : null),
    productId,
    productName:
      readString(row, "product_name", "productName") ??
      (productId != null ? productsById.get(productId)?.name ?? null : null),
    totalAmount,
    paidAmount,
    currency: toCurrency(readString(row, "currency")),
    invoiceDate: readDate(row, "invoice_date", "invoiceDate"),
    dueDate: readDate(row, "due_date", "dueDate"),
    notes: readString(row, "notes"),
    imageUrl: readString(row, "image_url", "imageUrl"),
    createdBy,
    createdByName: createdBy ? profilesById.get(createdBy)?.fullName ?? profilesById.get(createdBy)?.email ?? null : null,
    createdAt: readDate(row, "created_at", "createdAt"),
  };
}

function normalizeWorkerTransaction(
  row: Row,
  projectsById: Map<number, Project>,
): WorkerTransaction {
  const projectId = readNumber(row, "project_id", "projectId");
  const nestedProject = asRow(readValue(row, "projects", "project"));

  return {
    id: readId(row, "id"),
    workerId: readId(row, "worker_id", "workerId"),
    type: toTransactionType(readString(row, "type")),
    amount: readNumber(row, "amount") ?? 0,
    currency: toCurrency(readString(row, "currency")),
    description: readString(row, "description"),
    date: readDate(row, "date"),
    projectId,
    projectName:
      readString(nestedProject, "name") ??
      (projectId != null ? projectsById.get(projectId)?.name ?? null : null),
    createdAt: readDate(row, "created_at", "createdAt"),
  };
}

function normalizeIncomeTransaction(
  row: Row,
  projectsById: Map<number, Project>,
  profilesById: Map<string, AppUserProfile>,
): IncomeTransaction {
  const projectId = readId(row, "project_id", "projectId");
  const createdBy = readString(row, "created_by", "createdBy");

  return {
    id: readId(row, "id"),
    projectId,
    projectName: projectsById.get(projectId)?.name ?? null,
    amount: readNumber(row, "amount") ?? 0,
    currency: toCurrency(readString(row, "currency")),
    description: readString(row, "description"),
    date: readDate(row, "date"),
    createdBy,
    createdByName: createdBy
      ? profilesById.get(createdBy)?.fullName ?? profilesById.get(createdBy)?.email ?? null
      : null,
    createdAt: readDate(row, "created_at", "createdAt"),
  };
}

async function selectAll(table: string) {
  const { data, error } = await supabase.from(table).select("*").order("created_at", { ascending: false });
  if (error) {
    throw error;
  }
  return (data ?? []) as Row[];
}

async function selectOne(table: string, id: number) {
  const { data, error } = await supabase.from(table).select("*").eq("id", id).single();
  if (error) {
    throw error;
  }
  return asRow(data);
}

async function insertWithFallback(table: string, primaryPayload: Row, secondaryPayload = primaryPayload) {
  const primaryResult = await supabase.from(table).insert(primaryPayload);
  if (!primaryResult.error) {
    return;
  }

  const secondaryResult = await supabase.from(table).insert(secondaryPayload);
  if (secondaryResult.error) {
    throw secondaryResult.error;
  }
}

async function updateWithFallback(
  table: string,
  id: number,
  primaryPayload: Row,
  secondaryPayload = primaryPayload,
) {
  const primaryResult = await supabase.from(table).update(primaryPayload).eq("id", id);
  if (!primaryResult.error) {
    return;
  }

  const secondaryResult = await supabase.from(table).update(secondaryPayload).eq("id", id);
  if (secondaryResult.error) {
    throw secondaryResult.error;
  }
}

export async function listSuppliers() {
  const rows = await selectAll("suppliers");
  return rows.map(normalizeSupplier);
}

export async function getMyProfile() {
  return getCurrentUserProfile();
}

export async function listProfiles() {
  const rows = await selectAll("profiles");
  return rows.map(normalizeProfile);
}

export async function updateProfileRole(id: string, role: UserRole) {
  const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
  if (error) {
    throw error;
  }
}

export async function listProjectMemberships() {
  const rows = await selectAll("project_memberships");
  return rows.map(normalizeProjectMembership);
}

export async function replaceUserProjectMemberships(userId: string, projectIds: number[]) {
  const deleteResult = await supabase.from("project_memberships").delete().eq("user_id", userId);
  if (deleteResult.error) {
    throw deleteResult.error;
  }

  if (!projectIds.length) {
    return;
  }

  const insertResult = await supabase
    .from("project_memberships")
    .insert(projectIds.map((projectId) => ({ user_id: userId, project_id: projectId })));
  if (insertResult.error) {
    throw insertResult.error;
  }
}

export async function createSupplier(input: SupplierInput) {
  await insertWithFallback("suppliers", { ...input });
}

export async function updateSupplier(id: number, input: SupplierInput) {
  await updateWithFallback("suppliers", id, { ...input });
}

export async function deleteSupplier(id: number) {
  const { error } = await supabase.from("suppliers").delete().eq("id", id);
  if (error) {
    throw error;
  }
}

export async function listProjects() {
  const rows = filterRowsByProjectIds(await selectAll("projects"), await getAccessibleProjectIds());
  return rows.map(normalizeProject);
}

export async function getProject(id: number) {
  await requireProjectAccess(id);
  const row = await selectOne("projects", id);
  return normalizeProject(row);
}

export async function listProjectBuildings(projectId?: number) {
  if (projectId != null) {
    await requireProjectAccess(projectId);
  }
  let query = supabase.from("project_buildings").select("*").order("created_at", { ascending: true });
  if (projectId != null) {
    query = query.eq("project_id", projectId);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return ((data ?? []) as Row[]).map(normalizeProjectBuilding);
}

async function replaceProjectBuildings(projectId: number, buildingNames: string[]) {
  const trimmedNames = buildingNames.map((name) => name.trim()).filter(Boolean);

  const deleteResult = await supabase.from("project_buildings").delete().eq("project_id", projectId);
  if (deleteResult.error) {
    throw deleteResult.error;
  }

  if (!trimmedNames.length) {
    return;
  }

  const insertResult = await supabase
    .from("project_buildings")
    .insert(trimmedNames.map((name) => ({ project_id: projectId, name })));

  if (insertResult.error) {
    throw insertResult.error;
  }
}

export async function createProject(input: ProjectInput) {
  const camelPayload = {
    name: input.name,
    client: input.client,
    location: input.location,
    status: input.status,
    budget: input.budget,
    startDate: input.startDate,
    endDate: input.endDate,
  };
  const snakePayload = {
    name: input.name,
    client: input.client,
    location: input.location,
    status: input.status,
    budget: input.budget,
    start_date: input.startDate,
    end_date: input.endDate,
  };

  const primaryResult = await supabase.from("projects").insert(camelPayload).select("id").single();

  if (!primaryResult.error) {
    await replaceProjectBuildings(readId(asRow(primaryResult.data), "id"), input.buildings);
    return;
  }

  const secondaryResult = await supabase.from("projects").insert(snakePayload).select("id").single();
  if (secondaryResult.error) {
    throw secondaryResult.error;
  }

  await replaceProjectBuildings(readId(asRow(secondaryResult.data), "id"), input.buildings);
}

export async function updateProject(id: number, input: ProjectInput) {
  const camelPayload = {
    name: input.name,
    client: input.client,
    location: input.location,
    status: input.status,
    budget: input.budget,
    startDate: input.startDate,
    endDate: input.endDate,
  };
  const snakePayload = {
    name: input.name,
    client: input.client,
    location: input.location,
    status: input.status,
    budget: input.budget,
    start_date: input.startDate,
    end_date: input.endDate,
  };

  await updateWithFallback("projects", id, camelPayload, snakePayload);
  await replaceProjectBuildings(id, input.buildings);
}

export async function deleteProject(id: number) {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) {
    throw error;
  }
}

export async function listWorkerTransactions(workerId?: number) {
  const projects = await listProjects();
  const projectsById = new Map(projects.map((project) => [project.id, project]));

  let query = supabase
    .from("worker_transactions")
    .select("*, projects(name)")
    .order("date", { ascending: false });

  if (workerId != null) {
    query = query.eq("worker_id", workerId);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return ((data ?? []) as Row[]).map((row) => normalizeWorkerTransaction(row, projectsById));
}

export async function createWorkerTransaction(input: WorkerTransactionInput) {
  await requireProjectAccess(input.projectId);
  const snakePayload = {
    worker_id: input.workerId,
    type: input.type,
    amount: input.amount,
    currency: input.currency,
    description: input.description,
    date: input.date,
    project_id: input.projectId,
  };
  const camelPayload = {
    workerId: input.workerId,
    type: input.type,
    amount: input.amount,
    currency: input.currency,
    description: input.description,
    date: input.date,
    projectId: input.projectId,
  };

  await insertWithFallback("worker_transactions", snakePayload, camelPayload);
}

export async function listWorkers() {
  const [workerRows, transactions] = await Promise.all([
    selectAll("workers"),
    listWorkerTransactions(),
  ]);

  return workerRows.map((row) => {
    const workerId = readId(row, "id");
    const workerTransactions = transactions.filter((transaction) => transaction.workerId === workerId);
    return normalizeWorker(row, workerTransactions);
  });
}

export async function getWorker(id: number) {
  const [row, transactions] = await Promise.all([
    selectOne("workers", id),
    listWorkerTransactions(id),
  ]);

  return normalizeWorker(row, transactions);
}

export async function createWorker(input: WorkerInput) {
  await insertWithFallback("workers", { ...input });
}

export async function updateWorker(id: number, input: WorkerInput) {
  await updateWithFallback("workers", id, { ...input });
}

export async function deleteWorker(id: number) {
  const { error } = await supabase.from("workers").delete().eq("id", id);
  if (error) {
    throw error;
  }
}

export async function listProducts() {
  const [rows, suppliers, projects, buildings] = await Promise.all([
    selectAll("products"),
    listSuppliers(),
    listProjects(),
    listProjectBuildings(),
  ]);
  const suppliersById = new Map(suppliers.map((supplier) => [supplier.id, supplier]));
  const projectsById = new Map(projects.map((project) => [project.id, project]));
  const buildingsById = new Map(buildings.map((building) => [building.id, building]));
  return rows.map((row) => normalizeProduct(row, suppliersById, projectsById, buildingsById));
}

export async function createProduct(input: ProductInput) {
  await requireProjectAccess(input.projectId);
  const camelPayload = {
    name: input.name,
    supplierId: input.supplierId,
    projectId: input.projectId,
    buildingId: input.buildingId,
    unit: input.unit,
    unitPrice: input.unitPrice,
    currency: input.currency,
  };
  const snakePayload = {
    name: input.name,
    supplier_id: input.supplierId,
    project_id: input.projectId,
    building_id: input.buildingId,
    unit: input.unit,
    unit_price: input.unitPrice,
    currency: input.currency,
  };

  await insertWithFallback("products", camelPayload, snakePayload);
}

export async function updateProduct(id: number, input: ProductInput) {
  await requireProjectAccess(input.projectId);
  const camelPayload = {
    name: input.name,
    supplierId: input.supplierId,
    projectId: input.projectId,
    buildingId: input.buildingId,
    unit: input.unit,
    unitPrice: input.unitPrice,
    currency: input.currency,
  };
  const snakePayload = {
    name: input.name,
    supplier_id: input.supplierId,
    project_id: input.projectId,
    building_id: input.buildingId,
    unit: input.unit,
    unit_price: input.unitPrice,
    currency: input.currency,
  };

  await updateWithFallback("products", id, camelPayload, snakePayload);
}

export async function deleteProduct(id: number) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) {
    throw error;
  }
}

export async function listInvoices() {
  const [rows, suppliers, projects, buildings, profiles] = await Promise.all([
    filterRowsByProjectIds(await selectAll("invoices"), await getAccessibleProjectIds()),
    listSuppliers(),
    listProjects(),
    listProjectBuildings(),
    listProfiles(),
  ]);

  const products = await listProducts();
  const suppliersById = new Map(suppliers.map((supplier) => [supplier.id, supplier]));
  const projectsById = new Map(projects.map((project) => [project.id, project]));
  const buildingsById = new Map(buildings.map((building) => [building.id, building]));
  const productsById = new Map(products.map((product) => [product.id, product]));
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));

  return rows.map((row) =>
    normalizeInvoice(row, suppliersById, projectsById, buildingsById, productsById, profilesById),
  );
}

export async function getInvoice(id: number) {
  const [row, suppliers, projects, buildings, profiles] = await Promise.all([
    selectOne("invoices", id),
    listSuppliers(),
    listProjects(),
    listProjectBuildings(),
    listProfiles(),
  ]);

  await requireProjectAccess(readNumber(row, "project_id", "projectId"));
  const products = await listProducts();
  const suppliersById = new Map(suppliers.map((supplier) => [supplier.id, supplier]));
  const projectsById = new Map(projects.map((project) => [project.id, project]));
  const buildingsById = new Map(buildings.map((building) => [building.id, building]));
  const productsById = new Map(products.map((product) => [product.id, product]));
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));

  return normalizeInvoice(row, suppliersById, projectsById, buildingsById, productsById, profilesById);
}

export async function createInvoice(input: InvoiceInput) {
  await requireProjectAccess(input.projectId);
  const currentUserId = await getCurrentUserId();
  const camelPayload = {
    number: input.number,
    supplierId: input.supplierId,
    projectId: input.projectId,
    buildingId: input.buildingId,
    productId: input.productId,
    totalAmount: input.totalAmount,
    paidAmount: input.paidAmount,
    currency: input.currency,
    status: input.status,
    invoiceDate: input.invoiceDate,
    dueDate: input.dueDate,
    notes: input.notes,
    imageUrl: input.imageUrl,
    createdBy: currentUserId,
  };
  const snakePayload = {
    number: input.number,
    supplier_id: input.supplierId,
    project_id: input.projectId,
    building_id: input.buildingId,
    product_id: input.productId,
    total_amount: input.totalAmount,
    paid_amount: input.paidAmount,
    currency: input.currency,
    status: input.status,
    invoice_date: input.invoiceDate,
    due_date: input.dueDate,
    notes: input.notes,
    image_url: input.imageUrl,
    created_by: currentUserId,
  };

  await insertWithFallback("invoices", camelPayload, snakePayload);
}

export async function updateInvoice(id: number, input: InvoiceInput) {
  await requireProjectAccess(input.projectId);
  const camelPayload = {
    number: input.number,
    supplierId: input.supplierId,
    projectId: input.projectId,
    buildingId: input.buildingId,
    productId: input.productId,
    totalAmount: input.totalAmount,
    paidAmount: input.paidAmount,
    currency: input.currency,
    status: input.status,
    invoiceDate: input.invoiceDate,
    dueDate: input.dueDate,
    notes: input.notes,
    imageUrl: input.imageUrl,
  };
  const snakePayload = {
    number: input.number,
    supplier_id: input.supplierId,
    project_id: input.projectId,
    building_id: input.buildingId,
    product_id: input.productId,
    total_amount: input.totalAmount,
    paid_amount: input.paidAmount,
    currency: input.currency,
    status: input.status,
    invoice_date: input.invoiceDate,
    due_date: input.dueDate,
    notes: input.notes,
    image_url: input.imageUrl,
  };

  await updateWithFallback("invoices", id, camelPayload, snakePayload);
}

export async function markInvoicePaid(id: number, totalAmount: number) {
  await updateWithFallback(
    "invoices",
    id,
    { paidAmount: totalAmount, status: "paid" },
    { paid_amount: totalAmount, status: "paid" },
  );
}

export async function deleteInvoice(id: number) {
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) {
    throw error;
  }
}

export async function listIncomeTransactions() {
  const [rows, projects, profiles] = await Promise.all([
    filterRowsByProjectIds(await selectAll("income_transactions"), await getAccessibleProjectIds()),
    listProjects(),
    listProfiles(),
  ]);
  const projectsById = new Map(projects.map((project) => [project.id, project]));
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
  return rows.map((row) => normalizeIncomeTransaction(row, projectsById, profilesById));
}

export async function createIncomeTransaction(input: IncomeTransactionInput) {
  await requireProjectAccess(input.projectId);
  const currentUserId = await getCurrentUserId();
  const payload = {
    project_id: input.projectId,
    amount: input.amount,
    currency: input.currency,
    description: input.description,
    date: input.date,
    created_by: currentUserId,
  };
  const { error } = await supabase.from("income_transactions").insert(payload);
  if (error) {
    throw error;
  }
}

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const [workers, projects, suppliers, invoices, transactions] = await Promise.all([
    listWorkers(),
    listProjects(),
    listSuppliers(),
    listInvoices(),
    listWorkerTransactions(),
  ]);

  const totalInvoiceAmount = invoices.reduce((total, invoice) => total + invoice.totalAmount, 0);
  const totalPaidAmount = invoices.reduce((total, invoice) => total + invoice.paidAmount, 0);
  const remainingAmount = invoices.reduce(
    (total, invoice) => total + Math.max(0, invoice.totalAmount - invoice.paidAmount),
    0,
  );

  const projectsSummary = projects
    .map((project) => {
      const relatedInvoices = invoices.filter((invoice) => invoice.projectId === project.id);
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
      const totalCredit = relatedTransactions
        .filter((transaction) => transaction.type === "credit")
        .reduce((total, transaction) => total + transaction.amount, 0);
      const totalDebit = relatedTransactions
        .filter((transaction) => transaction.type === "debit")
        .reduce((total, transaction) => total + transaction.amount, 0);

      return {
        id: worker.id,
        name: worker.name,
        role: worker.role,
        balance: worker.balance,
        totalCredit,
        totalDebit,
      };
    })
    .sort((left, right) => Math.abs(right.balance) - Math.abs(left.balance));

  const invoicesSummary = [...invoices]
    .sort(
      (left, right) =>
        Math.max(0, right.totalAmount - right.paidAmount) - Math.max(0, left.totalAmount - left.paidAmount),
    )
    .map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      supplierName: invoice.supplierName,
      projectName: invoice.projectName,
      totalAmount: invoice.totalAmount,
      paidAmount: invoice.paidAmount,
      remaining: Math.max(0, invoice.totalAmount - invoice.paidAmount),
    }));

  return {
    totalWorkers: workers.length,
    activeProjects: projects.filter((project) => project.status === "active").length,
    totalSuppliers: suppliers.length,
    invoicesUnpaid: invoices.filter((invoice) => invoice.status !== "paid").length,
    totalInvoiceAmount,
    totalPaidAmount,
    remainingAmount,
    projectsSummary,
    workersSummary,
    invoicesSummary,
  };
}

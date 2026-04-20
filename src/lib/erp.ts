import { supabase } from "@/lib/supabase";

type Row = Record<string, unknown>;

export type ProjectStatus = "active" | "completed" | "paused";
export type InvoiceStatus = "unpaid" | "partial" | "paid";
export type TransactionType = "credit" | "debit";

export interface Worker {
  id: number;
  name: string;
  role: string;
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
  unit: string | null;
  unitPrice: number | null;
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
  totalAmount: number;
  paidAmount: number;
  invoiceDate: string | null;
  dueDate: string | null;
  notes: string | null;
  imageUrl: string | null;
  createdAt: string | null;
}

export interface WorkerTransaction {
  id: number;
  workerId: number;
  type: TransactionType;
  amount: number;
  description: string | null;
  date: string | null;
  projectId: number | null;
  projectName: string | null;
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
  unit: string | null;
  unitPrice: number | null;
}

export interface InvoiceInput {
  number: string;
  supplierId: number | null;
  projectId: number | null;
  buildingId: number | null;
  totalAmount: number;
  paidAmount: number;
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
  description: string | null;
  date: string | null;
  projectId: number | null;
}

export const erpKeys = {
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

function normalizeWorker(row: Row, transactions: WorkerTransaction[] = []): Worker {
  const storedBalance = readNumber(row, "balance");
  return {
    id: readId(row, "id"),
    name: readString(row, "name") ?? "Sans nom",
    role: readString(row, "role") ?? "-",
    phone: readString(row, "phone"),
    balance: computeWorkerBalance(storedBalance, transactions),
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

function normalizeProduct(row: Row, suppliersById: Map<number, Supplier>): Product {
  const supplierId = readNumber(row, "supplier_id", "supplierId");
  return {
    id: readId(row, "id"),
    name: readString(row, "name") ?? "Sans nom",
    supplierId,
    supplierName:
      readString(row, "supplier_name", "supplierName") ??
      (supplierId != null ? suppliersById.get(supplierId)?.name ?? null : null),
    unit: readString(row, "unit"),
    unitPrice: readNumber(row, "unit_price", "unitPrice"),
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
): Invoice {
  const supplierId = readNumber(row, "supplier_id", "supplierId");
  const projectId = readNumber(row, "project_id", "projectId");
  const buildingId = readNumber(row, "building_id", "buildingId");
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
    totalAmount,
    paidAmount,
    invoiceDate: readDate(row, "invoice_date", "invoiceDate"),
    dueDate: readDate(row, "due_date", "dueDate"),
    notes: readString(row, "notes"),
    imageUrl: readString(row, "image_url", "imageUrl"),
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
    description: readString(row, "description"),
    date: readDate(row, "date"),
    projectId,
    projectName:
      readString(nestedProject, "name") ??
      (projectId != null ? projectsById.get(projectId)?.name ?? null : null),
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
  const rows = await selectAll("projects");
  return rows.map(normalizeProject);
}

export async function getProject(id: number) {
  const row = await selectOne("projects", id);
  return normalizeProject(row);
}

export async function listProjectBuildings(projectId?: number) {
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
  const snakePayload = {
    worker_id: input.workerId,
    type: input.type,
    amount: input.amount,
    description: input.description,
    date: input.date,
    project_id: input.projectId,
  };
  const camelPayload = {
    workerId: input.workerId,
    type: input.type,
    amount: input.amount,
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
  const [rows, suppliers] = await Promise.all([selectAll("products"), listSuppliers()]);
  const suppliersById = new Map(suppliers.map((supplier) => [supplier.id, supplier]));
  return rows.map((row) => normalizeProduct(row, suppliersById));
}

export async function createProduct(input: ProductInput) {
  const camelPayload = {
    name: input.name,
    supplierId: input.supplierId,
    unit: input.unit,
    unitPrice: input.unitPrice,
  };
  const snakePayload = {
    name: input.name,
    supplier_id: input.supplierId,
    unit: input.unit,
    unit_price: input.unitPrice,
  };

  await insertWithFallback("products", camelPayload, snakePayload);
}

export async function updateProduct(id: number, input: ProductInput) {
  const camelPayload = {
    name: input.name,
    supplierId: input.supplierId,
    unit: input.unit,
    unitPrice: input.unitPrice,
  };
  const snakePayload = {
    name: input.name,
    supplier_id: input.supplierId,
    unit: input.unit,
    unit_price: input.unitPrice,
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
  const [rows, suppliers, projects, buildings] = await Promise.all([
    selectAll("invoices"),
    listSuppliers(),
    listProjects(),
    listProjectBuildings(),
  ]);

  const suppliersById = new Map(suppliers.map((supplier) => [supplier.id, supplier]));
  const projectsById = new Map(projects.map((project) => [project.id, project]));
  const buildingsById = new Map(buildings.map((building) => [building.id, building]));

  return rows.map((row) => normalizeInvoice(row, suppliersById, projectsById, buildingsById));
}

export async function getInvoice(id: number) {
  const [row, suppliers, projects, buildings] = await Promise.all([
    selectOne("invoices", id),
    listSuppliers(),
    listProjects(),
    listProjectBuildings(),
  ]);

  const suppliersById = new Map(suppliers.map((supplier) => [supplier.id, supplier]));
  const projectsById = new Map(projects.map((project) => [project.id, project]));
  const buildingsById = new Map(buildings.map((building) => [building.id, building]));

  return normalizeInvoice(row, suppliersById, projectsById, buildingsById);
}

export async function createInvoice(input: InvoiceInput) {
  const camelPayload = {
    number: input.number,
    supplierId: input.supplierId,
    projectId: input.projectId,
    buildingId: input.buildingId,
    totalAmount: input.totalAmount,
    paidAmount: input.paidAmount,
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
    total_amount: input.totalAmount,
    paid_amount: input.paidAmount,
    status: input.status,
    invoice_date: input.invoiceDate,
    due_date: input.dueDate,
    notes: input.notes,
    image_url: input.imageUrl,
  };

  await insertWithFallback("invoices", camelPayload, snakePayload);
}

export async function updateInvoice(id: number, input: InvoiceInput) {
  const camelPayload = {
    number: input.number,
    supplierId: input.supplierId,
    projectId: input.projectId,
    buildingId: input.buildingId,
    totalAmount: input.totalAmount,
    paidAmount: input.paidAmount,
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
    total_amount: input.totalAmount,
    paid_amount: input.paidAmount,
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

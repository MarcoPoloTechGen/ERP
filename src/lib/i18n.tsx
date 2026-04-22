import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Lang = "en" | "ku";

type TranslationShape = {
  dir: "ltr" | "rtl";
  dashboard: string;
  workers: string;
  projects: string;
  suppliers: string;
  products: string;
  invoices: string;
  income: string;
  expenses: string;
  siteTitle: string;
  siteSub: string;
  signIn: string;
  signOut: string;
  createAccount: string;
  fullName: string;
  fullNamePlaceholder: string;
  email: string;
  emailPlaceholder: string;
  password: string;
  passwordPlaceholder: string;
  authIntro: string;
  reset: string;
  dashboardTitle: string;
  dashboardSub: string;
  totalWorkers: string;
  activeProjects: string;
  totalSuppliers: string;
  unpaidInvoices: string;
  financialSummary: string;
  totalInvoiced: string;
  amountPaid: string;
  remaining: string;
  paymentProgress: string;
  projectsSummary: string;
  workersSummary: string;
  invoicesSummary: string;
  noneYet: string;
  loading: string;
  retry: string;
  search: string;
  clearFilters: string;
  remove: string;
  filter: string;
  all: string;
  allProjects: string;
  allSuppliers: string;
  allStatuses: string;
  allCurrencies: string;
  allCategories: string;
  previous: string;
  next: string;
  status: string;
  currency: string;
  category: string;
  workersTitle: string;
  worker_count: (count: number) => string;
  addWorker: string;
  name: string;
  role: string;
  phone: string;
  balance: string;
  toReceive: string;
  owes: string;
  positiveBalance: string;
  negativeBalance: string;
  noWorkers: string;
  newWorker: string;
  editWorker: string;
  namePlaceholder: string;
  rolePlaceholder: string;
  categoryPlaceholder: string;
  phonePlaceholder: string;
  nameRequired: string;
  roleRequired: string;
  requiredField: string;
  save: string;
  create: string;
  cancel: string;
  deleteWorkerConfirm: string;
  transactions: string;
  transactionsCount: (count: number) => string;
  addTransaction: string;
  noTransactions: string;
  newTransaction: string;
  type: string;
  amount: string;
  description: string;
  date: string;
  dateFrom: string;
  dateTo: string;
  credit: string;
  debit: string;
  amountRequired: string;
  dateRequired: string;
  creditLabel: string;
  debitLabel: string;
  txProject: string;
  noProjectOption: string;
  projectsTitle: string;
  project_count: (count: number) => string;
  buildingsTitle: string;
  building_count: (count: number) => string;
  buildingsHint: string;
  addBuilding: string;
  buildingLabel: string;
  buildingNamePlaceholder: string;
  noBuildings: string;
  addProject: string;
  noProjects: string;
  newProject: string;
  editProject: string;
  projectName: string;
  projectNamePlaceholder: string;
  client: string;
  clientPlaceholder: string;
  location: string;
  locationPlaceholder: string;
  active: string;
  completed: string;
  paused: string;
  unpaid: string;
  partial: string;
  paid: string;
  budget: string;
  startDate: string;
  endDate: string;
  deleteProjectConfirm: string;
  noClient: string;
  noDetail: string;
  from: string;
  to: string;
  relatedInvoices_count: (count: number) => string;
  noInvoicesForProject: string;
  noSupplier: string;
  projectInfo: string;
  suppliersTitle: string;
  supplier_count: (count: number) => string;
  addSupplier: string;
  noSuppliers: string;
  newSupplier: string;
  editSupplier: string;
  contact: string;
  contactPlaceholder: string;
  phoneSup: string;
  address: string;
  addressPlaceholder: string;
  deleteSupplierConfirm: string;
  productsTitle: string;
  product_count: (count: number) => string;
  addProduct: string;
  noProducts: string;
  newProduct: string;
  editProduct: string;
  unit: string;
  unitPlaceholder: string;
  unitPrice: string;
  supplierLabel: string;
  noneOption: string;
  deleteProductConfirm: string;
  invoicesTitle: string;
  invoice_count: (count: number) => string;
  expense_count: (count: number) => string;
  addInvoice: string;
  noInvoices: string;
  noExpenses: string;
  newInvoice: string;
  editInvoice: string;
  invoiceNumber: string;
  invoiceNumberPlaceholder: string;
  invoiceStatus_label: string;
  supplierOption: string;
  projectOption: string;
  invoiceAssignment: string;
  projectGlobalCost: string;
  projectBuildingCost: string;
  totalAmount: string;
  paidAmount: string;
  invoiceDate: string;
  dueDate: string;
  notes: string;
  notesPlaceholder: string;
  remaining_label: string;
  deleteInvoiceConfirm: string;
  unpaidFilter: string;
  partialFilter: string;
  paidFilter: string;
  markPaid: string;
  invoiceDetails: string;
  financialSummaryInv: string;
  alreadyPaid: string;
  progress: string;
  uploadImage: string;
  changeImage: string;
  viewImage: string;
  invoiceImage: string;
  receiptImage: string;
  reference: string;
  user: string;
  createdBy: string;
  notFound: string;
  pageNotFound: string;
  pageNotFoundSub: string;
  version: string;
  adminTitle: string;
  adminSubtitle: string;
  adminRestricted: string;
  allowedProjects: string;
  noUsersFound: string;
  roleLabel: string;
  incomeTitle: string;
  income_count: (count: number) => string;
  entries: string;
  addIncome: string;
  newIncomeEntry: string;
  noIncomeEntries: string;
  expenseDetails: string;
};

function createEnglishTranslations(dir: "ltr" | "rtl"): TranslationShape {
  return {
    dir,
    dashboard: "Dashboard",
    workers: "Workers",
    projects: "Projects",
    suppliers: "Suppliers",
    products: "Products",
    invoices: "Invoices",
    income: "Income",
    expenses: "Expenses",
    siteTitle: "BTP Manager",
    siteSub: "Simple and robust jobsite ERP",
    signIn: "Sign in",
    signOut: "Sign out",
    createAccount: "Create account",
    fullName: "Full name",
    fullNamePlaceholder: "Ahmed Benali",
    email: "Email",
    emailPlaceholder: "email@company.com",
    password: "Password",
    passwordPlaceholder: "Enter your password",
    authIntro: "Sign in to track projects, expenses, income, and team access.",
    reset: "Reset",
    dashboardTitle: "Dashboard",
    dashboardSub: "Overview of teams, projects and invoices.",
    totalWorkers: "Workers",
    activeProjects: "Active projects",
    totalSuppliers: "Suppliers",
    unpaidInvoices: "Open invoices",
    financialSummary: "Financial summary",
    totalInvoiced: "Total invoiced",
    amountPaid: "Total paid",
    remaining: "Remaining",
    paymentProgress: "Payment progress",
    projectsSummary: "Projects",
    workersSummary: "Workers",
    invoicesSummary: "Invoices",
    noneYet: "No data yet.",
    loading: "Loading",
    retry: "Retry",
    search: "Search",
    clearFilters: "Clear filters",
    remove: "Remove",
    filter: "Filter",
    all: "All",
    allProjects: "All projects",
    allSuppliers: "All suppliers",
    allStatuses: "All statuses",
    allCurrencies: "All currencies",
    allCategories: "All categories",
    previous: "Previous",
    next: "Next",
    status: "Status",
    currency: "Currency",
    category: "Category",
    workersTitle: "Workers",
    worker_count: (count) => `${count} worker${count === 1 ? "" : "s"}`,
    addWorker: "Add",
    name: "Name",
    role: "Role",
    phone: "Phone",
    balance: "Balance",
    toReceive: "To receive",
    owes: "Needs adjustment",
    positiveBalance: "Positive balance",
    negativeBalance: "Negative balance",
    noWorkers: "No workers yet. Add your first profile.",
    newWorker: "New worker",
    editWorker: "Edit worker",
    namePlaceholder: "Ahmed Benali",
    rolePlaceholder: "Mason, electrician, site manager...",
    categoryPlaceholder: "Mason, electrician, driver...",
    phonePlaceholder: "+33 6 12 34 56 78",
    nameRequired: "Name is required.",
    roleRequired: "Role is required.",
    requiredField: "Required field.",
    save: "Save",
    create: "Create",
    cancel: "Cancel",
    deleteWorkerConfirm: "Delete this worker?",
    transactions: "Transactions",
    transactionsCount: (count) => `${count} transaction${count === 1 ? "" : "s"}`,
    addTransaction: "Add transaction",
    noTransactions: "No transactions for this worker.",
    newTransaction: "New transaction",
    type: "Type",
    amount: "Amount",
    description: "Description",
    date: "Date",
    dateFrom: "Date from",
    dateTo: "Date to",
    credit: "Payment",
    debit: "Advance",
    amountRequired: "Amount is required.",
    dateRequired: "Date is required.",
    creditLabel: "Payment",
    debitLabel: "Advance",
    txProject: "Linked project",
    noProjectOption: "No project",
    projectsTitle: "Projects",
    project_count: (count) => `${count} project${count === 1 ? "" : "s"}`,
    buildingsTitle: "Buildings",
    building_count: (count) => `${count} building${count === 1 ? "" : "s"}`,
    buildingsHint: "Add the buildings that belong to this project.",
    addBuilding: "Add building",
    buildingLabel: "Building",
    buildingNamePlaceholder: "Building A, Block B, Tower C...",
    noBuildings: "No buildings configured for this project.",
    addProject: "Add",
    noProjects: "No projects yet. Create the first one.",
    newProject: "New project",
    editProject: "Edit project",
    projectName: "Project name",
    projectNamePlaceholder: "Villa renovation, building facade...",
    client: "Client",
    clientPlaceholder: "Client name",
    location: "Location",
    locationPlaceholder: "Paris, Lyon, Marseille...",
    active: "Active",
    completed: "Completed",
    paused: "Paused",
    unpaid: "Unpaid",
    partial: "Partial",
    paid: "Paid",
    budget: "Budget",
    startDate: "Start date",
    endDate: "Expected end",
    deleteProjectConfirm: "Delete this project?",
    noClient: "No client",
    noDetail: "No details",
    from: "From",
    to: "to",
    relatedInvoices_count: (count) => `${count} linked invoice${count === 1 ? "" : "s"}`,
    noInvoicesForProject: "No expenses for this project.",
    noSupplier: "No supplier",
    projectInfo: "Project information",
    suppliersTitle: "Suppliers",
    supplier_count: (count) => `${count} supplier${count === 1 ? "" : "s"}`,
    addSupplier: "Add",
    noSuppliers: "No suppliers yet.",
    newSupplier: "New supplier",
    editSupplier: "Edit supplier",
    contact: "Contact",
    contactPlaceholder: "Contact name",
    phoneSup: "Phone",
    address: "Address",
    addressPlaceholder: "12 Construction Street",
    deleteSupplierConfirm: "Delete this supplier?",
    productsTitle: "Products and materials",
    product_count: (count) => `${count} product${count === 1 ? "" : "s"}`,
    addProduct: "Add",
    noProducts: "No products yet.",
    newProduct: "New product",
    editProduct: "Edit product",
    unit: "Unit",
    unitPlaceholder: "bag, m2, pallet, item...",
    unitPrice: "Unit price",
    supplierLabel: "Supplier",
    noneOption: "None",
    deleteProductConfirm: "Delete this product?",
    invoicesTitle: "Expenses",
    invoice_count: (count) => `${count} invoice${count === 1 ? "" : "s"}`,
    expense_count: (count) => `${count} expense${count === 1 ? "" : "s"}`,
    addInvoice: "Add",
    noInvoices: "No invoices yet.",
    noExpenses: "No expenses yet.",
    newInvoice: "New expense",
    editInvoice: "Edit expense",
    invoiceNumber: "Reference",
    invoiceNumberPlaceholder: "EXP-2026-001",
    invoiceStatus_label: "Status",
    supplierOption: "Supplier",
    projectOption: "Project",
    invoiceAssignment: "Assignment",
    projectGlobalCost: "Project-wide cost",
    projectBuildingCost: "Specific building",
    totalAmount: "Total amount",
    paidAmount: "Paid amount",
    invoiceDate: "Invoice date",
    dueDate: "Due date",
    notes: "Notes",
    notesPlaceholder: "Helpful information, reference, comments...",
    remaining_label: "Remaining",
    deleteInvoiceConfirm: "Delete this expense?",
    unpaidFilter: "Unpaid",
    partialFilter: "Partial",
    paidFilter: "Paid",
    markPaid: "Mark as paid",
    invoiceDetails: "Expense details",
    financialSummaryInv: "Financial summary",
    alreadyPaid: "Already paid",
    progress: "Progress",
    uploadImage: "Add image",
    changeImage: "Change image",
    viewImage: "View image",
    invoiceImage: "Expense image",
    receiptImage: "Receipt image",
    reference: "Reference",
    user: "User",
    createdBy: "Created by",
    notFound: "Item not found.",
    pageNotFound: "Page not found",
    pageNotFoundSub: "The page you requested does not exist anymore.",
    version: "Version 2.1",
    adminTitle: "Admin",
    adminSubtitle: "Manage roles and project access",
    adminRestricted: "This page is restricted to administrators.",
    allowedProjects: "Allowed projects",
    noUsersFound: "No users found.",
    roleLabel: "Role",
    incomeTitle: "Income",
    income_count: (count) => `${count} entr${count === 1 ? "y" : "ies"}`,
    entries: "Entries",
    addIncome: "Add",
    newIncomeEntry: "New income entry",
    noIncomeEntries: "No income entries yet.",
    expenseDetails: "Expense details",
  };
}

const translations: Record<Lang, TranslationShape> = {
  en: createEnglishTranslations("ltr"),
  ku: createEnglishTranslations("rtl"),
};

const LangContext = createContext<{
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: TranslationShape;
}>({
  lang: "en",
  setLang: () => {},
  t: translations.en,
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("btp-lang") : null;
    return stored === "en" || stored === "ku" ? stored : "en";
  });

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = translations[lang].dir;
    window.localStorage.setItem("btp-lang", lang);
  }, [lang]);

  const value = useMemo(
    () => ({
      lang,
      setLang: setLangState,
      t: translations[lang],
    }),
    [lang],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

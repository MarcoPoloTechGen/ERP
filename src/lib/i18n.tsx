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
  siteTitle: string;
  siteSub: string;
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
  invoiced: string;
  totalCredit: string;
  totalDebit: string;
  due: string;
  noneYet: string;
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
  phonePlaceholder: string;
  nameRequired: string;
  roleRequired: string;
  save: string;
  create: string;
  cancel: string;
  deleteWorkerConfirm: string;
  transactions: string;
  addTransaction: string;
  noTransactions: string;
  newTransaction: string;
  type: string;
  amount: string;
  description: string;
  date: string;
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
  buildingsTitle?: string;
  building_count?: (count: number) => string;
  buildingsHint?: string;
  addBuilding?: string;
  buildingLabel?: string;
  buildingNamePlaceholder?: string;
  noBuildings?: string;
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
  status: string;
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
  email: string;
  emailPlaceholder: string;
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
  supplier_prefix: string;
  invoicesTitle: string;
  invoice_count: (count: number) => string;
  addInvoice: string;
  noInvoices: string;
  newInvoice: string;
  editInvoice: string;
  invoiceNumber: string;
  invoiceNumberPlaceholder: string;
  invoiceStatus_label: string;
  supplierOption: string;
  projectOption: string;
  invoiceAssignment?: string;
  projectGlobalCost?: string;
  projectBuildingCost?: string;
  totalAmount: string;
  paidAmount: string;
  invoiceDate: string;
  dueDate: string;
  notes: string;
  notesPlaceholder: string;
  remaining_label: string;
  deleteInvoiceConfirm: string;
  all: string;
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
  notFound: string;
  pageNotFound: string;
  pageNotFoundSub: string;
  version: string;
};

const translations: Record<Lang, TranslationShape> = {
  en: {
    dir: "ltr",
    dashboard: "Dashboard",
    workers: "Workers",
    projects: "Projects",
    suppliers: "Suppliers",
    products: "Products",
    invoices: "Invoices",
    siteTitle: "BTP Manager",
    siteSub: "Simple and robust jobsite ERP",
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
    invoiced: "Invoiced",
    totalCredit: "Payments",
    totalDebit: "Advances",
    due: "Remaining",
    noneYet: "No data yet.",
    workersTitle: "Workers",
    worker_count: (count) => `${count} worker${count > 1 ? "s" : ""}`,
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
    phonePlaceholder: "+33 6 12 34 56 78",
    nameRequired: "Name is required.",
    roleRequired: "Role is required.",
    save: "Save",
    create: "Create",
    cancel: "Cancel",
    deleteWorkerConfirm: "Delete this worker?",
    transactions: "Transactions",
    addTransaction: "Add transaction",
    noTransactions: "No transactions for this worker.",
    newTransaction: "New transaction",
    type: "Type",
    amount: "Amount (EUR)",
    description: "Description",
    date: "Date",
    credit: "Payment",
    debit: "Advance",
    amountRequired: "Amount is required.",
    dateRequired: "Date is required.",
    creditLabel: "Payment",
    debitLabel: "Advance",
    txProject: "Linked project",
    noProjectOption: "No project",
    projectsTitle: "Projects",
    project_count: (count) => `${count} project${count > 1 ? "s" : ""}`,
    buildingsTitle: "Buildings",
    building_count: (count) => `${count} building${count > 1 ? "s" : ""}`,
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
    status: "Status",
    active: "Active",
    completed: "Completed",
    paused: "Paused",
    unpaid: "Unpaid",
    partial: "Partial",
    paid: "Paid",
    budget: "Budget (EUR)",
    startDate: "Start date",
    endDate: "Expected end",
    deleteProjectConfirm: "Delete this project?",
    noClient: "No client",
    noDetail: "No details",
    from: "From",
    to: "to",
    relatedInvoices_count: (count) => `Related invoices (${count})`,
    noInvoicesForProject: "No invoices linked to this project.",
    noSupplier: "No supplier",
    projectInfo: "Project information",
    suppliersTitle: "Suppliers",
    supplier_count: (count) => `${count} supplier${count > 1 ? "s" : ""}`,
    addSupplier: "Add",
    noSuppliers: "No suppliers yet.",
    newSupplier: "New supplier",
    editSupplier: "Edit supplier",
    contact: "Contact",
    contactPlaceholder: "Contact name",
    phoneSup: "Phone",
    email: "Email",
    emailPlaceholder: "contact@supplier.com",
    address: "Address",
    addressPlaceholder: "12 Construction Street",
    deleteSupplierConfirm: "Delete this supplier?",
    productsTitle: "Products and materials",
    product_count: (count) => `${count} product${count > 1 ? "s" : ""}`,
    addProduct: "Add",
    noProducts: "No products yet.",
    newProduct: "New product",
    editProduct: "Edit product",
    unit: "Unit",
    unitPlaceholder: "bag, m2, pallet, item...",
    unitPrice: "Unit price (EUR)",
    supplierLabel: "Supplier",
    noneOption: "None",
    deleteProductConfirm: "Delete this product?",
    supplier_prefix: "Supplier",
    invoicesTitle: "Invoices",
    invoice_count: (count) => `${count} invoice${count > 1 ? "s" : ""}`,
    addInvoice: "Add",
    noInvoices: "No invoices yet.",
    newInvoice: "New invoice",
    editInvoice: "Edit invoice",
    invoiceNumber: "Number",
    invoiceNumberPlaceholder: "INV-2026-001",
    invoiceStatus_label: "Status",
    supplierOption: "Supplier",
    projectOption: "Project",
    invoiceAssignment: "Assignment",
    projectGlobalCost: "Project global cost",
    projectBuildingCost: "Specific building",
    totalAmount: "Total amount (EUR)",
    paidAmount: "Paid amount (EUR)",
    invoiceDate: "Invoice date",
    dueDate: "Due date",
    notes: "Notes",
    notesPlaceholder: "Helpful information, reference, comments...",
    remaining_label: "Remaining",
    deleteInvoiceConfirm: "Delete this invoice?",
    all: "All",
    unpaidFilter: "Unpaid",
    partialFilter: "Partial",
    paidFilter: "Paid",
    markPaid: "Mark as paid",
    invoiceDetails: "Invoice details",
    financialSummaryInv: "Financial summary",
    alreadyPaid: "Already paid",
    progress: "Progress",
    uploadImage: "Add image",
    changeImage: "Change image",
    viewImage: "View image",
    invoiceImage: "Invoice image",
    notFound: "Item not found.",
    pageNotFound: "Page not found",
    pageNotFoundSub: "The page you requested does not exist anymore.",
    version: "Version 2.0",
  },
  ku: {
    dir: "rtl",
    dashboard: "داشبۆرد",
    workers: "کرێکاران",
    projects: "پرۆژەکان",
    suppliers: "دابینکەرەکان",
    products: "کاڵا و کەرەستەکان",
    invoices: "پسووڵەکان",
    siteTitle: "BTP Manager",
    siteSub: "ERP ـێکی سادە و بەهێز بۆ چالاکی",
    dashboardTitle: "داشبۆرد",
    dashboardSub: "پوختەیەک لە تیمەکان، پرۆژەکان و پسووڵەکان.",
    totalWorkers: "کرێکاران",
    activeProjects: "پرۆژە چالاکەکان",
    totalSuppliers: "دابینکەرەکان",
    unpaidInvoices: "پسووڵەی نەدراو",
    financialSummary: "پوختەی دارایی",
    totalInvoiced: "کۆی پسووڵەکراو",
    amountPaid: "کۆی پارەدراو",
    remaining: "ماوە",
    paymentProgress: "پێشکەوتنی پارەدان",
    projectsSummary: "پرۆژەکان",
    workersSummary: "کرێکاران",
    invoicesSummary: "پسووڵەکان",
    invoiced: "پسووڵەکراو",
    totalCredit: "پارەدانەکان",
    totalDebit: "پێشەکییەکان",
    due: "ماوە",
    noneYet: "هێشتا هیچ داتایەک نییە.",
    workersTitle: "کرێکاران",
    worker_count: (count) => `${count} کرێکار`,
    addWorker: "زیادکردن",
    name: "ناو",
    role: "پۆست",
    phone: "تەلەفۆن",
    balance: "باڵانس",
    toReceive: "بۆ وەرگرتن",
    owes: "پێویستی بە ڕێکخستنەوە هەیە",
    positiveBalance: "باڵانسی ئەرێنی",
    negativeBalance: "باڵانسی نەرێنی",
    noWorkers: "هێشتا هیچ کرێکارێک نییە.",
    newWorker: "کرێکاری نوێ",
    editWorker: "دەستکاریکردنی کرێکار",
    namePlaceholder: "Ahmed Benali",
    rolePlaceholder: "بەنّا، کارەباچی، سەرپەرشتیار...",
    phonePlaceholder: "+964 750 123 4567",
    nameRequired: "ناو پێویستە.",
    roleRequired: "پۆست پێویستە.",
    save: "پاشەکەوتکردن",
    create: "دروستکردن",
    cancel: "هەڵوەشاندنەوە",
    deleteWorkerConfirm: "ئەم کرێکارە بسڕدرێتەوە؟",
    transactions: "مامەڵەکان",
    addTransaction: "زیادکردنی مامەڵە",
    noTransactions: "هیچ مامەڵەیەک بۆ ئەم کرێکارە نییە.",
    newTransaction: "مامەڵەی نوێ",
    type: "جۆر",
    amount: "بڕ (EUR)",
    description: "وەسف",
    date: "بەروار",
    credit: "پارەدان",
    debit: "پێشەکی",
    amountRequired: "بڕ پێویستە.",
    dateRequired: "بەروار پێویستە.",
    creditLabel: "پارەدان",
    debitLabel: "پێشەکی",
    txProject: "پرۆژەی پەیوەندیدار",
    noProjectOption: "هیچ پرۆژەیەک",
    projectsTitle: "پرۆژەکان",
    project_count: (count) => `${count} پرۆژە`,
    addProject: "زیادکردن",
    noProjects: "هێشتا هیچ پرۆژەیەک نییە.",
    newProject: "پرۆژەی نوێ",
    editProject: "دەستکاریکردنی پرۆژە",
    projectName: "ناوی پرۆژە",
    projectNamePlaceholder: "نۆژەنکردنەوەی خانوو، بینا، ڕووکار...",
    client: "کڕیار",
    clientPlaceholder: "ناوی کڕیار",
    location: "شوێن",
    locationPlaceholder: "هەولێر، سلێمانی، دهۆک...",
    status: "دۆخ",
    active: "چالاک",
    completed: "تەواوبوو",
    paused: "وەستاو",
    unpaid: "نەدراو",
    partial: "بەشێک دراوە",
    paid: "دراوە",
    budget: "بودجە (EUR)",
    startDate: "دەستپێک",
    endDate: "کۆتایی چاوەڕوانکراو",
    deleteProjectConfirm: "ئەم پرۆژەیە بسڕدرێتەوە؟",
    noClient: "کڕیار دیاری نەکراوە",
    noDetail: "هیچ وردەکارییەک نییە",
    from: "لە",
    to: "بۆ",
    relatedInvoices_count: (count) => `پسووڵە پەیوەندیدارەکان (${count})`,
    noInvoicesForProject: "هیچ پسووڵەیەک بەم پرۆژەیەوە نەبەستراوە.",
    noSupplier: "هیچ دابینکەرێک",
    projectInfo: "زانیاریی پرۆژە",
    suppliersTitle: "دابینکەرەکان",
    supplier_count: (count) => `${count} دابینکەر`,
    addSupplier: "زیادکردن",
    noSuppliers: "هێشتا هیچ دابینکەرێک نییە.",
    newSupplier: "دابینکەری نوێ",
    editSupplier: "دەستکاریکردنی دابینکەر",
    contact: "پەیوەندی",
    contactPlaceholder: "ناوی کەسی پەیوەندی",
    phoneSup: "تەلەفۆن",
    email: "ئیمەیڵ",
    emailPlaceholder: "contact@supplier.com",
    address: "ناونیشان",
    addressPlaceholder: "ناونیشان",
    deleteSupplierConfirm: "ئەم دابینکەرە بسڕدرێتەوە؟",
    productsTitle: "کاڵا و کەرەستەکان",
    product_count: (count) => `${count} کاڵا`,
    addProduct: "زیادکردن",
    noProducts: "هێشتا هیچ کاڵایەک نییە.",
    newProduct: "کاڵای نوێ",
    editProduct: "دەستکاریکردنی کاڵا",
    unit: "یەکە",
    unitPlaceholder: "کیسە، m2، پالێت، دانە...",
    unitPrice: "نرخی یەکە (EUR)",
    supplierLabel: "دابینکەر",
    noneOption: "هیچ",
    deleteProductConfirm: "ئەم کاڵایە بسڕدرێتەوە؟",
    supplier_prefix: "دابینکەر",
    invoicesTitle: "پسووڵەکان",
    invoice_count: (count) => `${count} پسووڵە`,
    addInvoice: "زیادکردن",
    noInvoices: "هێشتا هیچ پسووڵەیەک نییە.",
    newInvoice: "پسووڵەی نوێ",
    editInvoice: "دەستکاریکردنی پسووڵە",
    invoiceNumber: "ژمارە",
    invoiceNumberPlaceholder: "INV-2026-001",
    invoiceStatus_label: "دۆخ",
    supplierOption: "دابینکەر",
    projectOption: "پرۆژە",
    totalAmount: "کۆی بڕ (EUR)",
    paidAmount: "بڕی دراو (EUR)",
    invoiceDate: "بەرواری پسووڵە",
    dueDate: "بەرواری قەرز",
    notes: "تێبینی",
    notesPlaceholder: "زانیاریی بەسوود، سەرچاوە، تێبینی...",
    remaining_label: "ماوە",
    deleteInvoiceConfirm: "ئەم پسووڵەیە بسڕدرێتەوە؟",
    all: "هەموو",
    unpaidFilter: "نەدراو",
    partialFilter: "بەشێک دراوە",
    paidFilter: "دراوە",
    markPaid: "وەک دراو نیشانە بکە",
    invoiceDetails: "وردەکاریی پسووڵە",
    financialSummaryInv: "پوختەی دارایی",
    alreadyPaid: "پێشتر دراوە",
    progress: "پێشکەوتن",
    uploadImage: "زیادکردنی وێنە",
    changeImage: "گۆڕینی وێنە",
    viewImage: "بینینی وێنە",
    invoiceImage: "وێنەی پسووڵە",
    notFound: "ئەو توخمە نەدۆزرایەوە.",
    pageNotFound: "پەڕە نەدۆزرایەوە",
    pageNotFoundSub: "ئەو پەڕەیەی داوات کردووە بوونی نییە.",
    version: "وەشانی 2.0",
  },
};

export type Translations = TranslationShape;

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

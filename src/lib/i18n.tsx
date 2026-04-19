import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Lang = "fr" | "en";

type TranslationShape = {
  dir: "ltr";
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
  fr: {
    dir: "ltr",
    dashboard: "Tableau de bord",
    workers: "Ouvriers",
    projects: "Chantiers",
    suppliers: "Fournisseurs",
    products: "Materiaux",
    invoices: "Factures",
    siteTitle: "BTP Manager",
    siteSub: "ERP chantier simple et robuste",
    dashboardTitle: "Tableau de bord",
    dashboardSub: "Vue d'ensemble des equipes, chantiers et factures.",
    totalWorkers: "Ouvriers",
    activeProjects: "Chantiers actifs",
    totalSuppliers: "Fournisseurs",
    unpaidInvoices: "Factures a regler",
    financialSummary: "Synthese financiere",
    totalInvoiced: "Total facture",
    amountPaid: "Total regle",
    remaining: "Reste a regler",
    paymentProgress: "Avancement des paiements",
    projectsSummary: "Chantiers",
    workersSummary: "Ouvriers",
    invoicesSummary: "Factures",
    invoiced: "Facture",
    totalCredit: "Versements",
    totalDebit: "Avances",
    due: "Reste",
    noneYet: "Aucune donnee pour le moment.",
    workersTitle: "Ouvriers",
    worker_count: (count) => `${count} ouvrier${count > 1 ? "s" : ""}`,
    addWorker: "Ajouter",
    name: "Nom",
    role: "Poste",
    phone: "Telephone",
    balance: "Solde",
    toReceive: "A recevoir",
    owes: "A regulariser",
    positiveBalance: "Solde positif",
    negativeBalance: "Solde negatif",
    noWorkers: "Aucun ouvrier. Ajoute ton premier profil.",
    newWorker: "Nouvel ouvrier",
    editWorker: "Modifier l'ouvrier",
    namePlaceholder: "Ahmed Benali",
    rolePlaceholder: "Macon, electricien, chef de chantier...",
    phonePlaceholder: "06 12 34 56 78",
    nameRequired: "Le nom est obligatoire.",
    roleRequired: "Le poste est obligatoire.",
    save: "Enregistrer",
    create: "Creer",
    cancel: "Annuler",
    deleteWorkerConfirm: "Supprimer cet ouvrier ?",
    transactions: "Transactions",
    addTransaction: "Ajouter une transaction",
    noTransactions: "Aucune transaction pour cet ouvrier.",
    newTransaction: "Nouvelle transaction",
    type: "Type",
    amount: "Montant (EUR)",
    description: "Description",
    date: "Date",
    credit: "Versement",
    debit: "Avance",
    amountRequired: "Le montant est obligatoire.",
    dateRequired: "La date est obligatoire.",
    creditLabel: "Versement",
    debitLabel: "Avance",
    txProject: "Chantier lie",
    noProjectOption: "Aucun chantier",
    projectsTitle: "Chantiers",
    project_count: (count) => `${count} chantier${count > 1 ? "s" : ""}`,
    addProject: "Ajouter",
    noProjects: "Aucun chantier. Cree le premier.",
    newProject: "Nouveau chantier",
    editProject: "Modifier le chantier",
    projectName: "Nom du chantier",
    projectNamePlaceholder: "Renovation villa, immeuble, facade...",
    client: "Client",
    clientPlaceholder: "Nom du client",
    location: "Lieu",
    locationPlaceholder: "Paris, Lyon, Marseille...",
    status: "Statut",
    active: "Actif",
    completed: "Termine",
    paused: "En pause",
    unpaid: "Impayee",
    partial: "Partielle",
    paid: "Reglee",
    budget: "Budget (EUR)",
    startDate: "Debut",
    endDate: "Fin prevue",
    deleteProjectConfirm: "Supprimer ce chantier ?",
    noClient: "Client non renseigne",
    noDetail: "Aucun detail",
    from: "Du",
    to: "au",
    relatedInvoices_count: (count) => `Factures liees (${count})`,
    noInvoicesForProject: "Aucune facture liee a ce chantier.",
    noSupplier: "Aucun fournisseur",
    projectInfo: "Informations chantier",
    suppliersTitle: "Fournisseurs",
    supplier_count: (count) => `${count} fournisseur${count > 1 ? "s" : ""}`,
    addSupplier: "Ajouter",
    noSuppliers: "Aucun fournisseur. Cree la base fournisseurs.",
    newSupplier: "Nouveau fournisseur",
    editSupplier: "Modifier le fournisseur",
    contact: "Contact",
    contactPlaceholder: "Nom du contact",
    phoneSup: "Telephone",
    email: "Email",
    emailPlaceholder: "contact@fournisseur.com",
    address: "Adresse",
    addressPlaceholder: "12 rue du chantier",
    deleteSupplierConfirm: "Supprimer ce fournisseur ?",
    productsTitle: "Produits et materiaux",
    product_count: (count) => `${count} produit${count > 1 ? "s" : ""}`,
    addProduct: "Ajouter",
    noProducts: "Aucun produit. Ajoute ton premier materiau.",
    newProduct: "Nouveau produit",
    editProduct: "Modifier le produit",
    unit: "Unite",
    unitPlaceholder: "sac, m2, palette, piece...",
    unitPrice: "Prix unitaire (EUR)",
    supplierLabel: "Fournisseur",
    noneOption: "Aucun",
    deleteProductConfirm: "Supprimer ce produit ?",
    supplier_prefix: "Fournisseur",
    invoicesTitle: "Factures",
    invoice_count: (count) => `${count} facture${count > 1 ? "s" : ""}`,
    addInvoice: "Ajouter",
    noInvoices: "Aucune facture pour le moment.",
    newInvoice: "Nouvelle facture",
    editInvoice: "Modifier la facture",
    invoiceNumber: "Numero",
    invoiceNumberPlaceholder: "FAC-2026-001",
    invoiceStatus_label: "Statut",
    supplierOption: "Fournisseur",
    projectOption: "Chantier",
    totalAmount: "Montant total (EUR)",
    paidAmount: "Montant regle (EUR)",
    invoiceDate: "Date facture",
    dueDate: "Echeance",
    notes: "Notes",
    notesPlaceholder: "Informations utiles, reference, commentaire...",
    remaining_label: "Reste",
    deleteInvoiceConfirm: "Supprimer cette facture ?",
    all: "Toutes",
    unpaidFilter: "Impayees",
    partialFilter: "Partielles",
    paidFilter: "Reglees",
    markPaid: "Marquer comme reglee",
    invoiceDetails: "Details facture",
    financialSummaryInv: "Resume financier",
    alreadyPaid: "Deja regle",
    progress: "Progression",
    uploadImage: "Ajouter une image",
    changeImage: "Changer l'image",
    viewImage: "Voir l'image",
    invoiceImage: "Image facture",
    notFound: "Element introuvable.",
    pageNotFound: "Page introuvable",
    pageNotFoundSub: "La page demandee n'existe pas ou plus.",
    version: "Version 2.0",
  },
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
};

export type Translations = TranslationShape;

const LangContext = createContext<{
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: TranslationShape;
}>({
  lang: "fr",
  setLang: () => {},
  t: translations.fr,
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("btp-lang") : null;
    return stored === "en" || stored === "fr" ? stored : "fr";
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

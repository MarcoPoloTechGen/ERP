import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Lang = "en" | "ku";
export const DEFAULT_LANG: Lang = "ku";

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
  calendar: string;
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
  brandingTitle: string;
  brandingSubtitle: string;
  companyLogo: string;
  companyLogoHint: string;
  uploadCompanyLogo: string;
  changeCompanyLogo: string;
  removeCompanyLogo: string;
  saveCompanyLogo: string;
  noCompanyLogo: string;
  companyLogoUpdated: string;
  companyLogoRemoved: string;
  forgotPassword: string;
  forgotPasswordIntro: string;
  sendResetLink: string;
  sendResetLinkCooldown: (seconds: number) => string;
  resetPasswordEmailSent: string;
  resetPasswordRateLimit: (seconds: number) => string;
  accountCreatedCheckEmail: string;
  accountAlreadyExists: string;
  resetPasswordAction: string;
  backToSignIn: string;
  resetPasswordPageTitle: string;
  resetPasswordPageIntro: string;
  preparingRecoveryLink: string;
  newPassword: string;
  newPasswordPlaceholder: string;
  confirmPassword: string;
  confirmPasswordPlaceholder: string;
  updatePassword: string;
  passwordUpdated: string;
  passwordMismatch: string;
  passwordTooShort: string;
  invalidRecoveryLink: string;
  requestNewResetLink: string;
  authIntro: string;
  reset: string;
  dashboardTitle: string;
  dashboardSub: string;
  calendarTitle: string;
  calendarSub: string;
  calendarEventType: string;
  calendarAllEvents: string;
  calendarImportantEvents: string;
  calendarEventDetails: string;
  calendarOpenRecord: string;
  calendarSource: string;
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
  projectScope: string;
  allSuppliers: string;
  allStatuses: string;
  allCurrencies: string;
  allCategories: string;
  previous: string;
  next: string;
  status: string;
  deleted: string;
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
  expenseTitle: string;
  expenseType: string;
  expenseTypeLabor: string;
  expenseTypeProducts: string;
  expenseTypeLogistics: string;
  laborPersonName: string;
  laborPersonNamePlaceholder: string;
  materialOption: string;
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
  editIncomeEntry: string;
  noIncomeEntries: string;
  deleteIncomeConfirm: string;
  incomeLog: string;
  noIncomeLog: string;
  expenseDetails: string;
  expenseLog: string;
  changeDate: string;
  changeType: string;
  changeCreated: string;
  changeUpdated: string;
  changeDeleted: string;
  noExpenseLog: string;
  close: string;
  closeNavigation: string;
  excel: string;
  unexpectedError: string;
  renderErrorBadge: string;
  renderErrorTitle: string;
  renderErrorDescription: string;
  appLoadingDescription: string;
  appLoadingSlowDescription: string;
  configRequiredBadge: string;
  configRequiredTitle: string;
  configRequiredDescription: string;
  variableLabel: string;
  whereToCheckInVercel: string;
  vercelEnvHint: string;
  criticalError: string;
  appCouldNotStart: string;
  jsRenderBlocked: string;
  unhandledPromiseRejection: string;
  asyncStartupBlocked: string;
  missingRootElement: string;
  initialRenderFailed: string;
  authenticationFailed: string;
  updatePasswordFailed: string;
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
    calendar: "Calendar",
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
    brandingTitle: "Branding",
    brandingSubtitle: "Manage the company logo shown inside the application.",
    companyLogo: "Company logo",
    companyLogoHint: "This logo is shown in the admin area, sidebar, and sign-in screens.",
    uploadCompanyLogo: "Upload logo",
    changeCompanyLogo: "Change logo",
    removeCompanyLogo: "Remove logo",
    saveCompanyLogo: "Save logo",
    noCompanyLogo: "No company logo uploaded yet.",
    companyLogoUpdated: "The company logo has been updated.",
    companyLogoRemoved: "The company logo has been removed.",
    forgotPassword: "Forgot password?",
    forgotPasswordIntro: "Enter your email and we will send a secure link to choose a new password.",
    sendResetLink: "Send reset link",
    sendResetLinkCooldown: (seconds) => `Wait ${seconds}s`,
    resetPasswordEmailSent: "If that email exists, a password reset link has been sent.",
    resetPasswordRateLimit: (seconds) =>
      `Please wait ${seconds}s before requesting another reset email.`,
    accountCreatedCheckEmail: "Your account was created. Check your email to confirm it, then sign in.",
    accountAlreadyExists: "An account already exists for this email. Reset the password if you forgot it.",
    resetPasswordAction: "Reset password",
    backToSignIn: "Back to sign in",
    resetPasswordPageTitle: "Reset password",
    resetPasswordPageIntro: "Choose a new password for your account.",
    preparingRecoveryLink: "We are verifying your reset link...",
    newPassword: "New password",
    newPasswordPlaceholder: "Choose a new password",
    confirmPassword: "Confirm password",
    confirmPasswordPlaceholder: "Repeat your new password",
    updatePassword: "Update password",
    passwordUpdated: "Your password has been updated successfully.",
    passwordMismatch: "The passwords do not match.",
    passwordTooShort: "Password must be at least 8 characters.",
    invalidRecoveryLink: "This reset link is invalid or has expired.",
    requestNewResetLink: "Request a new reset link",
    authIntro: "Sign in to track projects, expenses, income, and team access.",
    reset: "Reset",
    dashboardTitle: "Dashboard",
    dashboardSub: "Overview of teams, projects and invoices.",
    calendarTitle: "Calendar",
    calendarSub: "Important income, expenses, due dates and worker transactions.",
    calendarEventType: "Event type",
    calendarAllEvents: "All events",
    calendarImportantEvents: "Important events",
    calendarEventDetails: "Event details",
    calendarOpenRecord: "Open record",
    calendarSource: "Source",
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
    projectScope: "Project scope",
    allSuppliers: "All suppliers",
    allStatuses: "All statuses",
    allCurrencies: "All currencies",
    allCategories: "All categories",
    previous: "Previous",
    next: "Next",
    status: "Status",
    deleted: "Deleted",
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
    expenseTitle: "Title",
    expenseType: "Expense type",
    expenseTypeLabor: "Labor",
    expenseTypeProducts: "Products",
    expenseTypeLogistics: "Logistics",
    laborPersonName: "Worker",
    laborPersonNamePlaceholder: "Select a registered worker",
    materialOption: "Material",
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
    editIncomeEntry: "Edit income entry",
    noIncomeEntries: "No income entries yet.",
    deleteIncomeConfirm: "Delete this income entry?",
    incomeLog: "Income log",
    noIncomeLog: "No income changes recorded yet.",
    expenseDetails: "Expense details",
    expenseLog: "Expense log",
    changeDate: "Changed at",
    changeType: "Action",
    changeCreated: "Created",
    changeUpdated: "Updated",
    changeDeleted: "Deleted",
    noExpenseLog: "No changes recorded for this expense yet.",
    close: "Close",
    closeNavigation: "Close navigation",
    excel: "Excel",
    unexpectedError: "An unexpected error occurred.",
    renderErrorBadge: "Render error",
    renderErrorTitle: "The application hit an error.",
    renderErrorDescription:
      "A problem is preventing the interface from rendering correctly. Please try again in a moment. If the issue continues, review the browser console and Supabase configuration.",
    appLoadingDescription: "The application is preparing your session and database connection.",
    appLoadingSlowDescription:
      "Loading is taking longer than expected. We are still waiting for Supabase to respond. If this keeps happening, verify the project configuration and network access.",
    configRequiredBadge: "Vercel configuration required",
    configRequiredTitle: "The application cannot connect to Supabase.",
    configRequiredDescription:
      "Add the following environment variables in the Vercel project and redeploy.",
    variableLabel: "Variable",
    whereToCheckInVercel: "Where to check in Vercel",
    vercelEnvHint:
      "Project Settings > Environment Variables. Use the same values as the local .env file for production and preview environments.",
    criticalError: "Critical error",
    appCouldNotStart: "The application could not start.",
    jsRenderBlocked:
      "A JavaScript error blocked rendering. If the problem continues, verify the Supabase configuration and open the browser console.",
    unhandledPromiseRejection: "Unhandled promise rejection.",
    asyncStartupBlocked: "An async error blocked the full application startup.",
    missingRootElement: "Missing #root element.",
    initialRenderFailed: "The initial render failed before the application could display.",
    authenticationFailed: "Authentication failed.",
    updatePasswordFailed: "Unable to update password.",
  };
}

function createSoraniTranslations(dir: "ltr" | "rtl"): TranslationShape {
  const base = createEnglishTranslations(dir);

  return {
    ...base,
    dashboard: "داشبۆرد",
    workers: "کرێکارەکان",
    projects: "پڕۆژەکان",
    suppliers: "دابینکەرەکان",
    products: "بەرهەمەکان",
    invoices: "پسوڵەکان",
    income: "داهات",
    expenses: "خەرجییەکان",
    calendar: "Calendar",
    siteSub: "ERPێکی سادە و بەهێز بۆ بەڕێوەبردنی شوێنی کار",
    signIn: "چوونەژوورەوە",
    signOut: "چوونەدەرەوە",
    createAccount: "هەژمار دروست بکە",
    fullName: "ناوی تەواو",
    fullNamePlaceholder: "ئەحمەد عەلی",
    email: "ئیمەیڵ",
    emailPlaceholder: "name@company.com",
    password: "وشەی نهێنی",
    passwordPlaceholder: "وشەی نهێنی بنووسە",
    brandingTitle: "براندینگ",
    brandingSubtitle: "لۆگۆی کۆمپانیا بەڕێوەببە کە لە ناو ئەپلیکەیشنەکە نیشان دەدرێت.",
    companyLogo: "لۆگۆی کۆمپانیا",
    companyLogoHint: "ئەم لۆگۆیە لە بەشی بەڕێوەبەر، لاتەنیشت و شاشەکانی چوونەژوورەوە نیشان دەدرێت.",
    uploadCompanyLogo: "بارکردنی لۆگۆ",
    changeCompanyLogo: "گۆڕینی لۆگۆ",
    removeCompanyLogo: "لابردنی لۆگۆ",
    saveCompanyLogo: "پاشەکەوتکردنی لۆگۆ",
    noCompanyLogo: "هێشتا هیچ لۆگۆیەکی کۆمپانیا بارنەکراوە.",
    companyLogoUpdated: "لۆگۆی کۆمپانیا نوێکرایەوە.",
    companyLogoRemoved: "لۆگۆی کۆمپانیا لابرا.",
    forgotPassword: "وشەی نهێنیت لەبیرکردووە؟",
    forgotPasswordIntro:
      "ئیمەیڵەکەت بنووسە و بەستەرێکی پارێزراو دەنێرین بۆ هەڵبژاردنی وشەی نهێنیی نوێ.",
    sendResetLink: "ناردنی بەستەری ڕیسێت",
    sendResetLinkCooldown: (seconds) => `چاوەڕێی ${seconds}s بکە`,
    resetPasswordEmailSent: "ئەگەر ئەم ئیمەیڵە هەبوو، بەستەری نوێکردنەوەی وشەی نهێنی بۆی نێردرا.",
    resetPasswordRateLimit: (seconds) =>
      `تکایە ${seconds}s چاوەڕێ بکە پێش داواکاریی ئیمەیڵێکی ڕیسێتی تر.`,
    accountCreatedCheckEmail:
      "هەژمارەکەت دروستکرا. ئیمەیڵەکەت بپشکنە بۆ پشتڕاستکردنەوە و پاشان بچۆ ژوورەوە.",
    accountAlreadyExists:
      "هەژمارێک پێشتر بۆ ئەم ئیمەیڵە هەیە. ئەگەر لەبیرت کردووە، وشەی نهێنی ڕیسێت بکە.",
    resetPasswordAction: "ڕیسێتکردنی وشەی نهێنی",
    backToSignIn: "گەڕانەوە بۆ چوونەژوورەوە",
    resetPasswordPageTitle: "ڕیسێتکردنی وشەی نهێنی",
    resetPasswordPageIntro: "وشەی نهێنییەکی نوێ بۆ هەژمارەکەت هەڵبژێرە.",
    preparingRecoveryLink: "بەستەری گەڕاندنەوەکەت دڵنیا دەکەینەوە...",
    newPassword: "وشەی نهێنیی نوێ",
    newPasswordPlaceholder: "وشەی نهێنیی نوێ هەڵبژێرە",
    confirmPassword: "دووبارەکردنەوەی وشەی نهێنی",
    confirmPasswordPlaceholder: "وشەی نهێنیی نوێ دووبارە بنووسە",
    updatePassword: "نوێکردنەوەی وشەی نهێنی",
    passwordUpdated: "وشەی نهێنیەکەت بە سەرکەوتوویی نوێکرایەوە.",
    passwordMismatch: "وشە نهێنییەکان هاوتا نین.",
    passwordTooShort: "وشەی نهێنی دەبێت لانیکەم 8 پیت بێت.",
    invalidRecoveryLink: "ئەم بەستەری ڕیسێتە ناڕەوا یان بەسەرچووە.",
    requestNewResetLink: "داواکردنی بەستەری ڕیسێتی نوێ",
    authIntro: "بچۆ ژوورەوە بۆ بەدواداچوونی پڕۆژەکان، خەرجییەکان، داهات و دەسەڵاتی تیم.",
    reset: "ڕیسێت",
    dashboardTitle: "داشبۆرد",
    dashboardSub: "بینینی گشتی تیمەکان، پڕۆژەکان و خەرجییەکان.",
    totalWorkers: "ژمارەی کرێکار",
    activeProjects: "پڕۆژە چالاکەکان",
    totalSuppliers: "ژمارەی دابینکەر",
    unpaidInvoices: "خەرجی نەدراوەکان",
    financialSummary: "کورتەی دارایی",
    totalInvoiced: "کۆی خەرجی",
    amountPaid: "کۆی پارەدراو",
    remaining: "ماوە",
    paymentProgress: "پێشکەوتنی پارەدان",
    projectsSummary: "پڕۆژەکان",
    workersSummary: "کرێکارەکان",
    invoicesSummary: "خەرجییەکان",
    noneYet: "هێشتا هیچ داتایەک نییە.",
    loading: "بارکردن",
    retry: "هەوڵدانەوە",
    search: "گەڕان",
    clearFilters: "پاککردنەوەی فلتەرەکان",
    remove: "لابردن",
    filter: "فلتەر",
    all: "هەموو",
    allProjects: "هەموو پڕۆژەکان",
    projectScope: "سنوری پڕۆژە",
    allSuppliers: "هەموو دابینکەرەکان",
    allStatuses: "هەموو دۆخەکان",
    allCurrencies: "هەموو دراوەکان",
    allCategories: "هەموو پۆلەکان",
    previous: "پێشوو",
    next: "دواتر",
    status: "دۆخ",
    deleted: "سڕاوەتەوە",
    currency: "دراو",
    category: "پۆل",
    workersTitle: "کرێکارەکان",
    worker_count: (count) => `${count} کرێکار`,
    addWorker: "زیادکردن",
    name: "ناو",
    role: "ئەرک",
    phone: "مۆبایل",
    balance: "بالانس",
    toReceive: "پارە وەرگرتن",
    owes: "پێویستی بە هەڵسەنگاندن هەیە",
    positiveBalance: "بالانسی ئەرێنی",
    negativeBalance: "بالانسی نەرێنی",
    noWorkers: "هێشتا هیچ کرێکارێک نییە. یەکەم پرۆفایل زیاد بکە.",
    newWorker: "کرێکاری نوێ",
    editWorker: "دەستکاریکردنی کرێکار",
    namePlaceholder: "ئەحمەد عەلی",
    rolePlaceholder: "بەنا، کارەباچی، سەرپەرشتیار...",
    categoryPlaceholder: "بەنا، کارەباچی، شۆفێر...",
    phonePlaceholder: "+964 750 000 0000",
    nameRequired: "ناو پێویستە.",
    roleRequired: "ئەرک پێویستە.",
    requiredField: "ئەم خانەیە پێویستە.",
    save: "پاشەکەوتکردن",
    create: "دروستکردن",
    cancel: "هەڵوەشاندنەوە",
    deleteWorkerConfirm: "ئەم کرێکارە بسڕدرێتەوە؟",
    transactions: "مامەڵەکان",
    transactionsCount: (count) => `${count} مامەڵە`,
    addTransaction: "زیادکردنی مامەڵە",
    noTransactions: "هیچ مامەڵەیەک بۆ ئەم کرێکارە نییە.",
    newTransaction: "مامەڵەی نوێ",
    type: "جۆر",
    amount: "بڕ",
    description: "وەسف",
    date: "بەروار",
    dateFrom: "لە بەرواری",
    dateTo: "بۆ بەرواری",
    credit: "پارەدان",
    debit: "پێشەکی",
    amountRequired: "بڕ پێویستە.",
    dateRequired: "بەروار پێویستە.",
    creditLabel: "پارەدان",
    debitLabel: "پێشەکی",
    txProject: "پڕۆژەی پەیوەندیدار",
    noProjectOption: "هیچ پڕۆژەیەک",
    projectsTitle: "پڕۆژەکان",
    project_count: (count) => `${count} پڕۆژە`,
    buildingsTitle: "بیناکان",
    building_count: (count) => `${count} بینا`,
    buildingsHint: "ئەو بینایانە زیاد بکە کە پەیوەستن بەو پڕۆژەیە.",
    addBuilding: "زیادکردنی بینا",
    buildingLabel: "بینا",
    buildingNamePlaceholder: "بینا A، بلۆک B، تاوەر C...",
    noBuildings: "هیچ بینایەک بۆ ئەم پڕۆژەیە دانەمەزرێنراوە.",
    addProject: "زیادکردن",
    noProjects: "هێشتا هیچ پڕۆژەیەک نییە. یەکەمەکە دروست بکە.",
    newProject: "پڕۆژەی نوێ",
    editProject: "دەستکاریکردنی پڕۆژە",
    projectName: "ناوی پڕۆژە",
    projectNamePlaceholder: "نۆژەنکردنەوەی ویللا، ڕووکاری بینا...",
    client: "کڕیار",
    clientPlaceholder: "ناوی کڕیار",
    location: "شوێن",
    locationPlaceholder: "هەولێر، سلێمانی، دهۆک...",
    active: "چالاک",
    completed: "تەواوبوو",
    paused: "وەستاو",
    unpaid: "نەدراو",
    partial: "بەشەکی",
    paid: "دراو",
    budget: "بودجە",
    startDate: "بەرواری دەستپێک",
    endDate: "بەرواری کۆتایی",
    deleteProjectConfirm: "ئەم پڕۆژەیە بسڕدرێتەوە؟",
    noClient: "هیچ کڕیارێک نییە",
    noDetail: "هیچ وردەکارییەک نییە",
    from: "لە",
    to: "بۆ",
    relatedInvoices_count: (count) => `${count} خەرجی پەیوەندیدار`,
    noInvoicesForProject: "هیچ خەرجییەک بۆ ئەم پڕۆژەیە نییە.",
    noSupplier: "هیچ دابینکەرێک نییە",
    projectInfo: "زانیاری پڕۆژە",
    suppliersTitle: "دابینکەرەکان",
    supplier_count: (count) => `${count} دابینکەر`,
    addSupplier: "زیادکردن",
    noSuppliers: "هێشتا هیچ دابینکەرێک نییە.",
    newSupplier: "دابینکەری نوێ",
    editSupplier: "دەستکاریکردنی دابینکەر",
    contact: "پەیوەندی",
    contactPlaceholder: "ناوی کەسی پەیوەندی",
    phoneSup: "مۆبایل",
    address: "ناونیشان",
    addressPlaceholder: "شەقامی بیناسازی 12",
    deleteSupplierConfirm: "ئەم دابینکەرە بسڕدرێتەوە؟",
    productsTitle: "بەرهەم و کەرەستەکان",
    product_count: (count) => `${count} بەرهەم`,
    addProduct: "زیادکردن",
    noProducts: "هێشتا هیچ بەرهەمێک نییە.",
    newProduct: "بەرهەمی نوێ",
    editProduct: "دەستکاریکردنی بەرهەم",
    unit: "یەکە",
    unitPlaceholder: "کیسە، m2، پەلێت، دانە...",
    unitPrice: "نرخی یەکە",
    supplierLabel: "دابینکەر",
    noneOption: "هیچ",
    deleteProductConfirm: "ئەم بەرهەمە بسڕدرێتەوە؟",
    invoicesTitle: "خەرجییەکان",
    invoice_count: (count) => `${count} پسوڵە`,
    expense_count: (count) => `${count} خەرجی`,
    addInvoice: "زیادکردن",
    noInvoices: "هێشتا هیچ پسوڵەیەک نییە.",
    noExpenses: "هێشتا هیچ خەرجییەک نییە.",
    newInvoice: "خەرجیی نوێ",
    editInvoice: "دەستکاریکردنی خەرجی",
    expenseTitle: "ناونیشان",
    expenseType: "جۆری خەرجی",
    expenseTypeLabor: "کرێکاری",
    expenseTypeProducts: "بەرهەمەکان",
    expenseTypeLogistics: "لۆجستیک",
    laborPersonName: "کرێکار",
    laborPersonNamePlaceholder: "کرێکاری تۆمارکراو هەڵبژێرە",
    materialOption: "کەرەستە",
    supplierOption: "دابینکەر",
    projectOption: "پڕۆژە",
    invoiceAssignment: "پەیوەستکردن",
    projectGlobalCost: "خەرجیی گشتی پڕۆژە",
    projectBuildingCost: "خەرجیی بینای دیاریکراو",
    totalAmount: "کۆی بڕ",
    paidAmount: "بڕی دراو",
    invoiceDate: "بەرواری پسوڵە",
    dueDate: "بەرواری قەرز",
    notes: "تێبینی",
    notesPlaceholder: "زانیاری یارمەتیدەر، مرجع، سەرنج...",
    remaining_label: "ماوە",
    deleteInvoiceConfirm: "ئەم خەرجییە بسڕدرێتەوە؟",
    unpaidFilter: "نەدراو",
    partialFilter: "بەشەکی",
    paidFilter: "دراو",
    markPaid: "وەک دراو نیشان بکە",
    invoiceDetails: "وردەکاری خەرجی",
    financialSummaryInv: "کورتەی دارایی",
    alreadyPaid: "پێشتر دراوە",
    progress: "پێشکەوتن",
    uploadImage: "زیادکردنی وێنە",
    changeImage: "گۆڕینی وێنە",
    viewImage: "بینینی وێنە",
    invoiceImage: "وێنەی خەرجی",
    receiptImage: "وێنەی پسوڵە",
    user: "بەکارهێنەر",
    createdBy: "دروستکراو لەلایەن",
    notFound: "دانەکە نەدۆزرایەوە.",
    pageNotFound: "پەڕەکە نەدۆزرایەوە",
    pageNotFoundSub: "ئەو پەڕەیەی داوات کردووە چیتر بوونی نییە.",
    version: "وەشانی 2.1",
    adminTitle: "بەڕێوەبەر",
    adminSubtitle: "بەڕێوەبردنی ڕۆڵ و دەستگەیشتن بە پڕۆژەکان",
    adminRestricted: "ئەم پەڕەیە تەنها بۆ بەڕێوەبەرانە.",
    allowedProjects: "پڕۆژە ڕێگەپێدراوەکان",
    noUsersFound: "هیچ بەکارهێنەرێک نەدۆزرایەوە.",
    roleLabel: "ڕۆڵ",
    incomeTitle: "داهات",
    income_count: (count) => `${count} تۆماری داهات`,
    entries: "تۆمارەکان",
    addIncome: "زیادکردن",
    newIncomeEntry: "تۆماری نوێی داهات",
    noIncomeEntries: "هێشتا هیچ تۆمارێکی داهات نییە.",
    deleteIncomeConfirm: "ئەم تۆمارەی داهاتە بسڕدرێتەوە؟",
    expenseDetails: "وردەکاری خەرجی",
    expenseLog: "تۆماری خەرجی",
    changeType: "جۆری گۆڕانکاری",
    changeCreated: "دروستکرا",
    changeUpdated: "نوێکرایەوە",
    noExpenseLog: "هێشتا هیچ گۆڕانکارییەک بۆ ئەم خەرجییە تۆمارنەکراوە.",
    close: "داخستن",
    closeNavigation: "داخستنی ناوبەری",
    excel: "ئێکسێل",
    unexpectedError: "هەڵەیەکی چاوەڕواننەکراو ڕوویدا.",
    renderErrorBadge: "هەڵەی ڕەندەرکردن",
    renderErrorTitle: "ئەپلیکەیشنەکە تووشی هەڵە بوو.",
    renderErrorDescription:
      "کێشەیەک ڕێگری لە ڕەندەرکردنی دروستی ڕووکار دەکات. تکایە دوای کەمێک هەوڵبدەوە. ئەگەر کێشەکە بەردەوام بوو، کۆنسۆڵی وێبگەڕ و ڕێکخستنی Supabase بپشکنە.",
    appLoadingDescription: "ئەپلیکەیشنەکە دانیشتن و پەیوەندی داتابەیستەکەت ئامادە دەکات.",
    appLoadingSlowDescription:
      "بارکردن زیاتر لە چاوەڕوانی کات دەخایەنێت. هێشتا چاوەڕوانی وەڵامی Supabase دەکەین. ئەگەر ئەمە بەردەوام بوو، ڕێکخستنی پڕۆژە و دەستگەیشتنی تۆڕ بپشکنە.",
    configRequiredBadge: "پێویستی بە ڕێکخستنی Vercel هەیە",
    configRequiredTitle: "ئەپلیکەیشنەکە ناتوانێت پەیوەندی بە Supabase بکات.",
    configRequiredDescription:
      "ئەم گۆڕاوە ژینگەییانە لە پڕۆژەی Vercel زیاد بکە و دووبارە بڵاو بکەرەوە.",
    variableLabel: "گۆڕاو",
    whereToCheckInVercel: "شوێنی پشکنین لە Vercel",
    vercelEnvHint:
      "لە Project Settings > Environment Variables هەمان بەهاکانی پەڕگەی .env ی ناوخۆیی بۆ ژینگەکانی production و preview بەکاربهێنە.",
    criticalError: "هەڵەی گرنگ",
    appCouldNotStart: "ئەپلیکەیشنەکە نەتوانی دەستپێبکات.",
    jsRenderBlocked:
      "هەڵەیەکی JavaScript ڕێگری لە ڕەندەرکردن کرد. ئەگەر کێشەکە بەردەوام بوو، ڕێکخستنی Supabase بپشکنە و کۆنسۆڵی وێبگەڕ بکەرەوە.",
    unhandledPromiseRejection: "ڕەتکردنەوەی promise بەبێ چارەسەر.",
    asyncStartupBlocked: "هەڵەیەکی async ڕێگری لە دەستپێکی تەواوی ئەپلیکەیشنەکە کرد.",
    missingRootElement: "ئەڵەمێنتی #root بوونی نییە.",
    initialRenderFailed: "ڕەندەرکردنی سەرەتایی پێش نیشاندانی ئەپلیکەیشنەکە سەرکەوتوو نەبوو.",
    authenticationFailed: "پشتڕاستکردنەوەی ناسنامە سەرکەوتوو نەبوو.",
    updatePasswordFailed: "نوێکردنەوەی وشەی نهێنی سەرکەوتوو نەبوو.",
  };
}

const translations: Record<Lang, TranslationShape> = {
  en: createEnglishTranslations("ltr"),
  ku: createSoraniTranslations("rtl"),
};

export function getStoredLang(): Lang {
  const stored = typeof window !== "undefined" ? window.localStorage.getItem("btp-lang") : null;
  return stored === "en" || stored === "ku" ? stored : DEFAULT_LANG;
}

export function getTranslationsForLang(lang: Lang) {
  return translations[lang];
}

const LangContext = createContext<{
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: TranslationShape;
}>({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: translations[DEFAULT_LANG],
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => getStoredLang());

  useEffect(() => {
    document.documentElement.lang = lang === "ku" ? "ckb" : "en";
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

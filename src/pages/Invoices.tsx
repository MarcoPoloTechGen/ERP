import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChevronRight, Download, FileSpreadsheet, Image as ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createInvoice,
  deleteInvoice,
  erpKeys,
  listInvoicesPage,
  listProducts,
  listProjectBuildings,
  listProjects,
  listSuppliers,
  type Currency,
  type Invoice,
  updateInvoice,
} from "@/lib/erp";
import { useAuth } from "@/lib/auth";
import { formatCurrency, formatDate, formatDateInput, statusColors } from "@/lib/format";
import { exportRowsToCsv, exportRowsToExcel } from "@/lib/export";
import { useLang } from "@/lib/i18n";
import { deleteInvoiceImageByUrl, uploadInvoiceImage } from "@/lib/supabase";
import {
  Card,
  controlClassName,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  Modal,
  PageHeader,
  PaginationControls,
  PrimaryButton,
  SecondaryButton,
} from "@/components/ui-kit";

type InvoiceFormValues = {
  number: string;
  supplierId: string;
  projectId: string;
  assignmentScope: "project" | "building";
  buildingId: string;
  productId: string;
  totalAmount: string;
  paidAmount: string;
  currency: Currency;
  status: "unpaid" | "partial" | "paid";
  invoiceDate: string;
  dueDate: string;
  notes: string;
};

function ExpenseImageField({
  value,
  previewUrl,
  onChange,
  label,
  removeLabel,
}: {
  value: string | null;
  previewUrl?: string | null;
  onChange: (value: File | null) => void;
  label: string;
  removeLabel: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const displayUrl = previewUrl ?? value;

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {displayUrl ? (
        <div className="flex items-center gap-4">
          <img src={displayUrl} alt={label} className="h-20 rounded-xl border border-border object-cover" />
          <SecondaryButton
            onClick={() => {
              onChange(null);
              if (inputRef.current) {
                inputRef.current.value = "";
              }
            }}
          >
            {removeLabel}
          </SecondaryButton>
        </div>
      ) : (
        <SecondaryButton onClick={() => inputRef.current?.click()}>
          <ImageIcon size={16} />
          {label}
        </SecondaryButton>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          onChange(file ?? null);
        }}
      />
    </div>
  );
}

function InvoiceModal({
  invoice,
  onClose,
}: {
  invoice?: Invoice;
  onClose: () => void;
}) {
  const { t } = useLang();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [storedImagePath, setStoredImagePath] = useState<string | null>(invoice?.imagePath ?? null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(invoice?.imageUrl ?? null);
  const { data: suppliers } = useQuery({
    queryKey: erpKeys.suppliers,
    queryFn: listSuppliers,
  });
  const { data: projects } = useQuery({
    queryKey: erpKeys.projects,
    queryFn: listProjects,
  });
  const { data: products } = useQuery({
    queryKey: erpKeys.products,
    queryFn: listProducts,
  });

  const { register, control, handleSubmit, formState, setValue } = useForm<InvoiceFormValues>({
    defaultValues: {
      number: invoice?.number ?? "",
      supplierId: invoice?.supplierId != null ? String(invoice.supplierId) : "",
      projectId: invoice?.projectId != null ? String(invoice.projectId) : "",
      assignmentScope: invoice?.buildingId != null ? "building" : "project",
      buildingId: invoice?.buildingId != null ? String(invoice.buildingId) : "",
      productId: invoice?.productId != null ? String(invoice.productId) : "",
      totalAmount: String(invoice?.totalAmount ?? ""),
      paidAmount: String(invoice?.paidAmount ?? 0),
      currency: invoice?.currency ?? "USD",
      status: invoice?.status ?? "unpaid",
      invoiceDate: formatDateInput(invoice?.invoiceDate) || new Date().toISOString().slice(0, 10),
      dueDate: formatDateInput(invoice?.dueDate),
      notes: invoice?.notes ?? "",
    },
  });

  const projectId = useWatch({ control, name: "projectId" });
  const assignmentScope = useWatch({ control, name: "assignmentScope" });
  const selectedProjectId = projectId ? Number(projectId) : null;

  const { data: projectBuildings } = useQuery({
    queryKey: erpKeys.projectBuildings(selectedProjectId ?? 0),
    queryFn: () => listProjectBuildings(selectedProjectId ?? undefined),
    enabled: selectedProjectId != null,
  });

  const projectProducts = useMemo(() => {
    return (products ?? []).filter((product) => {
      if (selectedProjectId == null) {
        return true;
      }

      return product.projectId === selectedProjectId || product.projectId == null;
    });
  }, [products, selectedProjectId]);

  const saveMutation = useMutation({
    mutationFn: async (values: InvoiceFormValues) => {
      const totalAmount = Number(values.totalAmount || 0);
      const paidAmount = Number(values.paidAmount || 0);
      let nextImagePath = storedImagePath;
      let uploadedPath: string | null = null;
      const previousImagePath = invoice?.imagePath ?? null;

      if (selectedImageFile) {
        const uploaded = await uploadInvoiceImage(
          selectedImageFile,
          values.number || "expense",
          values.projectId ? Number(values.projectId) : null,
        );
        uploadedPath = uploaded.path;
        nextImagePath = uploaded.path;
      } else if (!previewUrl && storedImagePath) {
        nextImagePath = null;
      }

      const payload = {
        number: values.number.trim(),
        supplierId: values.supplierId ? Number(values.supplierId) : null,
        projectId: values.projectId ? Number(values.projectId) : null,
        buildingId:
          values.projectId && values.assignmentScope === "building" && values.buildingId
            ? Number(values.buildingId)
            : null,
        productId: values.productId ? Number(values.productId) : null,
        totalAmount,
        paidAmount,
        currency: values.currency,
        status: values.status,
        invoiceDate: values.invoiceDate || null,
        dueDate: values.dueDate || null,
        notes: values.notes.trim() || null,
        imagePath: nextImagePath,
      } as const;

      try {
        if (invoice) {
          await updateInvoice(invoice.id, payload);
        } else {
          await createInvoice(payload);
        }
      } catch (error) {
        if (uploadedPath) {
          await deleteInvoiceImageByUrl(uploadedPath);
        }
        throw error;
      }

      if (previousImagePath && previousImagePath !== nextImagePath) {
        await deleteInvoiceImageByUrl(previousImagePath);
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: erpKeys.invoices }),
        queryClient.invalidateQueries({ queryKey: erpKeys.dashboard }),
      ]);
      onClose();
    },
  });

  return (
    <Modal title={invoice ? t.editInvoice : t.newInvoice} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit((values) => saveMutation.mutate(values))}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t.invoiceNumber} required error={formState.errors.number ? t.nameRequired : null}>
            <input
              {...register("number", { required: true })}
              className={controlClassName}
              placeholder={t.invoiceNumberPlaceholder}
            />
          </Field>

          <Field label={t.invoiceStatus_label}>
            <select {...register("status")} className={controlClassName}>
              <option value="unpaid">{t.unpaid}</option>
              <option value="partial">{t.partial}</option>
              <option value="paid">{t.paid}</option>
            </select>
          </Field>

          <Field label={t.user}>
            <input
              readOnly
              value={profile?.fullName ?? profile?.email ?? ""}
              className={`${controlClassName} bg-muted`}
            />
          </Field>

          <Field label={t.supplierOption}>
            <select {...register("supplierId")} className={controlClassName}>
              <option value="">{t.noneOption}</option>
              {suppliers?.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t.projectOption}>
            <select
              {...register("projectId", {
                onChange: () => {
                  setValue("assignmentScope", "project");
                  setValue("buildingId", "");
                  setValue("productId", "");
                },
              })}
              className={controlClassName}
            >
              <option value="">{t.noneOption}</option>
              {projects?.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t.invoiceAssignment}>
            <select
              {...register("assignmentScope", {
                onChange: (event) => {
                  if (event.target.value !== "building") {
                    setValue("buildingId", "");
                  }
                },
              })}
              className={controlClassName}
              disabled={!projectId}
            >
              <option value="project">{t.projectGlobalCost}</option>
              <option value="building" disabled={!projectBuildings?.length}>
                {t.projectBuildingCost}
              </option>
            </select>
          </Field>

          {projectId && assignmentScope === "building" ? (
            <Field label={t.buildingLabel}>
              <select {...register("buildingId")} className={controlClassName}>
                <option value="">{t.noneOption}</option>
                {projectBuildings?.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          <Field label={t.products}>
            <select {...register("productId")} className={controlClassName}>
              <option value="">{t.noneOption}</option>
              {projectProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                  {product.buildingName ? ` - ${product.buildingName}` : ""}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t.totalAmount} required error={formState.errors.totalAmount ? t.amountRequired : null}>
            <input
              type="number"
              step="0.01"
              min="0"
              {...register("totalAmount", { required: true })}
              className={controlClassName}
            />
          </Field>

          <Field label={t.paidAmount}>
            <input type="number" step="0.01" min="0" {...register("paidAmount")} className={controlClassName} />
          </Field>

          <Field label={t.currency}>
            <select {...register("currency")} className={controlClassName}>
              <option value="USD">USD</option>
              <option value="IQD">IQD</option>
            </select>
          </Field>

          <Field label={t.invoiceDate}>
            <input type="date" {...register("invoiceDate")} className={controlClassName} />
          </Field>

          <Field label={t.dueDate}>
            <input type="date" {...register("dueDate")} className={controlClassName} />
          </Field>
        </div>

        <Field label={t.notes}>
          <textarea {...register("notes")} rows={3} className={`${controlClassName} resize-none`} />
        </Field>

        <ExpenseImageField
          value={storedImagePath ? invoice?.imageUrl ?? null : null}
          previewUrl={previewUrl}
          onChange={(file) => {
            setSelectedImageFile(file);
            if (file) {
              setPreviewUrl(URL.createObjectURL(file));
            } else {
              setPreviewUrl(null);
              setStoredImagePath(null);
            }
          }}
          label={t.receiptImage}
          removeLabel={t.remove}
        />

        <div className="flex justify-end gap-3 pt-2">
          <SecondaryButton onClick={onClose}>{t.cancel}</SecondaryButton>
          <PrimaryButton type="submit" disabled={saveMutation.isPending}>
            {invoice ? t.save : t.create}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

export default function Invoices() {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"all" | "unpaid" | "partial" | "paid">("all");
  const [searchInput, setSearchInput] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState<Currency | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const deferredSearch = useDeferredValue(searchInput.trim());

  useEffect(() => {
    setPage(1);
  }, [currencyFilter, dateFrom, dateTo, deferredSearch, filter, projectFilter, supplierFilter]);

  const { data: projects } = useQuery({
    queryKey: erpKeys.projects,
    queryFn: listProjects,
  });
  const { data: suppliers } = useQuery({
    queryKey: erpKeys.suppliers,
    queryFn: listSuppliers,
  });

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: erpKeys.invoicesPage({
      page,
      pageSize: 10,
      search: deferredSearch,
      status: filter,
      projectId: projectFilter === "all" ? null : Number(projectFilter),
      supplierId: supplierFilter === "all" ? null : Number(supplierFilter),
      currency: currencyFilter,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
    }),
    queryFn: () =>
      listInvoicesPage({
        page,
        pageSize: 10,
        search: deferredSearch,
        status: filter,
        projectId: projectFilter === "all" ? null : Number(projectFilter),
        supplierId: supplierFilter === "all" ? null : Number(supplierFilter),
        currency: currencyFilter,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (invoice: Invoice) => {
      await deleteInvoice(invoice.id);
      if (invoice.imagePath) {
        await deleteInvoiceImageByUrl(invoice.imagePath);
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: erpKeys.invoices }),
        queryClient.invalidateQueries({ queryKey: erpKeys.dashboard }),
      ]);
    },
  });

  function exportInvoices(format: "csv" | "xlsx") {
    const fileBase = t.invoicesTitle;
    const rows =
      data?.items.map((invoice) => ({
        [t.reference]: invoice.number,
        [t.status]: t[invoice.status],
        [t.invoiceAssignment]: invoice.buildingName ? t.projectBuildingCost : t.projectGlobalCost,
        [t.buildingLabel]: invoice.buildingName ?? "",
        [t.supplierOption]: invoice.supplierName ?? "",
        [t.products]: invoice.productName ?? "",
        [t.projectOption]: invoice.projectName ?? "",
        [t.createdBy]: invoice.createdByName ?? "",
        [t.totalAmount]: invoice.totalAmount,
        [t.paidAmount]: invoice.paidAmount,
        [t.currency]: invoice.currency,
        [t.remaining_label]: invoice.remainingAmount,
        [t.invoiceDate]: formatDateInput(invoice.invoiceDate),
        [t.dueDate]: formatDateInput(invoice.dueDate),
        [t.notes]: invoice.notes ?? "",
      })) ?? [];

    if (format === "csv") {
      exportRowsToCsv(`${fileBase}.csv`, rows);
      return;
    }

    exportRowsToExcel(`${fileBase}.xlsx`, fileBase, rows);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.invoicesTitle}
        subtitle={t.expense_count(data?.total ?? 0)}
        action={
          <div className="flex flex-wrap justify-end gap-2">
            <SecondaryButton onClick={() => exportInvoices("csv")} disabled={!data?.items.length}>
              <Download size={16} />
              CSV
            </SecondaryButton>
            <SecondaryButton onClick={() => exportInvoices("xlsx")} disabled={!data?.items.length}>
              <FileSpreadsheet size={16} />
              {t.excel}
            </SecondaryButton>
            <PrimaryButton
              onClick={() => {
                setSelectedInvoice(undefined);
                setOpen(true);
              }}
            >
              <Plus size={16} />
              {t.addInvoice}
            </PrimaryButton>
          </div>
        }
      />

      <Card className="p-4">
        <div className="grid gap-4 xl:grid-cols-4">
          <div className="xl:col-span-4">
            <label className="mb-1.5 block text-sm font-medium text-foreground">{t.search}</label>
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className={controlClassName}
              placeholder={`${t.search} ${t.expenses.toLowerCase()}`}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">{t.status}</label>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as typeof filter)}
              className={controlClassName}
            >
              <option value="all">{t.allStatuses}</option>
              <option value="unpaid">{t.unpaidFilter}</option>
              <option value="partial">{t.partialFilter}</option>
              <option value="paid">{t.paidFilter}</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">{t.projectOption}</label>
            <select
              value={projectFilter}
              onChange={(event) => setProjectFilter(event.target.value)}
              className={controlClassName}
            >
              <option value="all">{t.allProjects}</option>
              {projects?.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">{t.supplierOption}</label>
            <select
              value={supplierFilter}
              onChange={(event) => setSupplierFilter(event.target.value)}
              className={controlClassName}
            >
              <option value="all">{t.allSuppliers}</option>
              {suppliers?.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">{t.currency}</label>
            <select
              value={currencyFilter}
              onChange={(event) => setCurrencyFilter(event.target.value as Currency | "all")}
              className={controlClassName}
            >
              <option value="all">{t.allCurrencies}</option>
              <option value="USD">USD</option>
              <option value="IQD">IQD</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">{t.dateFrom}</label>
            <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className={controlClassName} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">{t.dateTo}</label>
            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className={controlClassName} />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <SecondaryButton
            onClick={() => {
              setSearchInput("");
              setFilter("all");
              setProjectFilter("all");
              setSupplierFilter("all");
              setCurrencyFilter("all");
              setDateFrom("");
              setDateTo("");
            }}
            disabled={
              !searchInput &&
              filter === "all" &&
              projectFilter === "all" &&
              supplierFilter === "all" &&
              currencyFilter === "all" &&
              !dateFrom &&
              !dateTo
            }
          >
            {t.clearFilters}
          </SecondaryButton>
        </div>
      </Card>

      {isError ? (
        <ErrorState
          title={t.invoicesTitle}
          description={error instanceof Error ? error.message : undefined}
          action={<PrimaryButton onClick={() => void refetch()}>{t.retry}</PrimaryButton>}
        />
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl border border-card-border bg-card" />
          ))}
        </div>
      ) : !data?.items.length ? (
        <EmptyState title={t.noExpenses} />
      ) : (
        <>
          <div className="space-y-3">
            {data.items.map((invoice) => (
              <Card key={invoice.id} className="p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    {invoice.imageUrl ? (
                      <img
                        src={invoice.imageUrl}
                        alt={t.receiptImage}
                        className="h-16 w-16 rounded-2xl border border-border object-cover"
                      />
                    ) : null}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-base font-semibold text-foreground">{invoice.number}</p>
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusColors(invoice.status)}`}
                        >
                          {t[invoice.status]}
                        </span>
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            invoice.buildingName
                              ? "bg-sky-100 text-sky-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {invoice.buildingName ? t.projectBuildingCost : t.projectGlobalCost}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {[invoice.supplierName, invoice.projectName, invoice.productName, formatDate(invoice.invoiceDate)]
                          .filter(Boolean)
                          .join(" | ")}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{invoice.createdByName ?? "-"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="min-w-[160px] text-right">
                      <p className="text-base font-semibold text-foreground">
                        {formatCurrency(invoice.totalAmount, invoice.currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t.remaining_label}: {formatCurrency(invoice.remainingAmount, invoice.currency)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <IconButton
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setOpen(true);
                        }}
                      >
                        <Pencil size={16} />
                      </IconButton>
                      <IconButton
                        className="hover:text-rose-700"
                        onClick={() => {
                          if (window.confirm(t.deleteInvoiceConfirm)) {
                            deleteMutation.mutate(invoice);
                          }
                        }}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                      <Link href={`/expenses/${invoice.id}`}>
                        <div className="cursor-pointer rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground">
                          <ChevronRight size={16} />
                        </div>
                      </Link>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <PaginationControls
            page={data.page}
            pageCount={data.pageCount}
            total={data.total}
            itemLabel={t.expenses.toLowerCase()}
            previousLabel={t.previous}
            nextLabel={t.next}
            onPageChange={(nextPage) => {
              startTransition(() => {
                setPage(nextPage);
              });
            }}
          />
        </>
      )}

      {isFetching && !isLoading ? <p className="text-xs text-muted-foreground">{t.loading}...</p> : null}

      {open ? <InvoiceModal invoice={selectedInvoice} onClose={() => setOpen(false)} /> : null}
    </div>
  );
}

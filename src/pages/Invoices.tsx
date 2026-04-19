import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChevronRight, Image as ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createInvoice,
  deleteInvoice,
  erpKeys,
  listInvoices,
  listProjects,
  listSuppliers,
  type Invoice,
  updateInvoice,
} from "@/lib/erp";
import { formatCurrency, formatDate, formatDateInput, statusColors } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { deleteInvoiceImageByUrl, uploadInvoiceImage } from "@/lib/supabase";
import {
  Card,
  EmptyState,
  Field,
  IconButton,
  Modal,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
} from "@/components/ui-kit";

const inputClassName =
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

type InvoiceFormValues = {
  number: string;
  supplierId: string;
  projectId: string;
  totalAmount: string;
  paidAmount: string;
  status: "unpaid" | "partial" | "paid";
  invoiceDate: string;
  dueDate: string;
  notes: string;
};

function InvoiceImageField({
  value,
  previewUrl,
  onChange,
  label,
}: {
  value: string | null;
  previewUrl?: string | null;
  onChange: (value: File | null) => void;
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const displayUrl = previewUrl ?? value

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {displayUrl ? (
        <div className="flex items-center gap-4">
          <img src={displayUrl} alt="" className="h-20 rounded-xl border border-border object-cover" />
          <SecondaryButton
            onClick={() => {
              onChange(null);
              if (inputRef.current) {
                inputRef.current.value = "";
              }
            }}
          >
            Supprimer
          </SecondaryButton>
        </div>
      ) : (
        <SecondaryButton onClick={() => inputRef.current?.click()}>
          <ImageIcon size={16} />
          Ajouter
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
  const queryClient = useQueryClient();
  const [storedImageUrl, setStoredImageUrl] = useState<string | null>(invoice?.imageUrl ?? null);
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

  const { register, handleSubmit, formState } = useForm<InvoiceFormValues>({
    defaultValues: {
      number: invoice?.number ?? "",
      supplierId: invoice?.supplierId != null ? String(invoice.supplierId) : "",
      projectId: invoice?.projectId != null ? String(invoice.projectId) : "",
      totalAmount: String(invoice?.totalAmount ?? ""),
      paidAmount: String(invoice?.paidAmount ?? 0),
      status: invoice?.status ?? "unpaid",
      invoiceDate: formatDateInput(invoice?.invoiceDate) || new Date().toISOString().slice(0, 10),
      dueDate: formatDateInput(invoice?.dueDate),
      notes: invoice?.notes ?? "",
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: InvoiceFormValues) => {
      const totalAmount = Number(values.totalAmount || 0);
      const paidAmount = Number(values.paidAmount || 0);
      let nextImageUrl = storedImageUrl;
      let uploadedPublicUrl: string | null = null;
      const previousImageUrl = invoice?.imageUrl ?? null;

      if (selectedImageFile) {
        const uploaded = await uploadInvoiceImage(selectedImageFile, values.number);
        uploadedPublicUrl = uploaded.publicUrl;
        nextImageUrl = uploaded.publicUrl;
      } else if (!previewUrl && storedImageUrl) {
        nextImageUrl = null;
      }

      const payload = {
        number: values.number.trim(),
        supplierId: values.supplierId ? Number(values.supplierId) : null,
        projectId: values.projectId ? Number(values.projectId) : null,
        totalAmount,
        paidAmount,
        status:
          paidAmount <= 0 ? "unpaid" : paidAmount >= totalAmount && totalAmount > 0 ? "paid" : values.status,
        invoiceDate: values.invoiceDate || null,
        dueDate: values.dueDate || null,
        notes: values.notes.trim() || null,
        imageUrl: nextImageUrl,
      } as const;

      try {
        if (invoice) {
          await updateInvoice(invoice.id, payload);
        } else {
          await createInvoice(payload);
        }
      } catch (error) {
        if (uploadedPublicUrl) {
          await deleteInvoiceImageByUrl(uploadedPublicUrl);
        }
        throw error;
      }

      if (previousImageUrl && previousImageUrl !== nextImageUrl) {
        await deleteInvoiceImageByUrl(previousImageUrl);
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
          <Field
            label={t.invoiceNumber}
            required
            error={formState.errors.number ? t.nameRequired : null}
          >
            <input
              {...register("number", { required: true })}
              className={inputClassName}
              placeholder={t.invoiceNumberPlaceholder}
            />
          </Field>

          <Field label={t.invoiceStatus_label}>
            <select {...register("status")} className={inputClassName}>
              <option value="unpaid">{t.unpaid}</option>
              <option value="partial">{t.partial}</option>
              <option value="paid">{t.paid}</option>
            </select>
          </Field>

          <Field label={t.supplierOption}>
            <select {...register("supplierId")} className={inputClassName}>
              <option value="">{t.noneOption}</option>
              {suppliers?.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t.projectOption}>
            <select {...register("projectId")} className={inputClassName}>
              <option value="">{t.noneOption}</option>
              {projects?.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label={t.totalAmount}
            required
            error={formState.errors.totalAmount ? t.amountRequired : null}
          >
            <input
              type="number"
              step="0.01"
              {...register("totalAmount", { required: true })}
              className={inputClassName}
            />
          </Field>

          <Field label={t.paidAmount}>
            <input type="number" step="0.01" {...register("paidAmount")} className={inputClassName} />
          </Field>

          <Field label={t.invoiceDate}>
            <input type="date" {...register("invoiceDate")} className={inputClassName} />
          </Field>

          <Field label={t.dueDate}>
            <input type="date" {...register("dueDate")} className={inputClassName} />
          </Field>
        </div>

        <Field label={t.notes}>
          <textarea {...register("notes")} rows={3} className={`${inputClassName} resize-none`} />
        </Field>

        <InvoiceImageField
          value={storedImageUrl}
          previewUrl={previewUrl}
          onChange={(file) => {
            setSelectedImageFile(file);
            if (file) {
              setPreviewUrl(URL.createObjectURL(file));
            } else {
              setPreviewUrl(null);
              setStoredImageUrl(null);
            }
          }}
          label={t.invoiceImage}
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
  const [filter, setFilter] = useState<"all" | "unpaid" | "partial" | "paid">("all");

  const { data: invoices, isLoading } = useQuery({
    queryKey: erpKeys.invoices,
    queryFn: listInvoices,
  });

  const deleteMutation = useMutation({
    mutationFn: async (invoice: Invoice) => {
      await deleteInvoice(invoice.id)
      if (invoice.imageUrl) {
        await deleteInvoiceImageByUrl(invoice.imageUrl)
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: erpKeys.invoices }),
        queryClient.invalidateQueries({ queryKey: erpKeys.dashboard }),
      ]);
    },
  });

  const filteredInvoices =
    filter === "all" ? invoices : invoices?.filter((invoice) => invoice.status === filter);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.invoicesTitle}
        subtitle={t.invoice_count(invoices?.length ?? 0)}
        action={
          <PrimaryButton
            onClick={() => {
              setSelectedInvoice(undefined);
              setOpen(true);
            }}
          >
            <Plus size={16} />
            {t.addInvoice}
          </PrimaryButton>
        }
      />

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", t.all],
            ["unpaid", t.unpaidFilter],
            ["partial", t.partialFilter],
            ["paid", t.paidFilter],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              filter === value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl border border-card-border bg-card" />
          ))}
        </div>
      ) : !filteredInvoices?.length ? (
        <EmptyState title={t.noInvoices} />
      ) : (
        <div className="space-y-3">
          {filteredInvoices.map((invoice) => (
            <Card key={invoice.id} className="p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  {invoice.imageUrl ? (
                    <img
                      src={invoice.imageUrl}
                      alt=""
                      className="h-16 w-16 rounded-2xl border border-border object-cover"
                    />
                  ) : null}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-base font-semibold text-foreground">{invoice.number}</p>
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusColors(invoice.status)}`}>
                        {t[invoice.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[invoice.supplierName, invoice.projectName, formatDate(invoice.invoiceDate)]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="min-w-[150px] text-right">
                    <p className="text-base font-semibold text-foreground">
                      {formatCurrency(invoice.totalAmount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.remaining_label}: {formatCurrency(Math.max(0, invoice.totalAmount - invoice.paidAmount))}
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
                    <Link href={`/invoices/${invoice.id}`}>
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
      )}

      {open ? <InvoiceModal invoice={selectedInvoice} onClose={() => setOpen(false)} /> : null}
    </div>
  );
}

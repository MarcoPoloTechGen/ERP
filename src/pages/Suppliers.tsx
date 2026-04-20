import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileSpreadsheet, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createSupplier,
  deleteSupplier,
  erpKeys,
  listSuppliers,
  type Supplier,
  updateSupplier,
} from "@/lib/erp";
import { exportRowsToCsv, exportRowsToExcel } from "@/lib/export";
import { useLang } from "@/lib/i18n";
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

type SupplierFormValues = {
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
};

function SupplierModal({
  supplier,
  onClose,
}: {
  supplier?: Supplier;
  onClose: () => void;
}) {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const { register, handleSubmit, formState } = useForm<SupplierFormValues>({
    defaultValues: {
      name: supplier?.name ?? "",
      contact: supplier?.contact ?? "",
      phone: supplier?.phone ?? "",
      email: supplier?.email ?? "",
      address: supplier?.address ?? "",
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: SupplierFormValues) => {
      const payload = {
        name: values.name.trim(),
        contact: values.contact.trim() || null,
        phone: values.phone.trim() || null,
        email: values.email.trim() || null,
        address: values.address.trim() || null,
      };

      if (supplier) {
        await updateSupplier(supplier.id, payload);
      } else {
        await createSupplier(payload);
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: erpKeys.suppliers }),
        queryClient.invalidateQueries({ queryKey: erpKeys.dashboard }),
      ]);
      onClose();
    },
  });

  return (
    <Modal title={supplier ? t.editSupplier : t.newSupplier} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit((values) => saveMutation.mutate(values))}>
        <Field
          label={t.name}
          required
          error={formState.errors.name ? t.nameRequired : null}
        >
          <input {...register("name", { required: true })} className={inputClassName} />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t.contact}>
            <input
              {...register("contact")}
              className={inputClassName}
              placeholder={t.contactPlaceholder}
            />
          </Field>
          <Field label={t.phoneSup}>
            <input {...register("phone")} className={inputClassName} placeholder={t.phonePlaceholder} />
          </Field>
          <Field label={t.email}>
            <input type="email" {...register("email")} className={inputClassName} placeholder={t.emailPlaceholder} />
          </Field>
          <Field label={t.address}>
            <input {...register("address")} className={inputClassName} placeholder={t.addressPlaceholder} />
          </Field>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <SecondaryButton onClick={onClose}>{t.cancel}</SecondaryButton>
          <PrimaryButton type="submit" disabled={saveMutation.isPending}>
            {supplier ? t.save : t.create}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

export default function Suppliers() {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | undefined>(undefined);
  const [open, setOpen] = useState(false);

  const { data: suppliers, isLoading } = useQuery({
    queryKey: erpKeys.suppliers,
    queryFn: listSuppliers,
  });

  function exportSuppliers(format: "csv" | "xlsx") {
    const rows =
      suppliers?.map((supplier) => ({
        Name: supplier.name,
        Contact: supplier.contact ?? "",
        Phone: supplier.phone ?? "",
        Email: supplier.email ?? "",
        Address: supplier.address ?? "",
      })) ?? [];

    if (format === "csv") {
      exportRowsToCsv("suppliers.csv", rows);
      return;
    }

    exportRowsToExcel("suppliers.xlsx", "Suppliers", rows);
  }

  const deleteMutation = useMutation({
    mutationFn: deleteSupplier,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: erpKeys.suppliers }),
        queryClient.invalidateQueries({ queryKey: erpKeys.dashboard }),
      ]);
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.suppliersTitle}
        subtitle={t.supplier_count(suppliers?.length ?? 0)}
        action={
          <div className="flex flex-wrap justify-end gap-2">
            <SecondaryButton onClick={() => exportSuppliers("csv")}>
              <Download size={16} />
              CSV
            </SecondaryButton>
            <SecondaryButton onClick={() => exportSuppliers("xlsx")}>
              <FileSpreadsheet size={16} />
              Excel
            </SecondaryButton>
            <PrimaryButton
              onClick={() => {
                setSelectedSupplier(undefined);
                setOpen(true);
              }}
            >
              <Plus size={16} />
              {t.addSupplier}
            </PrimaryButton>
          </div>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl border border-card-border bg-card" />
          ))}
        </div>
      ) : !suppliers?.length ? (
        <EmptyState title={t.noSuppliers} />
      ) : (
        <div className="space-y-3">
          {suppliers.map((supplier) => (
            <Card key={supplier.id} className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-foreground">{supplier.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[supplier.contact, supplier.phone, supplier.email].filter(Boolean).join(" · ") || t.noDetail}
                  </p>
                  {supplier.address ? <p className="mt-1 text-xs text-muted-foreground">{supplier.address}</p> : null}
                </div>

                <div className="flex items-center gap-1">
                  <IconButton
                    onClick={() => {
                      setSelectedSupplier(supplier);
                      setOpen(true);
                    }}
                  >
                    <Pencil size={16} />
                  </IconButton>
                  <IconButton
                    className="hover:text-rose-700"
                    onClick={() => {
                      if (window.confirm(t.deleteSupplierConfirm)) {
                        deleteMutation.mutate(supplier.id);
                      }
                    }}
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {open ? <SupplierModal supplier={selectedSupplier} onClose={() => setOpen(false)} /> : null}
    </div>
  );
}

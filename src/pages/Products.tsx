import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  createProduct,
  deleteProduct,
  erpKeys,
  listProducts,
  listSuppliers,
  type Product,
  updateProduct,
} from "@/lib/erp";
import { formatCurrency } from "@/lib/format";
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

type ProductFormValues = {
  name: string;
  supplierId: string;
  unit: string;
  unitPrice: string;
};

function ProductModal({
  product,
  onClose,
}: {
  product?: Product;
  onClose: () => void;
}) {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const { data: suppliers } = useQuery({
    queryKey: erpKeys.suppliers,
    queryFn: listSuppliers,
  });

  const { register, handleSubmit, formState } = useForm<ProductFormValues>({
    defaultValues: {
      name: product?.name ?? "",
      supplierId: product?.supplierId != null ? String(product.supplierId) : "",
      unit: product?.unit ?? "",
      unitPrice: product?.unitPrice != null ? String(product.unitPrice) : "",
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      const payload = {
        name: values.name.trim(),
        supplierId: values.supplierId ? Number(values.supplierId) : null,
        unit: values.unit.trim() || null,
        unitPrice: values.unitPrice ? Number(values.unitPrice) : null,
      };

      if (product) {
        await updateProduct(product.id, payload);
      } else {
        await createProduct(payload);
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: erpKeys.products }),
        queryClient.invalidateQueries({ queryKey: erpKeys.dashboard }),
      ]);
      onClose();
    },
  });

  return (
    <Modal title={product ? t.editProduct : t.newProduct} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit((values) => saveMutation.mutate(values))}>
        <Field
          label={t.name}
          required
          error={formState.errors.name ? t.nameRequired : null}
        >
          <input {...register("name", { required: true })} className={inputClassName} />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t.supplierLabel}>
            <select {...register("supplierId")} className={inputClassName}>
              <option value="">{t.noneOption}</option>
              {suppliers?.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t.unit}>
            <input {...register("unit")} className={inputClassName} placeholder={t.unitPlaceholder} />
          </Field>
          <Field label={t.unitPrice}>
            <input type="number" step="0.01" {...register("unitPrice")} className={inputClassName} />
          </Field>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <SecondaryButton onClick={onClose}>{t.cancel}</SecondaryButton>
          <PrimaryButton type="submit" disabled={saveMutation.isPending}>
            {product ? t.save : t.create}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

export default function Products() {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>(undefined);
  const [open, setOpen] = useState(false);

  const { data: products, isLoading } = useQuery({
    queryKey: erpKeys.products,
    queryFn: listProducts,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: erpKeys.products }),
        queryClient.invalidateQueries({ queryKey: erpKeys.dashboard }),
      ]);
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.productsTitle}
        subtitle={t.product_count(products?.length ?? 0)}
        action={
          <PrimaryButton
            onClick={() => {
              setSelectedProduct(undefined);
              setOpen(true);
            }}
          >
            <Plus size={16} />
            {t.addProduct}
          </PrimaryButton>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl border border-card-border bg-card" />
          ))}
        </div>
      ) : !products?.length ? (
        <EmptyState title={t.noProducts} />
      ) : (
        <div className="space-y-3">
          {products.map((product) => (
            <Card key={product.id} className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-foreground">{product.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {product.unit ?? t.noDetail}
                    {product.supplierName ? ` · ${t.supplier_prefix}: ${product.supplierName}` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="min-w-[120px] text-right">
                    <p className="text-base font-semibold text-foreground">
                      {product.unitPrice != null ? formatCurrency(product.unitPrice) : "-"}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.unitPrice}</p>
                  </div>

                  <div className="flex items-center gap-1">
                    <IconButton
                      onClick={() => {
                        setSelectedProduct(product);
                        setOpen(true);
                      }}
                    >
                      <Pencil size={16} />
                    </IconButton>
                    <IconButton
                      className="hover:text-rose-700"
                      onClick={() => {
                        if (window.confirm(t.deleteProductConfirm)) {
                          deleteMutation.mutate(product.id);
                        }
                      }}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {open ? <ProductModal product={selectedProduct} onClose={() => setOpen(false)} /> : null}
    </div>
  );
}

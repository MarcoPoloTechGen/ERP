import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileSpreadsheet, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createProduct,
  deleteProduct,
  erpKeys,
  listProductsPage,
  listProjectBuildings,
  listProjects,
  listSuppliers,
  type Currency,
  type Product,
  updateProduct,
} from "@/lib/erp";
import { formatCurrency } from "@/lib/format";
import { exportRowsToCsv, exportRowsToExcel } from "@/lib/export";
import { useLang } from "@/lib/i18n";
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

type ProductFormValues = {
  name: string;
  supplierId: string;
  projectId: string;
  buildingId: string;
  unit: string;
  unitPrice: string;
  currency: Currency;
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
  const { data: projects } = useQuery({
    queryKey: erpKeys.projects,
    queryFn: listProjects,
  });

  const { register, control, handleSubmit, formState, setValue } = useForm<ProductFormValues>({
    defaultValues: {
      name: product?.name ?? "",
      supplierId: product?.supplierId != null ? String(product.supplierId) : "",
      projectId: product?.projectId != null ? String(product.projectId) : "",
      buildingId: product?.buildingId != null ? String(product.buildingId) : "",
      unit: product?.unit ?? "",
      unitPrice: product?.unitPrice != null ? String(product.unitPrice) : "",
      currency: product?.currency ?? "USD",
    },
  });

  const projectId = useWatch({ control, name: "projectId" });
  const selectedProjectId = projectId ? Number(projectId) : undefined;
  const { data: buildings } = useQuery({
    queryKey: erpKeys.projectBuildings(selectedProjectId ?? 0),
    queryFn: () => listProjectBuildings(selectedProjectId),
    enabled: selectedProjectId != null,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      const payload = {
        name: values.name.trim(),
        supplierId: values.supplierId ? Number(values.supplierId) : null,
        projectId: values.projectId ? Number(values.projectId) : null,
        buildingId: values.buildingId ? Number(values.buildingId) : null,
        unit: values.unit.trim() || null,
        unitPrice: values.unitPrice ? Number(values.unitPrice) : null,
        currency: values.currency,
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
        <Field label={t.name} required error={formState.errors.name ? t.nameRequired : null}>
          <input {...register("name", { required: true })} className={controlClassName} />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t.supplierLabel}>
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
                onChange: () => setValue("buildingId", ""),
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

          <Field label={t.buildingLabel}>
            <select {...register("buildingId")} className={controlClassName} disabled={!selectedProjectId}>
              <option value="">{t.noneOption}</option>
              {buildings?.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t.unit}>
            <input {...register("unit")} className={controlClassName} placeholder={t.unitPlaceholder} />
          </Field>

          <Field label={t.unitPrice}>
            <input type="number" step="0.01" min="0" {...register("unitPrice")} className={controlClassName} />
          </Field>

          <Field label={t.currency}>
            <select {...register("currency")} className={controlClassName}>
              <option value="USD">USD</option>
              <option value="IQD">IQD</option>
            </select>
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
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState<Currency | "all">("all");
  const deferredSearch = useDeferredValue(searchInput.trim());

  useEffect(() => {
    setPage(1);
  }, [currencyFilter, deferredSearch, projectFilter, supplierFilter]);

  const { data: projects } = useQuery({
    queryKey: erpKeys.projects,
    queryFn: listProjects,
  });
  const { data: suppliers } = useQuery({
    queryKey: erpKeys.suppliers,
    queryFn: listSuppliers,
  });

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: erpKeys.productsPage({
      page,
      pageSize: 10,
      search: deferredSearch,
      projectId: projectFilter === "all" ? null : Number(projectFilter),
      supplierId: supplierFilter === "all" ? null : Number(supplierFilter),
      currency: currencyFilter,
    }),
    queryFn: () =>
      listProductsPage({
        page,
        pageSize: 10,
        search: deferredSearch,
        projectId: projectFilter === "all" ? null : Number(projectFilter),
        supplierId: supplierFilter === "all" ? null : Number(supplierFilter),
        currency: currencyFilter,
      }),
  });

  function exportProducts(format: "csv" | "xlsx") {
    const fileBase = t.productsTitle;
    const rows =
      data?.items.map((product) => ({
        [t.name]: product.name,
        [t.supplierLabel]: product.supplierName ?? "",
        [t.projectOption]: product.projectName ?? "",
        [t.buildingLabel]: product.buildingName ?? "",
        [t.unit]: product.unit ?? "",
        [t.unitPrice]: product.unitPrice ?? "",
        [t.currency]: product.currency,
      })) ?? [];

    if (format === "csv") {
      exportRowsToCsv(`${fileBase}.csv`, rows);
      return;
    }

    exportRowsToExcel(`${fileBase}.xlsx`, fileBase, rows);
  }

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
        subtitle={t.product_count(data?.total ?? 0)}
        action={
          <div className="flex flex-wrap justify-end gap-2">
            <SecondaryButton onClick={() => exportProducts("csv")} disabled={!data?.items.length}>
              <Download size={16} />
              CSV
            </SecondaryButton>
            <SecondaryButton onClick={() => exportProducts("xlsx")} disabled={!data?.items.length}>
              <FileSpreadsheet size={16} />
              {t.excel}
            </SecondaryButton>
            <PrimaryButton
              onClick={() => {
                setSelectedProduct(undefined);
                setOpen(true);
              }}
            >
              <Plus size={16} />
              {t.addProduct}
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
              placeholder={`${t.search} ${t.products.toLowerCase()}`}
            />
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
            <label className="mb-1.5 block text-sm font-medium text-foreground">{t.supplierLabel}</label>
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
          <div className="flex items-end justify-end">
            <SecondaryButton
              onClick={() => {
                setSearchInput("");
                setProjectFilter("all");
                setSupplierFilter("all");
                setCurrencyFilter("all");
              }}
              disabled={
                !searchInput &&
                projectFilter === "all" &&
                supplierFilter === "all" &&
                currencyFilter === "all"
              }
            >
              {t.clearFilters}
            </SecondaryButton>
          </div>
        </div>
      </Card>

      {isError ? (
        <ErrorState
          title={t.productsTitle}
          description={error instanceof Error ? error.message : undefined}
          action={<PrimaryButton onClick={() => void refetch()}>{t.retry}</PrimaryButton>}
        />
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl border border-card-border bg-card" />
          ))}
        </div>
      ) : !data?.items.length ? (
        <EmptyState title={t.noProducts} />
      ) : (
        <>
          <div className="space-y-3">
            {data.items.map((product) => (
              <Card key={product.id} className="p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-base font-semibold text-foreground">{product.name}</p>
                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        {product.currency}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[product.projectName, product.buildingName, product.supplierName]
                        .filter(Boolean)
                        .join(" | ") || t.noDetail}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{product.unit ?? t.noDetail}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="min-w-[120px] text-right">
                      <p className="text-base font-semibold text-foreground">
                        {product.unitPrice != null ? formatCurrency(product.unitPrice, product.currency) : "-"}
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

          <PaginationControls
            page={data.page}
            pageCount={data.pageCount}
            total={data.total}
            itemLabel={t.products.toLowerCase()}
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

      {open ? <ProductModal product={selectedProduct} onClose={() => setOpen(false)} /> : null}
    </div>
  );
}

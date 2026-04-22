import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChevronRight, Download, FileSpreadsheet, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createWorker,
  deleteWorker,
  erpKeys,
  listWorkers,
  listWorkersPage,
  type Worker,
  updateWorker,
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

type WorkerFormValues = {
  name: string;
  role: string;
  category: string;
  phone: string;
};

function WorkerModal({
  worker,
  onClose,
}: {
  worker?: Worker;
  onClose: () => void;
}) {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const { register, handleSubmit, formState } = useForm<WorkerFormValues>({
    defaultValues: {
      name: worker?.name ?? "",
      role: worker?.role ?? "",
      category: worker?.category ?? "",
      phone: worker?.phone ?? "",
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: WorkerFormValues) => {
      const payload = {
        name: values.name.trim(),
        role: values.role.trim(),
        category: values.category.trim() || null,
        phone: values.phone.trim() || null,
      };

      if (worker) {
        await updateWorker(worker.id, payload);
      } else {
        await createWorker(payload);
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: erpKeys.workers }),
        queryClient.invalidateQueries({ queryKey: erpKeys.dashboard }),
      ]);
      onClose();
    },
  });

  return (
    <Modal title={worker ? t.editWorker : t.newWorker} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit((values) => saveMutation.mutate(values))}>
        <Field label={t.name} required error={formState.errors.name ? t.nameRequired : null}>
          <input
            {...register("name", { required: true })}
            className={controlClassName}
            placeholder={t.namePlaceholder}
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t.role} required error={formState.errors.role ? t.roleRequired : null}>
            <input
              {...register("role", { required: true })}
              className={controlClassName}
              placeholder={t.rolePlaceholder}
            />
          </Field>

          <Field label={t.category}>
            <input
              {...register("category")}
              className={controlClassName}
              placeholder={t.categoryPlaceholder}
            />
          </Field>

          <Field label={t.phone}>
            <input
              {...register("phone")}
              className={controlClassName}
              placeholder={t.phonePlaceholder}
            />
          </Field>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <SecondaryButton onClick={onClose}>{t.cancel}</SecondaryButton>
          <PrimaryButton type="submit" disabled={saveMutation.isPending}>
            {worker ? t.save : t.create}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

export default function Workers() {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const [selectedWorker, setSelectedWorker] = useState<Worker | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const deferredSearch = useDeferredValue(searchInput.trim());

  useEffect(() => {
    setPage(1);
  }, [categoryFilter, deferredSearch]);

  const { data: workersPage, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: erpKeys.workersPage({
      page,
      pageSize: 10,
      search: deferredSearch,
      category: categoryFilter,
    }),
    queryFn: () =>
      listWorkersPage({
        page,
        pageSize: 10,
        search: deferredSearch,
        category: categoryFilter,
      }),
  });

  const { data: allWorkers } = useQuery({
    queryKey: erpKeys.workers,
    queryFn: listWorkers,
  });

  const categories = useMemo(() => {
    const values = Array.from(
      new Set((allWorkers ?? []).map((worker) => worker.category).filter(Boolean) as string[]),
    );
    values.sort((left, right) => left.localeCompare(right));
    return values;
  }, [allWorkers]);

  function exportWorkers(format: "csv" | "xlsx") {
    const rows =
      workersPage?.items.map((worker) => ({
        Name: worker.name,
        Role: worker.role,
        Category: worker.category ?? "",
        Phone: worker.phone ?? "",
        Balance: worker.balance,
        Status: worker.balance >= 0 ? t.toReceive : t.owes,
      })) ?? [];

    if (format === "csv") {
      exportRowsToCsv("workers.csv", rows);
      return;
    }

    exportRowsToExcel("workers.xlsx", "Workers", rows);
  }

  const deleteMutation = useMutation({
    mutationFn: deleteWorker,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: erpKeys.workers }),
        queryClient.invalidateQueries({ queryKey: erpKeys.dashboard }),
      ]);
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.workersTitle}
        subtitle={t.worker_count(workersPage?.total ?? 0)}
        action={
          <div className="flex flex-wrap justify-end gap-2">
            <SecondaryButton onClick={() => exportWorkers("csv")} disabled={!workersPage?.items.length}>
              <Download size={16} />
              CSV
            </SecondaryButton>
            <SecondaryButton onClick={() => exportWorkers("xlsx")} disabled={!workersPage?.items.length}>
              <FileSpreadsheet size={16} />
              Excel
            </SecondaryButton>
            <PrimaryButton
              onClick={() => {
                setSelectedWorker(undefined);
                setOpen(true);
              }}
            >
              <Plus size={16} />
              {t.addWorker}
            </PrimaryButton>
          </div>
        }
      />

      <Card className="p-4">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">{t.search}</label>
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className={controlClassName}
              placeholder={`${t.search} ${t.workers.toLowerCase()}`}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">{t.category}</label>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className={controlClassName}
            >
              <option value="all">{t.allCategories}</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <SecondaryButton
            onClick={() => {
              setSearchInput("");
              setCategoryFilter("all");
            }}
            disabled={!searchInput && categoryFilter === "all"}
          >
            {t.clearFilters}
          </SecondaryButton>
        </div>
      </Card>

      {isError ? (
        <ErrorState
          title={t.notFound}
          description={error instanceof Error ? error.message : undefined}
          action={
            <PrimaryButton onClick={() => void refetch()}>
              {t.retry}
            </PrimaryButton>
          }
        />
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl border border-card-border bg-card" />
          ))}
        </div>
      ) : !workersPage?.items.length ? (
        <EmptyState title={t.noWorkers} />
      ) : (
        <>
          <div className="space-y-3">
            {workersPage.items.map((worker) => (
              <Card key={worker.id} className="p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-base font-semibold text-foreground">{worker.name}</p>
                      {worker.category ? (
                        <span className="inline-flex rounded-full bg-sky-100 px-2 py-1 text-xs font-medium text-sky-800">
                          {worker.category}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[worker.role, worker.phone].filter(Boolean).join(" | ")}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="min-w-[140px] text-right">
                      <p
                        className={`text-base font-semibold ${
                          worker.balance >= 0 ? "text-emerald-700" : "text-rose-700"
                        }`}
                      >
                        {formatCurrency(worker.balance)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {worker.balance >= 0 ? t.toReceive : t.owes}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <IconButton
                        onClick={() => {
                          setSelectedWorker(worker);
                          setOpen(true);
                        }}
                      >
                        <Pencil size={16} />
                      </IconButton>
                      <IconButton
                        className="hover:text-rose-700"
                        onClick={() => {
                          if (window.confirm(t.deleteWorkerConfirm)) {
                            deleteMutation.mutate(worker.id);
                          }
                        }}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                      <Link href={`/workers/${worker.id}`}>
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
            page={workersPage.page}
            pageCount={workersPage.pageCount}
            total={workersPage.total}
            itemLabel={t.workers.toLowerCase()}
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

      {open ? <WorkerModal worker={selectedWorker} onClose={() => setOpen(false)} /> : null}
    </div>
  );
}

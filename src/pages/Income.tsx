import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileSpreadsheet, Plus } from "lucide-react";
import {
  createIncomeTransaction,
  erpKeys,
  listIncomeTransactionsPage,
  listProjects,
  type Currency,
} from "@/lib/erp";
import { useAuth } from "@/lib/auth";
import { exportRowsToCsv, exportRowsToExcel } from "@/lib/export";
import { formatCurrency, formatDate } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import {
  Card,
  controlClassName,
  EmptyState,
  ErrorState,
  Field,
  Modal,
  PageHeader,
  PaginationControls,
  PrimaryButton,
  SecondaryButton,
} from "@/components/ui-kit";

type IncomeFormValues = {
  projectId: string;
  amount: string;
  currency: Currency;
  description: string;
  date: string;
};

function IncomeModal({ onClose }: { onClose: () => void }) {
  const { t } = useLang();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { data: projects } = useQuery({
    queryKey: erpKeys.projects,
    queryFn: listProjects,
  });

  const { register, handleSubmit, formState } = useForm<IncomeFormValues>({
    defaultValues: {
      projectId: "",
      amount: "",
      currency: "USD",
      description: "",
      date: new Date().toISOString().slice(0, 10),
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: IncomeFormValues) => {
      await createIncomeTransaction({
        projectId: Number(values.projectId),
        amount: Number(values.amount),
        currency: values.currency,
        description: values.description.trim() || null,
        date: values.date || null,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: erpKeys.incomes });
      onClose();
    },
  });

  return (
    <Modal title={t.newIncomeEntry} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit((values) => createMutation.mutate(values))}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t.user}>
            <input
              readOnly
              value={profile?.fullName ?? profile?.email ?? ""}
              className={`${controlClassName} bg-muted`}
            />
          </Field>

          <Field label={t.projectOption} required error={formState.errors.projectId ? t.requiredField : null}>
            <select {...register("projectId", { required: true })} className={controlClassName}>
              <option value="">{t.noneOption}</option>
              {projects?.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t.amount} required error={formState.errors.amount ? t.amountRequired : null}>
            <input
              type="number"
              step="0.01"
              min="0.01"
              {...register("amount", { required: true })}
              className={controlClassName}
            />
          </Field>

          <Field label={t.currency}>
            <select {...register("currency")} className={controlClassName}>
              <option value="USD">USD</option>
              <option value="IQD">IQD</option>
            </select>
          </Field>

          <Field label={t.date}>
            <input type="date" {...register("date")} className={controlClassName} />
          </Field>
        </div>

        <Field label={t.description}>
          <textarea {...register("description")} rows={3} className={`${controlClassName} resize-none`} />
        </Field>

        <div className="flex justify-end gap-3 pt-2">
          <SecondaryButton onClick={onClose}>{t.cancel}</SecondaryButton>
          <PrimaryButton type="submit" disabled={createMutation.isPending}>
            {t.create}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

export default function Income() {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState<Currency | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const deferredSearch = useDeferredValue(searchInput.trim());

  useEffect(() => {
    setPage(1);
  }, [currencyFilter, dateFrom, dateTo, deferredSearch, projectFilter]);

  const { data: projects } = useQuery({
    queryKey: erpKeys.projects,
    queryFn: listProjects,
  });

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: erpKeys.incomesPage({
      page,
      pageSize: 10,
      search: deferredSearch,
      projectId: projectFilter === "all" ? null : Number(projectFilter),
      currency: currencyFilter,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
    }),
    queryFn: () =>
      listIncomeTransactionsPage({
        page,
        pageSize: 10,
        search: deferredSearch,
        projectId: projectFilter === "all" ? null : Number(projectFilter),
        currency: currencyFilter,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
      }),
  });

  function exportIncome(format: "csv" | "xlsx") {
    const rows =
      data?.items.map((income) => ({
        Project: income.projectName ?? "",
        Amount: income.amount,
        Currency: income.currency,
        User: income.createdByName ?? "",
        Description: income.description ?? "",
        Date: income.date ?? "",
      })) ?? [];

    if (format === "csv") {
      exportRowsToCsv("income.csv", rows);
      return;
    }

    exportRowsToExcel("income.xlsx", "Income", rows);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.incomeTitle}
        subtitle={t.income_count(data?.total ?? 0)}
        action={
          <div className="flex flex-wrap justify-end gap-2">
            <SecondaryButton onClick={() => exportIncome("csv")} disabled={!data?.items.length}>
              <Download size={16} />
              CSV
            </SecondaryButton>
            <SecondaryButton onClick={() => exportIncome("xlsx")} disabled={!data?.items.length}>
              <FileSpreadsheet size={16} />
              Excel
            </SecondaryButton>
            <PrimaryButton onClick={() => setOpen(true)}>
              <Plus size={16} />
              {t.addIncome}
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
              placeholder={`${t.search} ${t.income.toLowerCase()}`}
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
              setProjectFilter("all");
              setCurrencyFilter("all");
              setDateFrom("");
              setDateTo("");
            }}
            disabled={
              !searchInput &&
              projectFilter === "all" &&
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
          title={t.incomeTitle}
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
        <EmptyState title={t.noIncomeEntries} />
      ) : (
        <>
          <div className="space-y-3">
            {data.items.map((income) => (
              <Card key={income.id} className="p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-foreground">{income.projectName ?? "-"}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[income.description, income.createdByName, formatDate(income.date)].filter(Boolean).join(" | ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-semibold text-emerald-700">
                      {formatCurrency(income.amount, income.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">{income.currency}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <PaginationControls
            page={data.page}
            pageCount={data.pageCount}
            total={data.total}
            itemLabel={t.entries.toLowerCase()}
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

      {open ? <IncomeModal onClose={() => setOpen(false)} /> : null}
    </div>
  );
}

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileSpreadsheet, Plus } from "lucide-react";
import {
  createIncomeTransaction,
  erpKeys,
  listIncomeTransactions,
  listProjects,
  type Currency,
} from "@/lib/erp";
import { useAuth } from "@/lib/auth";
import { exportRowsToCsv, exportRowsToExcel } from "@/lib/export";
import { formatCurrency, formatDate } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import {
  Card,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
} from "@/components/ui-kit";

const inputClassName =
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

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
    <Modal title="Nouvelle entree d'argent" onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit((values) => createMutation.mutate(values))}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Utilisateur">
            <input
              readOnly
              value={profile?.fullName ?? profile?.email ?? ""}
              className={`${inputClassName} bg-muted`}
            />
          </Field>

          <Field label={t.projectOption} required error={formState.errors.projectId ? "Champ requis" : null}>
            <select {...register("projectId", { required: true })} className={inputClassName}>
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
              {...register("amount", { required: true })}
              className={inputClassName}
            />
          </Field>

          <Field label="Devise">
            <select {...register("currency")} className={inputClassName}>
              <option value="USD">USD</option>
              <option value="IQD">IQD</option>
            </select>
          </Field>

          <Field label={t.date}>
            <input type="date" {...register("date")} className={inputClassName} />
          </Field>
        </div>

        <Field label={t.description}>
          <textarea {...register("description")} rows={3} className={`${inputClassName} resize-none`} />
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

  const { data: incomes, isLoading } = useQuery({
    queryKey: erpKeys.incomes,
    queryFn: listIncomeTransactions,
  });

  function exportIncome(format: "csv" | "xlsx") {
    const rows =
      incomes?.map((income) => ({
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
        title="Entrees d'argent"
        subtitle={`${incomes?.length ?? 0} transactions`}
        action={
          <div className="flex flex-wrap justify-end gap-2">
            <SecondaryButton onClick={() => exportIncome("csv")}>
              <Download size={16} />
              CSV
            </SecondaryButton>
            <SecondaryButton onClick={() => exportIncome("xlsx")}>
              <FileSpreadsheet size={16} />
              Excel
            </SecondaryButton>
            <PrimaryButton onClick={() => setOpen(true)}>
              <Plus size={16} />
              Ajouter
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
      ) : !incomes?.length ? (
        <EmptyState title="Aucune entree d'argent" />
      ) : (
        <div className="space-y-3">
          {incomes.map((income) => (
            <Card key={income.id} className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-foreground">
                    {income.projectName ?? "-"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[income.description, income.createdByName, formatDate(income.date)].filter(Boolean).join(" · ")}
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
      )}

      {open ? <IncomeModal onClose={() => setOpen(false)} /> : null}
    </div>
  );
}

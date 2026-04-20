import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { ArrowLeft, TrendingDown, TrendingUp } from "lucide-react";
import {
  Card,
  EmptyState,
  Field,
  Modal,
  PrimaryButton,
  SecondaryButton,
} from "@/components/ui-kit";
import {
  createWorkerTransaction,
  erpKeys,
  getWorker,
  listProjects,
  listWorkerTransactions,
  type Currency,
} from "@/lib/erp";
import { formatCurrency, formatDate } from "@/lib/format";
import { useLang } from "@/lib/i18n";

const inputClassName =
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

type TransactionFormValues = {
  type: "credit" | "debit";
  amount: string;
  currency: Currency;
  description: string;
  date: string;
  projectId: string;
};

function TransactionModal({
  workerId,
  onClose,
}: {
  workerId: number;
  onClose: () => void;
}) {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const { data: projects } = useQuery({
    queryKey: erpKeys.projects,
    queryFn: listProjects,
  });

  const { register, handleSubmit, formState } = useForm<TransactionFormValues>({
    defaultValues: {
      type: "credit",
      amount: "",
      currency: "USD",
      description: "",
      date: new Date().toISOString().slice(0, 10),
      projectId: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: TransactionFormValues) => {
      await createWorkerTransaction({
        workerId,
        type: values.type,
        amount: Number(values.amount),
        currency: values.currency,
        description: values.description.trim() || null,
        date: values.date || null,
        projectId: values.projectId ? Number(values.projectId) : null,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: erpKeys.worker(workerId) }),
        queryClient.invalidateQueries({ queryKey: erpKeys.workerTransactions(workerId) }),
        queryClient.invalidateQueries({ queryKey: erpKeys.workers }),
        queryClient.invalidateQueries({ queryKey: erpKeys.dashboard }),
      ]);
      onClose();
    },
  });

  return (
    <Modal title={t.newTransaction} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit((values) => createMutation.mutate(values))}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t.type} required>
            <select {...register("type")} className={inputClassName}>
              <option value="credit">{t.credit}</option>
              <option value="debit">{t.debit}</option>
            </select>
          </Field>

          <Field label={t.amount} required error={formState.errors.amount ? t.amountRequired : null}>
            <input
              type="number"
              step="0.01"
              min="0.01"
              {...register("amount", { required: true, min: 0.01 })}
              className={inputClassName}
              placeholder="500.00"
            />
          </Field>

          <Field label="Devise">
            <select {...register("currency")} className={inputClassName}>
              <option value="USD">USD</option>
              <option value="IQD">IQD</option>
            </select>
          </Field>

          <Field label={t.txProject}>
            <select {...register("projectId")} className={inputClassName}>
              <option value="">{t.noProjectOption}</option>
              {projects?.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t.date} required error={formState.errors.date ? t.dateRequired : null}>
            <input type="date" {...register("date", { required: true })} className={inputClassName} />
          </Field>
        </div>

        <Field label={t.description}>
          <input {...register("description")} className={inputClassName} />
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

export default function WorkerDetail() {
  const { id } = useParams<{ id: string }>();
  const workerId = Number(id);
  const { t } = useLang();
  const [showModal, setShowModal] = useState(false);

  const { data: worker, isLoading: workerLoading } = useQuery({
    queryKey: erpKeys.worker(workerId),
    queryFn: () => getWorker(workerId),
    enabled: Number.isFinite(workerId),
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: erpKeys.workerTransactions(workerId),
    queryFn: () => listWorkerTransactions(workerId),
    enabled: Number.isFinite(workerId),
  });

  if (workerLoading || !worker) {
    return workerLoading ? (
      <div className="h-32 animate-pulse rounded-2xl border border-card-border bg-card" />
    ) : (
      <EmptyState title={t.notFound} />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/workers">
          <div className="cursor-pointer rounded-xl border border-border bg-background p-2 text-foreground transition hover:bg-muted">
            <ArrowLeft size={18} />
          </div>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-foreground">{worker.name}</h1>
            {worker.category ? (
              <span className="inline-flex rounded-full bg-sky-100 px-2 py-1 text-xs font-medium text-sky-800">
                {worker.category}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {[worker.role, worker.phone].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="min-w-[180px] text-right">
          <p
            className={`text-2xl font-semibold ${
              worker.balance >= 0 ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {formatCurrency(worker.balance)}
          </p>
          <p className="text-xs text-muted-foreground">
            {worker.balance >= 0 ? t.positiveBalance : t.negativeBalance}
          </p>
        </div>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{t.transactions}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{transactions?.length ?? 0} mouvements</p>
          </div>
          <PrimaryButton onClick={() => setShowModal(true)}>{t.addTransaction}</PrimaryButton>
        </div>
      </Card>

      {transactionsLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-2xl border border-card-border bg-card" />
          ))}
        </div>
      ) : !transactions?.length ? (
        <EmptyState title={t.noTransactions} />
      ) : (
        <div className="space-y-3">
          {transactions.map((transaction) => (
            <Card key={transaction.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`rounded-2xl p-3 ${
                      transaction.type === "credit"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {transaction.type === "credit" ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {transaction.description ??
                        (transaction.type === "credit" ? t.creditLabel : t.debitLabel)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[formatDate(transaction.date), transaction.projectName].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>

                <p
                  className={`text-sm font-semibold ${
                    transaction.type === "credit" ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {transaction.type === "credit" ? "+" : "-"}
                  {formatCurrency(transaction.amount, transaction.currency)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showModal ? <TransactionModal workerId={workerId} onClose={() => setShowModal(false)} /> : null}
    </div>
  );
}

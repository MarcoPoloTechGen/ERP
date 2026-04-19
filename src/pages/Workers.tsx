import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createWorker,
  deleteWorker,
  erpKeys,
  listWorkers,
  type Worker,
  updateWorker,
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

type WorkerFormValues = {
  name: string;
  role: string;
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
      phone: worker?.phone ?? "",
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: WorkerFormValues) => {
      const payload = {
        name: values.name.trim(),
        role: values.role.trim(),
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
        <Field
          label={t.name}
          required
          error={formState.errors.name ? t.nameRequired : null}
        >
          <input
            {...register("name", { required: true })}
            className={inputClassName}
            placeholder={t.namePlaceholder}
          />
        </Field>

        <Field
          label={t.role}
          required
          error={formState.errors.role ? t.roleRequired : null}
        >
          <input
            {...register("role", { required: true })}
            className={inputClassName}
            placeholder={t.rolePlaceholder}
          />
        </Field>

        <Field label={t.phone}>
          <input
            {...register("phone")}
            className={inputClassName}
            placeholder={t.phonePlaceholder}
          />
        </Field>

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

  const { data: workers, isLoading } = useQuery({
    queryKey: erpKeys.workers,
    queryFn: listWorkers,
  });

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
        subtitle={t.worker_count(workers?.length ?? 0)}
        action={
          <PrimaryButton
            onClick={() => {
              setSelectedWorker(undefined);
              setOpen(true);
            }}
          >
            <Plus size={16} />
            {t.addWorker}
          </PrimaryButton>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl border border-card-border bg-card" />
          ))}
        </div>
      ) : !workers?.length ? (
        <EmptyState title={t.noWorkers} />
      ) : (
        <div className="space-y-3">
          {workers.map((worker) => (
            <Card key={worker.id} className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-foreground">{worker.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {worker.role}
                    {worker.phone ? ` · ${worker.phone}` : ""}
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
      )}

      {open ? <WorkerModal worker={selectedWorker} onClose={() => setOpen(false)} /> : null}
    </div>
  );
}

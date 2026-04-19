import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createProject,
  deleteProject,
  erpKeys,
  listProjects,
  type Project,
  updateProject,
} from "@/lib/erp";
import { formatCurrency, formatDateInput, statusColors } from "@/lib/format";
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

type ProjectFormValues = {
  name: string;
  client: string;
  location: string;
  status: "active" | "completed" | "paused";
  budget: string;
  startDate: string;
  endDate: string;
};

function ProjectModal({
  project,
  onClose,
}: {
  project?: Project;
  onClose: () => void;
}) {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const { register, handleSubmit, formState } = useForm<ProjectFormValues>({
    defaultValues: {
      name: project?.name ?? "",
      client: project?.client ?? "",
      location: project?.location ?? "",
      status: project?.status ?? "active",
      budget: project?.budget != null ? String(project.budget) : "",
      startDate: formatDateInput(project?.startDate),
      endDate: formatDateInput(project?.endDate),
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: ProjectFormValues) => {
      const payload = {
        name: values.name.trim(),
        client: values.client.trim() || null,
        location: values.location.trim() || null,
        status: values.status,
        budget: values.budget ? Number(values.budget) : null,
        startDate: values.startDate || null,
        endDate: values.endDate || null,
      };

      if (project) {
        await updateProject(project.id, payload);
      } else {
        await createProject(payload);
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: erpKeys.projects }),
        queryClient.invalidateQueries({ queryKey: erpKeys.dashboard }),
      ]);
      onClose();
    },
  });

  return (
    <Modal title={project ? t.editProject : t.newProject} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit((values) => saveMutation.mutate(values))}>
        <Field
          label={t.projectName}
          required
          error={formState.errors.name ? t.nameRequired : null}
        >
          <input
            {...register("name", { required: true })}
            className={inputClassName}
            placeholder={t.projectNamePlaceholder}
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t.client}>
            <input {...register("client")} className={inputClassName} placeholder={t.clientPlaceholder} />
          </Field>
          <Field label={t.location}>
            <input
              {...register("location")}
              className={inputClassName}
              placeholder={t.locationPlaceholder}
            />
          </Field>
          <Field label={t.status}>
            <select {...register("status")} className={inputClassName}>
              <option value="active">{t.active}</option>
              <option value="completed">{t.completed}</option>
              <option value="paused">{t.paused}</option>
            </select>
          </Field>
          <Field label={t.budget}>
            <input type="number" step="0.01" {...register("budget")} className={inputClassName} />
          </Field>
          <Field label={t.startDate}>
            <input type="date" {...register("startDate")} className={inputClassName} />
          </Field>
          <Field label={t.endDate}>
            <input type="date" {...register("endDate")} className={inputClassName} />
          </Field>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <SecondaryButton onClick={onClose}>{t.cancel}</SecondaryButton>
          <PrimaryButton type="submit" disabled={saveMutation.isPending}>
            {project ? t.save : t.create}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

export default function Projects() {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const [selectedProject, setSelectedProject] = useState<Project | undefined>(undefined);
  const [open, setOpen] = useState(false);

  const { data: projects, isLoading } = useQuery({
    queryKey: erpKeys.projects,
    queryFn: listProjects,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: erpKeys.projects }),
        queryClient.invalidateQueries({ queryKey: erpKeys.dashboard }),
      ]);
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.projectsTitle}
        subtitle={t.project_count(projects?.length ?? 0)}
        action={
          <PrimaryButton
            onClick={() => {
              setSelectedProject(undefined);
              setOpen(true);
            }}
          >
            <Plus size={16} />
            {t.addProject}
          </PrimaryButton>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl border border-card-border bg-card" />
          ))}
        </div>
      ) : !projects?.length ? (
        <EmptyState title={t.noProjects} />
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <Card key={project.id} className="p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-base font-semibold text-foreground">{project.name}</p>
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusColors(project.status)}`}
                    >
                      {t[project.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[project.client, project.location].filter(Boolean).join(" · ") || t.noDetail}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {project.startDate ? `${t.from} ${formatDateInput(project.startDate)}` : ""}
                    {project.endDate ? ` ${t.to} ${formatDateInput(project.endDate)}` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="min-w-[140px] text-right">
                    <p className="text-base font-semibold text-foreground">
                      {project.budget != null ? formatCurrency(project.budget) : "-"}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.budget}</p>
                  </div>

                  <div className="flex items-center gap-1">
                    <IconButton
                      onClick={() => {
                        setSelectedProject(project);
                        setOpen(true);
                      }}
                    >
                      <Pencil size={16} />
                    </IconButton>
                    <IconButton
                      className="hover:text-rose-700"
                      onClick={() => {
                        if (window.confirm(t.deleteProjectConfirm)) {
                          deleteMutation.mutate(project.id);
                        }
                      }}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                    <Link href={`/projects/${project.id}`}>
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

      {open ? <ProjectModal project={selectedProject} onClose={() => setOpen(false)} /> : null}
    </div>
  );
}

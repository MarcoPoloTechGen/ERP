import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { CrudFilters } from "@refinedev/core";
import { useTable } from "@refinedev/antd";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  App,
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  type TableProps,
} from "antd";
import { ChevronRight, Download, FileSpreadsheet, MinusCircle, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createProject,
  deleteProject,
  erpKeys,
  listProjectBuildings,
  type ProjectStatus,
  updateProject,
} from "@/lib/erp";
import { useAuth } from "@/lib/auth";
import { exportRowsToCsv, exportRowsToExcel } from "@/lib/export";
import { currencyInputProps, formatCurrency, formatDate, formatDateInput } from "@/lib/format";
import { canDeleteProjects, hasAdminAccess } from "@/lib/permissions";
import {
  addContainsSearchFilter,
  addEqualFilter,
  asProjectStatus,
  STANDARD_PAGE_SIZE,
  toErrorMessage,
} from "@/lib/refine-helpers";
import { useLang } from "@/lib/i18n";
import { useErpInvalidation } from "@/hooks/use-erp-invalidation";

type ProjectRow = {
  id: number | null;
  name: string | null;
  client: string | null;
  location: string | null;
  status: string | null;
  budget: number | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
  building_count: number | null;
};

type ProjectFormValues = {
  name: string;
  client?: string;
  location?: string;
  status: ProjectStatus;
  budget?: number;
  startDate?: string;
  endDate?: string;
  buildings?: { name?: string }[];
};

const statusColor: Record<ProjectStatus, string> = {
  active: "green",
  completed: "blue",
  paused: "orange",
};

function statusLabel(status: ProjectStatus, t: ReturnType<typeof useLang>["t"]) {
  if (status === "active") {
    return t.active;
  }
  if (status === "completed") {
    return t.completed;
  }
  return t.paused;
}

function buildFilters(search: string, status: ProjectStatus | "all") {
  const filters: CrudFilters = [];
  addContainsSearchFilter(filters, ["name", "client", "location"], search);
  addEqualFilter(filters, "status", status);
  return filters;
}

function ProjectModal({
  project,
  onClose,
  onSaved,
}: {
  project?: ProjectRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLang();
  const { message } = App.useApp();
  const erpInvalidation = useErpInvalidation();
  const [form] = Form.useForm<ProjectFormValues>();
  const { data: projectBuildings } = useQuery({
    queryKey: erpKeys.projectBuildings(project?.id ?? 0),
    queryFn: () => listProjectBuildings(project?.id),
    enabled: project?.id != null,
  });

  useEffect(() => {
    if (!project) {
      form.setFieldValue("buildings", [{ name: "" }]);
      return;
    }

    if (projectBuildings) {
      const buildings = projectBuildings.map((building) => ({ name: building.name }));
      form.setFieldValue("buildings", buildings.length ? buildings : [{ name: "" }]);
    }
  }, [form, project, projectBuildings]);

  const saveMutation = useMutation({
    mutationFn: async (values: ProjectFormValues) => {
      const payload = {
        name: values.name.trim(),
        client: values.client?.trim() || null,
        location: values.location?.trim() || null,
        status: values.status,
        budget: values.budget ?? null,
        startDate: values.startDate || null,
        endDate: values.endDate || null,
        buildings: (values.buildings ?? []).map((building) => building.name ?? ""),
      };

      if (project) {
        if (project.id == null) {
          throw new Error(t.notFound);
        }

        await updateProject(project.id, payload);
        return;
      }

      await createProject(payload);
    },
    onSuccess: async () => {
      await erpInvalidation.projects();
      onSaved();
      onClose();
    },
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  return (
    <Modal
      open
      width={760}
      title={project ? t.editProject : t.newProject}
      okText={project ? t.save : t.create}
      cancelText={t.cancel}
      confirmLoading={saveMutation.isPending}
      onCancel={onClose}
      onOk={() => form.submit()}
    >
      <Form<ProjectFormValues>
        form={form}
        layout="vertical"
        initialValues={{
          name: project?.name ?? "",
          client: project?.client ?? "",
          location: project?.location ?? "",
          status: asProjectStatus(project?.status),
          budget: project?.budget ?? undefined,
          startDate: formatDateInput(project?.start_date),
          endDate: formatDateInput(project?.end_date),
          buildings: [{ name: "" }],
        }}
        onFinish={(values) => saveMutation.mutate(values)}
      >
        <Form.Item name="name" label={t.projectName} rules={[{ required: true, message: t.nameRequired }]}>
          <Input placeholder={t.projectNamePlaceholder} />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="client" label={t.client}>
              <Input placeholder={t.clientPlaceholder} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="location" label={t.location}>
              <Input placeholder={t.locationPlaceholder} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="status" label={t.status}>
              <Select
                options={[
                  { label: t.active, value: "active" },
                  { label: t.completed, value: "completed" },
                  { label: t.paused, value: "paused" },
                ]}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="budget" label={t.budget}>
              <InputNumber min={0} step={0.01} style={{ width: "100%" }} {...currencyInputProps("USD")} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="startDate" label={t.startDate}>
              <Input type="date" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="endDate" label={t.endDate}>
              <Input type="date" />
            </Form.Item>
          </Col>
        </Row>

        <Typography.Text strong>{t.buildingsTitle}</Typography.Text>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
          {t.buildingsHint}
        </Typography.Paragraph>
        <Form.List name="buildings">
          {(fields, { add, remove }) => (
            <Space direction="vertical" size="small" style={{ width: "100%" }}>
              {fields.map((field) => (
                <Space key={field.key} align="baseline" style={{ display: "flex" }}>
                  <Form.Item {...field} name={[field.name, "name"]} style={{ flex: 1, marginBottom: 0 }}>
                    <Input placeholder={t.buildingNamePlaceholder} />
                  </Form.Item>
                  <Button
                    danger
                    type="text"
                    icon={<MinusCircle size={16} />}
                    disabled={fields.length === 1}
                    onClick={() => remove(field.name)}
                  />
                </Space>
              ))}
              <Button type="dashed" icon={<Plus size={16} />} onClick={() => add({ name: "" })}>
                {t.addBuilding}
              </Button>
            </Space>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}

export default function Projects() {
  const { t } = useLang();
  const { profile } = useAuth();
  const { message } = App.useApp();
  const [selectedProject, setSelectedProject] = useState<ProjectRow | undefined>();
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
  const [searchInput, setSearchInput] = useState("");
  const search = useDeferredValue(searchInput.trim());
  const canManageProjects = hasAdminAccess(profile?.role);
  const canRemoveProjects = canDeleteProjects(profile?.role);

  const { tableProps, tableQuery, setFilters, setCurrentPage } = useTable<ProjectRow>({
    resource: "app_projects",
    pagination: { pageSize: STANDARD_PAGE_SIZE },
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
    syncWithLocation: false,
  });

  useEffect(() => {
    setCurrentPage(1);
    setFilters(buildFilters(search, statusFilter), "replace");
  }, [search, setCurrentPage, setFilters, statusFilter]);

  const deleteMutation = useMutation({
    mutationFn: (project: ProjectRow) => {
      if (project.id == null) {
        throw new Error(t.notFound);
      }

      return deleteProject(project.id);
    },
    onSuccess: () => void tableQuery.refetch(),
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  const rows = useMemo(() => tableProps.dataSource ?? [], [tableProps.dataSource]);
  const hasFilters = Boolean(searchInput || statusFilter !== "all");
  const columns: TableProps<ProjectRow>["columns"] = [
    {
      title: t.projectName,
      dataIndex: "name",
      render: (value: string | null, project) => {
        const status = asProjectStatus(project.status);
        return (
        <Space direction="vertical" size={0}>
          <Space size="small" wrap>
            <Typography.Text strong>{value ?? "-"}</Typography.Text>
            <Tag color={statusColor[status]}>{statusLabel(status, t)}</Tag>
          </Space>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {[project.client, project.location].filter(Boolean).join(" | ") || t.noDetail}
          </Typography.Text>
        </Space>
        );
      },
    },
    {
      title: t.buildingsTitle,
      dataIndex: "building_count",
      render: (value: number | null) => t.building_count(value ?? 0),
    },
    {
      title: t.budget,
      dataIndex: "budget",
      align: "right",
      render: (value: number | null) => (value != null ? formatCurrency(value) : "-"),
    },
    { title: t.startDate, dataIndex: "start_date", render: (value: string | null) => formatDate(value) },
    { title: t.endDate, dataIndex: "end_date", render: (value: string | null) => formatDate(value) },
    {
      title: "",
      key: "actions",
      align: "right",
      width: 144,
      render: (_, project) => (
        <Space size="small">
          {canManageProjects ? (
            <>
              <Button
                type="text"
                icon={<Pencil size={16} />}
                onClick={() => {
                  setSelectedProject(project);
                  setOpen(true);
                }}
              />
              {canRemoveProjects && project.id != null ? (
                <Popconfirm
                  title={t.deleteProjectConfirm}
                  okText={t.remove}
                  cancelText={t.cancel}
                  onConfirm={() => deleteMutation.mutate(project)}
                >
                  <Button danger type="text" icon={<Trash2 size={16} />} loading={deleteMutation.isPending} />
                </Popconfirm>
              ) : null}
            </>
          ) : null}
          {project.id != null ? (
            <Link href={`/projects/${project.id}`}>
              <Button type="text" icon={<ChevronRight size={16} />} />
            </Link>
          ) : null}
        </Space>
      ),
    },
  ];

  function exportProjects(format: "csv" | "xlsx") {
    const fileBase = t.projectsTitle;
    const exportRows = rows.map((project) => ({
      [t.projectName]: project.name ?? "",
      [t.client]: project.client ?? "",
      [t.location]: project.location ?? "",
      [t.status]: statusLabel(asProjectStatus(project.status), t),
      [t.buildingsTitle]: project.building_count ?? 0,
      [t.budget]: project.budget ?? "",
      [t.startDate]: formatDateInput(project.start_date),
      [t.endDate]: formatDateInput(project.end_date),
    }));

    if (format === "csv") {
      exportRowsToCsv(`${fileBase}.csv`, exportRows);
      return;
    }

    exportRowsToExcel(`${fileBase}.xlsx`, fileBase, exportRows);
  }

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Row align="bottom" gutter={[16, 16]} justify="space-between">
        <Col>
          <Typography.Title level={2} style={{ marginBottom: 4 }}>
            {t.projectsTitle}
          </Typography.Title>
          <Typography.Text type="secondary">{t.project_count(tableQuery.data?.total ?? 0)}</Typography.Text>
        </Col>
        <Col>
          <Space wrap>
            <Button icon={<Download size={16} />} disabled={!rows.length} onClick={() => exportProjects("csv")}>
              CSV
            </Button>
            <Button icon={<FileSpreadsheet size={16} />} disabled={!rows.length} onClick={() => exportProjects("xlsx")}>
              {t.excel}
            </Button>
            {canManageProjects ? (
              <Button
                type="primary"
                icon={<Plus size={16} />}
                onClick={() => {
                  setSelectedProject(undefined);
                  setOpen(true);
                }}
              >
                {t.addProject}
              </Button>
            ) : null}
          </Space>
        </Col>
      </Row>

      <Card size="small">
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            <Input
              allowClear
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={`${t.search} ${t.projects.toLowerCase()}`}
            />
          </Col>
          <Col xs={24} md={12} lg={6}>
            <Select<ProjectStatus | "all">
              value={statusFilter}
              style={{ width: "100%" }}
              onChange={setStatusFilter}
              options={[
                { label: t.allStatuses, value: "all" },
                { label: t.active, value: "active" },
                { label: t.completed, value: "completed" },
                { label: t.paused, value: "paused" },
              ]}
            />
          </Col>
          <Col xs={24} md={12} lg={4}>
            <Button
              block
              disabled={!hasFilters}
              onClick={() => {
                setSearchInput("");
                setStatusFilter("all");
              }}
            >
              {t.clearFilters}
            </Button>
          </Col>
        </Row>
      </Card>

      {tableQuery.isError ? (
        <Alert
          showIcon
          type="error"
          message={t.projectsTitle}
          description={toErrorMessage(tableQuery.error)}
          action={<Button onClick={() => void tableQuery.refetch()}>{t.retry}</Button>}
        />
      ) : null}

      <Table<ProjectRow>
        {...tableProps}
        rowKey="id"
        columns={columns}
        scroll={{ x: 1000 }}
        pagination={
          tableProps.pagination
            ? {
                ...tableProps.pagination,
                itemRender: undefined,
                showSizeChanger: false,
                showTotal: (total) => `${total} ${t.projects.toLowerCase()}`,
              }
            : false
        }
      />

      {open ? (
        <ProjectModal
          project={selectedProject}
          onClose={() => setOpen(false)}
          onSaved={() => void tableQuery.refetch()}
        />
      ) : null}
    </Space>
  );
}

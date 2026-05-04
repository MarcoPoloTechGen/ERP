import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { CrudFilters } from "@refinedev/core";
import { useTable } from "@refinedev/antd";
import {
  Alert,
  Button,
  Card,
  Col,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  type TableProps,
} from "antd";
import { Download, FileSpreadsheet, Plus } from "lucide-react";
import { ProjectModal } from "@/components/projects/ProjectModal";
import { type ProjectStatus } from "@/lib/erp";
import { useAuth } from "@/lib/auth";
import { exportRowsToCsv, exportRowsToExcel } from "@/lib/export";
import { formatCurrency, formatDate, formatDateInput } from "@/lib/format";
import { hasAdminAccess } from "@/lib/permissions";
import {
  addContainsSearchFilter,
  addEqualFilter,
  asProjectStatus,
  STANDARD_PAGE_SIZE,
  toErrorMessage,
} from "@/lib/refine-helpers";
import { useLang } from "@/lib/i18n";

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

export default function Projects() {
  const { t } = useLang();
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
  const [searchInput, setSearchInput] = useState("");
  const search = useDeferredValue(searchInput.trim());
  const canManageProjects = hasAdminAccess(profile?.role);

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
                onClick={() => setOpen(true)}
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
        onRow={(project) => ({
          onClick: () => {
            if (project.id != null) {
              window.location.href = `/projects/${project.id}`;
            }
          },
          style: project.id != null ? { cursor: "pointer" } : undefined,
        })}
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
        <ProjectModal onClose={() => setOpen(false)} onSaved={() => void tableQuery.refetch()} />
      ) : null}
    </Space>
  );
}

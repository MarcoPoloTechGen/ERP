import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { CrudFilters } from "@refinedev/core";
import { useTable } from "@refinedev/antd";
import { useMutation } from "@tanstack/react-query";
import {
  App,
  Alert,
  Button,
  Card,
  Col,
  Input,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  type TableProps,
} from "antd";
import { Download, FileSpreadsheet, Pencil, Plus, Trash2 } from "lucide-react";
import { ProductModal } from "@/components/products/ProductModal";
import type { ProductRow } from "@/components/products/product-shared";
import {
  deleteProduct,
  type Currency,
} from "@/lib/erp";
import { exportRowsToCsv, exportRowsToExcel } from "@/lib/export";
import { formatCurrencyLabel, formatCurrencyPair } from "@/lib/format";
import {
  addContainsSearchFilter,
  addCurrencyAmountFilter,
  STANDARD_PAGE_SIZE,
  toErrorMessage,
} from "@/lib/refine-helpers";
import { useLang } from "@/lib/i18n";
import { useProjectScope } from "@/lib/project-scope";
import { useErpInvalidation } from "@/hooks/use-erp-invalidation";
import { useProjects } from "@/hooks/use-projects";
import { useSuppliers } from "@/hooks/use-suppliers";

function buildFilters({
  search,
  projectId,
  currency,
}: {
  search: string;
  projectId: string;
  currency: Currency | "all";
}) {
  const filters: CrudFilters = [];
  addContainsSearchFilter(filters, ["name", "supplier_name", "project_name", "building_name", "unit"], search);
  if (projectId !== "all") {
    filters.push({ field: "project_id", operator: "eq", value: Number(projectId) });
  }
  addCurrencyAmountFilter(filters, currency, { USD: "unit_price_usd", IQD: "unit_price_iqd" });
  return filters;
}

export default function Products() {
  const { t } = useLang();
  const { selectedProjectId: scopedProjectId } = useProjectScope();
  const { message } = App.useApp();
  const erpInvalidation = useErpInvalidation();
  const [selectedProduct, setSelectedProduct] = useState<ProductRow | undefined>();
  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState<Currency | "all">("all");
  const search = useDeferredValue(searchInput.trim());
  const effectiveProjectFilter = scopedProjectId == null ? projectFilter : String(scopedProjectId);

  const { data: projects } = useProjects();
  const { data: suppliers } = useSuppliers();

  const { tableProps, tableQuery, setFilters, setCurrentPage } = useTable<ProductRow>({
    resource: "app_products",
    pagination: { pageSize: STANDARD_PAGE_SIZE },
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
    syncWithLocation: false,
  });

  useEffect(() => {
    setCurrentPage(1);
    setFilters(buildFilters({ search, projectId: effectiveProjectFilter, currency: currencyFilter }), "replace");
  }, [currencyFilter, effectiveProjectFilter, search, setCurrentPage, setFilters]);

  const deleteMutation = useMutation({
    mutationFn: (product: ProductRow) => {
      if (product.id == null) {
        throw new Error(t.notFound);
      }

      return deleteProduct(product.id);
    },
    onSuccess: () => {
      void erpInvalidation.products();
      void tableQuery.refetch();
    },
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  const rows = useMemo(() => tableProps.dataSource ?? [], [tableProps.dataSource]);
  const visibleRows = useMemo(() => {
    if (supplierFilter === "all") {
      return rows;
    }

    const selectedSupplierId = Number(supplierFilter);
    return rows.filter((product) => product.supplier_ids?.includes(selectedSupplierId));
  }, [rows, supplierFilter]);
  const hasFilters = Boolean(
    searchInput || (scopedProjectId == null && projectFilter !== "all") || supplierFilter !== "all" || currencyFilter !== "all",
  );
  const columns: TableProps<ProductRow>["columns"] = [
    {
      title: t.name,
      dataIndex: "name",
      render: (value: string | null, product) => (
        <Space direction="vertical" size={0}>
          <Space size="small" wrap>
            <Typography.Text strong>{value ?? "-"}</Typography.Text>
            {product.unit_price_usd ? <Tag>{formatCurrencyLabel("USD")}</Tag> : null}
            {product.unit_price_iqd ? <Tag>IQD</Tag> : null}
          </Space>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {product.unit ?? t.noDetail}
          </Typography.Text>
        </Space>
      ),
    },
    { title: t.supplierLabel, dataIndex: "supplier_name", render: (value: string | null) => value ?? "-" },
    { title: t.projectOption, dataIndex: "project_name", render: (value: string | null) => value ?? "-" },
    { title: t.buildingLabel, dataIndex: "building_name", render: (value: string | null) => value ?? "-" },
    {
      title: t.unitPrice,
      dataIndex: "unit_price_usd",
      align: "right",
      render: (_value: number | null, product) => (
        <Typography.Text strong>
          {formatCurrencyPair({ usd: product.unit_price_usd, iqd: product.unit_price_iqd }, { hideZero: true })}
        </Typography.Text>
      ),
    },
    {
      title: "",
      key: "actions",
      align: "right",
      width: 96,
      render: (_, product) => (
        <Space size="small">
          <Button
            type="text"
            icon={<Pencil size={16} />}
            onClick={() => {
              setSelectedProduct(product);
              setOpen(true);
            }}
          />
          {product.id != null ? (
            <Popconfirm
              title={t.deleteProductConfirm}
              okText={t.remove}
              cancelText={t.cancel}
              onConfirm={() => deleteMutation.mutate(product)}
            >
              <Button danger type="text" icon={<Trash2 size={16} />} loading={deleteMutation.isPending} />
            </Popconfirm>
          ) : null}
        </Space>
      ),
    },
  ];

  function exportProducts(format: "csv" | "xlsx") {
    const fileBase = t.productsTitle;
    const exportRows = visibleRows.map((product) => ({
      [t.name]: product.name ?? "",
      [t.supplierLabel]: product.supplier_name ?? "",
      [t.projectOption]: product.project_name ?? "",
      [t.buildingLabel]: product.building_name ?? "",
      [t.unit]: product.unit ?? "",
      [`${t.unitPrice} ${formatCurrencyLabel("USD")}`]: product.unit_price_usd ?? 0,
      [`${t.unitPrice} IQD`]: product.unit_price_iqd ?? 0,
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
            {t.productsTitle}
          </Typography.Title>
          <Typography.Text type="secondary">{t.product_count(tableQuery.data?.total ?? 0)}</Typography.Text>
        </Col>
        <Col>
          <Space wrap>
            <Button icon={<Download size={16} />} disabled={!visibleRows.length} onClick={() => exportProducts("csv")}>
              CSV
            </Button>
            <Button icon={<FileSpreadsheet size={16} />} disabled={!visibleRows.length} onClick={() => exportProducts("xlsx")}>
              {t.excel}
            </Button>
            <Button
              type="primary"
              icon={<Plus size={16} />}
              onClick={() => {
                setSelectedProduct(undefined);
                setOpen(true);
              }}
            >
              {t.addProduct}
            </Button>
          </Space>
        </Col>
      </Row>

      <Card size="small">
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={8}>
            <Input
              allowClear
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={`${t.search} ${t.products.toLowerCase()}`}
            />
          </Col>
          <Col xs={24} md={12} lg={4}>
            <Select
              value={effectiveProjectFilter}
              disabled={scopedProjectId != null}
              style={{ width: "100%" }}
              onChange={setProjectFilter}
              options={[
                { label: t.allProjects, value: "all" },
                ...(projects?.map((project) => ({ label: project.name, value: String(project.id) })) ?? []),
              ]}
            />
          </Col>
          <Col xs={24} md={12} lg={4}>
            <Select
              value={supplierFilter}
              style={{ width: "100%" }}
              onChange={setSupplierFilter}
              options={[
                { label: t.allSuppliers, value: "all" },
                ...(suppliers?.map((supplier) => ({ label: supplier.name, value: String(supplier.id) })) ?? []),
              ]}
            />
          </Col>
          <Col xs={24} md={12} lg={4}>
            <Select<Currency | "all">
              value={currencyFilter}
              style={{ width: "100%" }}
              onChange={setCurrencyFilter}
              options={[
                { label: t.allCurrencies, value: "all" },
                { label: formatCurrencyLabel("USD"), value: "USD" },
                { label: formatCurrencyLabel("IQD"), value: "IQD" },
              ]}
            />
          </Col>
          <Col xs={24} md={12} lg={4}>
            <Button
              block
              disabled={!hasFilters}
              onClick={() => {
                setSearchInput("");
                setProjectFilter(scopedProjectId == null ? "all" : String(scopedProjectId));
                setSupplierFilter("all");
                setCurrencyFilter("all");
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
          message={t.productsTitle}
          description={toErrorMessage(tableQuery.error)}
          action={<Button onClick={() => void tableQuery.refetch()}>{t.retry}</Button>}
        />
      ) : null}

      <Table<ProductRow>
        {...tableProps}
        dataSource={visibleRows}
        rowKey="id"
        columns={columns}
        scroll={{ x: 1000 }}
        pagination={
          tableProps.pagination
            ? {
                ...tableProps.pagination,
                itemRender: undefined,
                showSizeChanger: false,
                showTotal: (total) => `${total} ${t.products.toLowerCase()}`,
              }
            : false
        }
      />

      {open ? (
        <ProductModal
          product={selectedProduct}
          onClose={() => setOpen(false)}
          onSaved={() => void tableQuery.refetch()}
        />
      ) : null}
    </Space>
  );
}

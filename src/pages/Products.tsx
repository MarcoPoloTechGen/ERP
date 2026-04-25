import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { CrudFilters } from "@refinedev/core";
import { useTable } from "@refinedev/antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Download, FileSpreadsheet, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createProduct,
  deleteProduct,
  erpKeys,
  listProjectBuildings,
  listProjects,
  listSuppliers,
  type Currency,
  updateProduct,
} from "@/lib/erp";
import { exportRowsToCsv, exportRowsToExcel } from "@/lib/export";
import { formatCurrencyPair } from "@/lib/format";
import {
  addContainsSearchFilter,
  addCurrencyAmountFilter,
  addEqualFilter,
  STANDARD_PAGE_SIZE,
  toErrorMessage,
} from "@/lib/refine-helpers";
import { useLang } from "@/lib/i18n";

type ProductRow = {
  id: number | null;
  name: string | null;
  supplier_id: number | null;
  supplier_name: string | null;
  project_id: number | null;
  project_name: string | null;
  building_id: number | null;
  building_name: string | null;
  unit: string | null;
  unit_price: number | null;
  currency: string | null;
  unit_price_usd: number | null;
  unit_price_iqd: number | null;
  created_at: string | null;
};

type ProductFormValues = {
  name: string;
  supplierId?: number;
  projectId?: number;
  buildingId?: number;
  unit?: string;
  unitPriceUsd?: number;
  unitPriceIqd?: number;
};

function buildFilters({
  search,
  projectId,
  supplierId,
  currency,
}: {
  search: string;
  projectId: string;
  supplierId: string;
  currency: Currency | "all";
}) {
  const filters: CrudFilters = [];
  addContainsSearchFilter(filters, ["name", "supplier_name", "project_name", "building_name", "unit"], search);
  addEqualFilter(filters, "project_id", projectId === "all" ? "all" : Number(projectId));
  addEqualFilter(filters, "supplier_id", supplierId === "all" ? "all" : Number(supplierId));
  addCurrencyAmountFilter(filters, currency, { USD: "unit_price_usd", IQD: "unit_price_iqd" });
  return filters;
}

function ProductModal({
  product,
  onClose,
  onSaved,
}: {
  product?: ProductRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLang();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<ProductFormValues>();
  const projectId = Form.useWatch("projectId", form);
  const selectedProjectId = typeof projectId === "number" ? projectId : undefined;

  const { data: suppliers } = useQuery({ queryKey: erpKeys.suppliers, queryFn: listSuppliers });
  const { data: projects } = useQuery({ queryKey: erpKeys.projects, queryFn: listProjects });
  const { data: buildings } = useQuery({
    queryKey: erpKeys.projectBuildings(selectedProjectId ?? 0),
    queryFn: () => listProjectBuildings(selectedProjectId),
    enabled: selectedProjectId != null,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      const payload = {
        name: values.name.trim(),
        supplierId: values.supplierId ?? null,
        projectId: values.projectId ?? null,
        buildingId: values.buildingId ?? null,
        unit: values.unit?.trim() || null,
        unitPriceUsd: Number(values.unitPriceUsd || 0),
        unitPriceIqd: Number(values.unitPriceIqd || 0),
      };

      if (product) {
        if (product.id == null) {
          throw new Error(t.notFound);
        }

        await updateProduct(product.id, payload);
        return;
      }

      await createProduct(payload);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: erpKeys.products }),
        queryClient.invalidateQueries({ queryKey: erpKeys.dashboard }),
      ]);
      onSaved();
      onClose();
    },
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  return (
    <Modal
      open
      title={product ? t.editProduct : t.newProduct}
      okText={product ? t.save : t.create}
      cancelText={t.cancel}
      confirmLoading={saveMutation.isPending}
      onCancel={onClose}
      onOk={() => form.submit()}
    >
      <Form<ProductFormValues>
        form={form}
        layout="vertical"
        initialValues={{
          name: product?.name ?? "",
          supplierId: product?.supplier_id ?? undefined,
          projectId: product?.project_id ?? undefined,
          buildingId: product?.building_id ?? undefined,
          unit: product?.unit ?? "",
          unitPriceUsd:
            product?.unit_price_usd ?? (product?.currency === "USD" ? product?.unit_price ?? undefined : undefined),
          unitPriceIqd:
            product?.unit_price_iqd ?? (product?.currency === "IQD" ? product?.unit_price ?? undefined : undefined),
        }}
        onFinish={(values) => saveMutation.mutate(values)}
      >
        <Form.Item name="name" label={t.name} rules={[{ required: true, message: t.nameRequired }]}>
          <Input placeholder={t.namePlaceholder} />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="supplierId" label={t.supplierLabel}>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder={t.noneOption}
                options={suppliers?.map((supplier) => ({ label: supplier.name, value: supplier.id }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="projectId" label={t.projectOption}>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder={t.noneOption}
                onChange={() => form.setFieldValue("buildingId", undefined)}
                options={projects?.map((project) => ({ label: project.name, value: project.id }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="buildingId" label={t.buildingLabel}>
              <Select
                allowClear
                showSearch
                disabled={!selectedProjectId}
                optionFilterProp="label"
                placeholder={t.noneOption}
                options={buildings?.map((building) => ({ label: building.name, value: building.id }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="unit" label={t.unit}>
              <Input placeholder={t.unitPlaceholder} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="unitPriceUsd" label={`${t.unitPrice} USD`}>
              <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="unitPriceIqd" label={`${t.unitPrice} IQD`}>
              <InputNumber min={0} step={1} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}

export default function Products() {
  const { t } = useLang();
  const { message } = App.useApp();
  const [selectedProduct, setSelectedProduct] = useState<ProductRow | undefined>();
  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState<Currency | "all">("all");
  const search = useDeferredValue(searchInput.trim());

  const { data: projects } = useQuery({ queryKey: erpKeys.projects, queryFn: listProjects });
  const { data: suppliers } = useQuery({ queryKey: erpKeys.suppliers, queryFn: listSuppliers });

  const { tableProps, tableQuery, setFilters, setCurrentPage } = useTable<ProductRow>({
    resource: "app_products",
    pagination: { pageSize: STANDARD_PAGE_SIZE },
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
    syncWithLocation: false,
  });

  useEffect(() => {
    setCurrentPage(1);
    setFilters(buildFilters({ search, projectId: projectFilter, supplierId: supplierFilter, currency: currencyFilter }), "replace");
  }, [currencyFilter, projectFilter, search, setCurrentPage, setFilters, supplierFilter]);

  const deleteMutation = useMutation({
    mutationFn: (product: ProductRow) => {
      if (product.id == null) {
        throw new Error(t.notFound);
      }

      return deleteProduct(product.id);
    },
    onSuccess: () => void tableQuery.refetch(),
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  const rows = useMemo(() => tableProps.dataSource ?? [], [tableProps.dataSource]);
  const hasFilters = Boolean(
    searchInput || projectFilter !== "all" || supplierFilter !== "all" || currencyFilter !== "all",
  );
  const columns: TableProps<ProductRow>["columns"] = [
    {
      title: t.name,
      dataIndex: "name",
      render: (value: string | null, product) => (
        <Space direction="vertical" size={0}>
          <Space size="small" wrap>
            <Typography.Text strong>{value ?? "-"}</Typography.Text>
            {product.unit_price_usd ? <Tag>USD</Tag> : null}
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
    const exportRows = rows.map((product) => ({
      [t.name]: product.name ?? "",
      [t.supplierLabel]: product.supplier_name ?? "",
      [t.projectOption]: product.project_name ?? "",
      [t.buildingLabel]: product.building_name ?? "",
      [t.unit]: product.unit ?? "",
      [`${t.unitPrice} USD`]: product.unit_price_usd ?? 0,
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
            <Button icon={<Download size={16} />} disabled={!rows.length} onClick={() => exportProducts("csv")}>
              CSV
            </Button>
            <Button icon={<FileSpreadsheet size={16} />} disabled={!rows.length} onClick={() => exportProducts("xlsx")}>
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
              value={projectFilter}
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
                { label: "USD", value: "USD" },
                { label: "IQD", value: "IQD" },
              ]}
            />
          </Col>
          <Col xs={24} md={12} lg={4}>
            <Button
              block
              disabled={!hasFilters}
              onClick={() => {
                setSearchInput("");
                setProjectFilter("all");
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

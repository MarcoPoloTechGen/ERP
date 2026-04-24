import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { CrudFilters } from "@refinedev/core";
import { useTable } from "@refinedev/antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  App,
  Alert,
  Button,
  Card,
  Col,
  Form,
  Image as AntImage,
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
  Upload,
  type TableProps,
} from "antd";
import { ChevronRight, Download, FileSpreadsheet, Image as ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createInvoice,
  deleteInvoice,
  erpKeys,
  listProducts,
  listProjectBuildings,
  listProjects,
  listSuppliers,
  type Currency,
  type InvoiceStatus,
  updateInvoice,
} from "@/lib/erp";
import { useAuth } from "@/lib/auth";
import { exportRowsToCsv, exportRowsToExcel } from "@/lib/export";
import { formatCurrency, formatDate, formatDateInput } from "@/lib/format";
import {
  addContainsSearchFilter,
  addDateRangeFilter,
  addEqualFilter,
  asCurrency,
  asInvoiceStatus,
  asNumber,
  asRecordStatus,
  STANDARD_PAGE_SIZE,
  toErrorMessage,
} from "@/lib/refine-helpers";
import { useLang } from "@/lib/i18n";
import {
  createSignedInvoiceImageUrl,
  createSignedInvoiceImageUrls,
  deleteInvoiceImageByUrl,
  resolveInvoiceImagePath,
  uploadInvoiceImage,
} from "@/lib/supabase";

type InvoiceRow = {
  id: number | null;
  number: string | null;
  status: string | null;
  record_status: string | null;
  supplier_id: number | null;
  supplier_name: string | null;
  project_id: number | null;
  project_name: string | null;
  building_id: number | null;
  building_name: string | null;
  product_id: number | null;
  product_name: string | null;
  total_amount: number | null;
  paid_amount: number | null;
  remaining_amount: number | null;
  currency: string | null;
  invoice_date: string | null;
  due_date: string | null;
  notes: string | null;
  image_path: string | null;
  created_by_name: string | null;
  created_at: string | null;
};

type InvoiceFormValues = {
  number: string;
  supplierId?: number;
  projectId?: number;
  assignmentScope: "project" | "building";
  buildingId?: number;
  productId?: number;
  totalAmount: number;
  paidAmount?: number;
  currency: Currency;
  status: InvoiceStatus;
  invoiceDate?: string;
  dueDate?: string;
  notes?: string;
};

const invoiceStatusColor: Record<InvoiceStatus, string> = {
  unpaid: "red",
  partial: "orange",
  paid: "green",
};

function invoiceStatusLabel(status: InvoiceStatus, t: ReturnType<typeof useLang>["t"]) {
  if (status === "paid") {
    return t.paid;
  }
  if (status === "partial") {
    return t.partial;
  }
  return t.unpaid;
}

function buildFilters({
  search,
  status,
  projectId,
  supplierId,
  currency,
  dateFrom,
  dateTo,
}: {
  search: string;
  status: InvoiceStatus | "all";
  projectId: string;
  supplierId: string;
  currency: Currency | "all";
  dateFrom: string;
  dateTo: string;
}) {
  const filters: CrudFilters = [];
  addContainsSearchFilter(
    filters,
    ["number", "supplier_name", "project_name", "building_name", "product_name", "created_by_name", "notes"],
    search,
  );
  addEqualFilter(filters, "status", status);
  addEqualFilter(filters, "project_id", projectId === "all" ? "all" : Number(projectId));
  addEqualFilter(filters, "supplier_id", supplierId === "all" ? "all" : Number(supplierId));
  addEqualFilter(filters, "currency", currency);
  addDateRangeFilter(filters, "invoice_date", dateFrom, dateTo);
  return filters;
}

function InvoiceImageField({
  displayUrl,
  label,
  removeLabel,
  onSelect,
  onRemove,
}: {
  displayUrl: string | null;
  label: string;
  removeLabel: string;
  onSelect: (file: File) => void;
  onRemove: () => void;
}) {
  return (
    <Space direction="vertical" size="small">
      <Typography.Text strong>{label}</Typography.Text>
      {displayUrl ? (
        <Space align="center">
          <AntImage width={88} height={88} src={displayUrl} alt={label} style={{ objectFit: "cover", borderRadius: 6 }} />
          <Button onClick={onRemove}>{removeLabel}</Button>
        </Space>
      ) : (
        <Upload
          accept="image/*"
          showUploadList={false}
          beforeUpload={(file) => {
            onSelect(file);
            return false;
          }}
        >
          <Button icon={<ImageIcon size={16} />}>{label}</Button>
        </Upload>
      )}
    </Space>
  );
}

function InvoiceModal({
  invoice,
  onClose,
  onSaved,
}: {
  invoice?: InvoiceRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLang();
  const { profile } = useAuth();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<InvoiceFormValues>();
  const projectId = Form.useWatch("projectId", form);
  const assignmentScope = Form.useWatch("assignmentScope", form);
  const selectedProjectId = typeof projectId === "number" ? projectId : undefined;
  const [storedImagePath, setStoredImagePath] = useState<string | null>(invoice?.image_path ?? null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

  const { data: suppliers } = useQuery({ queryKey: erpKeys.suppliers, queryFn: listSuppliers });
  const { data: projects } = useQuery({ queryKey: erpKeys.projects, queryFn: listProjects });
  const { data: products } = useQuery({ queryKey: erpKeys.products, queryFn: listProducts });
  const { data: projectBuildings } = useQuery({
    queryKey: erpKeys.projectBuildings(selectedProjectId ?? 0),
    queryFn: () => listProjectBuildings(selectedProjectId),
    enabled: selectedProjectId != null,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadSignedImage() {
      if (!invoice?.image_path) {
        setExistingImageUrl(null);
        return;
      }

      try {
        const signedUrl = await createSignedInvoiceImageUrl(invoice.image_path);
        if (!cancelled) {
          setExistingImageUrl(signedUrl);
        }
      } catch (error) {
        if (!cancelled) {
          void message.error(toErrorMessage(error));
        }
      }
    }

    void loadSignedImage();
    return () => {
      cancelled = true;
    };
  }, [invoice?.image_path, message]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const projectProducts = useMemo(() => {
    return (products ?? []).filter((product) => {
      if (selectedProjectId == null) {
        return true;
      }

      return product.projectId === selectedProjectId || product.projectId == null;
    });
  }, [products, selectedProjectId]);

  const saveMutation = useMutation({
    mutationFn: async (values: InvoiceFormValues) => {
      const totalAmount = Number(values.totalAmount || 0);
      const paidAmount = Number(values.paidAmount || 0);
      let nextImagePath = storedImagePath;
      let uploadedPath: string | null = null;
      const previousImagePath = invoice?.image_path ?? null;

      if (selectedImageFile) {
        const uploaded = await uploadInvoiceImage(
          selectedImageFile,
          values.number || "expense",
          values.projectId ?? null,
        );
        uploadedPath = uploaded.path;
        nextImagePath = uploaded.path;
      }

      const payload = {
        number: values.number.trim(),
        supplierId: values.supplierId ?? null,
        projectId: values.projectId ?? null,
        buildingId: values.projectId && values.assignmentScope === "building" ? values.buildingId ?? null : null,
        productId: values.productId ?? null,
        totalAmount,
        paidAmount,
        currency: values.currency,
        status: values.status,
        invoiceDate: values.invoiceDate || null,
        dueDate: values.dueDate || null,
        notes: values.notes?.trim() || null,
        imagePath: nextImagePath,
      };

      try {
        if (invoice) {
          if (invoice.id == null) {
            throw new Error(t.notFound);
          }

          await updateInvoice(invoice.id, payload);
        } else {
          await createInvoice(payload);
        }
      } catch (error) {
        if (uploadedPath) {
          await deleteInvoiceImageByUrl(uploadedPath);
        }
        throw error;
      }

      if (previousImagePath && previousImagePath !== nextImagePath) {
        await deleteInvoiceImageByUrl(previousImagePath);
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: erpKeys.invoices }),
        queryClient.invalidateQueries({ queryKey: erpKeys.dashboard }),
      ]);
      onSaved();
      onClose();
    },
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  const imageUrl = previewUrl ?? (storedImagePath ? existingImageUrl : null);

  return (
    <Modal
      open
      width={860}
      title={invoice ? t.editInvoice : t.newInvoice}
      okText={invoice ? t.save : t.create}
      cancelText={t.cancel}
      confirmLoading={saveMutation.isPending}
      onCancel={onClose}
      onOk={() => form.submit()}
    >
      <Form<InvoiceFormValues>
        form={form}
        layout="vertical"
        initialValues={{
          number: invoice?.number ?? "",
          supplierId: invoice?.supplier_id ?? undefined,
          projectId: invoice?.project_id ?? undefined,
          assignmentScope: invoice?.building_id != null ? "building" : "project",
          buildingId: invoice?.building_id ?? undefined,
          productId: invoice?.product_id ?? undefined,
          totalAmount: invoice?.total_amount ?? undefined,
          paidAmount: invoice?.paid_amount ?? 0,
          currency: asCurrency(invoice?.currency),
          status: asInvoiceStatus(invoice?.status, invoice?.total_amount ?? 0, invoice?.paid_amount ?? 0),
          invoiceDate: formatDateInput(invoice?.invoice_date) || new Date().toISOString().slice(0, 10),
          dueDate: formatDateInput(invoice?.due_date),
          notes: invoice?.notes ?? "",
        }}
        onFinish={(values) => saveMutation.mutate(values)}
      >
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="number" label={t.invoiceNumber} rules={[{ required: true, message: t.nameRequired }]}>
              <Input placeholder={t.invoiceNumberPlaceholder} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="status" label={t.invoiceStatus_label}>
              <Select
                options={[
                  { label: t.unpaid, value: "unpaid" },
                  { label: t.partial, value: "partial" },
                  { label: t.paid, value: "paid" },
                ]}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label={t.user}>
              <Input readOnly value={profile?.fullName ?? profile?.email ?? ""} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="supplierId" label={t.supplierOption}>
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
                onChange={() =>
                  form.setFieldsValue({ assignmentScope: "project", buildingId: undefined, productId: undefined })
                }
                options={projects?.map((project) => ({ label: project.name, value: project.id }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="assignmentScope" label={t.invoiceAssignment}>
              <Select
                disabled={!projectId}
                onChange={(value) => {
                  if (value !== "building") {
                    form.setFieldValue("buildingId", undefined);
                  }
                }}
                options={[
                  { label: t.projectGlobalCost, value: "project" },
                  { label: t.projectBuildingCost, value: "building", disabled: !projectBuildings?.length },
                ]}
              />
            </Form.Item>
          </Col>
          {projectId && assignmentScope === "building" ? (
            <Col xs={24} md={12}>
              <Form.Item name="buildingId" label={t.buildingLabel}>
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder={t.noneOption}
                  options={projectBuildings?.map((building) => ({ label: building.name, value: building.id }))}
                />
              </Form.Item>
            </Col>
          ) : null}
          <Col xs={24} md={12}>
            <Form.Item name="productId" label={t.products}>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder={t.noneOption}
                options={projectProducts.map((product) => ({
                  label: product.buildingName ? `${product.name} - ${product.buildingName}` : product.name,
                  value: product.id,
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="totalAmount" label={t.totalAmount} rules={[{ required: true, message: t.amountRequired }]}>
              <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="paidAmount" label={t.paidAmount}>
              <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="currency" label={t.currency}>
              <Select options={["USD", "IQD"].map((value) => ({ label: value, value }))} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="invoiceDate" label={t.invoiceDate}>
              <Input type="date" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="dueDate" label={t.dueDate}>
              <Input type="date" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="notes" label={t.notes}>
          <Input.TextArea rows={3} />
        </Form.Item>

        <InvoiceImageField
          displayUrl={imageUrl}
          label={t.receiptImage}
          removeLabel={t.remove}
          onSelect={(file) => {
            if (previewUrl) {
              URL.revokeObjectURL(previewUrl);
            }
            setSelectedImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
          }}
          onRemove={() => {
            if (previewUrl) {
              URL.revokeObjectURL(previewUrl);
            }
            setSelectedImageFile(null);
            setPreviewUrl(null);
            setStoredImagePath(null);
            setExistingImageUrl(null);
          }}
        />
      </Form>
    </Modal>
  );
}

export default function Invoices() {
  const { t } = useLang();
  const { message } = App.useApp();
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRow | undefined>();
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
  const [searchInput, setSearchInput] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState<Currency | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [imageUrlsByPath, setImageUrlsByPath] = useState(new Map<string, string>());
  const search = useDeferredValue(searchInput.trim());

  const { data: projects } = useQuery({ queryKey: erpKeys.projects, queryFn: listProjects });
  const { data: suppliers } = useQuery({ queryKey: erpKeys.suppliers, queryFn: listSuppliers });

  const { tableProps, tableQuery, setFilters, setCurrentPage } = useTable<InvoiceRow>({
    resource: "app_invoices",
    pagination: { pageSize: STANDARD_PAGE_SIZE },
    sorters: {
      initial: [
        { field: "invoice_date", order: "desc" },
        { field: "created_at", order: "desc" },
      ],
    },
    syncWithLocation: false,
  });

  useEffect(() => {
    setCurrentPage(1);
    setFilters(
      buildFilters({
        search,
        status: statusFilter,
        projectId: projectFilter,
        supplierId: supplierFilter,
        currency: currencyFilter,
        dateFrom,
        dateTo,
      }),
      "replace",
    );
  }, [currencyFilter, dateFrom, dateTo, projectFilter, search, setCurrentPage, setFilters, statusFilter, supplierFilter]);

  const deleteMutation = useMutation({
    mutationFn: (invoice: InvoiceRow) => {
      if (invoice.id == null) {
        throw new Error(t.notFound);
      }

      return deleteInvoice(invoice.id);
    },
    onSuccess: () => void tableQuery.refetch(),
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  const rows = useMemo(() => tableProps.dataSource ?? [], [tableProps.dataSource]);
  const imagePathKey = rows.map((invoice) => invoice.image_path ?? "").join("|");

  useEffect(() => {
    let cancelled = false;

    async function loadSignedImages() {
      try {
        const urls = await createSignedInvoiceImageUrls(rows.map((invoice) => invoice.image_path));
        if (!cancelled) {
          setImageUrlsByPath(urls);
        }
      } catch (error) {
        if (!cancelled) {
          void message.error(toErrorMessage(error));
        }
      }
    }

    void loadSignedImages();
    return () => {
      cancelled = true;
    };
  }, [imagePathKey, message, rows]);

  const hasFilters = Boolean(
    searchInput ||
      statusFilter !== "all" ||
      projectFilter !== "all" ||
      supplierFilter !== "all" ||
      currencyFilter !== "all" ||
      dateFrom ||
      dateTo,
  );

  function imageUrlFor(invoice: InvoiceRow) {
    const path = resolveInvoiceImagePath(invoice.image_path);
    return path ? imageUrlsByPath.get(path) ?? null : null;
  }

  const columns: TableProps<InvoiceRow>["columns"] = [
    {
      title: t.reference,
      dataIndex: "number",
      render: (value: string, invoice) => {
        const imageUrl = imageUrlFor(invoice);
        return (
          <Space>
            {imageUrl ? (
              <AntImage
                width={48}
                height={48}
                src={imageUrl}
                alt={t.receiptImage}
                style={{ objectFit: "cover", borderRadius: 6 }}
              />
            ) : null}
            <Space direction="vertical" size={0}>
              <Space size="small" wrap>
                <Typography.Text strong>{value ?? "-"}</Typography.Text>
                <Tag color={invoiceStatusColor[asInvoiceStatus(invoice.status, invoice.total_amount ?? 0, invoice.paid_amount ?? 0)]}>
                  {invoiceStatusLabel(asInvoiceStatus(invoice.status, invoice.total_amount ?? 0, invoice.paid_amount ?? 0), t)}
                </Tag>
                {asRecordStatus(invoice.record_status) === "deleted" ? <Tag>{t.deleted}</Tag> : null}
              </Space>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {[invoice.supplier_name, invoice.project_name, invoice.product_name].filter(Boolean).join(" | ") ||
                  t.noDetail}
              </Typography.Text>
            </Space>
          </Space>
        );
      },
    },
    {
      title: t.invoiceAssignment,
      dataIndex: "building_name",
      render: (value: string | null) => (value ? t.projectBuildingCost : t.projectGlobalCost),
    },
    { title: t.user, dataIndex: "created_by_name", render: (value: string | null) => value ?? "-" },
    {
      title: t.totalAmount,
      dataIndex: "total_amount",
      align: "right",
      render: (value: number | null, invoice) => formatCurrency(value ?? 0, asCurrency(invoice.currency)),
    },
    {
      title: t.remaining_label,
      dataIndex: "remaining_amount",
      align: "right",
      render: (value: number | null, invoice) => formatCurrency(value ?? 0, asCurrency(invoice.currency)),
    },
    { title: t.invoiceDate, dataIndex: "invoice_date", render: (value: string | null) => formatDate(value) },
    {
      title: "",
      key: "actions",
      align: "right",
      width: 144,
      render: (_, invoice) => (
        <Space size="small">
          {invoice.id != null && asRecordStatus(invoice.record_status) === "active" ? (
            <>
              <Button
                type="text"
                icon={<Pencil size={16} />}
                onClick={() => {
                  setSelectedInvoice(invoice);
                  setOpen(true);
                }}
              />
              <Popconfirm
                title={t.deleteInvoiceConfirm}
                okText={t.remove}
                cancelText={t.cancel}
                onConfirm={() => deleteMutation.mutate(invoice)}
              >
                <Button danger type="text" icon={<Trash2 size={16} />} loading={deleteMutation.isPending} />
              </Popconfirm>
            </>
          ) : null}
          {invoice.id != null ? (
            <Link href={`/expenses/${invoice.id}`}>
              <Button type="text" icon={<ChevronRight size={16} />} />
            </Link>
          ) : null}
        </Space>
      ),
    },
  ];

  function exportInvoices(format: "csv" | "xlsx") {
    const fileBase = t.invoicesTitle;
    const exportRows = rows.map((invoice) => ({
      [t.reference]: invoice.number ?? "",
      [t.status]: invoiceStatusLabel(asInvoiceStatus(invoice.status, invoice.total_amount ?? 0, invoice.paid_amount ?? 0), t),
      [t.invoiceAssignment]: invoice.building_name ? t.projectBuildingCost : t.projectGlobalCost,
      [t.buildingLabel]: invoice.building_name ?? "",
      [t.supplierOption]: invoice.supplier_name ?? "",
      [t.products]: invoice.product_name ?? "",
      [t.projectOption]: invoice.project_name ?? "",
      [t.createdBy]: invoice.created_by_name ?? "",
      [t.totalAmount]: asNumber(invoice.total_amount),
      [t.paidAmount]: asNumber(invoice.paid_amount),
      [t.currency]: asCurrency(invoice.currency),
      [t.remaining_label]: asNumber(invoice.remaining_amount),
      [t.invoiceDate]: formatDateInput(invoice.invoice_date),
      [t.dueDate]: formatDateInput(invoice.due_date),
      [t.notes]: invoice.notes ?? "",
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
            {t.invoicesTitle}
          </Typography.Title>
          <Typography.Text type="secondary">{t.expense_count(tableQuery.data?.total ?? 0)}</Typography.Text>
        </Col>
        <Col>
          <Space wrap>
            <Button icon={<Download size={16} />} disabled={!rows.length} onClick={() => exportInvoices("csv")}>
              CSV
            </Button>
            <Button icon={<FileSpreadsheet size={16} />} disabled={!rows.length} onClick={() => exportInvoices("xlsx")}>
              {t.excel}
            </Button>
            <Button
              type="primary"
              icon={<Plus size={16} />}
              onClick={() => {
                setSelectedInvoice(undefined);
                setOpen(true);
              }}
            >
              {t.addInvoice}
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
              placeholder={`${t.search} ${t.expenses.toLowerCase()}`}
            />
          </Col>
          <Col xs={24} md={12} lg={4}>
            <Select<InvoiceStatus | "all">
              value={statusFilter}
              style={{ width: "100%" }}
              onChange={setStatusFilter}
              options={[
                { label: t.allStatuses, value: "all" },
                { label: t.unpaidFilter, value: "unpaid" },
                { label: t.partialFilter, value: "partial" },
                { label: t.paidFilter, value: "paid" },
              ]}
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
          <Col xs={24} md={8} lg={4}>
            <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </Col>
          <Col xs={24} md={8} lg={4}>
            <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </Col>
          <Col xs={24} md={8} lg={4}>
            <Button
              block
              disabled={!hasFilters}
              onClick={() => {
                setSearchInput("");
                setStatusFilter("all");
                setProjectFilter("all");
                setSupplierFilter("all");
                setCurrencyFilter("all");
                setDateFrom("");
                setDateTo("");
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
          message={t.invoicesTitle}
          description={toErrorMessage(tableQuery.error)}
          action={<Button onClick={() => void tableQuery.refetch()}>{t.retry}</Button>}
        />
      ) : null}

      <Table<InvoiceRow>
        {...tableProps}
        rowKey="id"
        columns={columns}
        scroll={{ x: 1200 }}
        pagination={
          tableProps.pagination
            ? {
                ...tableProps.pagination,
                itemRender: undefined,
                showSizeChanger: false,
                showTotal: (total) => `${total} ${t.expenses.toLowerCase()}`,
              }
            : false
        }
      />

      {open ? (
        <InvoiceModal
          invoice={selectedInvoice}
          onClose={() => setOpen(false)}
          onSaved={() => void tableQuery.refetch()}
        />
      ) : null}
    </Space>
  );
}

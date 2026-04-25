import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { CrudFilters } from "@refinedev/core";
import { useTable } from "@refinedev/antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Alert,
  Button,
  Col,
  Form,
  Image as AntImage,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
  type TableProps,
} from "antd";
import { Image as ImageIcon } from "lucide-react";
import FinanceFilters from "@/components/finance/FinanceFilters";
import FinancePageHeader from "@/components/finance/FinancePageHeader";
import FinanceRowActions from "@/components/finance/FinanceRowActions";
import ProjectExpenseVisualization from "@/components/finance/ProjectExpenseVisualization";
import { standardPagination } from "@/components/finance/table";
import {
  createInvoice,
  deleteInvoice,
  erpKeys,
  listInvoices,
  listProducts,
  listProjectBuildings,
  listProjects,
  listSuppliers,
  listWorkers,
  type Currency,
  type InvoiceStatus,
  updateInvoice,
} from "@/lib/erp";
import { exportRowsToCsv, exportRowsToExcel } from "@/lib/export";
import {
  buildExpenseAssignmentOptions,
  expenseAssignmentKeyFromRecord,
  parseExpenseAssignmentKey,
} from "@/lib/expense-assignment";
import { EXPENSE_TYPES, asExpenseType, type ExpenseType } from "@/lib/expense-types";
import { formatCurrencyLabel, formatCurrencyPair, formatDate, formatDateInput } from "@/lib/format";
import {
  addContainsSearchFilter,
  addCurrencyAmountFilter,
  addDateRangeFilter,
  addEqualFilter,
  asCurrency,
  asDualCurrencyInvoiceStatus,
  asNumber,
  asRecordStatus,
  STANDARD_PAGE_SIZE,
  toErrorMessage,
} from "@/lib/refine-helpers";
import { useLang } from "@/lib/i18n";
import { useProjectScope } from "@/lib/project-scope";
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
  expense_type: string | null;
  labor_worker_id: number | null;
  labor_worker_name: string | null;
  labor_person_name: string | null;
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
  total_amount_usd: number | null;
  paid_amount_usd: number | null;
  remaining_amount_usd: number | null;
  total_amount_iqd: number | null;
  paid_amount_iqd: number | null;
  remaining_amount_iqd: number | null;
  invoice_date: string | null;
  due_date: string | null;
  notes: string | null;
  image_path: string | null;
  created_by_name: string | null;
  created_at: string | null;
};

type InvoiceFormValues = {
  expenseType: ExpenseType;
  laborWorkerId?: number;
  supplierId?: number;
  assignmentKey?: string;
  productId?: number;
  paidAmountUsd?: number;
  remainingAmountUsd?: number;
  paidAmountIqd?: number;
  remainingAmountIqd?: number;
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

function expenseTypeLabel(expenseType: ExpenseType, t: ReturnType<typeof useLang>["t"]) {
  if (expenseType === "labor") {
    return t.expenseTypeLabor;
  }
  if (expenseType === "logistics") {
    return t.expenseTypeLogistics;
  }
  return t.expenseTypeProducts;
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
    [
      "number",
      "expense_type",
      "labor_worker_name",
      "labor_person_name",
      "supplier_name",
      "project_name",
      "building_name",
      "product_name",
      "created_by_name",
      "notes",
    ],
    search,
  );
  addEqualFilter(filters, "status", status);
  addEqualFilter(filters, "project_id", projectId === "all" ? "all" : Number(projectId));
  addEqualFilter(filters, "supplier_id", supplierId === "all" ? "all" : Number(supplierId));
  addCurrencyAmountFilter(filters, currency, { USD: "total_amount_usd", IQD: "total_amount_iqd" });
  addDateRangeFilter(filters, "invoice_date", dateFrom, dateTo);
  return filters;
}

function buildGeneratedExpenseTitle({
  assignment,
  buildings,
  expenseType,
  fallbackInvoice,
  projects,
  t,
}: {
  assignment: { projectId: number | null; buildingId: number | null };
  buildings: Array<{ id: number; name: string; projectId: number }>;
  expenseType: ExpenseType;
  fallbackInvoice?: InvoiceRow;
  projects: Array<{ id: number; name: string }>;
  t: ReturnType<typeof useLang>["t"];
}) {
  const projectName =
    projects.find((project) => project.id === assignment.projectId)?.name ??
    fallbackInvoice?.project_name ??
    t.projectOption;
  const buildingName =
    assignment.buildingId == null
      ? t.projectGlobalCost
      : buildings.find((building) => building.id === assignment.buildingId)?.name ??
        fallbackInvoice?.building_name ??
        t.buildingLabel;

  return [projectName, buildingName, expenseTypeLabel(expenseType, t)].join(" : ");
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
  const { selectedProjectId: scopedProjectId } = useProjectScope();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<InvoiceFormValues>();
  const expenseType = Form.useWatch("expenseType", form) ?? "products";
  const assignmentKey = Form.useWatch("assignmentKey", form);
  const supplierId = Form.useWatch("supplierId", form);
  const [storedImagePath, setStoredImagePath] = useState<string | null>(invoice?.image_path ?? null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

  const { data: suppliers } = useQuery({ queryKey: erpKeys.suppliers, queryFn: listSuppliers });
  const { data: projects } = useQuery({ queryKey: erpKeys.projects, queryFn: listProjects });
  const { data: products } = useQuery({ queryKey: erpKeys.products, queryFn: listProducts });
  const { data: workers } = useQuery({ queryKey: erpKeys.workers, queryFn: listWorkers });
  const { data: projectBuildings } = useQuery({
    queryKey: erpKeys.projectBuildings(0),
    queryFn: () => listProjectBuildings(),
  });
  const effectiveAssignmentKey = assignmentKey ?? (scopedProjectId != null ? `project:${scopedProjectId}` : undefined);
  const selectedAssignment = parseExpenseAssignmentKey(effectiveAssignmentKey, projectBuildings);
  const selectedProjectId = selectedAssignment.projectId ?? undefined;

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
  const supplierProducts = useMemo(() => {
    if (supplierId == null) {
      return [];
    }

    return projectProducts.filter((product) => product.supplierId === supplierId);
  }, [projectProducts, supplierId]);
  const showProductField = expenseType === "products" && supplierId != null && supplierProducts.length > 1;
  const workerNameById = useMemo(() => {
    return new Map((workers ?? []).map((worker) => [worker.id, worker.name]));
  }, [workers]);

  const assignmentOptions = useMemo(() => {
    const options = buildExpenseAssignmentOptions({
        projects,
        buildings: projectBuildings,
        projectWideLabel: t.projectGlobalCost,
      });

    if (scopedProjectId == null) {
      return options;
    }

    const projectPrefix = `project:${scopedProjectId}`;
    const scopedBuildingIds = new Set(
      (projectBuildings ?? [])
        .filter((building) => building.projectId === scopedProjectId)
        .map((building) => `building:${building.projectId}:${building.id}`),
    );
    return options
      .map((group) => ({
        ...group,
        options: group.options.filter(
          (option) => option.value === projectPrefix || scopedBuildingIds.has(option.value),
        ),
      }))
      .filter((group) => group.options.length > 0);
  }, [projectBuildings, projects, scopedProjectId, t.projectGlobalCost]);

  useEffect(() => {
    if (scopedProjectId == null) {
      return;
    }

    const currentAssignment = parseExpenseAssignmentKey(form.getFieldValue("assignmentKey"), projectBuildings);
    if (currentAssignment.projectId !== scopedProjectId) {
      form.setFieldValue("assignmentKey", `project:${scopedProjectId}`);
      form.setFieldValue("productId", undefined);
    }
  }, [form, projectBuildings, scopedProjectId]);

  useEffect(() => {
    if (expenseType !== "products") {
      form.setFieldsValue({ supplierId: undefined, productId: undefined });
      return;
    }

    if (supplierId == null) {
      form.setFieldValue("productId", undefined);
      return;
    }

    const currentProductId = form.getFieldValue("productId");
    if (supplierProducts.length === 1 && currentProductId !== supplierProducts[0].id) {
      form.setFieldValue("productId", supplierProducts[0].id);
      return;
    }

    if (supplierProducts.length !== 1 && !supplierProducts.some((product) => product.id === currentProductId)) {
      form.setFieldValue("productId", undefined);
    }
  }, [expenseType, form, supplierId, supplierProducts]);

  useEffect(() => {
    if (expenseType !== "labor") {
      form.setFieldValue("laborWorkerId", undefined);
    }
  }, [expenseType, form]);

  const saveMutation = useMutation({
    mutationFn: async (values: InvoiceFormValues) => {
      const assignment = parseExpenseAssignmentKey(values.assignmentKey, projectBuildings);
      const paidAmountUsd = Number(values.paidAmountUsd || 0);
      const remainingAmountUsd = Number(values.remainingAmountUsd || 0);
      const paidAmountIqd = Number(values.paidAmountIqd || 0);
      const remainingAmountIqd = Number(values.remainingAmountIqd || 0);
      const totalAmountUsd = paidAmountUsd + remainingAmountUsd;
      const totalAmountIqd = paidAmountIqd + remainingAmountIqd;
      const laborWorkerName =
        values.expenseType === "labor" && values.laborWorkerId != null
          ? workerNameById.get(values.laborWorkerId) ?? null
          : null;
      const generatedTitle = buildGeneratedExpenseTitle({
        assignment,
        buildings: projectBuildings ?? [],
        expenseType: values.expenseType,
        fallbackInvoice: invoice,
        projects: projects ?? [],
        t,
      });
      let nextImagePath = storedImagePath;
      let uploadedPath: string | null = null;
      const previousImagePath = invoice?.image_path ?? null;

      if (selectedImageFile) {
        const uploaded = await uploadInvoiceImage(
          selectedImageFile,
          generatedTitle,
          assignment.projectId,
        );
        uploadedPath = uploaded.path;
        nextImagePath = uploaded.path;
      }

      const payload = {
        number: generatedTitle,
        expenseType: values.expenseType,
        laborWorkerId: values.expenseType === "labor" ? values.laborWorkerId ?? null : null,
        laborPersonName: laborWorkerName,
        supplierId: values.expenseType === "products" ? values.supplierId ?? null : null,
        projectId: assignment.projectId,
        buildingId: assignment.buildingId,
        productId: values.expenseType === "products" ? values.productId ?? null : null,
        totalAmountUsd,
        paidAmountUsd,
        totalAmountIqd,
        paidAmountIqd,
        status: "unpaid" as InvoiceStatus,
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
        queryClient.invalidateQueries({ queryKey: erpKeys.workers }),
        queryClient.invalidateQueries({ queryKey: erpKeys.workerTransactionsList }),
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
          expenseType: asExpenseType(invoice?.expense_type),
          laborWorkerId: invoice?.labor_worker_id ?? undefined,
          supplierId: invoice?.supplier_id ?? undefined,
          assignmentKey:
            scopedProjectId != null && !invoice
              ? `project:${scopedProjectId}`
              : expenseAssignmentKeyFromRecord(invoice?.project_id, invoice?.building_id),
          productId: invoice?.product_id ?? undefined,
          paidAmountUsd: invoice?.paid_amount_usd ?? (asCurrency(invoice?.currency) === "USD" ? invoice?.paid_amount ?? 0 : 0),
          remainingAmountUsd:
            invoice?.remaining_amount_usd ??
            (asCurrency(invoice?.currency) === "USD" ? invoice?.remaining_amount ?? undefined : undefined),
          paidAmountIqd: invoice?.paid_amount_iqd ?? (asCurrency(invoice?.currency) === "IQD" ? invoice?.paid_amount ?? 0 : 0),
          remainingAmountIqd:
            invoice?.remaining_amount_iqd ??
            (asCurrency(invoice?.currency) === "IQD" ? invoice?.remaining_amount ?? undefined : undefined),
          invoiceDate: formatDateInput(invoice?.invoice_date) || new Date().toISOString().slice(0, 10),
          dueDate: formatDateInput(invoice?.due_date),
          notes: invoice?.notes ?? "",
        }}
        onFinish={(values) => saveMutation.mutate(values)}
      >
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="expenseType" label={t.expenseType} rules={[{ required: true, message: t.requiredField }]}>
              <Select
                options={EXPENSE_TYPES.map((value) => ({ label: expenseTypeLabel(value, t), value }))}
                onChange={() => form.setFieldsValue({ laborWorkerId: undefined, supplierId: undefined, productId: undefined })}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="assignmentKey" label={t.invoiceAssignment} rules={[{ required: true, message: t.requiredField }]}>
              <Select
                showSearch
                optionFilterProp="label"
                placeholder={t.noneOption}
                onChange={() => form.setFieldValue("productId", undefined)}
                options={assignmentOptions}
              />
            </Form.Item>
          </Col>
          {expenseType === "labor" ? (
            <Col xs={24} md={12}>
              <Form.Item
                name="laborWorkerId"
                label={t.laborPersonName}
                rules={[{ required: true, message: t.requiredField }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder={t.noneOption}
                  options={workers?.map((worker) => ({ label: worker.name, value: worker.id }))}
                />
              </Form.Item>
            </Col>
          ) : null}
          {expenseType === "products" ? (
            <Col xs={24} md={12}>
              <Form.Item name="supplierId" label={t.supplierOption} rules={[{ required: true, message: t.requiredField }]}>
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder={t.noneOption}
                  onChange={() => form.setFieldValue("productId", undefined)}
                  options={suppliers?.map((supplier) => ({ label: supplier.name, value: supplier.id }))}
                />
              </Form.Item>
            </Col>
          ) : null}
          {showProductField ? (
            <Col xs={24} md={12}>
              <Form.Item name="productId" label={t.materialOption} rules={[{ required: true, message: t.requiredField }]}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder={t.noneOption}
                  options={supplierProducts.map((product) => ({
                    label: product.buildingName ? `${product.name} - ${product.buildingName}` : product.name,
                    value: product.id,
                  }))}
                />
              </Form.Item>
            </Col>
          ) : null}
          <Col xs={12} md={12}>
            <Form.Item name="paidAmountUsd" label={`${t.paidAmount} ${formatCurrencyLabel("USD")}`}>
              <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={12} md={12}>
            <Form.Item name="remainingAmountUsd" label={`${t.remaining_label} ${formatCurrencyLabel("USD")}`}>
              <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={12} md={12}>
            <Form.Item name="paidAmountIqd" label={`${t.paidAmount} IQD`}>
              <InputNumber min={0} step={1} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={12} md={12}>
            <Form.Item name="remainingAmountIqd" label={`${t.remaining_label} IQD`}>
              <InputNumber min={0} step={1} style={{ width: "100%" }} />
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
  const { selectedProjectId: scopedProjectId } = useProjectScope();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRow | undefined>();
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
  const [searchInput, setSearchInput] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [visualizationProjectId, setVisualizationProjectId] = useState<number | null>(null);
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState<Currency | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [imageUrlsByPath, setImageUrlsByPath] = useState(new Map<string, string>());
  const search = useDeferredValue(searchInput.trim());
  const effectiveProjectFilter = scopedProjectId == null ? projectFilter : String(scopedProjectId);

  const { data: projects } = useQuery({ queryKey: erpKeys.projects, queryFn: listProjects });
  const { data: suppliers } = useQuery({ queryKey: erpKeys.suppliers, queryFn: listSuppliers });
  const allInvoicesQuery = useQuery({ queryKey: erpKeys.invoices, queryFn: listInvoices });

  useEffect(() => {
    if (!projects?.length) {
      setVisualizationProjectId(null);
      return;
    }

    if (scopedProjectId != null) {
      setVisualizationProjectId(scopedProjectId);
      return;
    }

    if (visualizationProjectId == null || !projects.some((project) => project.id === visualizationProjectId)) {
      setVisualizationProjectId(projects[0].id);
    }
  }, [projects, scopedProjectId, visualizationProjectId]);

  const selectedVisualizationProjectId = visualizationProjectId;
  const visualizationBuildingsQuery = useQuery({
    queryKey: erpKeys.projectBuildings(selectedVisualizationProjectId ?? 0),
    queryFn: () => listProjectBuildings(selectedVisualizationProjectId ?? undefined),
    enabled: selectedVisualizationProjectId != null,
  });

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
        projectId: effectiveProjectFilter,
        supplierId: supplierFilter,
        currency: currencyFilter,
        dateFrom,
        dateTo,
      }),
      "replace",
    );
  }, [currencyFilter, dateFrom, dateTo, effectiveProjectFilter, search, setCurrentPage, setFilters, statusFilter, supplierFilter]);

  const deleteMutation = useMutation({
    mutationFn: (invoice: InvoiceRow) => {
      if (invoice.id == null) {
        throw new Error(t.notFound);
      }

      return deleteInvoice(invoice.id);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: erpKeys.invoices }),
        queryClient.invalidateQueries({ queryKey: erpKeys.workers }),
        queryClient.invalidateQueries({ queryKey: erpKeys.workerTransactionsList }),
        queryClient.invalidateQueries({ queryKey: erpKeys.dashboard }),
      ]);
      void tableQuery.refetch();
    },
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
      (scopedProjectId == null && projectFilter !== "all") ||
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
      title: t.expenseTitle,
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
                <Tag
                  color={
                    invoiceStatusColor[
                      asDualCurrencyInvoiceStatus(
                        invoice.status,
                        asNumber(invoice.total_amount_usd),
                        asNumber(invoice.paid_amount_usd),
                        asNumber(invoice.total_amount_iqd),
                        asNumber(invoice.paid_amount_iqd),
                      )
                    ]
                  }
                >
                  {invoiceStatusLabel(
                    asDualCurrencyInvoiceStatus(
                      invoice.status,
                      asNumber(invoice.total_amount_usd),
                      asNumber(invoice.paid_amount_usd),
                      asNumber(invoice.total_amount_iqd),
                      asNumber(invoice.paid_amount_iqd),
                    ),
                    t,
                  )}
                </Tag>
                {asRecordStatus(invoice.record_status) === "deleted" ? <Tag>{t.deleted}</Tag> : null}
              </Space>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {[
                  expenseTypeLabel(asExpenseType(invoice.expense_type), t),
                  invoice.labor_worker_name ?? invoice.labor_person_name,
                  invoice.supplier_name,
                  invoice.project_name,
                  invoice.product_name,
                ].filter(Boolean).join(" | ") ||
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
      dataIndex: "total_amount_usd",
      align: "right",
      render: (_value: number | null, invoice) =>
        formatCurrencyPair({ usd: invoice.total_amount_usd, iqd: invoice.total_amount_iqd }),
    },
    {
      title: t.remaining_label,
      dataIndex: "remaining_amount_usd",
      align: "right",
      render: (_value: number | null, invoice) =>
        formatCurrencyPair({ usd: invoice.remaining_amount_usd, iqd: invoice.remaining_amount_iqd }),
    },
    { title: t.invoiceDate, dataIndex: "invoice_date", render: (value: string | null) => formatDate(value) },
    {
      title: "",
      key: "actions",
      align: "right",
      width: 144,
      render: (_, invoice) => (
        <FinanceRowActions
          active={invoice.id != null && asRecordStatus(invoice.record_status) === "active"}
          cancelLabel={t.cancel}
          deleteLoading={deleteMutation.isPending}
          deleteTitle={t.deleteInvoiceConfirm}
          detailHref={invoice.id != null ? `/expenses/${invoice.id}` : undefined}
          removeLabel={t.remove}
          onDelete={() => deleteMutation.mutate(invoice)}
          onEdit={() => {
            setSelectedInvoice(invoice);
            setOpen(true);
          }}
        />
      ),
    },
  ];

  function exportInvoices(format: "csv" | "xlsx") {
    const fileBase = t.invoicesTitle;
    const exportRows = rows.map((invoice) => ({
      [t.expenseTitle]: invoice.number ?? "",
      [t.expenseType]: expenseTypeLabel(asExpenseType(invoice.expense_type), t),
      [t.laborPersonName]: invoice.labor_worker_name ?? invoice.labor_person_name ?? "",
      [t.status]: invoiceStatusLabel(
        asDualCurrencyInvoiceStatus(
          invoice.status,
          asNumber(invoice.total_amount_usd),
          asNumber(invoice.paid_amount_usd),
          asNumber(invoice.total_amount_iqd),
          asNumber(invoice.paid_amount_iqd),
        ),
        t,
      ),
      [t.invoiceAssignment]: invoice.building_name ? t.projectBuildingCost : t.projectGlobalCost,
      [t.buildingLabel]: invoice.building_name ?? "",
      [t.supplierOption]: invoice.supplier_name ?? "",
      [t.products]: invoice.product_name ?? "",
      [t.projectOption]: invoice.project_name ?? "",
      [t.createdBy]: invoice.created_by_name ?? "",
      [`${t.totalAmount} ${formatCurrencyLabel("USD")}`]: asNumber(invoice.total_amount_usd),
      [`${t.paidAmount} ${formatCurrencyLabel("USD")}`]: asNumber(invoice.paid_amount_usd),
      [`${t.remaining_label} ${formatCurrencyLabel("USD")}`]: asNumber(invoice.remaining_amount_usd),
      [`${t.totalAmount} IQD`]: asNumber(invoice.total_amount_iqd),
      [`${t.paidAmount} IQD`]: asNumber(invoice.paid_amount_iqd),
      [`${t.remaining_label} IQD`]: asNumber(invoice.remaining_amount_iqd),
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
      <FinancePageHeader
        addLabel={t.addInvoice}
        countText={t.expense_count(tableQuery.data?.total ?? 0)}
        excelLabel={t.excel}
        rowsLength={rows.length}
        title={t.invoicesTitle}
        onAdd={() => {
          setSelectedInvoice(undefined);
          setOpen(true);
        }}
        onExportCsv={() => exportInvoices("csv")}
        onExportExcel={() => exportInvoices("xlsx")}
      />

      {allInvoicesQuery.isError || visualizationBuildingsQuery.isError ? (
        <Alert
          showIcon
          type="error"
          message={t.invoicesTitle}
          description={toErrorMessage(allInvoicesQuery.error ?? visualizationBuildingsQuery.error)}
          action={
            <Button
              onClick={() => {
                void allInvoicesQuery.refetch();
                void visualizationBuildingsQuery.refetch();
              }}
            >
              {t.retry}
            </Button>
          }
        />
      ) : null}

      <ProjectExpenseVisualization
        buildings={visualizationBuildingsQuery.data}
        invoices={allInvoicesQuery.data}
        loading={allInvoicesQuery.isLoading || visualizationBuildingsQuery.isLoading}
        projects={projects}
        projectLocked={scopedProjectId != null}
        selectedProjectId={selectedVisualizationProjectId}
        onProjectChange={setVisualizationProjectId}
      />

      <FinanceFilters<InvoiceStatus>
        allCurrenciesLabel={t.allCurrencies}
        allProjectsLabel={t.allProjects}
        allStatusesLabel={t.allStatuses}
        allSuppliersLabel={t.allSuppliers}
        clearLabel={t.clearFilters}
        currencyValue={currencyFilter}
        dateFrom={dateFrom}
        dateTo={dateTo}
        hasFilters={hasFilters}
        projectDisabled={scopedProjectId != null}
        projectValue={effectiveProjectFilter}
        projects={projects}
        searchPlaceholder={`${t.search} ${t.expenses.toLowerCase()}`}
        searchValue={searchInput}
        statusOptions={[
          { label: t.unpaidFilter, value: "unpaid" },
          { label: t.partialFilter, value: "partial" },
          { label: t.paidFilter, value: "paid" },
        ]}
        statusValue={statusFilter}
        suppliers={suppliers}
        supplierValue={supplierFilter}
        onClear={() => {
          setSearchInput("");
          setStatusFilter("all");
          setProjectFilter(scopedProjectId == null ? "all" : String(scopedProjectId));
          setSupplierFilter("all");
          setCurrencyFilter("all");
          setDateFrom("");
          setDateTo("");
        }}
        onCurrencyChange={setCurrencyFilter}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onProjectChange={setProjectFilter}
        onSearchChange={setSearchInput}
        onStatusChange={setStatusFilter}
        onSupplierChange={setSupplierFilter}
      />

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
        pagination={standardPagination(tableProps.pagination, (total) => `${total} ${t.expenses.toLowerCase()}`)}
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

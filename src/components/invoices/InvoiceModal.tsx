import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { App, Button, Col, Form, Image as AntImage, Input, InputNumber, Modal, Row, Select, Space, Typography, Upload } from "antd";
import { Image as ImageIcon } from "lucide-react";
import { createInvoice, erpKeys, listProductsBySupplierIds, updateInvoice, type InvoiceStatus } from "@/lib/erp";
import {
  buildExpenseAssignmentOptions,
  buildingExpenseAssignmentKey,
  expenseAssignmentKeyFromRecord,
  formatExpenseAssignmentLabel,
  parseExpenseAssignmentKey,
  type ExpenseAssignment,
} from "@/lib/expense-assignment";
import { EXPENSE_TYPES, asExpenseType, type ExpenseType } from "@/lib/expense-types";
import { currencyInputProps, formatCurrencyLabel, formatDateInput } from "@/lib/format";
import { asCurrency, toErrorMessage } from "@/lib/refine-helpers";
import { useLang } from "@/lib/i18n";
import { useProjectScope } from "@/lib/project-scope";
import { useErpInvalidation } from "@/hooks/use-erp-invalidation";
import { useProducts } from "@/hooks/use-products";
import { useProjectBuildings, useProjects } from "@/hooks/use-projects";
import { useSuppliers } from "@/hooks/use-suppliers";
import { useWorkers } from "@/hooks/use-workers";
import { createSignedInvoiceImageUrl, deleteInvoiceImageByUrl, uploadInvoiceImage } from "@/lib/supabase";
import { ModalTitle } from "@/components/ModalTitle";
import { expenseTypeLabel, type InvoiceFormValues, type InvoiceRow } from "@/components/invoices/invoice-shared";

function buildGeneratedExpenseTitle({
  assignment,
  buildings,
  detailName,
  expenseType,
  fallbackInvoice,
  projects,
  t,
}: {
  assignment: { projectId: number | null; buildingId: number | null };
  buildings: Array<{ id: number; name: string; projectId: number }>;
  detailName?: string | null;
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

  return [projectName, buildingName, expenseTypeLabel(expenseType, t), detailName].filter(Boolean).join(" - ");
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

export function InvoiceModal({
  headerExtra,
  invoice,
  initialAssignment,
  onClose,
  onSaved,
}: {
  headerExtra?: ReactNode;
  invoice?: InvoiceRow;
  initialAssignment?: ExpenseAssignment;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLang();
  const { selectedProjectId: scopedProjectId } = useProjectScope();
  const { message } = App.useApp();
  const erpInvalidation = useErpInvalidation();
  const [form] = Form.useForm<InvoiceFormValues>();
  const expenseType = Form.useWatch("expenseType", form) ?? "products";
  const assignmentKey = Form.useWatch("assignmentKey", form);
  const supplierId = Form.useWatch("supplierId", form);
  const [storedImagePath, setStoredImagePath] = useState<string | null>(invoice?.image_path ?? null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

  const { data: suppliers } = useSuppliers();
  const { data: projects } = useProjects();
  const { data: products } = useProducts();
  const { data: workers } = useWorkers();
  const { data: productsBySupplier = {} } = useQuery({
    queryKey: supplierId == null ? [...erpKeys.supplierProductsList, "none"] : erpKeys.supplierProducts(supplierId),
    queryFn: () => listProductsBySupplierIds(supplierId == null ? [] : [supplierId]),
    enabled: supplierId != null,
  });
  const { data: projectBuildings } = useProjectBuildings();
  const initialAssignmentKey =
    invoice == null && initialAssignment?.projectId != null && initialAssignment.buildingId != null
      ? buildingExpenseAssignmentKey(initialAssignment.buildingId, initialAssignment.projectId)
      : undefined;
  const effectiveAssignmentKey =
    assignmentKey ?? (invoice ? expenseAssignmentKeyFromRecord(invoice.project_id, invoice.building_id) : initialAssignmentKey);
  const assignmentLocked = initialAssignmentKey != null;
  const selectedAssignment = parseExpenseAssignmentKey(effectiveAssignmentKey, projectBuildings);
  const selectedProjectId = selectedAssignment.projectId ?? undefined;
  const lockedAssignmentLabel = assignmentLocked
    ? formatExpenseAssignmentLabel({
        assignment: selectedAssignment,
        buildings: projectBuildings ?? [],
        buildingFallback: t.buildingLabel,
        projects: projects ?? [],
        projectFallback: t.projectOption,
        projectWideLabel: t.projectGlobalCost,
      })
    : scopedProjectId == null
      ? null
      : projects?.find((project) => project.id === scopedProjectId)?.name ?? null;

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

    const linkedProducts = productsBySupplier[supplierId] ?? [];
    const linkedProductIds = new Set(linkedProducts.map((product) => product.id));
    return projectProducts.filter((product) => linkedProductIds.has(product.id));
  }, [productsBySupplier, projectProducts, supplierId]);
  const showProductField = expenseType === "products" && supplierId != null && supplierProducts.length > 1;
  const workerNameById = useMemo(() => {
    return new Map((workers ?? []).map((worker) => [worker.id, worker.name]));
  }, [workers]);
  const productNameById = useMemo(() => {
    return new Map((products ?? []).map((product) => [product.id, product.name]));
  }, [products]);

  const assignmentOptions = useMemo(() => {
    const options = buildExpenseAssignmentOptions({
        projects,
        buildings: projectBuildings,
        includeProjectWide: false,
        projectWideLabel: t.projectGlobalCost,
      });

    if (scopedProjectId == null) {
      return options;
    }

    const scopedBuildingIds = new Set(
      (projectBuildings ?? [])
        .filter((building) => building.projectId === scopedProjectId)
        .map((building) => `building:${building.projectId}:${building.id}`),
    );
    return options
      .map((group) => ({
        ...group,
        options: group.options.filter(
          (option) => scopedBuildingIds.has(option.value),
        ),
      }))
      .filter((group) => group.options.length > 0);
  }, [projectBuildings, projects, scopedProjectId, t.projectGlobalCost]);

  useEffect(() => {
    if (scopedProjectId == null) {
      return;
    }

    const currentAssignment = parseExpenseAssignmentKey(form.getFieldValue("assignmentKey"), projectBuildings);
    if (currentAssignment.projectId !== scopedProjectId || currentAssignment.buildingId == null) {
      const firstBuilding = projectBuildings?.find((building) => building.projectId === scopedProjectId);
      form.setFieldValue("assignmentKey", buildingExpenseAssignmentKey(firstBuilding?.id, scopedProjectId));
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
      const assignment = parseExpenseAssignmentKey(values.assignmentKey ?? initialAssignmentKey, projectBuildings);
      if (assignment.projectId == null || assignment.buildingId == null) {
        throw new Error(`${t.invoiceAssignment}: ${t.requiredField}`);
      }

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
      const effectiveProductId =
        values.expenseType === "products"
          ? values.productId ?? (supplierProducts.length === 1 ? supplierProducts[0].id : undefined)
          : undefined;
      const productName =
        values.expenseType === "products" && effectiveProductId != null
          ? productNameById.get(effectiveProductId) ?? null
          : null;
      const generatedTitle = buildGeneratedExpenseTitle({
        assignment,
        buildings: projectBuildings ?? [],
        detailName: values.expenseType === "labor" ? laborWorkerName : productName,
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
        productId: values.expenseType === "products" ? effectiveProductId ?? null : null,
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
      await erpInvalidation.invoices();
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
      title={<ModalTitle title={invoice ? t.editInvoice : t.newInvoice} lockedLabel={lockedAssignmentLabel} />}
      okText={invoice ? t.save : t.create}
      cancelText={t.cancel}
      confirmLoading={saveMutation.isPending}
      onCancel={onClose}
      onOk={() => form.submit()}
    >
      {headerExtra ? <div style={{ marginBottom: 16 }}>{headerExtra}</div> : null}
      <Form<InvoiceFormValues>
        form={form}
        layout="vertical"
        initialValues={{
          expenseType: asExpenseType(invoice?.expense_type),
          laborWorkerId: invoice?.labor_worker_id ?? undefined,
          supplierId: invoice?.supplier_id ?? undefined,
          assignmentKey:
            invoice ? expenseAssignmentKeyFromRecord(invoice.project_id, invoice.building_id) : initialAssignmentKey,
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
          {assignmentLocked ? null : (
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
          )}
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
              <InputNumber min={0} step={0.01} style={{ width: "100%" }} {...currencyInputProps("USD")} />
            </Form.Item>
          </Col>
          <Col xs={12} md={12}>
            <Form.Item name="remainingAmountUsd" label={`${t.remaining_label} ${formatCurrencyLabel("USD")}`}>
              <InputNumber min={0} step={0.01} style={{ width: "100%" }} {...currencyInputProps("USD")} />
            </Form.Item>
          </Col>
          <Col xs={12} md={12}>
            <Form.Item name="paidAmountIqd" label={`${t.paidAmount} IQD`}>
              <InputNumber min={0} step={0.01} style={{ width: "100%" }} {...currencyInputProps("IQD")} />
            </Form.Item>
          </Col>
          <Col xs={12} md={12}>
            <Form.Item name="remainingAmountIqd" label={`${t.remaining_label} IQD`}>
              <InputNumber min={0} step={0.01} style={{ width: "100%" }} {...currencyInputProps("IQD")} />
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

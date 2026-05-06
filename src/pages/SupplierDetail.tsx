import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { ArrowLeft, FileText, Package2, Pencil, Plus, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import {
  App,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import AccountFlowChart from "@/components/finance/AccountFlowChart";
import { ModalTitle } from "@/components/ModalTitle";
import { invoiceStatusColor, invoiceStatusLabel } from "@/components/invoices/invoice-shared";
import { ProductModal } from "@/components/products/ProductModal";
import type { ProductRow } from "@/components/products/product-shared";
import {
  createSupplierTransaction,
  deleteProduct,
  deleteSupplier,
  deleteSupplierTransaction,
  erpKeys,
  getAppSettings,
  getSupplier,
  listProducts,
  listProjectBuildings,
  listInvoices,
  listProjects,
  listSupplierTransactions,
  updateSupplierTransaction,
  updateSupplier,
  updateSupplierProducts,
  type Currency,
  type Product,
  type SupplierTransaction,
} from "@/lib/erp";
import { currencyInputProps, formatCurrencyLabel, formatCurrencyPair, formatDate } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { useProjectScope } from "@/lib/project-scope";
import { toErrorMessage } from "@/lib/refine-helpers";
import { useErpInvalidation } from "@/hooks/use-erp-invalidation";

type SupplierFormValues = {
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
  productIds?: number[];
};

type TransactionFormValues = {
  currency?: Currency;
  totalAmountUsd?: number;
  paidAmountUsd?: number;
  totalAmountIqd?: number;
  paidAmountIqd?: number;
  description?: string;
  date?: string;
  projectId?: number;
  buildingId?: number;
};

function getInitialTransactionCurrency(transaction?: SupplierTransaction): Currency {
  if (!transaction) {
    return "IQD";
  }

  const hasUsdAmount = transaction.totalAmountUsd > 0 || transaction.paidAmountUsd > 0;
  const hasIqdAmount = transaction.totalAmountIqd > 0 || transaction.paidAmountIqd > 0;

  if (transaction.currency === "USD" && hasUsdAmount) {
    return "USD";
  }

  if (transaction.currency === "IQD" && hasIqdAmount) {
    return "IQD";
  }

  if (hasIqdAmount) {
    return "IQD";
  }

  return hasUsdAmount ? "USD" : "IQD";
}

function sameIds(left: number[], right: number[]) {
  if (left.length !== right.length) {
    return false;
  }

  const sortedLeft = [...left].sort((a, b) => a - b);
  const sortedRight = [...right].sort((a, b) => a - b);
  return sortedLeft.every((id, index) => id === sortedRight[index]);
}

function productOptionLabel(product: Product) {
  return [product.name, product.unit, formatCurrencyPair({ usd: product.unitPriceUsd, iqd: product.unitPriceIqd }, { hideZero: true })]
    .filter(Boolean)
    .join(" | ");
}

function toProductRow(product: Product): ProductRow {
  return {
    id: product.id,
    name: product.name,
    supplier_id: product.supplierId,
    supplier_name: product.supplierName,
    supplier_ids: product.supplierIds,
    supplier_names: product.supplierNames,
    project_id: product.projectId,
    project_name: product.projectName,
    building_id: product.buildingId,
    building_name: product.buildingName,
    unit: product.unit,
    unit_price: product.unitPrice,
    currency: product.currency,
    unit_price_usd: product.unitPriceUsd,
    unit_price_iqd: product.unitPriceIqd,
    created_at: product.createdAt,
  };
}

function SupplierFormModal({
  supplier,
  onClose,
}: {
  supplier: {
    id: number;
    name: string;
    contact: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
  };
  onClose: () => void;
}) {
  const { t } = useLang();
  const { message } = App.useApp();
  const erpInvalidation = useErpInvalidation();
  const [form] = Form.useForm<SupplierFormValues>();
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: erpKeys.products,
    queryFn: listProducts,
  });
  const supplierProducts = useMemo(
    () => products.filter((product) => product.supplierIds.includes(supplier.id)),
    [products, supplier.id],
  );
  const selectableProducts = products;

  useEffect(() => {
    form.setFieldValue(
      "productIds",
      supplierProducts.map((product) => product.id),
    );
  }, [form, supplierProducts]);

  const saveMutation = useMutation({
    mutationFn: async (values: SupplierFormValues) => {
      const payload = {
        name: values.name.trim(),
        contact: values.contact?.trim() || null,
        phone: values.phone?.trim() || null,
        email: values.email?.trim() || null,
        address: values.address?.trim() || null,
      };

      await updateSupplier(supplier.id, payload);
      await updateSupplierProducts(supplier.id, values.productIds ?? []);
    },
    onSuccess: async () => {
      await erpInvalidation.supplierDetail(supplier.id);
      message.success(t.saved);
      onClose();
    },
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  return (
    <Modal
      open
      title={t.editSupplier}
      okText={t.save}
      cancelText={t.cancel}
      confirmLoading={saveMutation.isPending}
      onCancel={onClose}
      onOk={() => form.submit()}
    >
      <Form<SupplierFormValues>
        form={form}
        layout="vertical"
        initialValues={{
          name: supplier.name,
          contact: supplier.contact ?? "",
          phone: supplier.phone ?? "",
          email: supplier.email ?? "",
          address: supplier.address ?? "",
        }}
        onFinish={(values) => saveMutation.mutate(values)}
      >
        <Form.Item name="name" label={t.name} rules={[{ required: true, message: t.nameRequired }]}>
          <Input placeholder={t.namePlaceholder} />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="contact" label={t.contact}>
              <Input placeholder={t.contactPlaceholder} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="phone" label={t.phoneSup}>
              <Input placeholder={t.phonePlaceholder} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="email" label={t.email}>
              <Input type="email" placeholder={t.emailPlaceholder} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="address" label={t.address}>
              <Input placeholder={t.addressPlaceholder} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="productIds" label={t.products}>
          <Select
            allowClear
            mode="multiple"
            loading={productsLoading}
            optionFilterProp="label"
            placeholder={selectableProducts.length ? t.products : t.noProducts}
            showSearch
            options={selectableProducts.map((product) => ({
              label: productOptionLabel(product),
              value: product.id,
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function SupplierTransactionModal({
  supplier,
  transaction,
  onClose,
}: {
  supplier: { id: number; name: string };
  transaction?: SupplierTransaction;
  onClose: () => void;
}) {
  const { t } = useLang();
  const { selectedProjectId: scopedProjectId } = useProjectScope();
  const { message } = App.useApp();
  const erpInvalidation = useErpInvalidation();
  const [form] = Form.useForm<TransactionFormValues>();
  const selectedProjectId = Form.useWatch("projectId", form);
  const initialCurrency = getInitialTransactionCurrency(transaction);
  const selectedCurrency = Form.useWatch("currency", form) ?? initialCurrency;
  const { data: projects } = useQuery({ queryKey: erpKeys.projects, queryFn: listProjects });
  const lockedProjectLabel = scopedProjectId == null
    ? null
    : projects?.find((project) => project.id === scopedProjectId)?.name ?? null;
  const { data: projectBuildings } = useQuery({
    queryKey: erpKeys.projectBuildings(0),
    queryFn: () => listProjectBuildings(),
  });
  const { data: appSettings } = useQuery({ queryKey: erpKeys.appSettings, queryFn: getAppSettings });
  const effectiveProjectId = scopedProjectId ?? selectedProjectId;
  const buildingOptions = useMemo(
    () => (projectBuildings ?? []).filter((building) => building.projectId === effectiveProjectId),
    [effectiveProjectId, projectBuildings],
  );

  const saveMutation = useMutation({
    mutationFn: (values: TransactionFormValues) => {
      const currency = values.currency ?? initialCurrency;
      const payload = {
        supplierId: supplier.id,
        totalAmountUsd: currency === "USD" ? Number(values.totalAmountUsd || 0) : 0,
        paidAmountUsd: currency === "USD" ? Number(values.paidAmountUsd || 0) : 0,
        totalAmountIqd: currency === "IQD" ? Number(values.totalAmountIqd || 0) : 0,
        paidAmountIqd: currency === "IQD" ? Number(values.paidAmountIqd || 0) : 0,
        description: values.description?.trim() || null,
        date: values.date || null,
        projectId: scopedProjectId ?? values.projectId ?? null,
        buildingId: values.buildingId ?? null,
      };

      return transaction ? updateSupplierTransaction(transaction.id, payload) : createSupplierTransaction(payload);
    },
    onSuccess: async () => {
      await erpInvalidation.supplierDetail(supplier.id);
      onClose();
    },
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  const validateAmountPair = () => {
    const values = form.getFieldsValue(["totalAmountUsd", "paidAmountUsd", "totalAmountIqd", "paidAmountIqd"]);
    const amount = selectedCurrency === "USD"
      ? Number(values.totalAmountUsd || 0) + Number(values.paidAmountUsd || 0)
      : Number(values.totalAmountIqd || 0) + Number(values.paidAmountIqd || 0);

    return amount > 0
      ? Promise.resolve()
      : Promise.reject(new Error(t.requiredField));
  };

  useEffect(() => {
    const currentBuildingId = form.getFieldValue("buildingId");

    if (effectiveProjectId == null) {
      if (currentBuildingId != null) {
        form.setFieldValue("buildingId", undefined);
      }
      return;
    }

    if (currentBuildingId != null && buildingOptions.some((building) => building.id === currentBuildingId)) {
      return;
    }

    form.setFieldValue("buildingId", buildingOptions.length === 1 ? buildingOptions[0].id : undefined);
  }, [buildingOptions, effectiveProjectId, form]);

  return (
    <Modal
      open
      title={<ModalTitle title={transaction ? t.editTransaction : t.newTransaction} lockedLabel={lockedProjectLabel} />}
      okText={transaction ? t.save : t.create}
      cancelText={t.cancel}
      confirmLoading={saveMutation.isPending}
      onCancel={onClose}
      onOk={() => form.submit()}
    >
      <Form<TransactionFormValues>
        form={form}
        layout="vertical"
        initialValues={{
          currency: initialCurrency,
          totalAmountUsd: transaction?.totalAmountUsd ?? 0,
          paidAmountUsd: transaction?.paidAmountUsd ?? 0,
          totalAmountIqd: transaction?.totalAmountIqd ?? 0,
          paidAmountIqd: transaction?.paidAmountIqd ?? 0,
          description: transaction?.description ?? undefined,
          date: transaction?.date ?? new Date().toISOString().slice(0, 10),
          projectId: scopedProjectId ?? transaction?.projectId ?? undefined,
          buildingId: transaction?.buildingId ?? undefined,
        }}
        onFinish={(values) => saveMutation.mutate(values)}
      >
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="currency" label={t.currency} rules={[{ required: true, message: t.requiredField }]}>
              <Select
                options={[
                  { label: "IQD", value: "IQD" },
                  { label: "USD", value: "USD" },
                ]}
              />
            </Form.Item>
          </Col>
          {selectedCurrency === "USD" ? (
            <>
              <Col xs={24} md={12}>
                <Form.Item name="totalAmountUsd" label={`${t.totalAmount} ${formatCurrencyLabel("USD")}`} rules={[{ validator: validateAmountPair }]}>
                  <InputNumber
                    min={appSettings?.transactionAmountMinUsd ?? 0}
                    max={appSettings?.transactionAmountMaxUsd ?? undefined}
                    step={0.01}
                    style={{ width: "100%" }}
                    {...currencyInputProps("USD")}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="paidAmountUsd" label={`${t.paidAmount} ${formatCurrencyLabel("USD")}`} rules={[{ validator: validateAmountPair }]}>
                  <InputNumber
                    min={appSettings?.transactionAmountMinUsd ?? 0}
                    max={appSettings?.transactionAmountMaxUsd ?? undefined}
                    step={0.01}
                    style={{ width: "100%" }}
                    {...currencyInputProps("USD")}
                  />
                </Form.Item>
              </Col>
            </>
          ) : (
            <>
              <Col xs={24} md={12}>
                <Form.Item name="totalAmountIqd" label={`${t.totalAmount} IQD`} rules={[{ validator: validateAmountPair }]}>
                  <InputNumber
                    min={appSettings?.transactionAmountMinIqd ?? 0}
                    max={appSettings?.transactionAmountMaxIqd ?? undefined}
                    step={0.01}
                    style={{ width: "100%" }}
                    {...currencyInputProps("IQD")}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="paidAmountIqd" label={`${t.paidAmount} IQD`} rules={[{ validator: validateAmountPair }]}>
                  <InputNumber
                    min={appSettings?.transactionAmountMinIqd ?? 0}
                    max={appSettings?.transactionAmountMaxIqd ?? undefined}
                    step={0.01}
                    style={{ width: "100%" }}
                    {...currencyInputProps("IQD")}
                  />
                </Form.Item>
              </Col>
            </>
          )}
          {scopedProjectId == null ? (
            <Col xs={24} md={12}>
              <Form.Item name="projectId" label={t.txProject} rules={[{ required: true, message: t.requiredField }]}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder={t.noProjectOption}
                  onChange={() => form.setFieldValue("buildingId", undefined)}
                  options={projects?.map((project) => ({ label: project.name, value: project.id }))}
                />
              </Form.Item>
            </Col>
          ) : null}
          <Col xs={24} md={12}>
            <Form.Item name="buildingId" label={t.buildingLabel} rules={[{ required: true, message: t.requiredField }]}>
              <Select
                showSearch
                optionFilterProp="label"
                placeholder={t.noneOption}
                disabled={effectiveProjectId == null}
                options={buildingOptions.map((building) => ({ label: building.name, value: building.id }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="date" label={t.date} rules={[{ required: true, message: t.requiredField }]}>
              <Input type="date" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="description" label={t.description}>
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function SupplierProductsSection({ supplier }: { supplier: { id: number; name: string } }) {
  const { t } = useLang();
  const { message } = App.useApp();
  const erpInvalidation = useErpInvalidation();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [editedProduct, setEditedProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: erpKeys.products,
    queryFn: listProducts,
  });
  const supplierProducts = useMemo(
    () => products.filter((product) => product.supplierIds.includes(supplier.id)),
    [products, supplier.id],
  );
  const selectableProducts = products;
  const savedIds = useMemo(() => supplierProducts.map((product) => product.id), [supplierProducts]);
  const hasChanges = !sameIds(savedIds, selectedIds);

  useEffect(() => {
    setSelectedIds(savedIds);
  }, [savedIds]);

  const saveMutation = useMutation({
    mutationFn: () => updateSupplierProducts(supplier.id, selectedIds),
    onSuccess: async () => {
      await erpInvalidation.supplierDetail(supplier.id);
      message.success(t.saved);
    },
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  const deleteProductMutation = useMutation({
    mutationFn: (product: Product) => deleteProduct(product.id),
    onSuccess: async () => {
      await erpInvalidation.supplierDetail(supplier.id);
      message.success(t.deleted);
    },
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  return (
    <Card
      title={
        <Space>
          <Package2 size={16} />
          <span>{t.products}</span>
        </Space>
      }
      extra={
        <Space wrap>
          <Button
            type="primary"
            disabled={!hasChanges}
            loading={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {t.save}
          </Button>
          <Button
            icon={<Plus size={16} />}
            onClick={() => {
              setEditedProduct(null);
              setShowProductModal(true);
            }}
          >
            {t.addProduct}
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Select
          allowClear
          mode="multiple"
          loading={productsLoading}
          optionFilterProp="label"
          placeholder={selectableProducts.length ? t.products : t.noProducts}
          showSearch
          style={{ width: "100%" }}
          value={selectedIds}
          onChange={setSelectedIds}
          options={selectableProducts.map((product) => ({
            label: productOptionLabel(product),
            value: product.id,
          }))}
        />
        <Typography.Text type="secondary">{t.product_count(supplierProducts.length)}</Typography.Text>

        {!supplierProducts.length ? (
          <Empty description={t.noProducts} />
        ) : (
          <Space direction="vertical" size="small" style={{ width: "100%" }}>
            {supplierProducts.map((product) => (
              <Card key={product.id} size="small">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                  <div>
                    <Typography.Text strong>{product.name}</Typography.Text>
                    <div>
                      <Typography.Text type="secondary">
                        {[product.unit, product.projectName, product.buildingName].filter(Boolean).join(" | ") || t.noDetail}
                      </Typography.Text>
                    </div>
                    <Typography.Text type="secondary">
                      {t.unitPrice}:{" "}
                      {formatCurrencyPair({ usd: product.unitPriceUsd, iqd: product.unitPriceIqd }, { hideZero: true })}
                    </Typography.Text>
                  </div>
                  <Space size="small">
                    <Button
                      type="text"
                      icon={<Pencil size={16} />}
                      onClick={() => {
                        setEditedProduct(product);
                        setShowProductModal(true);
                      }}
                    />
                    <Popconfirm
                      title={t.deleteProductConfirm}
                      okText={t.remove}
                      cancelText={t.cancel}
                      onConfirm={() => deleteProductMutation.mutate(product)}
                    >
                      <Button danger type="text" icon={<Trash2 size={16} />} loading={deleteProductMutation.isPending} />
                    </Popconfirm>
                  </Space>
                </div>
              </Card>
            ))}
          </Space>
        )}
      </Space>

      {showProductModal ? (
        <ProductModal
          lockedSupplier={supplier}
          product={editedProduct ? toProductRow(editedProduct) : undefined}
          onClose={() => {
            setShowProductModal(false);
            setEditedProduct(null);
          }}
          onSaved={() => void erpInvalidation.supplierDetail(supplier.id)}
        />
      ) : null}
    </Card>
  );
}

export default function SupplierDetail() {
  const { id } = useParams<{ id: string }>();
  const supplierId = Number(id);
  const { t } = useLang();
  const { selectedProjectId: scopedProjectId } = useProjectScope();
  const { message } = App.useApp();
  const erpInvalidation = useErpInvalidation();
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<SupplierTransaction | null>(null);

  const { data: appSettings } = useQuery({
    queryKey: erpKeys.appSettings,
    queryFn: getAppSettings,
  });

  const { data: supplier, isLoading: supplierLoading } = useQuery({
    queryKey: erpKeys.supplier(supplierId),
    queryFn: () => getSupplier(supplierId),
    enabled: Number.isFinite(supplierId),
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: erpKeys.supplierTransactions(supplierId),
    queryFn: () => listSupplierTransactions(supplierId),
    enabled: Number.isFinite(supplierId),
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: erpKeys.invoices,
    queryFn: listInvoices,
  });
  const deleteMutation = useMutation({
    mutationFn: (transaction: SupplierTransaction) => deleteSupplierTransaction(transaction.id),
    onSuccess: async () => {
      await erpInvalidation.supplierDetail(supplierId);
    },
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: () => deleteSupplier(supplierId),
    onSuccess: async () => {
      message.success(t.deleted);
      window.location.href = "/suppliers";
    },
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  const supplierInvoices = useMemo(() => {
    return (invoices ?? []).filter(
      (invoice) =>
        invoice.recordStatus === "active" &&
        invoice.supplierId === supplierId &&
        (scopedProjectId == null || invoice.projectId === scopedProjectId),
    );
  }, [invoices, scopedProjectId, supplierId]);

  const visibleTransactions =
    scopedProjectId == null
      ? transactions
      : transactions?.filter((transaction) => transaction.projectId === scopedProjectId);
  const transactionRows = visibleTransactions ?? [];
  const invoicesById = new Map((invoices ?? []).map((invoice) => [invoice.id, invoice]));
  const balance = transactionRows.reduce(
    (totals, transaction) => ({
      usd: totals.usd + transaction.totalAmountUsd - transaction.paidAmountUsd,
      iqd: totals.iqd + transaction.totalAmountIqd - transaction.paidAmountIqd,
    }),
    { usd: 0, iqd: 0 },
  );
  const creditTotals = transactionRows.reduce(
    (totals, transaction) => ({
      usd: totals.usd + transaction.totalAmountUsd,
      iqd: totals.iqd + transaction.totalAmountIqd,
    }),
    { usd: 0, iqd: 0 },
  );
  const debitTotals = transactionRows.reduce(
    (totals, transaction) => ({
      usd: totals.usd + transaction.paidAmountUsd,
      iqd: totals.iqd + transaction.paidAmountIqd,
    }),
    { usd: 0, iqd: 0 },
  );
  const chartEntries = transactionRows.map((transaction) => ({
    id: transaction.id,
    date: transaction.date,
    creditUsd: transaction.totalAmountUsd,
    creditIqd: transaction.totalAmountIqd,
    debitUsd: transaction.paidAmountUsd,
    debitIqd: transaction.paidAmountIqd,
    balanceDeltaUsd: transaction.totalAmountUsd - transaction.paidAmountUsd,
    balanceDeltaIqd: transaction.totalAmountIqd - transaction.paidAmountIqd,
    transactionUsd: transaction.totalAmountUsd - transaction.paidAmountUsd,
    transactionIqd: transaction.totalAmountIqd - transaction.paidAmountIqd,
    buildingName:
      transaction.sourceInvoiceId != null
        ? invoicesById.get(transaction.sourceInvoiceId)?.buildingName ?? t.projectGlobalCost
        : transaction.buildingName ?? transaction.projectName,
  }));

  if (supplierLoading || !supplier) {
    return supplierLoading ? <Skeleton active paragraph={{ rows: 3 }} /> : <Empty description={t.notFound} />;
  }

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Row align="middle" gutter={[16, 16]} justify="space-between">
        <Col flex="none">
          <Link href="/suppliers">
            <Button icon={<ArrowLeft size={16} />} />
          </Link>
        </Col>
        <Col flex="auto">
          <Typography.Title level={2} style={{ margin: 0 }}>
            {supplier.name}
          </Typography.Title>
          <div>
            <Typography.Text type="secondary">
              {[supplier.contact, supplier.phone, supplier.email, supplier.address].filter(Boolean).join(" | ")}
            </Typography.Text>
          </div>
        </Col>
        <Col flex="none">
          <Space>
            <Button
              icon={<Pencil size={16} />}
              onClick={() => setShowSupplierModal(true)}
            >
              {t.edit}
            </Button>
            <Popconfirm
              title={t.deleteSupplierConfirm}
              okText={t.remove}
              cancelText={t.cancel}
              onConfirm={() => deleteSupplierMutation.mutate()}
            >
              <Button danger icon={<Trash2 size={16} />} loading={deleteSupplierMutation.isPending}>
                {t.remove}
              </Button>
            </Popconfirm>
          </Space>
        </Col>
        <Col>
          <div style={{ textAlign: "right" }}>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {formatCurrencyPair(balance)}
            </Typography.Title>
            <Typography.Text type="secondary">{t.remaining_label}</Typography.Text>
          </div>
        </Col>
      </Row>

      {transactionsLoading ? (
        <Skeleton active paragraph={{ rows: 2 }} />
      ) : (
        <AccountFlowChart
          amountLabel={t.amount}
          balance={balance}
          balanceLabel={t.remaining_label}
          countLabel={t.transactionsCount(transactionRows.length)}
          credit={creditTotals}
          creditLabel={t.totalAmount}
          dateLabel={t.date}
          debit={debitTotals}
          debitLabel={t.paidAmount}
          empty={!transactionRows.length}
          emptyDescription={t.noTransactions}
          entries={chartEntries}
          exchangeRateIqdPer100Usd={appSettings?.exchangeRateIqdPer100Usd}
          title={t.transactions}
        />
      )}

      <SupplierProductsSection supplier={{ id: supplier.id, name: supplier.name }} />

      <Card
        title={t.transactions}
        extra={
          <Button
            type="primary"
            onClick={() => {
              setSelectedTransaction(null);
              setShowTransactionModal(true);
            }}
          >
            {t.addTransaction}
          </Button>
        }
      >
        <Typography.Text type="secondary">{t.transactionsCount(visibleTransactions?.length ?? 0)}</Typography.Text>
      </Card>

      {transactionsLoading ? (
        <Skeleton active paragraph={{ rows: 5 }} />
      ) : !visibleTransactions?.length ? (
        <Empty description={t.noTransactions} />
      ) : (
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          {visibleTransactions.map((transaction) => {
            const balanceDelta = {
              usd: transaction.totalAmountUsd - transaction.paidAmountUsd,
              iqd: transaction.totalAmountIqd - transaction.paidAmountIqd,
            };
            const isPositive = balanceDelta.usd >= 0 && balanceDelta.iqd >= 0;

            return (
            <Card key={transaction.id} size="small">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                <Space>
                  {isPositive ? (
                    <TrendingUp size={18} color="#047857" />
                  ) : (
                    <TrendingDown size={18} color="#be123c" />
                  )}
                  <div>
                    <Typography.Text strong>
                      {transaction.description ?? t.transactions}
                    </Typography.Text>
                    <div>
                      <Typography.Text type="secondary">
                        {[formatDate(transaction.date), transaction.projectName, transaction.buildingName].filter(Boolean).join(" | ")}
                      </Typography.Text>
                    </div>
                    <div>
                      <Typography.Text type="secondary">
                        {t.totalAmount}: {formatCurrencyPair({ usd: transaction.totalAmountUsd, iqd: transaction.totalAmountIqd }, { hideZero: true })} | {t.paidAmount}: {formatCurrencyPair({ usd: transaction.paidAmountUsd, iqd: transaction.paidAmountIqd }, { hideZero: true })}
                      </Typography.Text>
                    </div>
                  </div>
                </Space>
                <Space size="small">
                  <Typography.Text strong type={isPositive ? "success" : "danger"}>
                    {isPositive ? "+" : "-"}
                    {formatCurrencyPair(
                      { usd: Math.abs(balanceDelta.usd), iqd: Math.abs(balanceDelta.iqd) },
                      { hideZero: true },
                    )}
                  </Typography.Text>
                  {transaction.canManage ? (
                    <>
                      <Button
                        type="text"
                        icon={<Pencil size={16} />}
                        onClick={() => {
                          setSelectedTransaction(transaction);
                          setShowTransactionModal(true);
                        }}
                      />
                      <Popconfirm
                        title={t.deleteTransactionConfirm}
                        okText={t.remove}
                        cancelText={t.cancel}
                        onConfirm={() => deleteMutation.mutate(transaction)}
                      >
                        <Button
                          danger
                          type="text"
                          icon={<Trash2 size={16} />}
                          loading={deleteMutation.isPending}
                        />
                      </Popconfirm>
                    </>
                  ) : null}
                </Space>
              </div>
            </Card>
            );
          })}
        </Space>
      )}

      <Card
        title={
          <Space>
            <FileText size={16} />
            <span>{t.expense_count(supplierInvoices.length)}</span>
          </Space>
        }
      >
        {invoicesLoading ? (
          <Skeleton active paragraph={{ rows: 5 }} />
        ) : !supplierInvoices.length ? (
          <Empty description={t.noExpenses} />
        ) : (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            {supplierInvoices.map((invoice) => (
              <Link href={`/expenses/${invoice.id}`} key={invoice.id}>
                <div style={{ cursor: "pointer", borderRadius: 8, border: "1px solid #e5e0d5", padding: "10px 12px" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <Space size="small" wrap>
                        <Typography.Text strong>{invoice.number}</Typography.Text>
                        <Tag color={invoiceStatusColor[invoice.status]}>{invoiceStatusLabel(invoice.status, t)}</Tag>
                      </Space>
                      <div>
                        <Typography.Text type="secondary">
                          {[
                            formatDate(invoice.invoiceDate),
                            invoice.projectName ?? t.noProjectOption,
                            invoice.buildingName ?? t.projectGlobalCost,
                            invoice.productName,
                          ]
                            .filter(Boolean)
                            .join(" | ")}
                        </Typography.Text>
                      </div>
                    </div>
                    <div style={{ minWidth: 280 }}>
                      <div className="erp-invoice-amount-pair">
                        <div className="erp-invoice-amount-cell">
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t.totalAmount}</Typography.Text>
                          <div>
                            <Typography.Text strong>
                              {formatCurrencyPair({ usd: invoice.totalAmountUsd, iqd: invoice.totalAmountIqd })}
                            </Typography.Text>
                          </div>
                        </div>
                        <div className="erp-invoice-amount-cell">
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t.remaining_label}</Typography.Text>
                          <div>
                            <Typography.Text type="secondary">
                              {formatCurrencyPair(
                                { usd: invoice.remainingAmountUsd, iqd: invoice.remainingAmountIqd },
                                { hideZero: true },
                              )}
                            </Typography.Text>
                          </div>
                        </div>
                      </div>
                      <div>
                        <Typography.Text type="secondary">
                          {t.paidAmount}:{" "}
                          {formatCurrencyPair(
                            { usd: invoice.paidAmountUsd, iqd: invoice.paidAmountIqd },
                            { hideZero: true },
                          )}
                        </Typography.Text>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </Space>
        )}
      </Card>

      {showTransactionModal && supplier ? (
        <SupplierTransactionModal
          supplier={{ id: supplier.id, name: supplier.name }}
          transaction={selectedTransaction || undefined}
          onClose={() => {
            setShowTransactionModal(false);
            setSelectedTransaction(null);
          }}
        />
      ) : null}

      {showSupplierModal && supplier ? (
        <SupplierFormModal
          supplier={supplier}
          onClose={() => setShowSupplierModal(false)}
        />
      ) : null}
    </Space>
  );
}

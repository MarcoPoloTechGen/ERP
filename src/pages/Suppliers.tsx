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
  Modal,
  Popconfirm,
  Row,
  Space,
  Table,
  Typography,
  type TableProps,
} from "antd";
import { Download, FileSpreadsheet, Pencil, Plus, Trash2 } from "lucide-react";
import { createSupplier, deleteSupplier, erpKeys, listSupplierBalances, updateSupplier } from "@/lib/erp";
import { exportRowsToCsv, exportRowsToExcel } from "@/lib/export";
import { formatCurrencyLabel, formatCurrencyPair } from "@/lib/format";
import {
  addContainsSearchFilter,
  STANDARD_PAGE_SIZE,
  toErrorMessage,
} from "@/lib/refine-helpers";
import { useLang } from "@/lib/i18n";

type SupplierRow = {
  id: number;
  name: string;
  contact: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  created_at: string | null;
};

type SupplierFormValues = {
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
};

function buildFilters(search: string) {
  const filters: CrudFilters = [];
  addContainsSearchFilter(filters, ["name", "contact", "phone", "email", "address"], search);
  return filters;
}

function SupplierModal({
  supplier,
  onClose,
  onSaved,
}: {
  supplier?: SupplierRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLang();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<SupplierFormValues>();

  const saveMutation = useMutation({
    mutationFn: async (values: SupplierFormValues) => {
      const payload = {
        name: values.name.trim(),
        contact: values.contact?.trim() || null,
        phone: values.phone?.trim() || null,
        email: values.email?.trim() || null,
        address: values.address?.trim() || null,
      };

      if (supplier) {
        await updateSupplier(supplier.id, payload);
        return;
      }

      await createSupplier(payload);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: erpKeys.suppliers }),
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
      title={supplier ? t.editSupplier : t.newSupplier}
      okText={supplier ? t.save : t.create}
      cancelText={t.cancel}
      confirmLoading={saveMutation.isPending}
      onCancel={onClose}
      onOk={() => form.submit()}
    >
      <Form<SupplierFormValues>
        form={form}
        layout="vertical"
        initialValues={{
          name: supplier?.name ?? "",
          contact: supplier?.contact ?? "",
          phone: supplier?.phone ?? "",
          email: supplier?.email ?? "",
          address: supplier?.address ?? "",
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
      </Form>
    </Modal>
  );
}

export default function Suppliers() {
  const { t } = useLang();
  const { message } = App.useApp();
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierRow | undefined>();
  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const search = useDeferredValue(searchInput.trim());

  const { tableProps, tableQuery, setFilters, setCurrentPage } = useTable<SupplierRow>({
    resource: "suppliers",
    pagination: { pageSize: STANDARD_PAGE_SIZE },
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
    syncWithLocation: false,
  });
  const { data: supplierBalanceRows } = useQuery({
    queryKey: erpKeys.supplierBalances,
    queryFn: listSupplierBalances,
  });

  useEffect(() => {
    setCurrentPage(1);
    setFilters(buildFilters(search), "replace");
  }, [search, setCurrentPage, setFilters]);

  const deleteMutation = useMutation({
    mutationFn: (supplier: SupplierRow) => deleteSupplier(supplier.id),
    onSuccess: () => void tableQuery.refetch(),
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  const rows = useMemo(() => tableProps.dataSource ?? [], [tableProps.dataSource]);
  const supplierBalances = useMemo(() => {
    const balancesBySupplier = new Map<number, { usd: number; iqd: number }>();

    for (const balance of supplierBalanceRows ?? []) {
      balancesBySupplier.set(balance.supplierId, { usd: balance.balanceUsd, iqd: balance.balanceIqd });
    }

    return balancesBySupplier;
  }, [supplierBalanceRows]);
  const supplierBalance = (supplier: SupplierRow) => supplierBalances.get(supplier.id) ?? { usd: 0, iqd: 0 };
  const columns: TableProps<SupplierRow>["columns"] = [
    {
      title: t.name,
      dataIndex: "name",
      render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
    },
    { title: t.contact, dataIndex: "contact", render: (value: string | null) => value ?? "-" },
    { title: t.phoneSup, dataIndex: "phone", render: (value: string | null) => value ?? "-" },
    { title: t.email, dataIndex: "email", render: (value: string | null) => value ?? "-" },
    { title: t.address, dataIndex: "address", render: (value: string | null) => value ?? "-" },
    {
      title: t.balance,
      dataIndex: "id",
      align: "right",
      render: (_value: number, supplier) => {
        const balance = supplierBalance(supplier);
        const isPositive = balance.usd >= 0 && balance.iqd >= 0;

        return (
          <Space direction="vertical" size={0}>
            <Typography.Text strong type={isPositive ? "success" : "danger"}>
              {formatCurrencyPair({ usd: balance.usd, iqd: balance.iqd })}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {isPositive ? t.positiveBalance : t.negativeBalance}
            </Typography.Text>
          </Space>
        );
      },
    },
    {
      title: "",
      key: "actions",
      align: "right",
      width: 96,
      render: (_, supplier) => (
        <Space size="small">
          <Button
            type="text"
            icon={<Pencil size={16} />}
            onClick={() => {
              setSelectedSupplier(supplier);
              setOpen(true);
            }}
          />
          <Popconfirm
            title={t.deleteSupplierConfirm}
            okText={t.remove}
            cancelText={t.cancel}
            onConfirm={() => deleteMutation.mutate(supplier)}
          >
            <Button danger type="text" icon={<Trash2 size={16} />} loading={deleteMutation.isPending} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  function exportSuppliers(format: "csv" | "xlsx") {
    const fileBase = t.suppliersTitle;
    const exportRows = rows.map((supplier) => {
      const balance = supplierBalance(supplier);

      return {
        [t.name]: supplier.name,
        [t.contact]: supplier.contact ?? "",
        [t.phoneSup]: supplier.phone ?? "",
        [t.email]: supplier.email ?? "",
        [t.address]: supplier.address ?? "",
        [`${t.balance} ${formatCurrencyLabel("USD")}`]: balance.usd,
        [`${t.balance} ${formatCurrencyLabel("IQD")}`]: balance.iqd,
        [t.status]: balance.usd >= 0 && balance.iqd >= 0 ? t.positiveBalance : t.negativeBalance,
      };
    });

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
            {t.suppliersTitle}
          </Typography.Title>
          <Typography.Text type="secondary">{t.supplier_count(tableQuery.data?.total ?? 0)}</Typography.Text>
        </Col>
        <Col>
          <Space wrap>
            <Button icon={<Download size={16} />} disabled={!rows.length} onClick={() => exportSuppliers("csv")}>
              CSV
            </Button>
            <Button icon={<FileSpreadsheet size={16} />} disabled={!rows.length} onClick={() => exportSuppliers("xlsx")}>
              {t.excel}
            </Button>
            <Button
              type="primary"
              icon={<Plus size={16} />}
              onClick={() => {
                setSelectedSupplier(undefined);
                setOpen(true);
              }}
            >
              {t.addSupplier}
            </Button>
          </Space>
        </Col>
      </Row>

      <Card size="small">
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={20}>
            <Input
              allowClear
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={`${t.search} ${t.suppliers.toLowerCase()}`}
            />
          </Col>
          <Col xs={24} lg={4}>
            <Button block disabled={!searchInput} onClick={() => setSearchInput("")}>
              {t.clearFilters}
            </Button>
          </Col>
        </Row>
      </Card>

      {tableQuery.isError ? (
        <Alert
          showIcon
          type="error"
          message={t.suppliersTitle}
          description={toErrorMessage(tableQuery.error)}
          action={<Button onClick={() => void tableQuery.refetch()}>{t.retry}</Button>}
        />
      ) : null}

      <Table<SupplierRow>
        {...tableProps}
        rowKey="id"
        columns={columns}
        scroll={{ x: 1050 }}
        pagination={
          tableProps.pagination
            ? {
                ...tableProps.pagination,
                itemRender: undefined,
                showSizeChanger: false,
                showTotal: (total) => `${total} ${t.suppliers.toLowerCase()}`,
              }
            : false
        }
      />

      {open ? (
        <SupplierModal
          supplier={selectedSupplier}
          onClose={() => setOpen(false)}
          onSaved={() => void tableQuery.refetch()}
        />
      ) : null}
    </Space>
  );
}

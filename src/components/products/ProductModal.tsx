import { useMutation } from "@tanstack/react-query";
import { App, Col, Form, Input, InputNumber, Modal, Row, Select } from "antd";
import { createProduct, updateProduct } from "@/lib/erp";
import { currencyInputProps, formatCurrencyLabel } from "@/lib/format";
import { toErrorMessage } from "@/lib/refine-helpers";
import { useLang } from "@/lib/i18n";
import { useProjectScope } from "@/lib/project-scope";
import { useErpInvalidation } from "@/hooks/use-erp-invalidation";
import { useProjectBuildings, useProjects } from "@/hooks/use-projects";
import { useSuppliers } from "@/hooks/use-suppliers";
import type { ProductFormValues, ProductRow } from "@/components/products/product-shared";

export function ProductModal({
  product,
  onClose,
  onSaved,
}: {
  product?: ProductRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLang();
  const { selectedProjectId: scopedProjectId } = useProjectScope();
  const { message } = App.useApp();
  const erpInvalidation = useErpInvalidation();
  const [form] = Form.useForm<ProductFormValues>();
  const projectId = Form.useWatch("projectId", form);
  const selectedProjectId = typeof projectId === "number" ? projectId : undefined;

  const { data: suppliers } = useSuppliers();
  const { data: projects } = useProjects();
  const { data: buildings } = useProjectBuildings(selectedProjectId, selectedProjectId != null);

  const saveMutation = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      const payload = {
        name: values.name.trim(),
        supplierId: values.supplierId ?? null,
        projectId: scopedProjectId ?? values.projectId ?? null,
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
      await erpInvalidation.products();
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
          projectId: scopedProjectId ?? product?.project_id ?? undefined,
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
                disabled={scopedProjectId != null}
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
            <Form.Item name="unitPriceUsd" label={`${t.unitPrice} ${formatCurrencyLabel("USD")}`}>
              <InputNumber min={0} step={0.01} style={{ width: "100%" }} {...currencyInputProps("USD")} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="unitPriceIqd" label={`${t.unitPrice} IQD`}>
              <InputNumber min={0} step={1} style={{ width: "100%" }} {...currencyInputProps("IQD")} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}

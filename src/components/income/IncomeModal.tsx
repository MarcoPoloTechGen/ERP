import { useEffect, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { App, Col, Form, Input, InputNumber, Modal, Row, Select } from "antd";
import { createIncomeTransaction, erpKeys, getAppSettings, updateIncomeTransaction } from "@/lib/erp";
import { useAuth } from "@/lib/auth";
import { currencyInputProps, formatCurrencyLabel, formatDateInput } from "@/lib/format";
import { toErrorMessage } from "@/lib/refine-helpers";
import { useLang } from "@/lib/i18n";
import { useProjectScope } from "@/lib/project-scope";
import { useErpInvalidation } from "@/hooks/use-erp-invalidation";
import { useProjectBuildings, useProjects } from "@/hooks/use-projects";
import type { IncomeFormValues, IncomeRow } from "@/components/income/income-shared";

export function IncomeModal({
  income,
  open,
  onClose,
  onSaved,
}: {
  income: IncomeRow | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLang();
  const { selectedProjectId: scopedProjectId } = useProjectScope();
  const { profile } = useAuth();
  const { message } = App.useApp();
  const erpInvalidation = useErpInvalidation();
  const [form] = Form.useForm<IncomeFormValues>();
  const selectedProjectId = Form.useWatch("projectId", form);
  const { data: projects } = useProjects();
  const effectiveProjectId = scopedProjectId ?? selectedProjectId ?? income?.project_id ?? null;
  const { data: projectBuildings } = useProjectBuildings(effectiveProjectId, open && effectiveProjectId != null);
  const { data: appSettings } = useQuery({ queryKey: erpKeys.appSettings, queryFn: getAppSettings });
  const buildingOptions = useMemo(
    () => (projectBuildings ?? []).filter((building) => building.projectId === effectiveProjectId),
    [effectiveProjectId, projectBuildings],
  );

  const saveMutation = useMutation({
    mutationFn: (values: IncomeFormValues) => {
      const payload = {
        projectId: values.projectId,
        buildingId: values.buildingId,
        amountUsd: Number(values.amountUsd || 0),
        amountIqd: Number(values.amountIqd || 0),
        description: values.description?.trim() || null,
        date: values.date || null,
      };

      if (income) {
        if (income.id == null) {
          throw new Error(t.notFound);
        }

        return updateIncomeTransaction(income.id, payload);
      }

      return createIncomeTransaction(payload);
    },
    onSuccess: async () => {
      await erpInvalidation.income();
      form.resetFields();
      onSaved();
      onClose();
    },
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  useEffect(() => {
    if (!open) {
      form.resetFields();
      return;
    }

    form.setFieldsValue({
      projectId: scopedProjectId ?? income?.project_id ?? undefined,
      buildingId: income?.building_id ?? undefined,
      amountUsd: income?.amount_usd ?? (income?.currency === "USD" ? income?.amount ?? undefined : undefined),
      amountIqd: income?.amount_iqd ?? (income?.currency === "IQD" ? income?.amount ?? undefined : undefined),
      description: income?.description ?? "",
      date: formatDateInput(income?.date) || new Date().toISOString().slice(0, 10),
    });
  }, [form, income, open, scopedProjectId]);

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
      open={open}
      title={income ? t.editIncomeEntry : t.newIncomeEntry}
      okText={income ? t.save : t.create}
      cancelText={t.cancel}
      confirmLoading={saveMutation.isPending}
      onCancel={onClose}
      onOk={() => form.submit()}
    >
      <Form<IncomeFormValues>
        form={form}
        layout="vertical"
        initialValues={{ amountUsd: 0, amountIqd: 0, date: new Date().toISOString().slice(0, 10) }}
        onFinish={(values) => saveMutation.mutate(values)}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label={t.user}>
              <Input readOnly value={profile?.fullName ?? profile?.email ?? ""} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="projectId" label={t.projectOption} rules={[{ required: true, message: t.requiredField }]}>
              <Select
                showSearch
                disabled={scopedProjectId != null}
                optionFilterProp="label"
                placeholder={t.noneOption}
                onChange={() => form.setFieldValue("buildingId", undefined)}
                options={projects?.map((project) => ({ label: project.name, value: project.id }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
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
          <Col span={12}>
            <Form.Item name="amountUsd" label={`${t.amount} ${formatCurrencyLabel("USD")}`}>
              <InputNumber
                min={appSettings?.transactionAmountMinUsd ?? 0}
                max={appSettings?.transactionAmountMaxUsd ?? undefined}
                step={0.01}
                style={{ width: "100%" }}
                {...currencyInputProps("USD")}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="amountIqd" label={`${t.amount} IQD`}>
              <InputNumber
                min={appSettings?.transactionAmountMinIqd ?? 0}
                max={appSettings?.transactionAmountMaxIqd ?? undefined}
                step={1}
                style={{ width: "100%" }}
                {...currencyInputProps("IQD")}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="date" label={t.date}>
              <Input type="date" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="description" label={t.description}>
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

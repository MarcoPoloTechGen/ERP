import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { App, Col, Form, Input, InputNumber, Modal, Row, Select } from "antd";
import { createIncomeTransaction, updateIncomeTransaction } from "@/lib/erp";
import { useAuth } from "@/lib/auth";
import { formatCurrencyLabel, formatDateInput } from "@/lib/format";
import { toErrorMessage } from "@/lib/refine-helpers";
import { useLang } from "@/lib/i18n";
import { useProjectScope } from "@/lib/project-scope";
import { useErpInvalidation } from "@/hooks/use-erp-invalidation";
import { useProjects } from "@/hooks/use-projects";
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
  const { data: projects } = useProjects();

  const saveMutation = useMutation({
    mutationFn: (values: IncomeFormValues) => {
      const payload = {
        projectId: values.projectId,
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
      amountUsd: income?.amount_usd ?? (income?.currency === "USD" ? income?.amount ?? undefined : undefined),
      amountIqd: income?.amount_iqd ?? (income?.currency === "IQD" ? income?.amount ?? undefined : undefined),
      description: income?.description ?? "",
      date: formatDateInput(income?.date) || new Date().toISOString().slice(0, 10),
    });
  }, [form, income, open, scopedProjectId]);

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
                disabled={scopedProjectId != null}
                placeholder={t.noneOption}
                options={projects?.map((project) => ({ label: project.name, value: project.id }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="amountUsd" label={`${t.amount} ${formatCurrencyLabel("USD")}`}>
              <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="amountIqd" label={`${t.amount} IQD`}>
              <InputNumber min={0} step={1} style={{ width: "100%" }} />
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

import { useEffect, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { App, Col, Form, Input, InputNumber, Modal, Row, Select } from "antd";
import {
  createWorkerTransaction,
  erpKeys,
  getAppSettings,
  listProjectBuildings,
  listProjects,
  updateWorkerTransaction,
  type WorkerTransaction,
} from "@/lib/erp";
import { ModalTitle } from "@/components/ModalTitle";
import { useErpInvalidation } from "@/hooks/use-erp-invalidation";
import { currencyInputProps, formatCurrencyLabel } from "@/lib/format";
import { useLang, type TranslationShape } from "@/lib/i18n";
import { useProjectScope } from "@/lib/project-scope";
import { toErrorMessage } from "@/lib/refine-helpers";

export type WorkerTransactionMode = "worked" | "paid" | "worked_paid";

export function getWorkerTransactionModeLabel(t: TranslationShape, mode: WorkerTransactionMode) {
  if (mode === "worked") {
    return t.workerWorked;
  }

  if (mode === "paid") {
    return t.workerPaid;
  }

  return t.workerWorkedPaid;
}

type TransactionFormValues = {
  totalAmountUsd?: number;
  paidAmountUsd?: number;
  totalAmountIqd?: number;
  paidAmountIqd?: number;
  description?: string;
  date?: string;
  projectId?: number;
  buildingId?: number;
};

export function WorkerTransactionModal({
  mode = "worked_paid",
  transaction,
  workerId,
  onClose,
  onSaved,
}: {
  mode?: WorkerTransactionMode;
  transaction?: WorkerTransaction;
  workerId: number;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { t } = useLang();
  const { selectedProjectId: scopedProjectId } = useProjectScope();
  const { message } = App.useApp();
  const erpInvalidation = useErpInvalidation();
  const [form] = Form.useForm<TransactionFormValues>();
  const selectedProjectId = Form.useWatch("projectId", form);
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
  const showTotalFields = transaction != null || mode !== "paid";
  const showPaidFields = transaction != null || mode !== "worked";

  const saveMutation = useMutation({
    mutationFn: (values: TransactionFormValues) => {
      const payload = {
        workerId,
        totalAmountUsd: showTotalFields ? Number(values.totalAmountUsd || 0) : 0,
        paidAmountUsd: showPaidFields ? Number(values.paidAmountUsd || 0) : 0,
        totalAmountIqd: showTotalFields ? Number(values.totalAmountIqd || 0) : 0,
        paidAmountIqd: showPaidFields ? Number(values.paidAmountIqd || 0) : 0,
        description: values.description?.trim() || null,
        date: values.date || null,
        projectId: scopedProjectId ?? values.projectId ?? null,
        buildingId: values.buildingId ?? null,
      };

      return transaction ? updateWorkerTransaction(transaction.id, payload) : createWorkerTransaction(payload);
    },
    onSuccess: async () => {
      await erpInvalidation.workerDetail(workerId);
      onSaved?.();
      onClose();
    },
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  const validateAmountPair = () => {
    const values = form.getFieldsValue(["totalAmountUsd", "paidAmountUsd", "totalAmountIqd", "paidAmountIqd"]);
    const totalAmount = Number(values.totalAmountUsd || 0) + Number(values.totalAmountIqd || 0);
    const paidAmount = Number(values.paidAmountUsd || 0) + Number(values.paidAmountIqd || 0);

    if (showTotalFields && showPaidFields) {
      return totalAmount > 0 || paidAmount > 0
        ? Promise.resolve()
        : Promise.reject(new Error(t.requiredField));
    }

    if (showTotalFields) {
      return totalAmount > 0 ? Promise.resolve() : Promise.reject(new Error(t.requiredField));
    }

    return paidAmount > 0 ? Promise.resolve() : Promise.reject(new Error(t.requiredField));
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
      title={<ModalTitle title={transaction ? t.editTransaction : getWorkerTransactionModeLabel(t, mode)} lockedLabel={lockedProjectLabel} />}
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
          {showTotalFields ? (
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
            </>
          ) : null}
          {showPaidFields ? (
            <>
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
          ) : null}
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
            <Form.Item name="date" label={t.date} rules={[{ required: true, message: "Date is required" }]}>
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

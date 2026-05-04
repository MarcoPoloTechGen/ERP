import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  App,
  Button,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Typography,
} from "antd";
import { MinusCircle, Plus } from "lucide-react";
import {
  createProject,
  DEFAULT_PROJECT_BUILDING_NAME,
  erpKeys,
  listProjectBuildings,
  updateProject,
  type ProjectStatus,
} from "@/lib/erp";
import { currencyInputProps, formatDateInput } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { asProjectStatus, toErrorMessage } from "@/lib/refine-helpers";
import { useErpInvalidation } from "@/hooks/use-erp-invalidation";

type ProjectFormValues = {
  name: string;
  client?: string;
  location?: string;
  status: ProjectStatus;
  budget?: number;
  startDate?: string;
  endDate?: string;
  buildings?: { name?: string }[];
};

type EditableProject = {
  id: number;
  name: string | null;
  client: string | null;
  location: string | null;
  status: ProjectStatus | string | null;
  budget: number | null;
  startDate: string | null;
  endDate: string | null;
};

const LEGACY_DEFAULT_PROJECT_BUILDING_NAME = "Depenses generales";

function isDefaultProjectBuildingName(name: string) {
  const trimmedName = name.trim();
  return (
    trimmedName === DEFAULT_PROJECT_BUILDING_NAME.trim() ||
    trimmedName === LEGACY_DEFAULT_PROJECT_BUILDING_NAME
  );
}

export function ProjectModal({
  project,
  onClose,
  onSaved,
}: {
  project?: EditableProject;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { t } = useLang();
  const { message } = App.useApp();
  const erpInvalidation = useErpInvalidation();
  const [form] = Form.useForm<ProjectFormValues>();
  const { data: projectBuildings } = useQuery({
    queryKey: erpKeys.projectBuildings(project?.id ?? 0),
    queryFn: () => listProjectBuildings(project?.id),
    enabled: project?.id != null,
  });

  useEffect(() => {
    if (!project) {
      form.setFieldValue("buildings", [{ name: "" }]);
      return;
    }

    if (projectBuildings) {
      const buildings = projectBuildings
        .filter((building) => !building.isDefault && !isDefaultProjectBuildingName(building.name))
        .map((building) => ({ name: building.name }));
      form.setFieldValue("buildings", buildings.length ? buildings : [{ name: "" }]);
    }
  }, [form, project, projectBuildings]);

  const saveMutation = useMutation({
    mutationFn: async (values: ProjectFormValues) => {
      const payload = {
        name: values.name.trim(),
        client: values.client?.trim() || null,
        location: values.location?.trim() || null,
        status: values.status,
        budget: values.budget ?? null,
        startDate: values.startDate || null,
        endDate: values.endDate || null,
        buildings: (values.buildings ?? [])
          .map((building) => building.name ?? "")
          .filter((name) => !isDefaultProjectBuildingName(name)),
      };

      if (project) {
        await updateProject(project.id, payload);
        return;
      }

      await createProject(payload);
    },
    onSuccess: async () => {
      await erpInvalidation.projects();
      onSaved?.();
      onClose();
    },
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  return (
    <Modal
      open
      width={760}
      title={project ? t.editProject : t.newProject}
      okText={project ? t.save : t.create}
      cancelText={t.cancel}
      confirmLoading={saveMutation.isPending}
      onCancel={onClose}
      onOk={() => form.submit()}
    >
      <Form<ProjectFormValues>
        form={form}
        layout="vertical"
        initialValues={{
          name: project?.name ?? "",
          client: project?.client ?? "",
          location: project?.location ?? "",
          status: asProjectStatus(project?.status),
          budget: project?.budget ?? undefined,
          startDate: formatDateInput(project?.startDate),
          endDate: formatDateInput(project?.endDate),
          buildings: [{ name: "" }],
        }}
        onFinish={(values) => saveMutation.mutate(values)}
      >
        <Form.Item name="name" label={t.projectName} rules={[{ required: true, message: t.nameRequired }]}>
          <Input placeholder={t.projectNamePlaceholder} />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="client" label={t.client}>
              <Input placeholder={t.clientPlaceholder} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="location" label={t.location}>
              <Input placeholder={t.locationPlaceholder} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="status" label={t.status}>
              <Select
                options={[
                  { label: t.active, value: "active" },
                  { label: t.completed, value: "completed" },
                  { label: t.paused, value: "paused" },
                ]}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="budget" label={t.budget}>
              <InputNumber min={0} step={0.01} style={{ width: "100%" }} {...currencyInputProps("USD")} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="startDate" label={t.startDate}>
              <Input type="date" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="endDate" label={t.endDate}>
              <Input type="date" />
            </Form.Item>
          </Col>
        </Row>

        <Typography.Text strong>{t.buildingsTitle}</Typography.Text>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
          {t.buildingsHint}
        </Typography.Paragraph>
        <Input value={DEFAULT_PROJECT_BUILDING_NAME} disabled style={{ marginBottom: 8 }} />
        <Form.List name="buildings">
          {(fields, { add, remove }) => (
            <Space direction="vertical" size="small" style={{ width: "100%" }}>
              {fields.map((field) => (
                <Space key={field.key} align="baseline" style={{ display: "flex" }}>
                  <Form.Item {...field} name={[field.name, "name"]} style={{ flex: 1, marginBottom: 0 }}>
                    <Input placeholder={t.buildingNamePlaceholder} />
                  </Form.Item>
                  <Button
                    danger
                    type="text"
                    icon={<MinusCircle size={16} />}
                    disabled={fields.length === 1}
                    onClick={() => remove(field.name)}
                  />
                </Space>
              ))}
              <Button type="dashed" icon={<Plus size={16} />} onClick={() => add({ name: "" })}>
                {t.addBuilding}
              </Button>
            </Space>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}

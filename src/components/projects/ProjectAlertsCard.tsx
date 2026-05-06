import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, Button, Card, Empty, Form, Input, List, Popconfirm, Space, Tag, Tooltip, Typography } from "antd";
import { Bell, Trash2 } from "lucide-react";
import { createProjectAlert, deleteProjectAlert, erpKeys, type ProjectAlert } from "@/lib/erp";
import { dateReminderStatus, daysUntilDate, isDateReminderVisible, type DateReminderStatus } from "@/lib/date-reminders";
import { formatDate } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { hasAdminAccess } from "@/lib/permissions";
import { toErrorMessage } from "@/lib/refine-helpers";
import { useAuth } from "@/lib/auth";
import { useProjectAlerts } from "@/hooks/use-projects";

type ProjectAlertFormValues = {
  alertDate?: string;
  note?: string;
};

function reminderColor(status: DateReminderStatus) {
  if (status === "overdue") {
    return "red";
  }

  if (status === "today") {
    return "gold";
  }

  return "blue";
}

function reminderLabel(status: DateReminderStatus, daysUntil: number, t: ReturnType<typeof useLang>["t"]) {
  if (status === "overdue") {
    return t.overdueReminder;
  }

  if (status === "today") {
    return t.todayReminder;
  }

  return t.upcomingReminderDays(daysUntil);
}

function alertStatus(alert: ProjectAlert) {
  const daysUntil = daysUntilDate(alert.alertDate);
  if (daysUntil == null) {
    return null;
  }

  return {
    daysUntil,
    status: dateReminderStatus(daysUntil),
  };
}

export function ProjectAlertsCard({ projectId }: { projectId: number }) {
  const { t } = useLang();
  const { profile } = useAuth();
  const { message } = App.useApp();
  const [form] = Form.useForm<ProjectAlertFormValues>();
  const queryClient = useQueryClient();
  const alertsQuery = useProjectAlerts(projectId);
  const canManageAllAlerts = hasAdminAccess(profile?.role);

  const createMutation = useMutation({
    mutationFn: (values: ProjectAlertFormValues) =>
      createProjectAlert(projectId, {
        alertDate: values.alertDate ?? "",
        note: values.note ?? "",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: erpKeys.projectAlerts(projectId) });
      await queryClient.invalidateQueries({ queryKey: erpKeys.projectAlerts("all") });
      await queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      form.resetFields();
      message.success(t.projectAlertCreated);
    },
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (alert: ProjectAlert) => deleteProjectAlert(alert.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: erpKeys.projectAlerts(projectId) });
      await queryClient.invalidateQueries({ queryKey: erpKeys.projectAlerts("all") });
      await queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      message.success(t.projectAlertDeleted);
    },
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  const alerts = alertsQuery.data ?? [];

  return (
    <Card
      title={
        <Space>
          <Bell size={16} />
          <span>{t.projectAlerts}</span>
        </Space>
      }
    >
      <Form<ProjectAlertFormValues>
        form={form}
        layout="vertical"
        onFinish={(values) => createMutation.mutate(values)}
      >
        <Space direction="vertical" size="small" style={{ width: "100%" }}>
          <Form.Item name="alertDate" label={t.projectAlertDate} rules={[{ required: true, message: t.requiredField }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item
            name="note"
            label={t.projectAlertNote}
            rules={[
              { required: true, message: t.requiredField },
              {
                validator: async (_, value: string | undefined) => {
                  if (value?.trim()) {
                    return;
                  }

                  throw new Error(t.requiredField);
                },
              },
            ]}
          >
            <Input.TextArea rows={3} placeholder={t.projectAlertNotePlaceholder} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
            {t.addProjectAlert}
          </Button>
        </Space>
      </Form>

      {!alerts.length && !alertsQuery.isLoading ? (
        <Empty description={t.noProjectAlerts} style={{ marginTop: 20 }} />
      ) : (
        <List
          loading={alertsQuery.isLoading}
          dataSource={alerts}
          style={{ marginTop: 20 }}
          renderItem={(alert) => {
            const status = alertStatus(alert);
            const canDeleteAlert = canManageAllAlerts || alert.createdBy === profile?.id;

            return (
              <List.Item
                actions={[
                  canDeleteAlert ? (
                    <Popconfirm
                      key="delete"
                      title={t.deleteProjectAlertConfirm}
                      okText={t.remove}
                      cancelText={t.cancel}
                      onConfirm={() => deleteMutation.mutate(alert)}
                    >
                      <Tooltip title={t.remove}>
                        <Button
                          danger
                          icon={<Trash2 size={16} />}
                          loading={deleteMutation.isPending && deleteMutation.variables?.id === alert.id}
                        />
                      </Tooltip>
                    </Popconfirm>
                  ) : null,
                ].filter(Boolean)}
              >
                <List.Item.Meta
                  avatar={<Bell size={20} />}
                  title={
                    <Space size="small" wrap>
                      <Typography.Text strong>{formatDate(alert.alertDate)}</Typography.Text>
                      {status && isDateReminderVisible(status.daysUntil) ? (
                        <Tag color={reminderColor(status.status)}>
                          {reminderLabel(status.status, status.daysUntil, t)}
                        </Tag>
                      ) : null}
                    </Space>
                  }
                  description={<Typography.Text>{alert.note}</Typography.Text>}
                />
              </List.Item>
            );
          }}
        />
      )}
    </Card>
  );
}

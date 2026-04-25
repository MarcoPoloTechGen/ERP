import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateClickArg } from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import timeGridPlugin from "@fullcalendar/timegrid";
import type { EventClickArg, EventContentArg, EventInput } from "@fullcalendar/core";
import { Link } from "wouter";
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Segmented,
  Select,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
} from "antd";
import {
  createIncomeTransaction,
  createInvoice,
  erpKeys,
  listIncomeTransactions,
  listInvoices,
  listProducts,
  listProjectBuildings,
  listProjects,
  listSuppliers,
  listWorkers,
  listWorkerTransactions,
  type InvoiceStatus,
} from "@/lib/erp";
import { useAuth } from "@/lib/auth";
import {
  buildExpenseAssignmentOptions,
  parseExpenseAssignmentKey,
} from "@/lib/expense-assignment";
import { formatCurrencyLabel, formatCurrencyPair, formatDate } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { useProjectScope } from "@/lib/project-scope";
import { toErrorMessage } from "@/lib/refine-helpers";

type CalendarEventKind = "income" | "expense" | "due" | "worker";
type CalendarEventType = "income" | "expense" | "due" | "worker_credit" | "worker_debit";
type CalendarFilter = CalendarEventKind | "all";
type CalendarEntryType = "income" | "expense";

type CalendarEntryFormValues = {
  type: CalendarEntryType;
  projectId?: number;
  amountUsd?: number;
  amountIqd?: number;
  description?: string;
  date?: string;
  number?: string;
  supplierId?: number;
  assignmentKey?: string;
  productId?: number;
  totalAmountUsd?: number;
  paidAmountUsd?: number;
  totalAmountIqd?: number;
  paidAmountIqd?: number;
  status: InvoiceStatus;
  invoiceDate?: string;
  dueDate?: string;
  notes?: string;
};

type CalendarEventDetails = {
  kind: CalendarEventKind;
  type: CalendarEventType;
  source: string;
  amountUsd: number;
  amountIqd: number;
  date: string;
  projectId?: number | null;
  projectName?: string | null;
  counterparty?: string | null;
  description?: string | null;
  status?: InvoiceStatus | null;
  path?: string | null;
};

type CalendarEvent = EventInput & {
  id: string;
  title: string;
  start: string;
  extendedProps: CalendarEventDetails;
};

type SelectedEvent = CalendarEventDetails & {
  id: string;
  title: string;
};

const calendarEventsKey = ["calendar-events"] as const;

const colorsByKind: Record<CalendarEventKind, { background: string; foreground: string }> = {
  income: { background: "#16a34a", foreground: "#ffffff" },
  expense: { background: "#dc2626", foreground: "#ffffff" },
  due: { background: "#f59e0b", foreground: "#111827" },
  worker: { background: "#2563eb", foreground: "#ffffff" },
};

function readDate(value: string | null | undefined) {
  return value ? value.slice(0, 10) : null;
}

function makeEvent(input: CalendarEvent): CalendarEvent {
  const colors = colorsByKind[input.extendedProps.kind];
  return {
    ...input,
    backgroundColor: colors.background,
    borderColor: colors.background,
    textColor: colors.foreground,
  };
}

async function loadCalendarSources() {
  const [incomes, invoices, workers, workerTransactions] = await Promise.all([
    listIncomeTransactions(),
    listInvoices(),
    listWorkers(),
    listWorkerTransactions(),
  ]);

  const workerNamesById = new Map(workers.map((worker) => [worker.id, worker.name]));
  return { incomes, invoices, workerNamesById, workerTransactions };
}

function eventContent(info: EventContentArg) {
  return (
    <span className="block truncate px-1 text-xs font-medium">
      {info.event.title}
    </span>
  );
}

function CalendarEntryModal({
  selectedDate,
  onClose,
  onSaved,
}: {
  selectedDate: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLang();
  const { selectedProjectId: scopedProjectId } = useProjectScope();
  const { profile } = useAuth();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<CalendarEntryFormValues>();
  const entryType = Form.useWatch("type", form) ?? "income";
  const assignmentKey = Form.useWatch("assignmentKey", form);

  const { data: projects } = useQuery({ queryKey: erpKeys.projects, queryFn: listProjects });
  const { data: suppliers } = useQuery({ queryKey: erpKeys.suppliers, queryFn: listSuppliers });
  const { data: products } = useQuery({ queryKey: erpKeys.products, queryFn: listProducts });
  const { data: projectBuildings } = useQuery({
    queryKey: erpKeys.projectBuildings(0),
    queryFn: () => listProjectBuildings(),
    enabled: entryType === "expense",
  });
  const effectiveAssignmentKey = assignmentKey ?? (scopedProjectId != null ? `project:${scopedProjectId}` : undefined);
  const selectedAssignment = parseExpenseAssignmentKey(effectiveAssignmentKey, projectBuildings);
  const selectedProjectId = selectedAssignment.projectId ?? undefined;

  const projectProducts = useMemo(() => {
    return (products ?? []).filter((product) => {
      if (selectedProjectId == null) {
        return true;
      }

      return product.projectId === selectedProjectId || product.projectId == null;
    });
  }, [products, selectedProjectId]);

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

  const saveMutation = useMutation({
    mutationFn: (values: CalendarEntryFormValues) => {
      if (values.type === "income") {
        return createIncomeTransaction({
          projectId: scopedProjectId ?? (values.projectId as number),
          amountUsd: Number(values.amountUsd ?? 0),
          amountIqd: Number(values.amountIqd ?? 0),
          description: values.description?.trim() || null,
          date: values.date || selectedDate,
        });
      }

      const assignment = parseExpenseAssignmentKey(values.assignmentKey, projectBuildings);
      return createInvoice({
        number: values.number?.trim() || t.newInvoice,
        supplierId: values.supplierId ?? null,
          projectId: scopedProjectId ?? assignment.projectId,
        buildingId: assignment.buildingId,
        productId: values.productId ?? null,
        totalAmountUsd: Number(values.totalAmountUsd ?? 0),
        paidAmountUsd: Number(values.paidAmountUsd ?? 0),
        totalAmountIqd: Number(values.totalAmountIqd ?? 0),
        paidAmountIqd: Number(values.paidAmountIqd ?? 0),
        status: values.status,
        invoiceDate: values.invoiceDate || selectedDate,
        dueDate: values.dueDate || null,
        notes: values.notes?.trim() || null,
        imagePath: null,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: calendarEventsKey }),
        queryClient.invalidateQueries({ queryKey: erpKeys.dashboard }),
        queryClient.invalidateQueries({ queryKey: erpKeys.invoices }),
        queryClient.invalidateQueries({ queryKey: erpKeys.incomes }),
        queryClient.invalidateQueries({ queryKey: erpKeys.incomeHistory }),
      ]);
      form.resetFields();
      onSaved();
      onClose();
    },
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  const modalTitle = `${entryType === "income" ? t.newIncomeEntry : t.newInvoice} - ${formatDate(selectedDate)}`;

  return (
    <Modal
      open
      width={860}
      title={modalTitle}
      okText={t.create}
      cancelText={t.cancel}
      confirmLoading={saveMutation.isPending}
      onCancel={onClose}
      onOk={() => form.submit()}
    >
      <Form<CalendarEntryFormValues>
        form={form}
        layout="vertical"
        initialValues={{
          type: "income",
          amountUsd: 0,
          amountIqd: 0,
          projectId: scopedProjectId ?? undefined,
          date: selectedDate,
          number: "",
          totalAmountUsd: 0,
          paidAmountUsd: 0,
          totalAmountIqd: 0,
          paidAmountIqd: 0,
          status: "unpaid",
          invoiceDate: selectedDate,
          assignmentKey: scopedProjectId != null ? `project:${scopedProjectId}` : undefined,
        }}
        onFinish={(values) => saveMutation.mutate(values)}
      >
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="type" label={t.type}>
              <Segmented
                block
                options={[
                  { label: t.income, value: "income" },
                  { label: t.expenses, value: "expense" },
                ]}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label={t.user}>
              <Input readOnly value={profile?.fullName ?? profile?.email ?? ""} />
            </Form.Item>
          </Col>

          {entryType === "income" ? (
            <>
              <Col xs={24} md={12}>
                <Form.Item
                  name="projectId"
                  label={t.projectOption}
                  rules={[{ required: true, message: t.requiredField }]}
                >
                  <Select
                    disabled={scopedProjectId != null}
                    showSearch
                    optionFilterProp="label"
                    placeholder={t.noneOption}
                    options={projects?.map((project) => ({ label: project.name, value: project.id }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="amountUsd" label={`${t.amount} ${formatCurrencyLabel("USD")}`}>
                  <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="amountIqd" label={`${t.amount} IQD`}>
                  <InputNumber min={0} step={1} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="date" label={t.date}>
                  <Input type="date" />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="description" label={t.description}>
                  <Input.TextArea rows={3} />
                </Form.Item>
              </Col>
            </>
          ) : (
            <>
              <Col xs={24} md={12}>
                <Form.Item name="number" label={t.expenseTitle} rules={[{ required: true, message: t.nameRequired }]}>
                  <Input placeholder={t.expenseTitlePlaceholder} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="status" label={t.invoiceStatus_label}>
                  <Select
                    options={[
                      { label: t.unpaid, value: "unpaid" },
                      { label: t.partial, value: "partial" },
                      { label: t.paid, value: "paid" },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="supplierId" label={t.supplierOption}>
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder={t.noneOption}
                    options={suppliers?.map((supplier) => ({ label: supplier.name, value: supplier.id }))}
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
              <Col xs={24} md={12}>
                <Form.Item name="productId" label={t.products}>
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder={t.noneOption}
                    options={projectProducts.map((product) => ({
                      label: product.buildingName ? `${product.name} - ${product.buildingName}` : product.name,
                      value: product.id,
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="totalAmountUsd" label={`${t.totalAmount} ${formatCurrencyLabel("USD")}`}>
                  <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="paidAmountUsd" label={`${t.paidAmount} ${formatCurrencyLabel("USD")}`}>
                  <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="totalAmountIqd" label={`${t.totalAmount} IQD`}>
                  <InputNumber min={0} step={1} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="paidAmountIqd" label={`${t.paidAmount} IQD`}>
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
              <Col span={24}>
                <Form.Item name="notes" label={t.notes}>
                  <Input.TextArea rows={3} />
                </Form.Item>
              </Col>
            </>
          )}
        </Row>
      </Form>
    </Modal>
  );
}

export default function CalendarPage() {
  const { t } = useLang();
  const { selectedProjectId: scopedProjectId } = useProjectScope();
  const [filter, setFilter] = useState<CalendarFilter>("all");
  const [selectedEvent, setSelectedEvent] = useState<SelectedEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: calendarEventsKey,
    queryFn: loadCalendarSources,
  });

  const events = useMemo<CalendarEvent[]>(() => {
    if (!data) {
      return [];
    }

    const nextEvents: CalendarEvent[] = [];

    for (const income of data.incomes) {
      if (income.recordStatus !== "active") {
        continue;
      }

      const date = readDate(income.date ?? income.createdAt);
      if (!date) {
        continue;
      }

      nextEvents.push(
        makeEvent({
          id: `income-${income.id}`,
          title: `${t.income}: ${formatCurrencyPair({ usd: income.amountUsd, iqd: income.amountIqd }, { hideZero: true })}`,
          start: date,
          allDay: true,
          extendedProps: {
            kind: "income",
            type: "income",
            source: t.income,
            amountUsd: income.amountUsd,
            amountIqd: income.amountIqd,
            date,
            projectId: income.projectId,
            projectName: income.projectName,
            counterparty: income.createdByName,
            description: income.description,
          },
        }),
      );
    }

    for (const invoice of data.invoices) {
      if (invoice.recordStatus !== "active") {
        continue;
      }

      const invoiceDate = readDate(invoice.invoiceDate ?? invoice.createdAt);
      if (invoiceDate) {
        nextEvents.push(
          makeEvent({
            id: `expense-${invoice.id}`,
            title: `${invoice.number} - ${formatCurrencyPair({ usd: invoice.totalAmountUsd, iqd: invoice.totalAmountIqd }, { hideZero: true })}`,
            start: invoiceDate,
            allDay: true,
            extendedProps: {
              kind: "expense",
              type: "expense",
              source: t.expenses,
              amountUsd: invoice.totalAmountUsd,
              amountIqd: invoice.totalAmountIqd,
              date: invoiceDate,
              projectId: invoice.projectId,
              projectName: invoice.projectName,
              counterparty: invoice.supplierName,
              description: invoice.notes,
              status: invoice.status,
              path: `/expenses/${invoice.id}`,
            },
          }),
        );
      }

      const dueDate = readDate(invoice.dueDate);
      if (dueDate && invoice.status !== "paid") {
        nextEvents.push(
          makeEvent({
            id: `due-${invoice.id}`,
            title: `${t.dueDate}: ${invoice.number} - ${formatCurrencyPair({ usd: invoice.remainingAmountUsd, iqd: invoice.remainingAmountIqd }, { hideZero: true })}`,
            start: dueDate,
            allDay: true,
            extendedProps: {
              kind: "due",
              type: "due",
              source: t.dueDate,
              amountUsd: invoice.remainingAmountUsd,
              amountIqd: invoice.remainingAmountIqd,
              date: dueDate,
              projectId: invoice.projectId,
              projectName: invoice.projectName,
              counterparty: invoice.supplierName,
              description: invoice.notes,
              status: invoice.status,
              path: `/expenses/${invoice.id}`,
            },
          }),
        );
      }
    }

    for (const transaction of data.workerTransactions) {
      const date = readDate(transaction.date ?? transaction.createdAt);
      if (!date) {
        continue;
      }

      const workerName = data.workerNamesById.get(transaction.workerId) ?? t.workers;
      const sign = transaction.type === "credit" ? "+" : "-";

      nextEvents.push(
        makeEvent({
          id: `worker-${transaction.id}`,
          title: `${workerName} ${sign}${formatCurrencyPair({ usd: transaction.amountUsd, iqd: transaction.amountIqd }, { hideZero: true })}`,
          start: date,
          allDay: true,
          extendedProps: {
            kind: "worker",
            type: transaction.type === "credit" ? "worker_credit" : "worker_debit",
            source: t.workers,
            amountUsd: transaction.amountUsd,
            amountIqd: transaction.amountIqd,
            date,
            projectId: transaction.projectId,
            projectName: transaction.projectName,
            counterparty: workerName,
            description: transaction.description,
            path: `/workers/${transaction.workerId}`,
          },
        }),
      );
    }

    return nextEvents;
  }, [data, t]);

  const visibleEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesProject = scopedProjectId == null || event.extendedProps.projectId === scopedProjectId;
      const matchesType = filter === "all" || event.extendedProps.kind === filter;
      return matchesProject && matchesType;
    });
  }, [events, filter, scopedProjectId]);

  const counts = useMemo(() => {
    return visibleEvents.reduce(
      (total, event) => {
        total.all += 1;
        total[event.extendedProps.kind] += 1;
        return total;
      },
      { all: 0, income: 0, expense: 0, due: 0, worker: 0 } as Record<CalendarFilter, number>,
    );
  }, [visibleEvents]);

  function handleEventClick(info: EventClickArg) {
    const details = info.event.extendedProps as CalendarEventDetails;
    setSelectedEvent({
      ...details,
      id: info.event.id,
      title: info.event.title,
    });
  }

  function handleDateClick(info: DateClickArg) {
    setSelectedDate(info.dateStr.slice(0, 10));
  }

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <div>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          {t.calendarTitle}
        </Typography.Title>
        <Typography.Text type="secondary">{t.calendarSub}</Typography.Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Statistic title={t.calendarImportantEvents} value={counts.all} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Statistic title={t.income} value={counts.income} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Statistic title={t.expenses} value={counts.expense} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Statistic title={t.dueDate} value={counts.due} />
          </Card>
        </Col>
      </Row>

      <Card
        title={t.calendarTitle}
        extra={
          <Space wrap>
            <Select
              aria-label={t.calendarEventType}
              style={{ minWidth: 220 }}
              value={filter}
              onChange={(value) => setFilter(value)}
              options={[
                { label: t.calendarAllEvents, value: "all" },
                { label: t.income, value: "income" },
                { label: t.expenses, value: "expense" },
                { label: t.dueDate, value: "due" },
                { label: t.workers, value: "worker" },
              ]}
            />
            <Button onClick={() => void refetch()} loading={isFetching}>
              {t.retry}
            </Button>
          </Space>
        }
      >
        {isError ? (
          <Alert
            type="error"
            showIcon
            message={t.unexpectedError}
            description={error instanceof Error ? error.message : undefined}
          />
        ) : isLoading ? (
          <div className="flex min-h-80 items-center justify-center">
            <Spin />
          </div>
        ) : (
          <div className="erp-calendar">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,listWeek",
              }}
              firstDay={1}
              height="auto"
              direction={t.dir}
              dayMaxEvents={3}
              eventContent={eventContent}
              eventClick={handleEventClick}
              dateClick={handleDateClick}
              events={visibleEvents}
              nowIndicator
            />
          </div>
        )}
      </Card>

      <Modal
        open={Boolean(selectedEvent)}
        title={selectedEvent?.title}
        onCancel={() => setSelectedEvent(null)}
        footer={
          selectedEvent?.path ? (
            <Link href={selectedEvent.path}>
              <Button type="primary">{t.calendarOpenRecord}</Button>
            </Link>
          ) : null
        }
      >
        {selectedEvent ? (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label={t.calendarSource}>
              <Tag color={colorsByKind[selectedEvent.kind].background}>{selectedEvent.source}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t.amount}>
              {formatCurrencyPair({ usd: selectedEvent.amountUsd, iqd: selectedEvent.amountIqd })}
            </Descriptions.Item>
            <Descriptions.Item label={t.date}>{formatDate(selectedEvent.date)}</Descriptions.Item>
            {selectedEvent.status ? (
              <Descriptions.Item label={t.status}>{t[selectedEvent.status]}</Descriptions.Item>
            ) : null}
            {selectedEvent.projectName ? (
              <Descriptions.Item label={t.projectOption}>{selectedEvent.projectName}</Descriptions.Item>
            ) : null}
            {selectedEvent.counterparty ? (
              <Descriptions.Item label={t.name}>{selectedEvent.counterparty}</Descriptions.Item>
            ) : null}
            {selectedEvent.description ? (
              <Descriptions.Item label={t.description}>{selectedEvent.description}</Descriptions.Item>
            ) : null}
          </Descriptions>
        ) : null}
      </Modal>

      {selectedDate ? (
        <CalendarEntryModal
          selectedDate={selectedDate}
          onClose={() => setSelectedDate(null)}
          onSaved={() => void refetch()}
        />
      ) : null}
    </Space>
  );
}

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import timeGridPlugin from "@fullcalendar/timegrid";
import type { EventClickArg, EventContentArg, EventInput } from "@fullcalendar/core";
import { Link } from "wouter";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
} from "antd";
import {
  listIncomeTransactions,
  listInvoices,
  listWorkers,
  listWorkerTransactions,
  type Currency,
  type InvoiceStatus,
} from "@/lib/erp";
import { formatCurrency, formatDate } from "@/lib/format";
import { useLang } from "@/lib/i18n";

type CalendarEventKind = "income" | "expense" | "due" | "worker";
type CalendarEventType = "income" | "expense" | "due" | "worker_credit" | "worker_debit";
type CalendarFilter = CalendarEventKind | "all";

type CalendarEventDetails = {
  kind: CalendarEventKind;
  type: CalendarEventType;
  source: string;
  amount: number;
  currency: Currency;
  date: string;
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

export default function CalendarPage() {
  const { t } = useLang();
  const [filter, setFilter] = useState<CalendarFilter>("all");
  const [selectedEvent, setSelectedEvent] = useState<SelectedEvent | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["calendar-events"],
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
          title: `${t.income}: ${formatCurrency(income.amount, income.currency)}`,
          start: date,
          allDay: true,
          extendedProps: {
            kind: "income",
            type: "income",
            source: t.income,
            amount: income.amount,
            currency: income.currency,
            date,
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
            title: `${invoice.number} - ${formatCurrency(invoice.totalAmount, invoice.currency)}`,
            start: invoiceDate,
            allDay: true,
            extendedProps: {
              kind: "expense",
              type: "expense",
              source: t.expenses,
              amount: invoice.totalAmount,
              currency: invoice.currency,
              date: invoiceDate,
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
            title: `${t.dueDate}: ${invoice.number} - ${formatCurrency(invoice.remainingAmount, invoice.currency)}`,
            start: dueDate,
            allDay: true,
            extendedProps: {
              kind: "due",
              type: "due",
              source: t.dueDate,
              amount: invoice.remainingAmount,
              currency: invoice.currency,
              date: dueDate,
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
          title: `${workerName} ${sign}${formatCurrency(transaction.amount, transaction.currency)}`,
          start: date,
          allDay: true,
          extendedProps: {
            kind: "worker",
            type: transaction.type === "credit" ? "worker_credit" : "worker_debit",
            source: t.workers,
            amount: transaction.amount,
            currency: transaction.currency,
            date,
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
    if (filter === "all") {
      return events;
    }

    return events.filter((event) => event.extendedProps.kind === filter);
  }, [events, filter]);

  const counts = useMemo(() => {
    return events.reduce(
      (total, event) => {
        total.all += 1;
        total[event.extendedProps.kind] += 1;
        return total;
      },
      { all: 0, income: 0, expense: 0, due: 0, worker: 0 } as Record<CalendarFilter, number>,
    );
  }, [events]);

  function handleEventClick(info: EventClickArg) {
    const details = info.event.extendedProps as CalendarEventDetails;
    setSelectedEvent({
      ...details,
      id: info.event.id,
      title: info.event.title,
    });
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
              {formatCurrency(selectedEvent.amount, selectedEvent.currency)}
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
    </Space>
  );
}

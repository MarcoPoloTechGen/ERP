import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Alert, App as AntApp, Button, Segmented, Space, Typography } from "antd";
import ProjectExpenseVisualization from "@/components/finance/ProjectExpenseVisualization";
import { IncomeModal } from "@/components/income/IncomeModal";
import type { IncomeRow } from "@/components/income/income-shared";
import { InvoiceModal } from "@/components/invoices/InvoiceModal";
import type { InvoiceRow } from "@/components/invoices/invoice-shared";
import { useErpInvalidation } from "@/hooks/use-erp-invalidation";
import { useIncomeTransactions } from "@/hooks/use-income";
import { useInvoices } from "@/hooks/use-invoices";
import { useProjectBuildings, useProjects } from "@/hooks/use-projects";
import type { ExpenseAssignment } from "@/lib/expense-assignment";
import { softDeleteIncomeTransaction, softDeleteInvoice, type IncomeTransaction, type Invoice } from "@/lib/erp";
import { useLang } from "@/lib/i18n";
import { useProjectScope } from "@/lib/project-scope";
import { toErrorMessage } from "@/lib/refine-helpers";

function invoiceToRow(invoice: Invoice): InvoiceRow {
  return {
    id: invoice.id,
    number: invoice.number,
    expense_type: invoice.expenseType,
    labor_worker_id: invoice.laborWorkerId,
    labor_worker_name: invoice.laborWorkerName,
    labor_person_name: invoice.laborPersonName,
    status: invoice.status,
    record_status: invoice.recordStatus,
    supplier_id: invoice.supplierId,
    supplier_name: invoice.supplierName,
    project_id: invoice.projectId,
    project_name: invoice.projectName,
    building_id: invoice.buildingId,
    building_name: invoice.buildingName,
    product_id: invoice.productId,
    product_name: invoice.productName,
    total_amount: invoice.totalAmount,
    paid_amount: invoice.paidAmount,
    remaining_amount: invoice.remainingAmount,
    currency: invoice.currency,
    total_amount_usd: invoice.totalAmountUsd,
    paid_amount_usd: invoice.paidAmountUsd,
    remaining_amount_usd: invoice.remainingAmountUsd,
    total_amount_iqd: invoice.totalAmountIqd,
    paid_amount_iqd: invoice.paidAmountIqd,
    remaining_amount_iqd: invoice.remainingAmountIqd,
    invoice_date: invoice.invoiceDate,
    due_date: invoice.dueDate,
    notes: invoice.notes,
    image_path: invoice.imagePath,
    created_by_name: invoice.createdByName,
    created_at: invoice.createdAt,
  };
}

function incomeToRow(income: IncomeTransaction): IncomeRow {
  return {
    id: income.id,
    project_id: income.projectId,
    project_name: income.projectName,
    building_id: income.buildingId,
    building_name: income.buildingName,
    amount: income.amount,
    currency: income.currency,
    amount_usd: income.amountUsd,
    amount_iqd: income.amountIqd,
    description: income.description,
    date: income.date,
    record_status: income.recordStatus,
    created_by_name: income.createdByName,
  };
}

export default function Buildings() {
  const { t } = useLang();
  const { selectedProjectId: scopedProjectId } = useProjectScope();
  const { message } = AntApp.useApp();
  const erpInvalidation = useErpInvalidation();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [initialAssignment, setInitialAssignment] = useState<ExpenseAssignment | undefined>();
  const [transactionKind, setTransactionKind] = useState<"expense" | "income">("expense");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceRow | undefined>();
  const [editingIncome, setEditingIncome] = useState<IncomeRow | null>(null);

  const { data: projects } = useProjects();
  const invoicesQuery = useInvoices();
  const incomesQuery = useIncomeTransactions();

  const deleteInvoiceMutation = useMutation({
    mutationFn: (invoice: InvoiceRow) => {
      if (invoice.id == null) {
        throw new Error(t.notFound);
      }

      return softDeleteInvoice(invoice.id);
    },
    onSuccess: async () => {
      await erpInvalidation.invoices();
      await invoicesQuery.refetch();
      closeEditModal();
      void message.success(t.deleted);
    },
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  const deleteIncomeMutation = useMutation({
    mutationFn: (income: IncomeRow) => {
      if (income.id == null) {
        throw new Error(t.notFound);
      }

      return softDeleteIncomeTransaction(income.id);
    },
    onSuccess: async () => {
      await erpInvalidation.income();
      await incomesQuery.refetch();
      closeEditModal();
      void message.success(t.deleted);
    },
    onError: (error) => void message.error(toErrorMessage(error)),
  });

  useEffect(() => {
    if (!projects?.length) {
      setSelectedProjectId(null);
      return;
    }

    if (scopedProjectId != null) {
      setSelectedProjectId(scopedProjectId);
      return;
    }

    if (selectedProjectId == null || !projects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, scopedProjectId, selectedProjectId]);

  const buildingsQuery = useProjectBuildings(selectedProjectId, selectedProjectId != null);
  const hasError = invoicesQuery.isError || incomesQuery.isError || buildingsQuery.isError;
  const selector = initialAssignment ? (
    <Segmented<"expense" | "income">
      block
      options={[
        { label: t.expenses, value: "expense" },
        { label: t.income, value: "income" },
      ]}
      value={transactionKind}
      onChange={setTransactionKind}
    />
  ) : null;

  function closeModal() {
    setModalOpen(false);
    setInitialAssignment(undefined);
    setTransactionKind("expense");
  }

  function closeEditModal() {
    setEditingInvoice(undefined);
    setEditingIncome(null);
  }

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <div>
        <Typography.Title level={2} style={{ margin: 0 }}>
          {t.buildingsTitle}
        </Typography.Title>
      </div>

      {hasError ? (
        <Alert
          showIcon
          type="error"
          message={t.buildingsTitle}
          description={toErrorMessage(invoicesQuery.error ?? incomesQuery.error ?? buildingsQuery.error)}
          action={
            <Button
              onClick={() => {
                void invoicesQuery.refetch();
                void incomesQuery.refetch();
                void buildingsQuery.refetch();
              }}
            >
              {t.retry}
            </Button>
          }
        />
      ) : null}

      <ProjectExpenseVisualization
        buildings={buildingsQuery.data}
        incomes={incomesQuery.data}
        invoices={invoicesQuery.data}
        loading={invoicesQuery.isLoading || incomesQuery.isLoading || buildingsQuery.isLoading}
        projects={projects}
        projectLocked={scopedProjectId != null}
        selectedProjectId={selectedProjectId}
        onAddTransaction={(assignment) => {
          closeEditModal();
          setInitialAssignment(assignment);
          setTransactionKind("expense");
          setModalOpen(true);
        }}
        onEditTransaction={(movement) => {
          closeModal();
          if (movement.type === "income") {
            setEditingIncome(incomeToRow(movement.source));
            setEditingInvoice(undefined);
            return;
          }

          setEditingInvoice(invoiceToRow(movement.source));
          setEditingIncome(null);
        }}
        onProjectChange={setSelectedProjectId}
      />

      {modalOpen && initialAssignment && transactionKind === "income" ? (
        <IncomeModal
          headerExtra={selector}
          income={null}
          initialAssignment={initialAssignment}
          open
          onClose={closeModal}
          onSaved={() => {
            void erpInvalidation.income();
            void incomesQuery.refetch();
            closeModal();
          }}
        />
      ) : modalOpen ? (
        <InvoiceModal
          headerExtra={selector}
          initialAssignment={initialAssignment}
          onClose={closeModal}
          onSaved={() => {
            void erpInvalidation.invoices();
            void invoicesQuery.refetch();
            closeModal();
          }}
        />
      ) : editingIncome ? (
        <IncomeModal
          deleteLoading={deleteIncomeMutation.isPending}
          income={editingIncome}
          open
          onClose={closeEditModal}
          onDelete={() => deleteIncomeMutation.mutate(editingIncome)}
          onSaved={() => {
            void erpInvalidation.income();
            void incomesQuery.refetch();
          }}
        />
      ) : editingInvoice ? (
        <InvoiceModal
          deleteLoading={deleteInvoiceMutation.isPending}
          invoice={editingInvoice}
          onClose={closeEditModal}
          onDelete={() => deleteInvoiceMutation.mutate(editingInvoice)}
          onSaved={() => {
            void erpInvalidation.invoices();
            void invoicesQuery.refetch();
          }}
        />
      ) : null}
    </Space>
  );
}

import { useEffect, useState } from "react";
import { Alert, Button, Segmented, Space, Typography } from "antd";
import ProjectExpenseVisualization from "@/components/finance/ProjectExpenseVisualization";
import { IncomeModal } from "@/components/income/IncomeModal";
import { InvoiceModal } from "@/components/invoices/InvoiceModal";
import { useErpInvalidation } from "@/hooks/use-erp-invalidation";
import { useIncomeTransactions } from "@/hooks/use-income";
import { useInvoices } from "@/hooks/use-invoices";
import { useProjectBuildings, useProjects } from "@/hooks/use-projects";
import type { ExpenseAssignment } from "@/lib/expense-assignment";
import { useLang } from "@/lib/i18n";
import { useProjectScope } from "@/lib/project-scope";
import { toErrorMessage } from "@/lib/refine-helpers";

export default function Buildings() {
  const { t } = useLang();
  const { selectedProjectId: scopedProjectId } = useProjectScope();
  const erpInvalidation = useErpInvalidation();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [initialAssignment, setInitialAssignment] = useState<ExpenseAssignment | undefined>();
  const [transactionKind, setTransactionKind] = useState<"expense" | "income">("expense");
  const [modalOpen, setModalOpen] = useState(false);

  const { data: projects } = useProjects();
  const invoicesQuery = useInvoices();
  const incomesQuery = useIncomeTransactions();

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
          setInitialAssignment(assignment);
          setTransactionKind("expense");
          setModalOpen(true);
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
      ) : null}
    </Space>
  );
}

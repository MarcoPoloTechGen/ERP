import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createInvoice,
  createSupplierTransaction,
  createWorkerTransaction,
  listProjects,
  listProjectBuildings,
  listSuppliers,
  listWorkers,
} from '@/lib/erp-core';
import type { Currency } from '@/lib/erp-core';

export interface ExpenseFormData {
  amountUsd?: number;
  amountIqd?: number;
  description?: string;
  date: string;
  projectId?: number;
  buildingId?: number;
  workerId?: number;
  supplierId?: number;
  partyType: 'worker' | 'supplier' | 'general';
}

function normalizeAmounts(data: ExpenseFormData) {
  const amountUsd = Number(data.amountUsd || 0);
  const amountIqd = Number(data.amountIqd || 0);
  const currency: Currency = amountUsd > 0 || amountIqd === 0 ? 'USD' : 'IQD';
  const primaryAmount = currency === 'USD' ? amountUsd : amountIqd;

  return {
    amountUsd,
    amountIqd,
    currency,
    primaryAmount,
  };
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ExpenseFormData) => {
      const amounts = normalizeAmounts(data);

      if (data.partyType === 'worker' && data.workerId) {
        return createWorkerTransaction({
          workerId: data.workerId,
          totalAmountUsd: amounts.amountUsd,
          paidAmountUsd: 0,
          totalAmountIqd: amounts.amountIqd,
          paidAmountIqd: 0,
          description: data.description ?? null,
          date: data.date,
          projectId: data.projectId ?? null,
          buildingId: data.buildingId ?? null,
        });
      }

      if (data.partyType === 'supplier' && data.supplierId) {
        return createSupplierTransaction({
          supplierId: data.supplierId,
          totalAmountUsd: amounts.amountUsd,
          paidAmountUsd: 0,
          totalAmountIqd: amounts.amountIqd,
          paidAmountIqd: 0,
          description: data.description ?? null,
          date: data.date,
          projectId: data.projectId ?? null,
          buildingId: data.buildingId ?? null,
        });
      }

      return createInvoice({
        number: `EXP-${Date.now()}`,
        expenseType: 'logistics',
        laborWorkerId: null,
        laborPersonName: null,
        supplierId: null,
        projectId: data.projectId,
        buildingId: data.buildingId ?? null,
        productId: null,
        totalAmount: amounts.primaryAmount,
        paidAmount: amounts.primaryAmount,
        currency: amounts.currency,
        totalAmountUsd: amounts.amountUsd,
        paidAmountUsd: amounts.amountUsd,
        totalAmountIqd: amounts.amountIqd,
        paidAmountIqd: amounts.amountIqd,
        status: 'paid',
        invoiceDate: data.date,
        notes: data.description ?? null,
        dueDate: data.date,
        imagePath: null,
      });
    },
    onSuccess: () => {
      toast.success('Depense creee avec succes');
      void queryClient.invalidateQueries({ queryKey: ['allExpenses'] });
      void queryClient.invalidateQueries({ queryKey: ['workerTransactions'] });
      void queryClient.invalidateQueries({ queryKey: ['supplierTransactions'] });
      void queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error: Error) => {
      toast.error(`Erreur lors de la creation: ${error.message}`);
    },
  });
}

export function useExpenseFormData() {
  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: listProjects,
    staleTime: 1000 * 60 * 5,
  });

  const workersQuery = useQuery({
    queryKey: ['workers'],
    queryFn: listWorkers,
    staleTime: 1000 * 60 * 5,
  });

  const suppliersQuery = useQuery({
    queryKey: ['suppliers'],
    queryFn: listSuppliers,
    staleTime: 1000 * 60 * 5,
  });

  const buildingsQuery = useQuery({
    queryKey: ['projectBuildings'],
    queryFn: () => listProjectBuildings(),
    staleTime: 1000 * 60 * 5,
  });

  return {
    projects: projectsQuery.data || [],
    buildings: buildingsQuery.data || [],
    workers: workersQuery.data || [],
    suppliers: suppliersQuery.data || [],
    isLoading: projectsQuery.isLoading || buildingsQuery.isLoading || workersQuery.isLoading || suppliersQuery.isLoading,
    error: projectsQuery.error || buildingsQuery.error || workersQuery.error || suppliersQuery.error,
  };
}

export function useExpenseForm(initialData?: Partial<ExpenseFormData>) {
  const [formData, setFormData] = useState<ExpenseFormData>({
    amountUsd: 0,
    amountIqd: 0,
    date: new Date().toISOString().split('T')[0],
    partyType: 'general',
    ...initialData,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: keyof ExpenseFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as string]) {
      setErrors((prev) => ({ ...prev, [field as string]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const amountUsd = Number(formData.amountUsd || 0);
    const amountIqd = Number(formData.amountIqd || 0);

    if (amountUsd <= 0 && amountIqd <= 0) {
      newErrors.amountUsd = 'Renseigner un montant USD, IQD ou les deux';
    }

    if (!formData.date) {
      newErrors.date = 'La date est obligatoire';
    }

    if (!formData.projectId) {
      newErrors.projectId = 'Le projet est obligatoire';
    }

    if (!formData.buildingId) {
      newErrors.buildingId = 'Le batiment est obligatoire';
    }

    if (formData.partyType === 'worker' && !formData.workerId) {
      newErrors.workerId = 'Le travailleur est obligatoire';
    }

    if (formData.partyType === 'supplier' && !formData.supplierId) {
      newErrors.supplierId = 'Le fournisseur est obligatoire';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      amountUsd: 0,
      amountIqd: 0,
      date: new Date().toISOString().split('T')[0],
      partyType: 'general',
      ...initialData,
    });
    setErrors({});
  };

  return {
    formData,
    errors,
    updateField,
    validateForm,
    resetForm,
  };
}

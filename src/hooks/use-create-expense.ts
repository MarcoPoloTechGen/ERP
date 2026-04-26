import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  createWorkerTransaction, 
  createSupplierTransaction,
  createInvoice,
  listProjects,
  listWorkers,
  listSuppliers,
  type ExpenseFormData 
} from '@/lib/erp-core';

// Hook pour créer une dépense unifiée
export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ExpenseFormData) => {
      let result;

      // Selon le type de partie, créer la transaction appropriée
      if (data.partyType === 'worker' && data.workerId) {
        // Créer une transaction de travailleur
        result = await createWorkerTransaction({
          workerId: data.workerId,
          type: 'debit', // Toujours un débit pour les dépenses
          amountUsd: data.amountUsd || (data.currency === 'USD' ? data.amount : 0),
          amountIqd: data.amountIqd || (data.currency === 'IQD' ? data.amount : 0),
          description: data.description,
          date: data.date,
          projectId: data.projectId,
          expenseCategory: data.category,
        });
      } else if (data.partyType === 'supplier' && data.supplierId) {
        // Créer une transaction de fournisseur
        result = await createSupplierTransaction({
          supplierId: data.supplierId,
          type: 'debit', // Toujours un débit pour les dépenses
          amountUsd: data.amountUsd || (data.currency === 'USD' ? data.amount : 0),
          amountIqd: data.amountIqd || (data.currency === 'IQD' ? data.amount : 0),
          description: data.description,
          date: data.date,
          projectId: data.projectId,
          expenseCategory: data.category,
        });
      } else {
        // Créer une facture pour les dépenses générales
        result = await createInvoice({
          number: `EXP-${Date.now()}`, // Numéro automatique
          expenseType: data.category,
          laborWorkerId: null,
          laborPersonName: null,
          supplierId: null,
          projectId: data.projectId,
          buildingId: null,
          productId: null,
          totalAmount: data.amount,
          paidAmount: data.amount, // Payé immédiatement
          currency: data.currency,
          totalAmountUsd: data.amountUsd || (data.currency === 'USD' ? data.amount : 0),
          paidAmountUsd: data.amountUsd || (data.currency === 'USD' ? data.amount : 0),
          totalAmountIqd: data.amountIqd || (data.currency === 'IQD' ? data.amount : 0),
          paidAmountIqd: data.amountIqd || (data.currency === 'IQD' ? data.amount : 0),
          notes: data.description,
          dueDate: data.date,
        });
      }

      return result;
    },
    onSuccess: () => {
      toast.success('Dépense créée avec succès');
      
      // Invalider les requêtes pertinentes
      queryClient.invalidateQueries({ queryKey: ['allExpenses'] });
      queryClient.invalidateQueries({ queryKey: ['workerTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['supplierTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error: Error) => {
      toast.error(`Erreur lors de la création: ${error.message}`);
    },
  });
}

// Hook pour charger les données nécessaires au formulaire
export function useExpenseFormData() {
  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: listProjects,
    staleTime: 1000 * 60 * 5, // 5 minutes
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

  return {
    projects: projectsQuery.data || [],
    workers: workersQuery.data || [],
    suppliers: suppliersQuery.data || [],
    isLoading: projectsQuery.isLoading || workersQuery.isLoading || suppliersQuery.isLoading,
    error: projectsQuery.error || workersQuery.error || suppliersQuery.error,
  };
}

// Hook pour gérer l'état du formulaire de dépense
export function useExpenseForm(initialData?: Partial<ExpenseFormData>) {
  const [formData, setFormData] = useState<ExpenseFormData>({
    amount: 0,
    currency: 'USD',
    category: 'other',
    date: new Date().toISOString().split('T')[0],
    partyType: 'general',
    ...initialData,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: keyof ExpenseFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Effacer l'erreur quand l'utilisateur corrige
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Le montant est obligatoire et doit être positif';
    }

    if (!formData.category) {
      newErrors.category = 'La catégorie est obligatoire';
    }

    if (!formData.date) {
      newErrors.date = 'La date est obligatoire';
    }

    if (formData.partyType === 'worker' && !formData.workerId) {
      newErrors.workerId = 'Le travailleur est obligatoire';
    }

    if (formData.partyType === 'supplier' && !formData.supplierId) {
      newErrors.supplierId = 'Le fournisseur est obligatoire';
    }

    // Validation des montants en double devise
    if (formData.currency === 'USD') {
      if (formData.amountUsd !== undefined && formData.amountUsd <= 0) {
        newErrors.amountUsd = 'Le montant USD doit être positif';
      }
    } else {
      if (formData.amountIqd !== undefined && formData.amountIqd <= 0) {
        newErrors.amountIqd = 'Le montant IQD doit être positif';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      amount: 0,
      currency: 'USD',
      category: 'other',
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

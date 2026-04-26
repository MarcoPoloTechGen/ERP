import React from 'react';
import { ExpenseForm, ExpenseFormData } from '@/components/expenses/ExpenseForm';
import { useCreateExpense, useExpenseFormData } from '@/hooks/use-create-expense';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CreateExpensePage() {
  const router = useRouter();
  const createExpense = useCreateExpense();
  const { projects, workers, suppliers, isLoading, error } = useExpenseFormData();

  const handleSubmit = async (data: ExpenseFormData) => {
    await createExpense.mutateAsync(data);
    router.push('/expenses');
  };

  const handleCancel = () => {
    router.push('/expenses');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Chargement des données...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-red-600">Erreur de chargement</CardTitle>
            <CardDescription>
              Impossible de charger les données nécessaires. Veuillez réessayer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Réessayer
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-center mb-2">
          Créer une Nouvelle Dépense
        </h1>
        <p className="text-center text-gray-600">
          Utilisez ce formulaire pour créer une dépense dans n'importe quelle partie de l'application
        </p>
      </div>

      <ExpenseForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        title="Nouvelle Dépense"
        description="Remplissez les informations ci-dessous pour créer une nouvelle dépense"
        isLoading={createExpense.isPending}
        projects={projects}
        workers={workers}
        suppliers={suppliers}
      />
    </div>
  );
}

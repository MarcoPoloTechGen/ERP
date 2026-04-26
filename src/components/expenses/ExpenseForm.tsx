import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Types pour les dépenses
export interface ExpenseFormData {
  amount: number;
  amountUsd?: number;
  amountIqd?: number;
  currency: 'USD' | 'IQD';
  category: string;
  description?: string;
  date: string;
  projectId?: number;
  workerId?: number;
  supplierId?: number;
  partyType: 'worker' | 'supplier' | 'general';
}

export interface ExpenseFormProps {
  onSubmit: (data: ExpenseFormData) => Promise<void>;
  onCancel?: () => void;
  initialData?: Partial<ExpenseFormData>;
  title?: string;
  description?: string;
  isLoading?: boolean;
  projects?: Array<{ id: number; name: string }>;
  workers?: Array<{ id: number; name: string }>;
  suppliers?: Array<{ id: number; name: string }>;
}

// Catégories de dépenses communes
const EXPENSE_CATEGORIES = [
  { value: 'salary_payment', label: 'Paiement Salaire' },
  { value: 'supplier_payment', label: 'Paiement Fournisseur' },
  { value: 'material_purchase', label: 'Achat Matériel' },
  { value: 'services', label: 'Services' },
  { value: 'transport', label: 'Transport' },
  { value: 'rent', label: 'Loyer' },
  { value: 'utilities', label: 'Services Publics' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'insurance', label: 'Assurance' },
  { value: 'taxes', label: 'Taxes' },
  { value: 'other', label: 'Autre' },
];

export function ExpenseForm({
  onSubmit,
  onCancel,
  initialData,
  title = "Nouvelle Dépense",
  description = "Créez une nouvelle dépense avec les informations requises",
  isLoading = false,
  projects = [],
  workers = [],
  suppliers = [],
}: ExpenseFormProps) {
  const [formData, setFormData] = useState<ExpenseFormData>({
    amount: 0,
    currency: 'USD',
    category: 'other',
    date: new Date().toISOString().split('T')[0],
    partyType: 'general',
    ...initialData,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validation des champs obligatoires
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
    }
  };

  const updateField = (field: keyof ExpenseFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Effacer l'erreur quand l'utilisateur corrige
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">{title}</CardTitle>
        <CardDescription className="text-center">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations de base */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-medium">
                Montant <span className="text-red-500">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount || ''}
                onChange={(e) => updateField('amount', parseFloat(e.target.value) || 0)}
                className={errors.amount ? 'border-red-500' : ''}
              />
              {errors.amount && (
                <p className="text-sm text-red-500">{errors.amount}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency" className="text-sm font-medium">
                Devise <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.currency}
                onValueChange={(value: 'USD' | 'IQD') => updateField('currency', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner la devise" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="IQD">IQD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Montants en double devise */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amountUsd" className="text-sm font-medium">
                Montant USD
              </Label>
              <Input
                id="amountUsd"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amountUsd || ''}
                onChange={(e) => updateField('amountUsd', parseFloat(e.target.value) || undefined)}
                className={errors.amountUsd ? 'border-red-500' : ''}
              />
              {errors.amountUsd && (
                <p className="text-sm text-red-500">{errors.amountUsd}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amountIqd" className="text-sm font-medium">
                Montant IQD
              </Label>
              <Input
                id="amountIqd"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amountIqd || ''}
                onChange={(e) => updateField('amountIqd', parseFloat(e.target.value) || undefined)}
                className={errors.amountIqd ? 'border-red-500' : ''}
              />
              {errors.amountIqd && (
                <p className="text-sm text-red-500">{errors.amountIqd}</p>
              )}
            </div>
          </div>

          {/* Catégorie et Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-medium">
                Catégorie <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) => updateField('category', value)}
              >
                <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-red-500">{errors.category}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date" className="text-sm font-medium">
                Date <span className="text-red-500">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.date && "text-muted-foreground",
                      errors.date && "border-red-500"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date ? (
                      format(new Date(formData.date), "PPP", { locale: fr })
                    ) : (
                      "Sélectionner une date"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={new Date(formData.date)}
                    onSelect={(date) => {
                      if (date) {
                        updateField('date', date.toISOString().split('T')[0]);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.date && (
                <p className="text-sm text-red-500">{errors.date}</p>
              )}
            </div>
          </div>

          {/* Type de partie */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Type de partie <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.partyType}
              onValueChange={(value: 'worker' | 'supplier' | 'general') => updateField('partyType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner le type de partie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">Général</SelectItem>
                <SelectItem value="worker">Travailleur</SelectItem>
                <SelectItem value="supplier">Fournisseur</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sélection du travailleur/fournisseur selon le type */}
          {formData.partyType === 'worker' && (
            <div className="space-y-2">
              <Label htmlFor="workerId" className="text-sm font-medium">
                Travailleur <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.workerId?.toString()}
                onValueChange={(value) => updateField('workerId', parseInt(value))}
              >
                <SelectTrigger className={errors.workerId ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Sélectionner un travailleur" />
                </SelectTrigger>
                <SelectContent>
                  {workers.map((worker) => (
                    <SelectItem key={worker.id} value={worker.id.toString()}>
                      {worker.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.workerId && (
                <p className="text-sm text-red-500">{errors.workerId}</p>
              )}
            </div>
          )}

          {formData.partyType === 'supplier' && (
            <div className="space-y-2">
              <Label htmlFor="supplierId" className="text-sm font-medium">
                Fournisseur <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.supplierId?.toString()}
                onValueChange={(value) => updateField('supplierId', parseInt(value))}
              >
                <SelectTrigger className={errors.supplierId ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Sélectionner un fournisseur" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id.toString()}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.supplierId && (
                <p className="text-sm text-red-500">{errors.supplierId}</p>
              )}
            </div>
          )}

          {/* Projet */}
          <div className="space-y-2">
            <Label htmlFor="projectId" className="text-sm font-medium">
              Projet
            </Label>
            <Select
              value={formData.projectId?.toString()}
              onValueChange={(value) => updateField('projectId', value ? parseInt(value) : undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un projet (optionnel)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Aucun projet</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Ajouter une description (optionnel)"
              value={formData.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              rows={3}
            />
          </div>

          {/* Boutons d'action */}
          <div className="flex justify-end space-x-4 pt-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
              >
                Annuler
              </Button>
            )}
            <Button
              type="submit"
              disabled={isLoading}
              className="min-w-[120px]"
            >
              {isLoading ? 'Création...' : 'Créer la dépense'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

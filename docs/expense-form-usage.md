# Formulaire Unifié de Dépenses - Guide d'Utilisation

## 📋 Vue d'Ensemble

Le formulaire unifié de dépenses permet de créer des dépenses dans n'importe quelle partie de l'application avec la même logique de titre et champs obligatoires.

## 🎯 Objectif

Assurer une expérience utilisateur cohérente pour la création de dépenses, que ce soit pour :
- Les paiements aux travailleurs
- Les paiements aux fournisseurs  
- Les dépenses générales (factures)

## 🔧 Composants

### 1. ExpenseForm Component
**Fichier :** `src/components/expenses/ExpenseForm.tsx`

**Props principales :**
```typescript
interface ExpenseFormProps {
  onSubmit: (data: ExpenseFormData) => Promise<void>;  // Fonction de soumission
  onCancel?: () => void;                               // Fonction d'annulation
  initialData?: Partial<ExpenseFormData>;             // Données initiales
  title?: string;                                      // Titre personnalisé
  description?: string;                                // Description personnalisée
  isLoading?: boolean;                                 // État de chargement
  projects?: Array<{ id: number; name: string }>;     // Liste des projets
  workers?: Array<{ id: number; name: string }>;      // Liste des travailleurs
  suppliers?: Array<{ id: number; name: string }>;    // Liste des fournisseurs
}
```

### 2. useCreateExpense Hook
**Fichier :** `src/hooks/use-create-expense.ts`

**Fonctionnalités :**
- Création automatique selon le type de partie
- Validation des données
- Gestion des erreurs
- Invalidement du cache

### 3. useExpenseFormData Hook
**Fichier :** `src/hooks/use-create-expense.ts`

**Fonctionnalités :**
- Chargement des données nécessaires (projets, travailleurs, fournisseurs)
- Gestion de l'état de chargement
- Gestion des erreurs

## 📝 Champs Obligatoires Communs

### Champs requis (marqués avec *) :
- **Montant** - Le montant de la dépense
- **Devise** - USD ou IQD
- **Catégorie** - Type de dépense
- **Date** - Date de la dépense
- **Type de partie** - Travailleur, Fournisseur ou Général

### Champs conditionnels :
- **Travailleur** - Requis si type = "Travailleur"
- **Fournisseur** - Requis si type = "Fournisseur"

### Champs optionnels :
- **Montant USD** - Pour les montants en double devise
- **Montant IQD** - Pour les montants en double devise
- **Projet** - Association à un projet
- **Description** - Notes supplémentaires

## 🏷️ Catégories de Dépenses

Catégories prédéfinies disponibles :
- `salary_payment` - Paiement Salaire
- `supplier_payment` - Paiement Fournisseur
- `material_purchase` - Achat Matériel
- `services` - Services
- `transport` - Transport
- `rent` - Loyer
- `utilities` - Services Publics
- `maintenance` - Maintenance
- `insurance` - Assurance
- `taxes` - Taxes
- `other` - Autre

## 🚀 Utilisation

### 1. Importation
```typescript
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { useCreateExpense, useExpenseFormData } from '@/hooks/use-create-expense';
```

### 2. Utilisation de base
```typescript
function MyExpensePage() {
  const createExpense = useCreateExpense();
  const { projects, workers, suppliers } = useExpenseFormData();

  const handleSubmit = async (data: ExpenseFormData) => {
    await createExpense.mutateAsync(data);
    // Redirection ou autre action
  };

  return (
    <ExpenseForm
      onSubmit={handleSubmit}
      projects={projects}
      workers={workers}
      suppliers={suppliers}
    />
  );
}
```

### 3. Personnalisation
```typescript
<ExpenseForm
  onSubmit={handleSubmit}
  title="Paiement Fournisseur"
  description="Enregistrer un paiement pour un fournisseur"
  initialData={{
    partyType: 'supplier',
    category: 'supplier_payment'
  }}
  projects={projects}
  workers={workers}
  suppliers={suppliers}
/>
```

## 🔄 Logique de Création

Le formulaire crée automatiquement le bon type d'enregistrement selon le `partyType` :

### Si `partyType = "worker"` :
- Crée une transaction de travailleur via `createWorkerTransaction()`
- Type : `debit` (sortie d'argent)
- Enregistre dans `party_transactions` avec `party_type = 'worker'`

### Si `partyType = "supplier"` :
- Crée une transaction de fournisseur via `createSupplierTransaction()`
- Type : `debit` (sortie d'argent)
- Enregistre dans `party_transactions` avec `party_type = 'supplier'`

### Si `partyType = "general"` :
- Crée une facture via `createInvoice()`
- Numéro automatique : `EXP-{timestamp}`
- Statut : `paid` (payé immédiatement)
- Enregistre dans `invoices`

## ✅ Validation

Le formulaire inclut une validation complète :

### Validation des champs obligatoires
- Montant positif
- Catégorie sélectionnée
- Date valide
- Travailleur/Fournisseur si applicable

### Validation des montants
- Montants USD/IQD positifs si spécifiés
- Cohérence des devises

## 🎨 Personnalisation

### Modification du titre par défaut
```typescript
<ExpenseForm
  title="Nouvelle Dépense Projet"
  description="Ajoutez une dépense pour ce projet spécifique"
  // ... autres props
/>
```

### Ajout de catégories personnalisées
Modifier `EXPENSE_CATEGORIES` dans `ExpenseForm.tsx` :
```typescript
const EXPENSE_CATEGORIES = [
  // ... catégories existantes
  { value: 'custom_category', label: 'Catégorie Personnalisée' },
];
```

### Styles personnalisés
La composante utilise Tailwind CSS et peut être stylée via les props className.

## 📱 Pages d'Exemple

### Page de création de dépense
**URL :** `/expenses/create`
**Fichier :** `src/app/expenses/create/page.tsx`

### Intégration dans d'autres pages
```typescript
// Dans une page de projet
<ExpenseForm
  onSubmit={handleProjectExpense}
  initialData={{ projectId: currentProject.id }}
  title={`Dépense - ${currentProject.name}`}
/>

// Dans une page de travailleur
<ExpenseForm
  onSubmit={handleWorkerPayment}
  initialData={{ 
    partyType: 'worker', 
    workerId: currentWorker.id,
    category: 'salary_payment'
  }}
  title={`Paiement - ${currentWorker.name}`}
/>
```

## 🔧 Maintenance

### Ajout d'un nouveau champ
1. Mettre à jour `ExpenseFormData` dans `ExpenseForm.tsx`
2. Ajouter le champ dans le JSX
3. Mettre à jour la validation
4. Adapter les hooks si nécessaire

### Modification des catégories
1. Mettre à jour `EXPENSE_CATEGORIES`
2. Mettre à jour les types si nécessaire
3. Tester la validation

## 📊 Intégration avec la Vue Unifiée

Toutes les dépenses créées via ce formulaire sont automatiquement disponibles dans la vue `all_expenses` pour :
- Les rapports consolidés
- Les analyses globales
- Le suivi des dépenses par catégorie

## 🎯 Avantages

1. **Cohérence** - Même interface partout
2. **Validation** - Validation centralisée
3. **Extensibilité** - Facile à personnaliser
4. **Maintenance** - Un seul composant à maintenir
5. **Accessibilité** - Interface accessible et responsive

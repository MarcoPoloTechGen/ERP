import React, { useState } from 'react';
import { Button, Input, Select, DatePicker, Form, Card, Typography, Space, Row, Col } from 'antd';

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
  const [form] = Form.useForm();
  const [formData, setFormData] = useState<ExpenseFormData>({
    amount: 0,
    currency: 'USD',
    category: 'other',
    date: new Date().toISOString().split('T')[0],
    partyType: 'general',
    ...initialData,
  });

  const handleSubmit = async (values: any) => {
    try {
      const expenseData: ExpenseFormData = {
        ...formData,
        ...values,
        date: values.date?.format('YYYY-MM-DD') || formData.date,
      };
      await onSubmit(expenseData);
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
    }
  };

  const updateField = (field: keyof ExpenseFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card title={title} extra={<Typography.Text>{description}</Typography.Text>}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          amount: formData.amount,
          currency: formData.currency,
          category: formData.category,
          date: formData.date ? new Date(formData.date) : null,
          partyType: formData.partyType,
          workerId: formData.workerId,
          supplierId: formData.supplierId,
          projectId: formData.projectId,
          amountUsd: formData.amountUsd,
          amountIqd: formData.amountIqd,
          description: formData.description,
        }}
      >
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="amount"
              label="Montant *"
              rules={[{ required: true, message: 'Le montant est obligatoire' }]}
            >
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                onChange={(e) => updateField('amount', parseFloat(e.target.value) || 0)}
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} md={12}>
            <Form.Item
              name="currency"
              label="Devise *"
              rules={[{ required: true, message: 'La devise est obligatoire' }]}
            >
              <Select
                placeholder="Sélectionner la devise"
                onChange={(value: 'USD' | 'IQD') => updateField('currency', value)}
              >
                <Select.Option value="USD">USD</Select.Option>
                <Select.Option value="IQD">IQD</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="amountUsd" label="Montant USD">
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                onChange={(e) => updateField('amountUsd', parseFloat(e.target.value) || undefined)}
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} md={12}>
            <Form.Item name="amountIqd" label="Montant IQD">
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                onChange={(e) => updateField('amountIqd', parseFloat(e.target.value) || undefined)}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="category"
              label="Catégorie *"
              rules={[{ required: true, message: 'La catégorie est obligatoire' }]}
            >
              <Select
                placeholder="Sélectionner une catégorie"
                onChange={(value) => updateField('category', value)}
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <Select.Option key={cat.value} value={cat.value}>
                    {cat.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          
          <Col xs={24} md={12}>
            <Form.Item
              name="date"
              label="Date *"
              rules={[{ required: true, message: 'La date est obligatoire' }]}
            >
              <DatePicker
                style={{ width: '100%' }}
                placeholder="Sélectionner une date"
                format="DD/MM/YYYY"
                onChange={(date) => {
                  if (date) {
                    updateField('date', date.format('YYYY-MM-DD'));
                  }
                }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="partyType"
          label="Type de partie *"
          rules={[{ required: true, message: 'Le type de partie est obligatoire' }]}
        >
          <Select
            placeholder="Sélectionner le type de partie"
            onChange={(value: 'worker' | 'supplier' | 'general') => updateField('partyType', value)}
          >
            <Select.Option value="general">Général</Select.Option>
            <Select.Option value="worker">Travailleur</Select.Option>
            <Select.Option value="supplier">Fournisseur</Select.Option>
          </Select>
        </Form.Item>

        {formData.partyType === 'worker' && (
          <Form.Item
            name="workerId"
            label="Travailleur *"
            rules={[{ required: true, message: 'Le travailleur est obligatoire' }]}
          >
            <Select
              placeholder="Sélectionner un travailleur"
              onChange={(value) => updateField('workerId', parseInt(value))}
            >
              {workers.map((worker) => (
                <Select.Option key={worker.id} value={worker.id}>
                  {worker.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {formData.partyType === 'supplier' && (
          <Form.Item
            name="supplierId"
            label="Fournisseur *"
            rules={[{ required: true, message: 'Le fournisseur est obligatoire' }]}
          >
            <Select
              placeholder="Sélectionner un fournisseur"
              onChange={(value) => updateField('supplierId', parseInt(value))}
            >
              {suppliers.map((supplier) => (
                <Select.Option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        )}

        <Form.Item name="projectId" label="Projet">
          <Select
            placeholder="Sélectionner un projet (optionnel)"
            allowClear
            onChange={(value) => updateField('projectId', value ? parseInt(value) : undefined)}
          >
            {projects.map((project) => (
              <Select.Option key={project.id} value={project.id}>
                {project.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="description" label="Description">
          <Input.TextArea
            placeholder="Ajouter une description (optionnel)"
            rows={3}
            onChange={(e) => updateField('description', e.target.value)}
          />
        </Form.Item>

        <Form.Item>
          <Space>
            {onCancel && (
              <Button onClick={onCancel} disabled={isLoading}>
                Annuler
              </Button>
            )}
            <Button type="primary" htmlType="submit" loading={isLoading}>
              {isLoading ? 'Création...' : 'Créer la dépense'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
}

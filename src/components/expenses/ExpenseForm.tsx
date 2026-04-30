import React, { useState } from 'react';
import { Button, Card, Col, Form, Input, InputNumber, Row, Select, Space, Typography } from 'antd';
import { currencyInputProps } from '@/lib/format';

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

export interface ExpenseFormProps {
  onSubmit: (data: ExpenseFormData) => Promise<void>;
  onCancel?: () => void;
  initialData?: Partial<ExpenseFormData>;
  title?: string;
  description?: string;
  isLoading?: boolean;
  projects?: Array<{ id: number; name: string }>;
  buildings?: Array<{ id: number; name: string; projectId: number }>;
  workers?: Array<{ id: number; name: string }>;
  suppliers?: Array<{ id: number; name: string }>;
}

export function ExpenseForm({
  onSubmit,
  onCancel,
  initialData,
  title = 'Nouvelle depense',
  description = 'Creez une nouvelle depense avec les informations requises',
  isLoading = false,
  projects = [],
  buildings = [],
  workers = [],
  suppliers = [],
}: ExpenseFormProps) {
  const [form] = Form.useForm();
  const [formData, setFormData] = useState<ExpenseFormData>({
    amountUsd: 0,
    amountIqd: 0,
    date: new Date().toISOString().split('T')[0],
    partyType: 'general',
    ...initialData,
  });

  const validateAmountPair = () => {
    const values = form.getFieldsValue(['amountUsd', 'amountIqd']);
    const amountUsd = Number(values.amountUsd || 0);
    const amountIqd = Number(values.amountIqd || 0);

    return amountUsd > 0 || amountIqd > 0
      ? Promise.resolve()
      : Promise.reject(new Error('Renseigner un montant USD, IQD ou les deux'));
  };

  const handleSubmit = async (values: ExpenseFormData) => {
    try {
      await onSubmit({
        ...formData,
        ...values,
        amountUsd: Number(values.amountUsd || 0),
        amountIqd: Number(values.amountIqd || 0),
        date: values.date || formData.date,
      });
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
    }
  };

  const updateField = (field: keyof ExpenseFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Card title={title} extra={<Typography.Text>{description}</Typography.Text>}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          date: formData.date || undefined,
          partyType: formData.partyType,
          workerId: formData.workerId,
          supplierId: formData.supplierId,
          projectId: formData.projectId,
          buildingId: formData.buildingId,
          amountUsd: formData.amountUsd,
          amountIqd: formData.amountIqd,
          description: formData.description,
        }}
      >
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="amountUsd" label="Montant USD" rules={[{ validator: validateAmountPair }]}>
              <InputNumber
                min={0}
                step={0.01}
                style={{ width: '100%' }}
                {...currencyInputProps('USD')}
                onChange={(value) => updateField('amountUsd', Number(value || 0))}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item name="amountIqd" label="Montant IQD" rules={[{ validator: validateAmountPair }]}>
              <InputNumber
                min={0}
                step={1}
                style={{ width: '100%' }}
                {...currencyInputProps('IQD')}
                onChange={(value) => updateField('amountIqd', Number(value || 0))}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item name="date" label="Date *" rules={[{ required: true, message: 'La date est obligatoire' }]}>
              <Input type="date" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="partyType"
          label="Type de partie *"
          rules={[{ required: true, message: 'Le type de partie est obligatoire' }]}
        >
          <Select
            placeholder="Selectionner le type de partie"
            onChange={(value: 'worker' | 'supplier' | 'general') => updateField('partyType', value)}
          >
            <Select.Option value="general">General</Select.Option>
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
              placeholder="Selectionner un travailleur"
              onChange={(value) => updateField('workerId', Number(value))}
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
              placeholder="Selectionner un fournisseur"
              onChange={(value) => updateField('supplierId', Number(value))}
            >
              {suppliers.map((supplier) => (
                <Select.Option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        )}

        <Form.Item name="projectId" label="Projet *" rules={[{ required: true, message: 'Le projet est obligatoire' }]}>
          <Select
            placeholder="Selectionner un projet"
            onChange={(value) => {
              updateField('projectId', value ? Number(value) : undefined);
              updateField('buildingId', undefined);
              form.setFieldValue('buildingId', undefined);
            }}
          >
            {projects.map((project) => (
              <Select.Option key={project.id} value={project.id}>
                {project.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="buildingId" label="Batiment *" rules={[{ required: true, message: 'Le batiment est obligatoire' }]}>
          <Select
            placeholder="Selectionner un batiment"
            disabled={!formData.projectId}
            onChange={(value) => updateField('buildingId', value ? Number(value) : undefined)}
          >
            {buildings
              .filter((building) => building.projectId === formData.projectId)
              .map((building) => (
                <Select.Option key={building.id} value={building.id}>
                  {building.name}
                </Select.Option>
              ))}
          </Select>
        </Form.Item>

        <Form.Item name="description" label="Description">
          <Input.TextArea
            placeholder="Ajouter une description (optionnel)"
            rows={3}
            onChange={(event) => updateField('description', event.target.value)}
          />
        </Form.Item>

        <Form.Item>
          <Space>
            {onCancel ? (
              <Button onClick={onCancel} disabled={isLoading}>
                Annuler
              </Button>
            ) : null}
            <Button type="primary" htmlType="submit" loading={isLoading}>
              {isLoading ? 'Creation...' : 'Creer la depense'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
}

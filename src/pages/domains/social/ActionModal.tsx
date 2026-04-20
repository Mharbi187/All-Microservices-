// ============================================================
// NEXUS-AID — Add Social Action Modal
// Form for recording a new social action on a family
// ============================================================

import { useState } from 'react';
import {
    Modal, Form, Select, Input, InputNumber, DatePicker,
    Typography, message,
} from 'antd';
import {
    HeartOutlined, MedicineBoxOutlined, ShoppingOutlined,
    HomeOutlined, DollarOutlined,
} from '@ant-design/icons';
import { socialService } from '@/services/domainServices';
import type { FamilyDTO, SocialActionDTO } from '@/types';

const { TextArea } = Input;
const { Text } = Typography;

const ACTION_TYPES = [
    { value: 'FOOD_DELIVERY', label: 'Distribution alimentaire', icon: <ShoppingOutlined /> },
    { value: 'MEDICAL_AID', label: 'Aide médicale', icon: <MedicineBoxOutlined /> },
    { value: 'FINANCIAL', label: 'Aide financière', icon: <DollarOutlined /> },
    { value: 'SHELTER_SUPPORT', label: 'Aide au logement', icon: <HomeOutlined /> },
    { value: 'VISIT', label: 'Visite sociale', icon: <HeartOutlined /> },
];

const EVENT_CONTEXTS = [
    'Ramadan 2026',
    'Rentrée Scolaire 2026',
    'Distribution Hiver 2026',
    'Aïd Al-Adha 2026',
    'Campagne Santé',
    'Urgence',
    'Autre',
];

interface ActionModalProps {
    family: FamilyDTO | null;
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const ActionModal: React.FC<ActionModalProps> = ({ family, open, onClose, onSuccess }) => {
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!family?.id) return;
        try {
            const values = await form.validateFields();
            setSubmitting(true);

            const payload: SocialActionDTO = {
                familyId: family.id,
                actionType: values.actionType,
                eventContext: values.eventContext,
                quantity: values.quantity || 0,
                notes: values.notes,
            };

            await socialService.createAction(payload);
            message.success('Action sociale enregistrée avec succès');
            form.resetFields();
            onSuccess?.();
            onClose();
        } catch {
            message.error('Erreur lors de l\'enregistrement');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: 'rgba(200,30,30,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#C81E1E',
                    }}>
                        <HeartOutlined />
                    </div>
                    <div>
                        <Text strong>Nouvelle Action Sociale</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {family?.familyName || '—'}
                        </Text>
                    </div>
                </div>
            }
            open={open}
            onCancel={onClose}
            onOk={handleSubmit}
            confirmLoading={submitting}
            okText="Enregistrer"
            cancelText="Annuler"
            okButtonProps={{ style: { background: '#C81E1E' } }}
            width={520}
        >
            <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                <Form.Item
                    name="actionType"
                    label="Type d'action"
                    rules={[{ required: true, message: 'Sélectionnez le type d\'action' }]}
                >
                    <Select
                        placeholder="Choisir le type d'aide"
                        options={ACTION_TYPES.map(t => ({
                            value: t.value,
                            label: (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {t.icon} {t.label}
                                </span>
                            ),
                        }))}
                    />
                </Form.Item>

                <Form.Item name="eventContext" label="Contexte / Campagne">
                    <Select
                        placeholder="Lié à quelle campagne ?"
                        allowClear
                        options={EVENT_CONTEXTS.map(e => ({ value: e, label: e }))}
                    />
                </Form.Item>

                <Form.Item name="quantity" label="Quantité (unités d'aide)">
                    <InputNumber
                        min={0}
                        placeholder="Ex: 5 colis"
                        style={{ width: '100%' }}
                    />
                </Form.Item>

                <Form.Item name="notes" label="Notes / Observations">
                    <TextArea
                        rows={3}
                        placeholder="Détails de l'intervention, observations terrain..."
                        maxLength={1000}
                        showCount
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default ActionModal;

// ============================================================
// NEXUS-AID — Add Family Modal
// Form for registering a new family in the social registry
// ============================================================

import { useState } from 'react';
import {
    Modal, Form, Input, InputNumber, Select, Typography, message, Row, Col,
} from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { socialService } from '@/services/domainServices';
import type { FamilyDTO } from '@/types';

const { Text } = Typography;

const NEEDS_OPTIONS = [
    { value: 'MEDICAL', label: 'Médical' },
    { value: 'FOOD', label: 'Alimentaire' },
    { value: 'SHELTER', label: 'Logement' },
    { value: 'CLOTHING', label: 'Habillement' },
    { value: 'FINANCIAL', label: 'Financier' },
    { value: 'EDUCATION', label: 'Éducation' },
];

const EVENT_OPTIONS = [
    { value: 'Ramadan', label: 'Ramadan' },
    { value: 'Rentrée Scolaire', label: 'Rentrée Scolaire' },
    { value: 'Distribution Hiver', label: 'Distribution Hiver' },
    { value: 'Aïd Al-Adha', label: 'Aïd Al-Adha' },
    { value: 'Campagne Santé', label: 'Campagne Santé' },
];

interface AddFamilyModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const AddFamilyModal: React.FC<AddFamilyModalProps> = ({ open, onClose, onSuccess }) => {
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);

            const payload: FamilyDTO = {
                familyName: values.familyName,
                headOfFamily: values.headOfFamily,
                members: values.members,
                address: values.address,
                needsType: values.needsType || [],
                urgentNeeds: values.urgentNeeds || [],
                eventTags: values.eventTags || [],
                status: 'ACTIVE',
            };

            // Add GPS if provided
            if (values.lat && values.lng) {
                payload.gpsCoordinates = { lat: values.lat, lng: values.lng };
            }

            await socialService.createFamily(payload);
            message.success('Famille enregistrée avec succès');
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
                        background: 'rgba(16,185,129,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#10b981',
                    }}>
                        <HomeOutlined />
                    </div>
                    <Text strong>Enregistrer une Famille</Text>
                </div>
            }
            open={open}
            onCancel={onClose}
            onOk={handleSubmit}
            confirmLoading={submitting}
            okText="Enregistrer"
            cancelText="Annuler"
            okButtonProps={{ style: { background: '#C81E1E' } }}
            width={600}
        >
            <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            name="familyName"
                            label="Nom de famille"
                            rules={[{ required: true, message: 'Requis' }]}
                        >
                            <Input placeholder="Ex: Famille Amrani" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            name="headOfFamily"
                            label="Chef de famille"
                            rules={[{ required: true, message: 'Requis' }]}
                        >
                            <Input placeholder="Nom complet" />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item
                            name="members"
                            label="Nombre de membres"
                            rules={[{ required: true, message: 'Requis' }]}
                        >
                            <InputNumber min={1} max={30} style={{ width: '100%' }} placeholder="Ex: 5" />
                        </Form.Item>
                    </Col>
                    <Col span={16}>
                        <Form.Item
                            name="address"
                            label="Adresse"
                            rules={[{ required: true, message: 'Requis' }]}
                        >
                            <Input placeholder="Adresse complète" />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="lat" label="Latitude (GPS)">
                            <InputNumber style={{ width: '100%' }} step={0.0001} placeholder="Ex: 34.0209" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="lng" label="Longitude (GPS)">
                            <InputNumber style={{ width: '100%' }} step={0.0001} placeholder="Ex: -6.8416" />
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item name="needsType" label="Types de besoins">
                    <Select mode="multiple" placeholder="Sélectionnez les besoins" options={NEEDS_OPTIONS} />
                </Form.Item>

                <Form.Item name="urgentNeeds" label="Besoins urgents">
                    <Select mode="multiple" placeholder="Besoins critiques (le cas échéant)" options={NEEDS_OPTIONS} />
                </Form.Item>

                <Form.Item name="eventTags" label="Marquage par événement">
                    <Select mode="multiple" placeholder="Événements associés" options={EVENT_OPTIONS} />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default AddFamilyModal;

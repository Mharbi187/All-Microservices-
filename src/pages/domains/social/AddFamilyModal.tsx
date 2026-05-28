// ============================================================
// NEXUS-AID — Add Family Modal (Version Enrichie)
// Formulaire complet pour enregistrer une famille bénéficiaire
// Avec CIN, photo, localisation, bénéficiaire, membres
// ============================================================

import { useState, useRef } from 'react';
import {
    Modal, Form, Input, InputNumber, Select, Typography, Row, Col,
    Divider, Switch, Tag, App
} from 'antd';
import {
    HomeOutlined, UserOutlined, CameraOutlined, EnvironmentOutlined,
    IdcardOutlined, PhoneOutlined, CloseOutlined
} from '@ant-design/icons';
import { socialService } from '@/services/domainServices';
import type { FamilyDTO } from '@/types';

const { Text } = Typography;
const { TextArea } = Input;

const NEEDS_OPTIONS = [
    { value: 'MEDICAL', label: '🏥 Médical' },
    { value: 'FOOD', label: '🍽️ Alimentaire' },
    { value: 'SHELTER', label: '🏠 Logement' },
    { value: 'CLOTHING', label: '👕 Habillement' },
    { value: 'FINANCIAL', label: '💰 Financier' },
    { value: 'EDUCATION', label: '📚 Éducation' },
    { value: 'PSYCHOLOGIQUE', label: '🧠 Psychologique' },
];

const EVENT_OPTIONS = [
    { value: 'Ramadan', label: 'Ramadan' },
    { value: 'Rentrée Scolaire', label: 'Rentrée Scolaire' },
    { value: 'Distribution Hiver', label: 'Distribution Hiver' },
    { value: 'Aïd Al-Adha', label: 'Aïd Al-Adha' },
    { value: 'Campagne Santé', label: 'Campagne Santé' },
    { value: 'Urgence', label: 'Urgence' },
];

// CRC Colors
const CRC_SOCIAL = '#e01c2e';
const CRC_SOCIAL_BG = '#fff5f5';
const CRC_SOCIAL_BORDER = 'rgba(224,28,46,0.2)';

interface AddFamilyModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const AddFamilyModal: React.FC<AddFamilyModalProps> = ({ open, onClose, onSuccess }) => {
    const { message: messageApi } = App.useApp();
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    const [familyPhoto, setFamilyPhoto] = useState<string>('');
    const [addressUnknown, setAddressUnknown] = useState(false);
    const photoRef = useRef<HTMLInputElement>(null);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setFamilyPhoto(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);

            const payload: FamilyDTO = {
                familyName: values.familyName,
                headOfFamily: values.headOfFamily,
                members: values.members,
                address: addressUnknown ? 'Indéfini' : (values.address || 'Indéfini'),
                cin: values.cin,
                recipientName: values.recipientName,
                imageUrl: familyPhoto || undefined,
                needsType: values.needsType || [],
                urgentNeeds: values.urgentNeeds || [],
                eventTags: values.eventTags || [],
                status: 'ACTIVE',
            };

            // GPS if provided
            if (values.lat && values.lng) {
                payload.gpsCoordinates = { lat: values.lat, lng: values.lng };
            }

            await socialService.createFamily(payload);
            messageApi.success('✅ Famille enregistrée avec succès !');
            form.resetFields();
            setFamilyPhoto('');
            setAddressUnknown(false);
            onSuccess?.();
            onClose();
        } catch (err: any) {
            if (!err?.errorFields) {
                messageApi.error('Erreur lors de l\'enregistrement de la famille.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 42, height: 42, borderRadius: 12,
                        background: 'linear-gradient(135deg, #e01c2e, #c0152a)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff',
                    }}>
                        <HomeOutlined />
                    </div>
                    <Text strong style={{ fontSize: 17 }}>Enregistrer une Famille Bénéficiaire</Text>
                </div>
            }
            open={open}
            onCancel={() => { onClose(); setFamilyPhoto(''); setAddressUnknown(false); }}
            onOk={handleSubmit}
            confirmLoading={submitting}
            okText="Enregistrer la famille"
            cancelText="Annuler"
            okButtonProps={{
                style: {
                    background: 'linear-gradient(135deg, #e01c2e, #c0152a)',
                    border: 'none',
                    borderRadius: 10,
                    height: 42
                }
            }}
            cancelButtonProps={{ style: { borderRadius: 10, height: 42 } }}
            width={700}
            centered
            styles={{ content: { borderRadius: 24, padding: 28 } }}
        >
            <Form form={form} layout="vertical" style={{ marginTop: 8 }}>

                {/* SECTION: Identité */}
                <Divider orientation="left" orientationMargin={0} style={{ color: CRC_SOCIAL, borderColor: CRC_SOCIAL_BORDER }}>
                    <Text style={{ color: CRC_SOCIAL, fontWeight: 700, fontSize: 13 }}>🪪 Identité de la Famille</Text>
                </Divider>
                <Row gutter={16}>
                    <Col xs={24} sm={12}>
                        <Form.Item name="familyName" label="Nom de famille" rules={[{ required: true, message: 'Requis' }]}>
                            <Input size="large" prefix={<HomeOutlined style={{ color: CRC_SOCIAL }} />} placeholder="Ex: Famille Amrani" style={{ borderRadius: 12 }} />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Form.Item name="headOfFamily" label="Chef de famille" rules={[{ required: true, message: 'Requis' }]}>
                            <Input size="large" prefix={<UserOutlined style={{ color: CRC_SOCIAL }} />} placeholder="Nom complet du chef" style={{ borderRadius: 12 }} />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col xs={24} sm={8}>
                        <Form.Item name="cin" label="CIN" rules={[{ required: true, message: 'CIN requis' }, { min: 8, message: 'CIN invalide' }]}>
                            <Input size="large" prefix={<IdcardOutlined style={{ color: CRC_SOCIAL }} />} placeholder="Ex: 09876543" style={{ borderRadius: 12 }} />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Form.Item name="recipientName" label="Nom du bénéficiaire">
                            <Input size="large" prefix={<UserOutlined style={{ color: CRC_SOCIAL }} />} placeholder="Bénéficiaire principal" style={{ borderRadius: 12 }} />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Form.Item name="members" label="Nombre de membres" rules={[{ required: true, message: 'Requis' }]}>
                            <InputNumber size="large" min={1} max={30} style={{ width: '100%', borderRadius: 12 }} placeholder="Ex: 5" />
                        </Form.Item>
                    </Col>
                </Row>

                {/* SECTION: Photo */}
                <Divider orientation="left" orientationMargin={0} style={{ color: CRC_SOCIAL, borderColor: CRC_SOCIAL_BORDER }}>
                    <Text style={{ color: CRC_SOCIAL, fontWeight: 700, fontSize: 13 }}>📷 Photo de la Famille</Text>
                </Divider>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                    <div
                        onClick={() => photoRef.current?.click()}
                        style={{
                            width: 80, height: 80, borderRadius: 16,
                            border: `2px dashed ${CRC_SOCIAL_BORDER}`,
                            background: CRC_SOCIAL_BG,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', overflow: 'hidden',
                            transition: 'all 0.2s'
                        }}
                    >
                        {familyPhoto ? (
                            <img src={familyPhoto} alt="Famille" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <CameraOutlined style={{ fontSize: 28, color: CRC_SOCIAL }} />
                        )}
                    </div>
                    <div>
                        <Text style={{ display: 'block', fontWeight: 600, fontSize: 13 }}>Photo de la famille</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>Cliquez pour sélectionner (JPG, PNG)</Text>
                        {familyPhoto && (
                            <div
                                onClick={() => setFamilyPhoto('')}
                                style={{ color: CRC_SOCIAL, fontSize: 12, cursor: 'pointer', marginTop: 4 }}
                            >
                                <CloseOutlined /> Supprimer la photo
                            </div>
                        )}
                    </div>
                    <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
                </div>

                {/* SECTION: Localisation */}
                <Divider orientation="left" orientationMargin={0} style={{ color: CRC_SOCIAL, borderColor: CRC_SOCIAL_BORDER }}>
                    <Text style={{ color: CRC_SOCIAL, fontWeight: 700, fontSize: 13 }}>📍 Localisation</Text>
                </Divider>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <Switch
                        checked={addressUnknown}
                        onChange={setAddressUnknown}
                        style={{ background: addressUnknown ? '#9ca3af' : undefined }}
                    />
                    <Text style={{ fontSize: 13 }}>Adresse inconnue (Indéfini)</Text>
                </div>
                {!addressUnknown && (
                    <>
                        <Form.Item name="address" label="Adresse" rules={[{ required: !addressUnknown, message: 'Requis ou activez "Indéfini"' }]}>
                            <Input
                                size="large"
                                prefix={<EnvironmentOutlined style={{ color: CRC_SOCIAL }} />}
                                placeholder="Ex: Rue Ibn Khaldoun, Tunis 1002"
                                style={{ borderRadius: 12 }}
                            />
                        </Form.Item>
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="lat" label="Latitude GPS (optionnel)">
                                    <InputNumber size="large" style={{ width: '100%', borderRadius: 12 }} step={0.0001} placeholder="Ex: 36.8065" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="lng" label="Longitude GPS (optionnel)">
                                    <InputNumber size="large" style={{ width: '100%', borderRadius: 12 }} step={0.0001} placeholder="Ex: 10.1815" />
                                </Form.Item>
                            </Col>
                        </Row>
                    </>
                )}

                {/* SECTION: Besoins */}
                <Divider orientation="left" orientationMargin={0} style={{ color: CRC_SOCIAL, borderColor: CRC_SOCIAL_BORDER }}>
                    <Text style={{ color: CRC_SOCIAL, fontWeight: 700, fontSize: 13 }}>🆘 Besoins & Priorités</Text>
                </Divider>
                <Form.Item name="needsType" label="Types de besoins">
                    <Select mode="multiple" placeholder="Sélectionnez les besoins" options={NEEDS_OPTIONS} style={{ borderRadius: 12 }} />
                </Form.Item>
                <Form.Item name="urgentNeeds" label="Besoins urgents (prioritaires)">
                    <Select mode="multiple" placeholder="Besoins critiques" options={NEEDS_OPTIONS} style={{ borderRadius: 12 }} />
                </Form.Item>
                <Form.Item name="eventTags" label="Contexte / Événement">
                    <Select mode="multiple" placeholder="Événements associés" options={EVENT_OPTIONS} style={{ borderRadius: 12 }} />
                </Form.Item>

            </Form>
        </Modal>
    );
};

export default AddFamilyModal;

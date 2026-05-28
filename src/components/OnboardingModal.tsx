// ============================================================
// NEXUS-AID — OnboardingModal
// Mandatory post-approval extended profile form.
// Renders as a non-dismissible modal for approved volunteers
// who have not yet completed their first-login form.
// NOTE: birthDate is already in the DB — not asked again.
// ============================================================

import { useState } from 'react';
import {
    Modal, Form, Input, Select, Steps, Button, Space,
    Typography, message, Row, Col, Divider, Tag,
} from 'antd';
import {
    UserOutlined, HeartOutlined, CheckCircleOutlined,
    ArrowRightOutlined, ArrowLeftOutlined, InfoCircleOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/stores';
import onboardingService from '@/services/onboardingService';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'];
const LANGUAGES = ['Arabe', 'Français', 'Anglais', 'Allemand', 'Espagnol', 'Tamazight', 'Autre'];

const steps = [
    {
        title: 'Identité',
        icon: <UserOutlined />,
    },
    {
        title: 'Profil volontaire',
        icon: <HeartOutlined />,
    },
    {
        title: 'Confirmation',
        icon: <CheckCircleOutlined />,
    },
];

const OnboardingModal: React.FC = () => {
    const user = useAuthStore((s) => s.user);
    const fetchProfile = useAuthStore((s) => s.fetchProfile);

    const [form] = Form.useForm();
    const [currentStep, setCurrentStep] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    // Guard: only show for APPROVED volunteers who haven't done first login
    const shouldShow =
        user?.type === 'VOLUNTEER' &&
        user?.status === 'APPROVED' &&
        user?.firstLoginCompleted === false;

    if (!shouldShow) return null;

    const next = async () => {
        try {
            // Validate only the current step's fields
            if (currentStep === 0) {
                await form.validateFields([
                    'address',
                    'emergencyContactName', 'emergencyContactPhone',
                ]);
            } else if (currentStep === 1) {
                await form.validateFields(['motivation', 'availability']);
            }
            setCurrentStep((s) => s + 1);
        } catch {
            // Validation error — stay on current step
        }
    };

    const prev = () => setCurrentStep((s) => s - 1);

    const handleFinish = async () => {
        try {
            setSubmitting(true);
            const values = await form.validateFields();

            const payload: Record<string, unknown> = {
                address: values.address,
                emergencyContactName: values.emergencyContactName,
                emergencyContactPhone: values.emergencyContactPhone,
                bloodType: values.bloodType ?? null,
                motivation: values.motivation,
                availability: values.availability,
                hasTransport: values.hasTransport === 'true',
                previousExperience: values.previousExperience ?? null,
                languages: values.languages ?? [],
            };

            await onboardingService.completeProfile(payload);
            await onboardingService.markFirstLoginComplete();
            // Refresh the user store so firstLoginCompleted flips to true
            await fetchProfile();

            message.success('Profil complété ! Bienvenue sur NEXUS-AID 🎉');
        } catch (err: any) {
            const errorData = err.response?.data;
            const errorMsg = typeof errorData === 'string' ? errorData : errorData?.message || 'Erreur lors de la soumission. Veuillez réessayer.';
            message.error(errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            open={shouldShow}
            closable={false}
            maskClosable={false}
            keyboard={false}
            footer={null}
            width={680}
            centered
            styles={{ body: { padding: '0 0 8px 0' } }}
        >
            {/* Header */}
            <div
                style={{
                    background: 'linear-gradient(135deg, #C81E1E 0%, #991b1b 100%)',
                    borderRadius: '8px 8px 0 0',
                    padding: '28px 32px 24px',
                    color: '#fff',
                    marginBottom: 24,
                }}
            >
                <Title level={3} style={{ color: '#fff', margin: 0 }}>
                    Bienvenue, {user?.fullName?.split(' ')[0]} ! 👋
                </Title>
                <Paragraph style={{ color: 'rgba(255,255,255,0.85)', marginBottom: 0, marginTop: 6 }}>
                    Votre compte a été approuvé. Complétez votre profil pour rejoindre votre comité.
                </Paragraph>
            </div>

            <div style={{ padding: '0 32px 16px' }}>
                {/* Steps */}
                <Steps
                    current={currentStep}
                    items={steps.map((s) => ({ title: s.title, icon: s.icon }))}
                    style={{ marginBottom: 28 }}
                    size="small"
                />

                <Form form={form} layout="vertical" requiredMark="optional">
                    {/* ── Step 0: Identity & Emergency Contact ── */}
                    {currentStep === 0 && (
                        <>
                            {/* Pre-filled info from DB — read-only */}
                            <div style={{
                                background: 'rgba(200,30,30,0.06)',
                                border: '1px solid rgba(200,30,30,0.15)',
                                borderRadius: 8,
                                padding: '12px 16px',
                                marginBottom: 16,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                            }}>
                                <InfoCircleOutlined style={{ color: '#C81E1E', fontSize: 16, flexShrink: 0 }} />
                                <div>
                                    <Text style={{ fontSize: 13, fontWeight: 600, display: 'block' }}>
                                        {user?.fullName}
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        {user?.email}
                                        {user?.phone ? ` · ${user.phone}` : ''}
                                        {user?.cin ? ` · CIN: ${user.cin}` : ''}
                                        {user?.matricule ? ` · Mat: ${user.matricule}` : ''}
                                    </Text>
                                    <div style={{ marginTop: 4 }}>
                                        <Tag color="success" style={{ fontSize: 11 }}>✓ Compte approuvé</Tag>
                                        {user?.dateAdhesion && (
                                            <Tag style={{ fontSize: 11 }}>Adhésion : {user.dateAdhesion}</Tag>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <Divider orientation="left" style={{ fontSize: 13, color: '#888' }}>
                                Coordonnées complémentaires
                            </Divider>
                            <Row gutter={16}>
                                <Col span={24}>
                                    <Form.Item
                                        name="address"
                                        label="Adresse complète"
                                        rules={[{ required: true, message: 'Veuillez indiquer votre adresse' }]}
                                    >
                                        <Input placeholder="Rue, Ville, Code postal" />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="bloodType" label="Groupe sanguin">
                                        <Select placeholder="Sélectionner" allowClear>
                                            {BLOOD_TYPES.map((bt) => (
                                                <Option key={bt} value={bt}>{bt === 'unknown' ? 'Inconnu' : bt}</Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Divider orientation="left" style={{ fontSize: 13, color: '#888' }}>
                                Contact d'urgence
                            </Divider>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item
                                        name="emergencyContactName"
                                        label="Nom du contact"
                                        rules={[{ required: true, message: 'Champ requis' }]}
                                    >
                                        <Input placeholder="Nom & prénom" />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        name="emergencyContactPhone"
                                        label="Téléphone du contact"
                                        rules={[
                                            { required: true, message: 'Champ requis' },
                                            { pattern: /^[\d\s+\-()]{8,}$/, message: 'Numéro invalide' },
                                        ]}
                                    >
                                        <Input placeholder="+216 XX XXX XXX" />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </>
                    )}

                    {/* ── Step 1: Volunteer Profile ── */}
                    {currentStep === 1 && (
                        <>
                            <Row gutter={16}>
                                <Col span={24}>
                                    <Form.Item
                                        name="motivation"
                                        label="Pourquoi souhaitez-vous être volontaire ?"
                                        rules={[{ required: true, min: 30, message: 'Veuillez détailler votre motivation (min. 30 caractères)' }]}
                                    >
                                        <TextArea rows={4} placeholder="Décrivez vos motivations à rejoindre le Croissant-Rouge Tunisien..." showCount maxLength={500} />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        name="availability"
                                        label="Disponibilité"
                                        rules={[{ required: true, message: 'Champ requis' }]}
                                    >
                                        <Select placeholder="Sélectionner">
                                            <Option value="weekdays">Jours de semaine</Option>
                                            <Option value="weekends">Week-ends</Option>
                                            <Option value="both">Les deux</Option>
                                            <Option value="flexible">Flexible</Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="hasTransport" label="Avez-vous un moyen de transport ?">
                                        <Select placeholder="Sélectionner" allowClear>
                                            <Option value="true">Oui</Option>
                                            <Option value="false">Non</Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                                <Col span={24}>
                                    <Form.Item name="languages" label="Langues parlées">
                                        <Select mode="multiple" placeholder="Sélectionner les langues" allowClear>
                                            {LANGUAGES.map((l) => (
                                                <Option key={l} value={l}>{l}</Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                </Col>
                                <Col span={24}>
                                    <Form.Item name="previousExperience" label="Expérience bénévole antérieure">
                                        <TextArea rows={2} placeholder="Décrivez brièvement toute expérience de volontariat précédente (optionnel)" />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </>
                    )}

                    {/* ── Step 2: Confirmation ── */}
                    {currentStep === 2 && (
                        <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
                            <div
                                style={{
                                    width: 72, height: 72, borderRadius: '50%',
                                    background: '#dcfce7', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    margin: '0 auto 16px',
                                    fontSize: 32,
                                }}
                            >
                                ✅
                            </div>
                            <Title level={4} style={{ marginBottom: 8 }}>Tout est prêt !</Title>
                            <Paragraph type="secondary" style={{ maxWidth: 400, margin: '0 auto 24px' }}>
                                Vérifiez vos informations avant de soumettre. Vous pourrez les modifier
                                plus tard depuis vos paramètres de profil.
                            </Paragraph>
                            <div
                                style={{
                                    background: '#f8fafc', border: '1px solid #e2e8f0',
                                    borderRadius: 8, padding: '16px 20px',
                                    textAlign: 'left', maxWidth: 420, margin: '0 auto',
                                }}
                            >
                                <Text strong>Nom complet :</Text> <Text>{user?.fullName || '—'}</Text><br />
                                <Text strong>Email :</Text> <Text>{user?.email || '—'}</Text><br />
                                <Text strong>Adresse :</Text> <Text>{form.getFieldValue('address') || '—'}</Text><br />
                                <Text strong>Contact d'urgence :</Text> <Text>{form.getFieldValue('emergencyContactName') || '—'} ({form.getFieldValue('emergencyContactPhone') || '—'})</Text><br />
                                <Text strong>Disponibilité :</Text> <Text>
                                    {form.getFieldValue('availability') === 'weekdays' ? 'Jours de semaine' :
                                        form.getFieldValue('availability') === 'weekends' ? 'Week-ends' :
                                            form.getFieldValue('availability') === 'both' ? 'Les deux' :
                                                form.getFieldValue('availability') === 'flexible' ? 'Flexible' : '—'}
                                </Text>
                            </div>
                        </div>
                    )}
                </Form>

                {/* Navigation */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
                    <Button
                        onClick={prev}
                        disabled={currentStep === 0}
                        icon={<ArrowLeftOutlined />}
                    >
                        Précédent
                    </Button>

                    {currentStep < steps.length - 1 ? (
                        <Button type="primary" onClick={next} icon={<ArrowRightOutlined />} iconPosition="end"
                            style={{ background: '#C81E1E', borderColor: '#C81E1E' }}>
                            Suivant
                        </Button>
                    ) : (
                        <Button
                            type="primary"
                            onClick={handleFinish}
                            loading={submitting}
                            icon={<CheckCircleOutlined />}
                            style={{ background: '#16a34a', borderColor: '#16a34a' }}
                        >
                            Terminer & Accéder au tableau de bord
                        </Button>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default OnboardingModal;

import React, { useState, useEffect } from 'react';
import {
    Steps, Button, Form, Input, Select, DatePicker, Upload, Progress,
    Card, Typography, Space, App, Divider, Tag, Row, Col, Alert
} from 'antd';
import {
    UserOutlined, PhoneOutlined, UploadOutlined, BookOutlined,
    SafetyCertificateOutlined, CheckCircleFilled, StarOutlined,
    HeartOutlined, LoadingOutlined, LockOutlined,
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores';
import onboardingService, {
    EDUCATION_LEVEL_LABELS, SecourismeCertification
} from '@/services/onboardingService';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const CLOUDINARY_CLOUD = 'doxmfj1cw';
const CLOUDINARY_PRESET = 'exus_aid_preset';

const stepTitles = ['Identité & Contact', 'Formation & Intégration', 'Compétences & Certifications'];
const stepIcons = [<UserOutlined />, <BookOutlined />, <SafetyCertificateOutlined />];

const OnboardingPage: React.FC = () => {
    const { message } = App.useApp();
    const navigate = useNavigate();
    const { user, fetchProfile } = useAuthStore();

    const [current, setCurrent] = useState(0);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [certifications, setCertifications] = useState<SecourismeCertification[]>([]);
    const [selectedCerts, setSelectedCerts] = useState<{ certId: string; date: string; expiry?: string; issuedBy: string }[]>([]);

    const [form] = Form.useForm();
    const [photoUrl, setPhotoUrl] = useState('');
    const [photoPublicId, setPhotoPublicId] = useState('');
    const [score, setScore] = useState(0);

    useEffect(() => {
        onboardingService.getAvailableCertifications().then(setCertifications).catch(console.error);
    }, []);

    // Score preview
    const updateScorePreview = () => {
        const vals = form.getFieldsValue();
        let s = 0;
        if (vals.phone) s++;
        if (vals.emergencyContactName) s++;
        if (vals.emergencyContactPhone) s++;
        if (vals.emergencyContactRelation) s++;
        if (photoUrl) s++;
        if (vals.educationLevel) s++;
        if (vals.specializationDomain) s++;
        if (vals.trainingCoursesAttended) s++;
        if (vals.realIntegrationDate) s++;
        if (vals.otherSkills) s++;
        setScore((s / 10) * 100);
    };

    const handlePhotoUpload = async (info: any) => {
        const file = info.file;
        if (!file.type?.startsWith('image/')) {
            message.error('Fichier image requis (JPG/PNG)');
            return false;
        }
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('upload_preset', CLOUDINARY_PRESET);
            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method: 'POST', body: fd });
            const data = await res.json();
            setPhotoUrl(data.secure_url);
            setPhotoPublicId(data.public_id);
            message.success('Photo téléversée avec succès !');
            updateScorePreview();
        } catch {
            message.error('Erreur lors du téléversement');
        } finally {
            setUploading(false);
        }
        return false;
    };

    const handleSubmit = async () => {
        setSaving(true);
        try {
            const vals = form.getFieldsValue(true);
            const payload = {
                phone: vals.phone,
                emergencyContactName: vals.emergencyContactName,
                emergencyContactPhone: vals.emergencyContactPhone,
                emergencyContactRelation: vals.emergencyContactRelation,
                photoUrl,
                photoPublicId,
                educationLevel: vals.educationLevel,
                specializationDomain: vals.specializationDomain,
                trainingCoursesAttended: vals.trainingCoursesAttended
                    ? JSON.stringify(typeof vals.trainingCoursesAttended === 'string'
                        ? [vals.trainingCoursesAttended]
                        : vals.trainingCoursesAttended)
                    : undefined,
                realIntegrationDate: vals.realIntegrationDate
                    ? dayjs(vals.realIntegrationDate).format('YYYY-MM-DD')
                    : undefined,
                otherSkills: vals.otherSkills,
            };

            const result = await onboardingService.completeProfile(payload);

            // Add certifications
            for (const cert of selectedCerts) {
                try {
                    await onboardingService.addCertification({
                        certificationId: cert.certId,
                        dateObtained: cert.date,
                        dateExpiry: cert.expiry,
                        issuedBy: cert.issuedBy,
                    });
                } catch { /* ignore duplicates */ }
            }

            if (result.profileCompleted) {
                message.success('🎉 Profil complété avec succès ! Bienvenue sur Nexus-AID !');
                await fetchProfile();
                navigate('/dashboard');
            } else {
                message.warning(`Profil sauvegardé. Score: ${result.completionScore}%. Complétez les champs manquants.`);
            }
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Erreur lors de la sauvegarde');
        } finally {
            setSaving(false);
        }
    };

    const steps = [
        // ─── Step 0: Identity & Contact ──────────────────────────────────────
        <motion.div key="step0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}>
            <Row gutter={[24, 0]}>
                <Col xs={24} md={12}>
                    <Form.Item name="phone" label="Numéro de téléphone"
                        rules={[{ required: true, message: 'Téléphone requis' },
                                { pattern: /^\+?[0-9]{8,15}$/, message: 'Format invalide' }]}>
                        <Input prefix={<PhoneOutlined className="text-red-500" />}
                            placeholder="+216 XX XXX XXX" size="large" className="rounded-xl" onChange={updateScorePreview} />
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item label="Photo de profil">
                        <Upload accept="image/*" showUploadList={false}
                            beforeUpload={(f) => { handlePhotoUpload({ file: f }); return false; }}>
                            <Button icon={uploading ? <LoadingOutlined /> : <UploadOutlined />}
                                size="large" className="w-full rounded-xl">
                                {photoUrl ? '✅ Photo téléversée' : 'Téléverser votre photo'}
                            </Button>
                        </Upload>
                        {photoUrl && (
                            <img src={photoUrl} alt="preview"
                                className="mt-3 w-24 h-24 rounded-full object-cover border-4 border-red-200 shadow" />
                        )}
                    </Form.Item>
                </Col>
                <Col xs={24}>
                    <Divider orientation="left" plain><HeartOutlined className="text-red-500" /> Contact d'urgence</Divider>
                </Col>
                <Col xs={24} md={8}>
                    <Form.Item name="emergencyContactName" label="Nom complet"
                        rules={[{ required: true, message: 'Requis' }]}>
                        <Input placeholder="Prénom Nom" size="large" className="rounded-xl" onChange={updateScorePreview} />
                    </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                    <Form.Item name="emergencyContactPhone" label="Téléphone d'urgence"
                        rules={[{ required: true, message: 'Requis' }]}>
                        <Input placeholder="+216 XX XXX XXX" size="large" className="rounded-xl" onChange={updateScorePreview} />
                    </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                    <Form.Item name="emergencyContactRelation" label="Relation"
                        rules={[{ required: true, message: 'Requis' }]}>
                        <Select placeholder="Sélectionner" size="large" className="rounded-xl" onChange={updateScorePreview}>
                            {['Père', 'Mère', 'Époux/Épouse', 'Frère/Sœur', 'Enfant', 'Ami(e)'].map(r =>
                                <Option key={r} value={r}>{r}</Option>)}
                        </Select>
                    </Form.Item>
                </Col>
            </Row>
        </motion.div>,

        // ─── Step 1: Formation & Intégration ─────────────────────────────────
        <motion.div key="step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}>
            <Row gutter={[24, 0]}>
                <Col xs={24} md={12}>
                    <Form.Item name="educationLevel" label="Niveau d'étude"
                        rules={[{ required: true, message: 'Requis' }]}>
                        <Select placeholder="Sélectionner votre niveau" size="large" onChange={updateScorePreview}>
                            {Object.entries(EDUCATION_LEVEL_LABELS).map(([val, label]) =>
                                <Option key={val} value={val}>{label}</Option>)}
                        </Select>
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item name="specializationDomain" label="Domaine de spécialisation"
                        rules={[{ required: true, message: 'Requis' }]}>
                        <Input placeholder="ex: Médecine, Informatique, Droit..." size="large"
                            className="rounded-xl" onChange={updateScorePreview} />
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item name="realIntegrationDate" label="Date réelle d'intégration au CRT">
                        <DatePicker className="w-full rounded-xl" size="large"
                            placeholder="Sélectionner la date"
                            disabledDate={d => d && d.isAfter(dayjs())}
                            onChange={updateScorePreview} />
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item name="trainingCoursesAttended" label="Formations suivies">
                        <Select mode="tags" size="large" placeholder="Saisissez et appuyez Entrée"
                            tokenSeparators={[',']} onChange={updateScorePreview}>
                            {['PSC1','PSE1','PSE2','RCP','PHTLS','Premiers secours pédiatriques',
                              'Gestion de crise','Secourisme aquatique'].map(f =>
                                <Option key={f} value={f}>{f}</Option>)}
                        </Select>
                    </Form.Item>
                </Col>
                <Col xs={24}>
                    <Form.Item name="otherSkills" label="Autres compétences">
                        <Input.TextArea rows={3} placeholder="ex: Permis de conduire, Langues, Informatique..."
                            className="rounded-xl" onChange={updateScorePreview} />
                    </Form.Item>
                </Col>
            </Row>
        </motion.div>,

        // ─── Step 2: Certifications ───────────────────────────────────────────
        <motion.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}>
            <Alert
                message="Certifications de secourisme"
                description="Ajoutez vos certifications obtenues. Vous pourrez en ajouter ou modifier depuis votre profil."
                type="info" showIcon className="mb-6 rounded-xl" />

            <div className="space-y-4">
                {certifications.map(cert => {
                    const selected = selectedCerts.find(s => s.certId === cert.id);
                    return (
                        <Card key={cert.id} size="small"
                            className={`rounded-xl border-2 transition-all cursor-pointer ${selected ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                            onClick={() => {
                                if (selected) {
                                    setSelectedCerts(prev => prev.filter(s => s.certId !== cert.id));
                                } else {
                                    setSelectedCerts(prev => [...prev, {
                                        certId: cert.id,
                                        date: dayjs().subtract(1, 'year').format('YYYY-MM-DD'),
                                        issuedBy: 'CRT',
                                    }]);
                                }
                            }}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <Space>
                                        <Tag color={selected ? 'red' : 'default'}>Niveau {cert.level}</Tag>
                                        <Text strong>{cert.code}</Text>
                                        <Text>— {cert.label}</Text>
                                    </Space>
                                    {cert.description && (
                                        <Paragraph type="secondary" className="!mb-0 text-xs mt-1">
                                            {cert.description}
                                        </Paragraph>
                                    )}
                                </div>
                                {selected && <CheckCircleFilled className="text-red-500 text-2xl" />}
                            </div>
                            {selected && (
                                <div className="mt-3 pt-3 border-t border-red-200" onClick={e => e.stopPropagation()}>
                                    <Row gutter={12}>
                                        <Col xs={12}>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Date d'obtention</label>
                                            <DatePicker size="small" className="w-full mt-1 rounded-lg"
                                                value={dayjs(selected.date)}
                                                onChange={d => setSelectedCerts(prev =>
                                                    prev.map(s => s.certId === cert.id
                                                        ? { ...s, date: d?.format('YYYY-MM-DD') || s.date } : s))} />
                                        </Col>
                                        <Col xs={12}>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Organisme émetteur</label>
                                            <Input size="small" className="mt-1 rounded-lg"
                                                value={selected.issuedBy}
                                                onChange={e => setSelectedCerts(prev =>
                                                    prev.map(s => s.certId === cert.id
                                                        ? { ...s, issuedBy: e.target.value } : s))} />
                                        </Col>
                                    </Row>
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>

            {selectedCerts.length > 0 && (
                <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-200">
                    <Text strong className="text-green-700">
                        ✅ {selectedCerts.length} certification(s) sélectionnée(s)
                    </Text>
                </div>
            )}
        </motion.div>,
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-start justify-center p-6">
            <div className="w-full max-w-3xl">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-red-600 rounded-full mb-4 shadow-2xl">
                        <HeartOutlined className="text-white text-4xl" />
                    </div>
                    <Title level={2} className="!mb-1 !font-black">Bienvenue sur Nexus-AID ! 🎉</Title>
                    <Paragraph type="secondary" className="text-lg">
                        Votre compte a été approuvé. Veuillez compléter votre profil pour accéder à la plateforme.
                    </Paragraph>
                    <div className="flex items-center justify-center gap-2 text-red-600">
                        <LockOutlined />
                        <Text type="danger" strong>Cette étape est obligatoire avant d'accéder à la plateforme.</Text>
                    </div>
                </motion.div>

                {/* Progress */}
                <Card className="rounded-2xl shadow-xl mb-6" styles={{ body: { padding: '24px 32px' } }}>
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <Text strong>Score de complétude</Text>
                            <Text strong className={score >= 80 ? 'text-green-600' : 'text-orange-500'}>
                                {Math.round(score)}%
                            </Text>
                        </div>
                        <Progress percent={Math.round(score)}
                            strokeColor={score >= 80 ? '#16a34a' : score >= 50 ? '#f59e0b' : '#dc2626'}
                            strokeWidth={10} className="mb-0" />
                    </div>

                    <Steps current={current} size="small"
                        items={stepTitles.map((title, i) => ({
                            title, icon: stepIcons[i],
                            status: i < current ? 'finish' : i === current ? 'process' : 'wait',
                        }))} />
                </Card>

                {/* Step Content */}
                <Card className="rounded-2xl shadow-xl mb-6" styles={{ body: { padding: '32px' } }}>
                    <Form form={form} layout="vertical" onValuesChange={updateScorePreview}>
                        <AnimatePresence mode="wait">
                            {steps[current]}
                        </AnimatePresence>
                    </Form>
                </Card>

                {/* Navigation */}
                <div className="flex justify-between">
                    <Button size="large" className="h-12 px-8 rounded-xl"
                        disabled={current === 0}
                        onClick={() => setCurrent(c => c - 1)}>
                        ← Précédent
                    </Button>

                    {current < steps.length - 1 ? (
                        <Button type="primary" size="large"
                            className="h-12 px-8 rounded-xl bg-red-600 hover:bg-red-700 border-none font-bold"
                            onClick={async () => {
                                try {
                                    await form.validateFields();
                                    setCurrent(c => c + 1);
                                } catch { /* validation failed */ }
                            }}>
                            Suivant →
                        </Button>
                    ) : (
                        <Button type="primary" size="large" loading={saving}
                            icon={<CheckCircleFilled />}
                            className="h-12 px-8 rounded-xl bg-green-600 hover:bg-green-700 border-none font-bold"
                            onClick={handleSubmit}>
                            Terminer & Accéder à Nexus-AID
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OnboardingPage;

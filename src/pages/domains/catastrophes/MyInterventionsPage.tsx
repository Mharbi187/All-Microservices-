import React, { useEffect, useState } from 'react';
import { Typography, Card, Row, Col, Spin, Button, Tag, Space, Modal, Form, Input, notification, Upload } from 'antd';
import { SafetyOutlined, FilePdfOutlined, EditOutlined, EnvironmentOutlined, CalendarOutlined, PlusOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/stores';
import { catastropheService } from '@/services/catastropheService';
import { templateBuilderService } from '@/services/templateBuilderService';
import PrintRenderer from '@/components/renderer/PrintRenderer';
import type { DisasterMissionDTO } from '@/types';
import type { TemplateElement } from '@/types/template.types';
import jsPDF from 'jspdf';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
dayjs.locale('fr');

const MyInterventionsPage: React.FC = () => {
    const { user } = useAuthStore();
    const [missions, setMissions] = useState<DisasterMissionDTO[]>([]);
    const [loading, setLoading] = useState(true);

    const [isReportModalVisible, setIsReportModalVisible] = useState(false);
    const [selectedMission, setSelectedMission] = useState<DisasterMissionDTO | null>(null);
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);

    // Dynamic Template State
    const [templateStructure, setTemplateStructure] = useState<TemplateElement[] | null>(null);
    const [dynamicResponses, setDynamicResponses] = useState<Record<string, unknown>>({});
    const [loadingTemplate, setLoadingTemplate] = useState(false);

    // Photos State for fallback form
    const [photos, setPhotos] = useState<any[]>([]);

    useEffect(() => {
        fetchMissions();
    }, []);

    const fetchMissions = async () => {
        setLoading(true);
        try {
            const data = await catastropheService.getMyMissions();
            setMissions(data || []);
        } catch (error) {
            notification.error({
                message: 'Erreur',
                description: 'Impossible de récupérer vos missions.',
            });
        } finally {
            setLoading(false);
        }
    };

    const downloadMissionOrder = (mission: DisasterMissionDTO) => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(22);
        doc.setTextColor(220, 38, 38); // Red CRT
        doc.text("ORDRE DE MISSION", 105, 20, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setTextColor(50, 50, 50);
        doc.text("Croissant-Rouge Tunisien", 105, 28, { align: 'center' });
        doc.line(20, 32, 190, 32);

        // Content
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        
        doc.text(`Référence: ${mission.missionNumber || 'N/A'}`, 20, 45);
        doc.text(`Date d'émission: ${dayjs().format('DD/MM/YYYY')}`, 140, 45);
        
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("1. Informations du Volontaire", 20, 60);
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(`Nom et Prénom : ${user?.firstName} ${user?.lastName}`, 25, 70);
        doc.text(`Matricule : ${user?.matricule || 'N/A'}`, 25, 78);
        doc.text(`Rôle : Membre NDRT / RDRT`, 25, 86);

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("2. Détails de la Mission", 20, 105);
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(`Titre : ${mission.title}`, 25, 115);
        doc.text(`Type : ${mission.missionType}`, 25, 123);
        doc.text(`Chef de Mission : ${mission.teamChiefName || 'Non défini'}`, 25, 131);
        doc.text(`Lieu : ${mission.locationGps?.address || 'Non spécifié'}`, 25, 139);
        doc.text(`Début : ${dayjs(mission.startDatetime).format('DD/MM/YYYY HH:mm')}`, 25, 147);
        if (mission.endDatetime) {
            doc.text(`Fin Prévue : ${dayjs(mission.endDatetime).format('DD/MM/YYYY HH:mm')}`, 25, 155);
        }

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("3. Instructions", 20, 175);
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        
        const instructions = mission.instructions || "Veuillez suivre les protocoles standards d'intervention sur le terrain.";
        const splitText = doc.splitTextToSize(instructions, 160);
        doc.text(splitText, 25, 185);

        // Footer Signatures
        doc.setFontSize(10);
        doc.text("Signature du Chef de Mission", 30, 250);
        doc.text("Signature du Président", 130, 250);

        doc.save(`Ordre_Mission_${mission.missionNumber || 'Intervention'}.pdf`);
    };

    const handleOpenReportModal = async (mission: DisasterMissionDTO) => {
        setSelectedMission(mission);
        setIsReportModalVisible(true);
        form.resetFields();
        setPhotos([]);
        setDynamicResponses({});
        setTemplateStructure(null);

        if (mission.reportTemplateId) {
            setLoadingTemplate(true);
            try {
                const versions = await templateBuilderService.getPublishedVersions(mission.reportTemplateId);
                if (versions && versions.length > 0) {
                    // Prends la version publiée la plus récente (on suppose la première ou dernière, selon l'ordre backend)
                    // Généralement, le backend retourne trié par versionNumber desc
                    setTemplateStructure(versions[0].structure);
                }
            } catch (error) {
                console.error("Failed to load template", error);
                notification.warning({
                    message: "Modèle introuvable",
                    description: "Le modèle assigné est introuvable. Vous pouvez utiliser le formulaire standard."
                });
            } finally {
                setLoadingTemplate(false);
            }
        }
    };

    const handlePhotoUpload = async (options: any) => {
        const { file, onSuccess } = options;
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            setPhotos(prev => [...prev, reader.result]);
            onSuccess("ok");
        };
    };

    const handleSubmitReport = async (values?: any) => {
        if (!selectedMission?.id) return;
        setSubmitting(true);
        try {
            let finalResponses: Record<string, unknown> = {};
            
            if (templateStructure) {
                // Modèle dynamique
                finalResponses = dynamicResponses;
            } else {
                // Formulaire basique fallback
                finalResponses = {
                    observations: values?.observations,
                    actionsPrises: values?.actionsPrises,
                    besoins: values?.besoins,
                    photos: photos
                };
            }

            const reportPayload = {
                missionId: selectedMission.id,
                templateId: selectedMission.reportTemplateId, // can be undefined
                responses: finalResponses
            };
            
            await catastropheService.submitFieldReport(selectedMission.id, reportPayload as any);
            
            notification.success({
                message: 'Rapport soumis',
                description: 'Votre rapport a été transmis avec succès au chef de mission.',
            });
            setIsReportModalVisible(false);
        } catch (error) {
            notification.error({
                message: 'Erreur',
                description: 'Impossible de soumettre le rapport.',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'PLANNED': return 'blue';
            case 'IN_PROGRESS': return 'orange';
            case 'COMPLETED': return 'green';
            case 'CANCELLED': return 'red';
            default: return 'default';
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <Title level={2} className="m-0 flex items-center gap-3">
                        <SafetyOutlined className="text-red-600" />
                        Mes Interventions (NDRT / RDRT)
                    </Title>
                    <Text type="secondary" className="mt-1 block text-base">
                        Consultez vos missions d'intervention, téléchargez vos ordres de mission et soumettez vos rapports de terrain.
                    </Text>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Spin size="large" />
                </div>
            ) : missions.length === 0 ? (
                <Card className="text-center p-12 bg-gray-50 border-dashed">
                    <SafetyOutlined className="text-4xl text-gray-300 mb-4 block" />
                    <Title level={4} className="text-gray-500">Aucune mission assignée</Title>
                    <Text type="secondary">Vous n'êtes actuellement assigné(e) à aucune équipe d'intervention active.</Text>
                </Card>
            ) : (
                <Row gutter={[24, 24]}>
                    {missions.map(mission => (
                        <Col xs={24} md={12} lg={8} key={mission.id}>
                            <Card 
                                hoverable 
                                className="h-full flex flex-col shadow-sm border-gray-200"
                                bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                                actions={[
                                    <Button type="text" icon={<FilePdfOutlined />} onClick={() => downloadMissionOrder(mission)}>
                                        Ordre de Mission
                                    </Button>,
                                    <Button type="primary" ghost icon={<EditOutlined />} onClick={() => handleOpenReportModal(mission)}>
                                        Rapport
                                    </Button>
                                ]}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <Tag color={getStatusColor(mission.status)} className="m-0 font-medium px-3 py-1 text-xs rounded-full">
                                        {mission.status === 'PLANNED' ? 'PLANIFIÉE' : 
                                         mission.status === 'IN_PROGRESS' ? 'EN COURS' :
                                         mission.status === 'COMPLETED' ? 'TERMINÉE' : 'ANNULÉE'}
                                    </Tag>
                                    <Text className="text-gray-400 text-xs font-mono">{mission.missionNumber}</Text>
                                </div>
                                
                                <Title level={4} className="mt-0 mb-2 line-clamp-2">{mission.title}</Title>
                                <Paragraph className="text-gray-500 line-clamp-3 text-sm flex-1">
                                    {mission.description || "Aucune description fournie."}
                                </Paragraph>
                                
                                <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-2">
                                    <div className="flex items-center text-sm text-gray-600">
                                        <EnvironmentOutlined className="mr-2 text-gray-400" />
                                        <span className="truncate">{mission.locationGps?.address || 'Lieu non spécifié'}</span>
                                    </div>
                                    <div className="flex items-center text-sm text-gray-600">
                                        <CalendarOutlined className="mr-2 text-gray-400" />
                                        <span>{dayjs(mission.startDatetime).format('DD MMM YYYY, HH:mm')}</span>
                                    </div>
                                    <div className="flex items-center text-sm text-gray-600">
                                        <SafetyOutlined className="mr-2 text-gray-400" />
                                        <span>Chef: <Text strong>{mission.teamChiefName || 'Non défini'}</Text></span>
                                    </div>
                                </div>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}

            {/* Submit Report Modal */}
            <Modal
                title={templateStructure ? "Rapport d'Intervention Officiel" : "Rédiger un rapport d'intervention"}
                open={isReportModalVisible}
                onCancel={() => setIsReportModalVisible(false)}
                footer={null}
                width={800}
                destroyOnClose
            >
                {loadingTemplate ? (
                    <div className="flex justify-center p-12">
                        <Spin />
                    </div>
                ) : templateStructure ? (
                    <div>
                        <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded-md text-sm border border-blue-100">
                            <strong>Note :</strong> Ce modèle officiel a été défini par le coordinateur pour cette mission.
                            Veuillez remplir les champs obligatoires ci-dessous.
                        </div>
                        <div className="p-4 bg-gray-50 rounded border mb-6">
                            <PrintRenderer 
                                structure={templateStructure}
                                filledData={dynamicResponses}
                                mode="fill"
                                onChange={(fieldId, value) => setDynamicResponses(prev => ({...prev, [fieldId]: value}))}
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button onClick={() => setIsReportModalVisible(false)}>
                                Annuler
                            </Button>
                            <Button type="primary" onClick={() => handleSubmitReport()} loading={submitting}>
                                Soumettre le rapport
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="mb-4 p-3 bg-gray-50 text-gray-700 rounded-md text-sm border border-gray-200">
                            Aucun modèle spécifique n'a été assigné à cette mission. Vous pouvez utiliser ce formulaire standard pour rendre compte de votre intervention.
                        </div>
                        
                        <Form form={form} layout="vertical" onFinish={handleSubmitReport}>
                            <Form.Item
                                name="observations"
                                label="Observations sur le terrain"
                                rules={[{ required: true, message: 'Veuillez saisir vos observations' }]}
                            >
                                <TextArea rows={4} placeholder="Décrivez la situation observée à votre arrivée..." />
                            </Form.Item>
                            
                            <Form.Item
                                name="actionsPrises"
                                label="Actions entreprises"
                                rules={[{ required: true, message: 'Veuillez décrire vos actions' }]}
                            >
                                <TextArea rows={4} placeholder="Quelles tâches avez-vous accomplies ?" />
                            </Form.Item>
                            
                            <Form.Item
                                name="besoins"
                                label="Besoins matériels ou renforts (Optionnel)"
                            >
                                <TextArea rows={2} placeholder="S'il manque du matériel ou du personnel..." />
                            </Form.Item>

                            <Form.Item label="Photos (Optionnel)">
                                <Upload
                                    listType="picture-card"
                                    customRequest={handlePhotoUpload}
                                    onRemove={(file) => {
                                        // Just clear all for simplicity, or handle specific removals if needed
                                        setPhotos([]); 
                                    }}
                                    maxCount={3}
                                    accept="image/*"
                                >
                                    <div>
                                        <PlusOutlined />
                                        <div style={{ marginTop: 8 }}>Ajouter</div>
                                    </div>
                                </Upload>
                            </Form.Item>

                            <div className="flex justify-end gap-2 mt-6">
                                <Button onClick={() => setIsReportModalVisible(false)}>
                                    Annuler
                                </Button>
                                <Button type="primary" htmlType="submit" loading={submitting}>
                                    Soumettre le rapport
                                </Button>
                            </div>
                        </Form>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default MyInterventionsPage;

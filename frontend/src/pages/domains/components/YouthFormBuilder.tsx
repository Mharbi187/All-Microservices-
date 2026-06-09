import React, { useState, useEffect } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    Button, Input, Select, Switch, Space, Row, Col,
    Typography, Empty, Modal, Tag, Divider, Checkbox,
    DatePicker
} from 'antd';
import {
    PlusOutlined, DeleteOutlined, HolderOutlined,
    EyeOutlined, SaveOutlined,
    TeamOutlined, FormOutlined,
    StarOutlined, CheckCircleOutlined,
    ArrowRightOutlined, SendOutlined,
    ClockCircleOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import committeeService from '@/services/committeeService';
import type { Committee } from '@/types';

const { Title, Text } = Typography;
const { TextArea } = Input;

// --- Types ---
export type QuestionType = 'TEXT' | 'RADIO' | 'CHECKBOX' | 'SATISFACTION' | 'BOOLEAN' | 'DATE' | 'RATING';

export interface Question {
    id: string;
    type: QuestionType;
    label: string;
    required: boolean;
    options?: string[];
}

interface SortableItemProps {
    id: string;
    question: Question;
    onUpdate: (id: string, patch: Partial<Question>) => void;
    onDelete: (id: string) => void;
}

// --- Reusable Modern Components ---
const GlassCard: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties }> = ({ children, className = "", style }) => (
    <div className={`glass-card ${className}`} style={{ padding: '24px', ...style }}>
        {children}
    </div>
);

const SortableQuestion: React.FC<SortableItemProps> = ({ id, question, onUpdate, onDelete }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        marginBottom: 16,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <div className="glass-card" style={{ padding: '20px', marginBottom: 16 }}>
                <Row gutter={16} align="middle">
                    <Col flex="40px" {...listeners} style={{ cursor: 'grab', opacity: 0.3 }}>
                        <HolderOutlined style={{ fontSize: 20 }} />
                    </Col>
                    <Col flex="auto">
                        <Input
                            value={question.label}
                            onChange={(e) => onUpdate(id, { label: e.target.value })}
                            placeholder="Entrez votre question ici..."
                            variant="borderless"
                            style={{
                                fontWeight: 600,
                                fontSize: 16,
                                padding: 0,
                                color: '#302d28'
                            }}
                        />
                    </Col>
                    <Col>
                        <Tag color="red" style={{
                            borderRadius: 6,
                            border: 'none',
                            background: 'rgba(241, 3, 22, 0.08)',
                            color: '#f10316',
                            fontWeight: 700
                        }}>
                            {question.type}
                        </Tag>
                    </Col>
                    <Col>
                        <Space size="small">
                            <Text type="secondary" style={{ fontSize: 12, opacity: 0.6 }}>Obligatoire</Text>
                            <Switch
                                size="small"
                                checked={question.required}
                                onChange={(val) => onUpdate(id, { required: val })}
                                style={{ background: question.required ? '#f10316' : '#bebdb9' }}
                            />
                            <Divider type="vertical" />
                            <Button
                                type="text"
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => onDelete(id)}
                            />
                        </Space>
                    </Col>
                </Row>

                {(['RADIO', 'CHECKBOX'].includes(question.type)) && (
                    <div style={{ marginTop: 20, paddingLeft: 40, position: 'relative' }}>
                        <div style={{ position: 'absolute', left: 16, top: 0, bottom: 0, width: 2, background: 'rgba(241, 3, 22, 0.1)', borderRadius: 1 }} />
                        {question.options?.map((opt, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: 12, marginBottom: 8, alignItems: 'center' }}>
                                <div style={{ width: 14, height: 14, borderRadius: question.type === 'RADIO' ? '50%' : 4, border: '2px solid #bebdb9' }} />
                                <Input
                                    size="small"
                                    value={opt}
                                    variant="borderless"
                                    onChange={(e) => {
                                        const next = [...(question.options || [])];
                                        next[idx] = e.target.value;
                                        onUpdate(id, { options: next });
                                    }}
                                    style={{ flex: 1, padding: '4px 8px', background: 'rgba(0,0,0,0.02)', borderRadius: 6 }}
                                />
                                <Button
                                    type="text"
                                    size="small"
                                    danger
                                    icon={<DeleteOutlined style={{ fontSize: 12 }} />}
                                    onClick={() => {
                                        const next = question.options?.filter((_, i) => i !== idx);
                                        onUpdate(id, { options: next });
                                    }}
                                />
                            </div>
                        ))}
                        <Button
                            type="text"
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={() => onUpdate(id, { options: [...(question.options || []), `Option ${(question.options?.length || 0) + 1}`] })}
                            style={{ marginTop: 8, color: '#f10316', fontWeight: 600, fontSize: 13 }}
                        >
                            Ajouter une option
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Main Builder ---
interface BuilderProps {
    onSave: (data: {
        title: string;
        description: string;
        questions: Question[];
        targetCommitteeIds: string[];
        targetLevel: string;
    }) => void;
    onCancel: () => void;
    initialData?: { title: string; description: string; questions: Question[] };
    userLevel: 'NATIONAL' | 'REGIONAL' | 'LOCAL';
    userCommitteeId: string;
}

const YouthFormBuilder: React.FC<BuilderProps> = ({ onSave, onCancel, initialData, userLevel, userCommitteeId }) => {
    const [title, setTitle] = useState(initialData?.title || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [questions, setQuestions] = useState<Question[]>(initialData?.questions || []);
    const [isPreview, setIsPreview] = useState(false);
    const [previewAnswers, setPreviewAnswers] = useState<Record<string, any>>({});
    const [isSimulatedSubmitted, setIsSimulatedSubmitted] = useState(false);

    // Hierarchy State
    const [targetLevel, setTargetLevel] = useState<string>(userLevel);
    const [targetCommitteeIds, setTargetCommitteeIds] = useState<string[]>([userCommitteeId]);
    const [committees, setCommittees] = useState<Committee[]>([]);
    const [loadingCommittees, setLoadingCommittees] = useState(false);

    useEffect(() => {
        if (userLevel !== 'LOCAL') {
            fetchCommittees();
        }
    }, [userLevel]);

    const fetchCommittees = async () => {
        setLoadingCommittees(true);
        try {
            const data = await committeeService.getAll();
            setCommittees(data);
        } catch (error) {
            console.error('Failed to fetch committees:', error);
        } finally {
            setLoadingCommittees(false);
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setQuestions((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const addQuestion = (type: QuestionType) => {
        const newQ: Question = {
            id: `q-${Date.now()}`,
            type,
            label: '',
            required: false,
            options: ['RADIO', 'CHECKBOX'].includes(type) ? ['Option 1'] : undefined
        };
        setQuestions([...questions, newQ]);
    };

    const updateQuestion = (id: string, patch: Partial<Question>) => {
        setQuestions(qs => qs.map(q => q.id === id ? { ...q, ...patch } : q));
    };

    const deleteQuestion = (id: string) => {
        setQuestions(qs => qs.filter(q => q.id !== id));
    };

    const QUESTION_TYPES: { type: QuestionType; label: string }[] = [
        { type: 'TEXT', label: 'Texte' },
        { type: 'RADIO', label: 'Choix unique' },
        { type: 'CHECKBOX', label: 'Choix multiple' },
        { type: 'SATISFACTION', label: 'Satisfaction (1-5)' },
        { type: 'BOOLEAN', label: 'Oui/Non' },
        { type: 'DATE', label: 'Date' },
        { type: 'RATING', label: 'Évaluation ⭐' },
    ];

    const filteredCommittees = committees.filter(c => {
        if (userLevel === 'NATIONAL') return true;
        if (userLevel === 'REGIONAL') {
            // Should show own region and its locals
            // Mocking logic: region field exists in Committee DTO
            return c.id === userCommitteeId || (c.parentId === userCommitteeId);
        }
        return false;
    });

    return (
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <Space direction="vertical" size={2}>
                    <Title level={2} style={{ margin: 0, fontWeight: 900, color: '#302d28' }}>Générateur de Formulaire</Title>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Tag color="red" icon={<ClockCircleOutlined />} style={{ borderRadius: 6, fontWeight: 600 }}>Brouillon</Tag>
                        <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
                            Ciblage <ArrowRightOutlined style={{ fontSize: 10, margin: '0 4px' }} />
                            <Text strong style={{ color: '#f10316' }}>{targetLevel}</Text>
                        </Text>
                    </div>
                </Space>

                <Space size="middle">
                    <Button
                        icon={<EyeOutlined />}
                        onClick={() => setIsPreview(true)}
                        className="hover-lift"
                        style={{ height: 48, borderRadius: 14, fontWeight: 600, padding: '0 24px', border: '1.5px solid #bebdb9' }}
                    >
                        Aperçu
                    </Button>
                    <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={() => onSave({ title, description, questions, targetCommitteeIds, targetLevel })}
                        className="red-gradient"
                        style={{
                            height: 48,
                            border: 'none',
                            borderRadius: 14,
                            fontWeight: 700,
                            padding: '0 28px'
                        }}
                        disabled={!title || questions.length === 0 || targetCommitteeIds.length === 0}
                    >
                        Publier le Formulaire
                    </Button>
                    <Button
                        onClick={onCancel}
                        type="text"
                        style={{ color: '#bebdb9', fontWeight: 600 }}
                    >
                        Annuler
                    </Button>
                </Space>
            </div>

            <Row gutter={24}>
                <Col xs={24} lg={16}>
                    <GlassCard className="mb-6" style={{ padding: '32px' }}>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Titre du formulaire *"
                            size="large"
                            variant="borderless"
                            className="text-2xl font-black px-0 mb-2 focus:shadow-none"
                            style={{ padding: '0', color: '#302d28' }}
                        />
                        <TextArea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Ajoutez une description ou des consignes pour les bénévoles. Ce texte sera affiché en haut du formulaire pour expliquer l'objectif de la collecte d'informations."
                            autoSize={{ minRows: 2 }}
                            variant="borderless"
                            className="px-0 focus:shadow-none text-gray-500"
                            style={{ fontSize: 15, lineHeight: 1.6 }}
                        />
                    </GlassCard>

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={questions.map(q => q.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {questions.length === 0 ? (
                                <div style={{
                                    background: 'rgba(255,255,255,0.4)',
                                    border: '2px dashed rgba(48,45,40,0.1)',
                                    textAlign: 'center',
                                    padding: '60px 40px',
                                    borderRadius: 30
                                }}>
                                    <Empty
                                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                                        description={
                                            <Space direction="vertical" size={4}>
                                                <Text type="secondary" style={{ fontSize: 16, fontWeight: 600 }}>Votre formulaire est vide</Text>
                                                <Text type="secondary" style={{ fontSize: 13, opacity: 0.6 }}>Commencez par ajouter une question depuis la boîte à outils à droite.</Text>
                                            </Space>
                                        }
                                    />
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {questions.map((q) => (
                                        <SortableQuestion
                                            key={q.id}
                                            id={q.id}
                                            question={q}
                                            onUpdate={updateQuestion}
                                            onDelete={deleteQuestion}
                                        />
                                    ))}
                                </div>
                            )}
                        </SortableContext>
                    </DndContext>
                </Col>

                <Col xs={24} lg={8}>
                    <div className="sticky top-6 h-[calc(100vh-120px)] overflow-y-auto pr-2 custom-scrollbar">
                        {/* Publication Settings */}
                        <GlassCard className="mb-6">
                            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(241, 3, 22, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <TeamOutlined style={{ color: '#f10316' }} />
                                </div>
                                <Title level={5} style={{ margin: 0, fontWeight: 700 }}>Ciblage</Title>
                            </div>

                            <div style={{ marginBottom: 24 }}>
                                <Text strong style={{ fontSize: 11, color: '#bebdb9', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>NIVEAU ADMINISTRATIVE</Text>
                                <Select
                                    value={targetLevel}
                                    onChange={(val) => {
                                        setTargetLevel(val);
                                        if (val === 'GLOBAL') setTargetCommitteeIds(['ALL']);
                                        else if (val === 'LOCAL' && userLevel === 'LOCAL') setTargetCommitteeIds([userCommitteeId]);
                                        else setTargetCommitteeIds([]);
                                    }}
                                    style={{ width: '100%', height: 40, background: '#f9fafb', borderRadius: 10 }}
                                    options={[
                                        { label: 'Global (National)', value: 'GLOBAL', disabled: userLevel !== 'NATIONAL' },
                                        { label: 'Régional', value: 'REGIONAL', disabled: userLevel === 'LOCAL' },
                                        { label: 'Local (Comité)', value: 'LOCAL' },
                                    ]}
                                    disabled={userLevel === 'LOCAL'}
                                />
                            </div>

                            {targetLevel !== 'GLOBAL' && (
                                <div style={{ marginBottom: 24 }}>
                                    <Text strong style={{ fontSize: 11, color: '#bebdb9', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>SÉLECTION DES UNITÉS</Text>
                                    <Select
                                        mode="multiple"
                                        placeholder="Choisir les comités..."
                                        value={targetCommitteeIds}
                                        onChange={setTargetCommitteeIds}
                                        style={{ width: '100%' }}
                                        maxTagCount="responsive"
                                        loading={loadingCommittees}
                                        disabled={userLevel === 'LOCAL'}
                                        className="custom-select"
                                        options={filteredCommittees.map(c => ({
                                            label: `${c.name} (${c.type})`,
                                            value: c.id
                                        }))}
                                    />
                                </div>
                            )}

                            <Divider style={{ margin: '16px 0', opacity: 0.1 }} />

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div className="flex items-center justify-between">
                                    <Text style={{ fontSize: 13, opacity: 0.8 }}>Générer QR Code</Text>
                                    <Switch size="small" checked={true} disabled style={{ background: '#f10316' }} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Text style={{ fontSize: 13, opacity: 0.8 }}>Alertes Email</Text>
                                    <Switch size="small" defaultChecked style={{ background: '#f10316' }} />
                                </div>
                            </div>
                        </GlassCard>

                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(241, 3, 22, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <PlusOutlined style={{ color: '#f10316' }} />
                                </div>
                                <Title level={5} style={{ margin: 0, fontWeight: 700 }}>Outils</Title>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                {QUESTION_TYPES.map((qt) => (
                                    <button
                                        key={qt.type}
                                        onClick={() => addQuestion(qt.type)}
                                        className="flex flex-col items-center justify-center gap-3 p-4 bg-white border border-transparent rounded-2xl shadow-sm hover:border-red-500 hover:shadow-md transition-all active:scale-95 group"
                                        style={{ border: '1px solid rgba(0,0,0,0.05)' }}
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-red-50 group-hover:text-red-500 transition-colors">
                                            {qt.type === 'TEXT' && <FormOutlined />}
                                            {qt.type === 'RADIO' && <TeamOutlined />}
                                            {qt.type === 'CHECKBOX' && <PlusOutlined />}
                                            {qt.type === 'SATISFACTION' && <StarOutlined />}
                                            {qt.type === 'BOOLEAN' && <CheckCircleOutlined />}
                                            {qt.type === 'DATE' && <ClockCircleOutlined />}
                                            {qt.type === 'RATING' && <StarOutlined />}
                                        </div>
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 group-hover:text-red-600">
                                            {qt.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </Col>
            </Row>

            <Modal
                title={null}
                open={isPreview}
                onCancel={() => {
                    setIsPreview(false);
                    setIsSimulatedSubmitted(false);
                    setPreviewAnswers({});
                }}
                footer={null}
                width="95%"
                style={{ maxWidth: 800 }}
                centered
                destroyOnHidden
                styles={{ body: { padding: 0, overflow: 'hidden', borderRadius: 24 } }}
                className="premium-preview-modal"
            >
                <div style={{
                    maxHeight: '85vh',
                    overflowY: 'auto',
                    background: isSimulatedSubmitted ? '#fff' : '#f7f8f6',
                    padding: '24px 20px'
                }} className="sm:p-10">
                    <AnimatePresence mode="wait">
                        {!isSimulatedSubmitted ? (
                            <motion.div
                                key="simulation-form"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                            >
                                {/* Header Simulation */}
                                <div style={{ textAlign: 'center', marginBottom: 48 }}>
                                    <div style={{
                                        width: 60, height: 60, borderRadius: 20,
                                        background: 'linear-gradient(135deg, #f10316, #e23a4d)',
                                        margin: '0 auto 20px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 10px 25px rgba(241, 3, 22, 0.25)'
                                    }}>
                                        <FormOutlined style={{ fontSize: 24, color: '#fff' }} />
                                    </div>
                                    <Title level={2} style={{ margin: '0 0 12px 0', fontWeight: 900 }}>{title || 'Formulaire Jeunesse'}</Title>
                                    <Text type="secondary" style={{ fontSize: 16, maxWidth: 600, display: 'inline-block' }}>
                                        {description || 'Veuillez remplir ce formulaire pour soumettre vos informations.'}
                                    </Text>
                                    <Divider style={{ marginTop: 32, opacity: 0.1 }} />
                                </div>

                                {/* Questions Simulation */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                                    {questions.map((q, idx) => (
                                        <div key={q.id} style={{
                                            background: '#fff',
                                            padding: '20px',
                                            borderRadius: 24,
                                            boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
                                            border: '1px solid rgba(0,0,0,0.04)',
                                            minHeight: 120
                                        }} className="sm:p-8">
                                            <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
                                                <span style={{
                                                    background: 'rgba(241, 3, 22, 0.1)',
                                                    color: '#f10316',
                                                    width: 28, height: 28,
                                                    borderRadius: 8,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontWeight: 800, fontSize: 13
                                                }}>
                                                    {idx + 1}
                                                </span>
                                                <div style={{ flex: 1 }}>
                                                    <Text strong style={{ fontSize: 17, color: '#302d28' }}>
                                                        {q.label || 'Question sans titre'}
                                                        {q.required && <span style={{ color: '#f10316', marginLeft: 4 }}>*</span>}
                                                    </Text>
                                                </div>
                                            </div>

                                            <div style={{ paddingLeft: 40 }}>
                                                {q.type === 'TEXT' && (
                                                    <Input
                                                        size="large"
                                                        placeholder="Votre réponse ici..."
                                                        style={{ borderRadius: 12, height: 50 }}
                                                        value={previewAnswers[q.id] || ''}
                                                        onChange={(e) => setPreviewAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                                    />
                                                )}

                                                {(q.type === 'RADIO' || q.type === 'BOOLEAN') && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                        {(q.type === 'BOOLEAN' ? ['Oui', 'Non'] : (q.options || [])).map(opt => (
                                                            <div
                                                                key={opt}
                                                                onClick={() => setPreviewAnswers(prev => ({ ...prev, [q.id]: opt }))}
                                                                style={{
                                                                    padding: '14px 20px',
                                                                    borderRadius: 14,
                                                                    border: '2px solid',
                                                                    borderColor: previewAnswers[q.id] === opt ? '#f10316' : 'rgba(0,0,0,0.05)',
                                                                    background: previewAnswers[q.id] === opt ? 'rgba(241, 3, 22, 0.03)' : '#fff',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s ease',
                                                                    fontWeight: 600,
                                                                    color: previewAnswers[q.id] === opt ? '#f10316' : '#302d28'
                                                                }}
                                                            >
                                                                <Space>
                                                                    <div style={{
                                                                        width: 18, height: 18,
                                                                        borderRadius: '50%',
                                                                        border: '2px solid',
                                                                        borderColor: previewAnswers[q.id] === opt ? '#f10316' : '#bebdb9',
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                                    }}>
                                                                        {previewAnswers[q.id] === opt && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f10316' }} />}
                                                                    </div>
                                                                    {opt}
                                                                </Space>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {q.type === 'CHECKBOX' && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                        {(q.options || []).map(opt => (
                                                            <div
                                                                key={opt}
                                                                onClick={() => {
                                                                    const current = previewAnswers[q.id] || [];
                                                                    const next = current.includes(opt)
                                                                        ? current.filter((v: string) => v !== opt)
                                                                        : [...current, opt];
                                                                    setPreviewAnswers(prev => ({ ...prev, [q.id]: next }));
                                                                }}
                                                                style={{
                                                                    padding: '14px 20px',
                                                                    borderRadius: 14,
                                                                    border: '2px solid',
                                                                    borderColor: (previewAnswers[q.id] || []).includes(opt) ? '#f10316' : 'rgba(0,0,0,0.05)',
                                                                    background: (previewAnswers[q.id] || []).includes(opt) ? 'rgba(241, 3, 22, 0.03)' : '#fff',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s ease',
                                                                    fontWeight: 600,
                                                                    color: (previewAnswers[q.id] || []).includes(opt) ? '#f10316' : '#302d28'
                                                                }}
                                                            >
                                                                <Space>
                                                                    <div style={{
                                                                        width: 18, height: 18,
                                                                        borderRadius: 4,
                                                                        border: '2px solid',
                                                                        borderColor: (previewAnswers[q.id] || []).includes(opt) ? '#f10316' : '#bebdb9',
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                                    }}>
                                                                        {(previewAnswers[q.id] || []).includes(opt) && <CheckCircleOutlined style={{ fontSize: 12, color: '#f10316' }} />}
                                                                    </div>
                                                                    {opt}
                                                                </Space>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {q.type === 'DATE' && (
                                                    <DatePicker
                                                        size="large"
                                                        placeholder="Sélectionner une date"
                                                        className="w-full"
                                                        style={{ borderRadius: 12, height: 50 }}
                                                        getPopupContainer={(trigger) => trigger.parentElement || document.body}
                                                        onChange={(_, dateString) => setPreviewAnswers(prev => ({ ...prev, [q.id]: dateString }))}
                                                    />
                                                )}

                                                {q.type === 'SATISFACTION' && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                                                        {[1, 2, 3, 4, 5].map(val => (
                                                            <Button
                                                                key={val}
                                                                onClick={() => setPreviewAnswers(prev => ({ ...prev, [q.id]: val }))}
                                                                style={{
                                                                    width: 50, height: 50, borderRadius: 15,
                                                                    borderColor: previewAnswers[q.id] === val ? '#f10316' : 'rgba(0,0,0,0.1)',
                                                                    background: previewAnswers[q.id] === val ? '#f10316' : '#fff',
                                                                    color: previewAnswers[q.id] === val ? '#fff' : '#302d28',
                                                                    fontWeight: 800,
                                                                    fontSize: 18
                                                                }}
                                                            >
                                                                {val}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                )}

                                                {q.type === 'RATING' && (
                                                    <div style={{ fontSize: 32, color: '#f10316' }}>
                                                        {[1, 2, 3, 4, 5].map(val => (
                                                            <StarOutlined
                                                                key={val}
                                                                style={{
                                                                    marginRight: 8, cursor: 'pointer',
                                                                    opacity: (previewAnswers[q.id] || 0) >= val ? 1 : 0.2
                                                                }}
                                                                onClick={() => setPreviewAnswers(prev => ({ ...prev, [q.id]: val }))}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ marginTop: 60, textAlign: 'center' }}>
                                    <Button
                                        type="primary"
                                        size="large"
                                        icon={<SendOutlined />}
                                        onClick={() => setIsSimulatedSubmitted(true)}
                                        style={{
                                            background: 'linear-gradient(135deg, #f10316, #e23a4d)',
                                            borderColor: '#f10316',
                                            height: 60,
                                            padding: '0 60px',
                                            borderRadius: 20,
                                            fontWeight: 700,
                                            fontSize: 18,
                                            boxShadow: '0 15px 35px rgba(241, 3, 22, 0.3)'
                                        }}
                                        className="hover-lift"
                                    >
                                        Soumettre la réponse
                                    </Button>
                                    <div style={{ marginTop: 24 }}>
                                        <Button variant="text" onClick={() => setIsPreview(false)} style={{ color: '#bebdb9', fontWeight: 600 }}>Quitter le mode aperçu</Button>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="simulation-success"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                style={{ textAlign: 'center', padding: '60px 0' }}
                            >
                                <div style={{
                                    width: 100, height: 100, borderRadius: 50,
                                    background: 'rgba(52, 211, 153, 0.1)',
                                    color: '#10b981',
                                    margin: '0 auto 32px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 48
                                }}>
                                    <CheckCircleOutlined />
                                </div>
                                <Title level={2}>Simulation terminée !</Title>
                                <Text style={{ fontSize: 18, display: 'block', marginBottom: 40, color: '#302d28', opacity: 0.7 }}>
                                    Votre réponse a été enregistrée avec succès dans ce mode simulation.<br />
                                    C'est exactement ce que verront vos volontaires.
                                </Text>
                                <Button
                                    size="large"
                                    onClick={() => {
                                        setIsSimulatedSubmitted(false);
                                        setPreviewAnswers({});
                                    }}
                                    style={{ borderRadius: 15, fontWeight: 700, padding: '0 40px' }}
                                >
                                    Recommencer la simulation
                                </Button>
                                <div style={{ marginTop: 24 }}>
                                    <Button type="primary" onClick={() => setIsPreview(false)} style={{ background: '#302d28', borderColor: '#302d28', borderRadius: 15, height: 44, padding: '0 30px' }}>
                                        Fermer l'aperçu
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </Modal>
        </div >
    );
};

export default YouthFormBuilder;

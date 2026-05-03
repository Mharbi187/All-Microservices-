// ============================================================
// Template Builder — Professional SaaS-style Report Builder
// Drag & Drop + Contextual Properties + Rich Element Palette
// ============================================================
import React, { useEffect, useDeferredValue, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Layout, Button, Space, Tooltip, message, Divider, Typography, Badge,
  Select, Input, Switch, Form, Popconfirm, Tag, Slider, InputNumber, Collapse, Modal,
} from 'antd';
import {
  ArrowLeftOutlined, EyeOutlined, EditOutlined, SaveOutlined, UndoOutlined, RedoOutlined,
  HolderOutlined, DeleteOutlined, CopyOutlined, DragOutlined,
  AlignLeftOutlined, AlignCenterOutlined, AlignRightOutlined,
  DesktopOutlined, TabletOutlined, MobileOutlined, PlusOutlined, SearchOutlined,
  FilePdfOutlined, FontSizeOutlined,
  LineOutlined, FormOutlined, CheckSquareOutlined, UnorderedListOutlined,
  CalendarOutlined, PictureOutlined, TableOutlined, HighlightOutlined,
  CloudUploadOutlined, CloudSyncOutlined, SendOutlined,
  BorderOuterOutlined, RadiusSettingOutlined, DashOutlined,
} from '@ant-design/icons';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { nanoid } from 'nanoid';
import { useBuilderStore } from '@/stores/builderStore';
import { templateBuilderService } from '@/services/templateBuilderService';
import type { ElementType, TemplateElement } from '@/types/template.types';
import RenderEngine from '@/components/renderer/RenderEngine';
import { V2ElementRenderer } from '@/components/renderer/V2Renderer';

const { Sider, Content, Header } = Layout;
const { Text, Title } = Typography;

// ── Design tokens ────────────────────────────────────────────────────────────
const COLORS = {
  primary: '#7c3aed', // Violet principal pour le bouton de sauvegarde
  primaryLight: '#f5f3ff',
  primaryBorder: '#ddd6fe',
  surface: '#ffffff',
  canvas: '#f8fafc',
  border: '#e2e8f0',
  borderHover: '#cbd5e1',
  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  danger: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  activeMode: '#ef4444', // Rouge pour le mode actif PC
  typoAccent: '#4f46e5',
  fieldAccent: '#059669',
  advancedAccent: '#d97706',
};

// ── Element palette ──────────────────────────────────────────────────────────
const ELEMENT_META: Record<string, { icon: React.ReactNode; label: string; desc: string }> = {
  heading: { icon: <FontSizeOutlined />, label: 'Titre', desc: 'H1, H2, H3' },
  subtitle: { icon: <FontSizeOutlined style={{ fontSize: 12 }} />, label: 'Sous-titre', desc: 'Texte d\'accroche' },
  paragraph: { icon: <AlignLeftOutlined />, label: 'Paragraphe', desc: 'Texte libre, puces' },
  divider: { icon: <LineOutlined />, label: 'Séparateur', desc: 'Ligne horizontale' },
  text_input: { icon: <FormOutlined />, label: 'Champ texte', desc: 'Saisie courte' },
  textarea: { icon: <AlignLeftOutlined />, label: 'Zone de texte', desc: 'Saisie longue' },
  checkbox: { icon: <CheckSquareOutlined />, label: 'Case à cocher', desc: 'Oui / Non' },
  radio: { icon: <UnorderedListOutlined />, label: 'Boutons radio', desc: 'Choix unique' },
  date_picker: { icon: <CalendarOutlined />, label: 'Sélecteur de date', desc: 'Date / Période' },
  image: { icon: <PictureOutlined />, label: 'Image', desc: 'Logo, Photo' },
  file_upload: { icon: <CloudUploadOutlined />, label: 'Fichier', desc: 'À télécharger' },
  table: { icon: <TableOutlined />, label: 'Tableau de données', desc: 'Lignes & colonnes' },
  signature_block: { icon: <HighlightOutlined />, label: 'Signature', desc: 'Bloc signature' },
  page_break: { icon: <DashOutlined />, label: 'Saut de page', desc: 'Force le passage à la page suivante' },
};

const PALETTE_GROUPS = [
  {
    label: 'MISE EN PAGE', color: COLORS.primary,
    items: ['heading', 'subtitle', 'paragraph', 'divider', 'page_break'] as ElementType[],
  },
  {
    label: 'CHAMPS DE SAISIE', color: COLORS.fieldAccent,
    items: ['text_input', 'textarea', 'checkbox', 'radio', 'date_picker', 'signature_block'] as ElementType[],
  },
  {
    label: 'AVANCÉ', color: COLORS.advancedAccent,
    items: ['image', 'file_upload', 'table'] as ElementType[],
  },
];

// ── Sortable Element Card with floating toolbar ──────────────────────────────
const SortableElementCard = React.memo(({ id, el, isSelected, isHovered, onSelect, onRemove, onDuplicate, onHover }: {
  id: string; el: TemplateElement; isSelected: boolean; isHovered: boolean;
  onSelect: () => void; onRemove: () => void; onDuplicate: () => void;
  onHover: (id: string | null) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const showToolbar = isSelected || isHovered;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    position: 'relative',
    border: isSelected ? `2px solid ${COLORS.primary}` : isHovered ? `1px dashed ${COLORS.primaryBorder}` : '1px solid transparent',
    borderRadius: 4,
    cursor: 'default',
    width: '100%',
    gridColumn: `span ${(el.props as any).gridSpan || 12}`,
    boxSizing: 'border-box',
    margin: isSelected ? '-1px' : '0' // compense la bordure pour ne pas sauter
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onMouseEnter={() => onHover(id)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Floating toolbar */}
      {showToolbar && (
        <div style={{
          position: 'absolute', top: -32, right: 0,
          background: COLORS.primary, borderRadius: 6, padding: '4px 6px',
          display: 'flex', gap: 2, zIndex: 50,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          <Tooltip title="Déplacer">
            <Button size="small" type="text" icon={<DragOutlined style={{ color: '#fff', fontSize: 12 }} />}
              style={{ minWidth: 24, height: 24, cursor: 'grab' }} {...attributes} {...listeners} />
          </Tooltip>
          <Tooltip title="Dupliquer">
            <Button size="small" type="text" icon={<CopyOutlined style={{ color: '#fff', fontSize: 12 }} />}
              style={{ minWidth: 24, height: 24 }} onClick={e => { e.stopPropagation(); onDuplicate(); }} />
          </Tooltip>
          <Tooltip title="Supprimer">
            <Button size="small" type="text" icon={<DeleteOutlined style={{ color: '#fff', fontSize: 12 }} />}
              style={{ minWidth: 24, height: 24 }} onClick={e => { e.stopPropagation(); onRemove(); }} />
          </Tooltip>
        </div>
      )}

      {/* Render Element Live */}
      <div style={{ pointerEvents: 'none' }}>
        <V2ElementRenderer
          element={el}
          filledData={{}}
          mode="preview"
        />
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Deep equality for performance
  return prevProps.isSelected === nextProps.isSelected &&
    prevProps.isHovered === nextProps.isHovered &&
    JSON.stringify(prevProps.el) === JSON.stringify(nextProps.el);
});

// ── Box Model Editor ───────────────────────────────────────────────────────────
const BoxModelEditor: React.FC<{
  margin?: { top: number, right: number, bottom: number, left: number };
  padding?: { top: number, right: number, bottom: number, left: number };
  onChange: (type: 'margin' | 'padding', side: 'top' | 'right' | 'bottom' | 'left', val: number) => void;
}> = ({ margin = { top: 0, right: 0, bottom: 0, left: 0 }, padding = { top: 0, right: 0, bottom: 0, left: 0 }, onChange }) => {
  return (
    <div style={{
      position: 'relative', width: '100%', height: 160, background: COLORS.canvas,
      border: `1px solid ${COLORS.border}`, borderRadius: 8, display: 'flex',
      justifyContent: 'center', alignItems: 'center', fontFamily: 'Inter, sans-serif'
    }}>
      <Text style={{ position: 'absolute', top: 4, left: 8, fontSize: 9, fontWeight: 600, color: COLORS.textSecondary, letterSpacing: 1 }}>MARGIN</Text>
      <InputNumber size="small" controls={false} style={{ position: 'absolute', top: 4, width: 40, textAlign: 'center', fontSize: 11 }} value={margin.top} onChange={v => onChange('margin', 'top', v || 0)} />
      <InputNumber size="small" controls={false} style={{ position: 'absolute', bottom: 4, width: 40, textAlign: 'center', fontSize: 11 }} value={margin.bottom} onChange={v => onChange('margin', 'bottom', v || 0)} />
      <InputNumber size="small" controls={false} style={{ position: 'absolute', left: 4, top: '50%', marginTop: -12, width: 40, textAlign: 'center', fontSize: 11 }} value={margin.left} onChange={v => onChange('margin', 'left', v || 0)} />
      <InputNumber size="small" controls={false} style={{ position: 'absolute', right: 4, top: '50%', marginTop: -12, width: 40, textAlign: 'center', fontSize: 11 }} value={margin.right} onChange={v => onChange('margin', 'right', v || 0)} />

      <div style={{
        position: 'relative', width: 140, height: 90, border: `1px dashed ${COLORS.borderHover}`,
        background: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center'
      }}>
        <Text style={{ position: 'absolute', top: 2, left: 4, fontSize: 9, fontWeight: 600, color: COLORS.textSecondary, letterSpacing: 1 }}>PADDING</Text>
        <InputNumber size="small" controls={false} style={{ position: 'absolute', top: 2, width: 36, textAlign: 'center', fontSize: 11 }} value={padding.top} onChange={v => onChange('padding', 'top', v || 0)} />
        <InputNumber size="small" controls={false} style={{ position: 'absolute', bottom: 2, width: 36, textAlign: 'center', fontSize: 11 }} value={padding.bottom} onChange={v => onChange('padding', 'bottom', v || 0)} />
        <InputNumber size="small" controls={false} style={{ position: 'absolute', left: 2, top: '50%', marginTop: -12, width: 36, textAlign: 'center', fontSize: 11 }} value={padding.left} onChange={v => onChange('padding', 'left', v || 0)} />
        <InputNumber size="small" controls={false} style={{ position: 'absolute', right: 2, top: '50%', marginTop: -12, width: 36, textAlign: 'center', fontSize: 11 }} value={padding.right} onChange={v => onChange('padding', 'right', v || 0)} />

        <div style={{ width: 40, height: 24, background: COLORS.primaryLight, border: `1px solid ${COLORS.primaryBorder}`, borderRadius: 2 }} />
      </div>
    </div>
  );
};

// ── Sortable Option Item ──────────────────────────────────────────────────────
const SortableOptionItem: React.FC<{
  id: string; opt: { id: string, label: string, value: string };
  onChange: (id: string, key: string, val: string) => void;
  onRemove: (id: string) => void;
}> = ({ id, opt, onChange, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform), transition,
        display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6,
        background: '#fff', padding: '4px 6px', border: `1px solid ${COLORS.border}`, borderRadius: 4,
      }}
    >
      <span {...attributes} {...listeners} style={{ cursor: 'grab', color: COLORS.textMuted }}>
        <DragOutlined />
      </span>
      <Input size="small" value={opt.label} onChange={e => onChange(opt.id, 'label', e.target.value)} placeholder="Label" style={{ flex: 1 }} />
      <Input size="small" value={opt.value} onChange={e => onChange(opt.id, 'value', e.target.value)} placeholder="Valeur" style={{ flex: 1 }} />
      <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => onRemove(opt.id)} />
    </div>
  );
};

// ── Options Editor ───────────────────────────────────────────────────────────
const OptionsEditor: React.FC<{
  options: { id: string, label: string, value: string }[];
  onChange: (options: { id: string, label: string, value: string }[]) => void;
}> = ({ options, onChange }) => {
  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = options.findIndex(o => o.id === active.id);
      const newIndex = options.findIndex(o => o.id === over.id);
      const newOptions = [...options];
      const [moved] = newOptions.splice(oldIndex, 1);
      newOptions.splice(newIndex, 0, moved);
      onChange(newOptions);
    }
  };

  return (
    <div style={{ marginTop: 8 }}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={options.map(o => o.id)} strategy={verticalListSortingStrategy}>
          {options.map(opt => (
            <SortableOptionItem
              key={opt.id} id={opt.id} opt={opt}
              onChange={(id, key, val) => onChange(options.map(o => o.id === id ? { ...o, [key]: val } : o))}
              onRemove={id => onChange(options.filter(o => o.id !== id))}
            />
          ))}
        </SortableContext>
      </DndContext>
      <Button type="dashed" block size="small" icon={<PlusOutlined />} onClick={() => onChange([...options, { id: `opt_${Date.now()}`, label: 'Nouvelle option', value: `val_${Date.now()}` }])}>
        Ajouter une option
      </Button>
    </div>
  );
};

// ── Properties Panel ─────────────────────────────────────────────────────────
const PropertiesPanel: React.FC<{
  element: TemplateElement;
  onUpdate: (id: string, props: any) => void;
}> = ({ element, onUpdate }) => {
  const meta = ELEMENT_META[element.type] || { icon: '□', label: element.type, desc: '' };

  const update = (key: string, value: any) => {
    onUpdate(element.id, { ...element.props, [key]: value });
  };

  const updateBoxModel = (type: 'margin' | 'padding', side: string, val: number) => {
    const current = (element.props as any)[type] || { top: 0, right: 0, bottom: 0, left: 0 };
    update(type, { ...current, [side]: val });
  };

  const isTextElement = ['heading', 'paragraph', 'subtitle'].includes(element.type);

  return (
    <div style={{ padding: '0 4px', paddingBottom: 40 }}>
      {/* Element type header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
        padding: '10px 12px', background: COLORS.primaryLight, borderRadius: 8,
      }}>
        <span style={{ color: COLORS.primary, fontSize: 18 }}>{meta.icon}</span>
        <div>
          <Text strong style={{ fontSize: 13, textTransform: 'uppercase', color: COLORS.primary }}>PROPRIÉTÉS: {meta.label}</Text>
          <Text style={{ display: 'block', fontSize: 11, color: COLORS.textSecondary }}>{meta.desc}</Text>
        </div>
      </div>

      <Collapse defaultActiveKey={['content', 'text', 'spacing']} expandIconPosition="end" ghost
        items={[
          {
            key: 'content', label: <Text strong style={{ fontSize: 12 }}>Contenu</Text>,
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {element.type === 'heading' && (
                  <>
                    <div>
                      <Text style={{ fontSize: 11, color: COLORS.textSecondary, display: 'block', marginBottom: 4 }}>Texte</Text>
                      <Input.TextArea rows={2} value={(element.props as any).text || ''}
                        onChange={e => update('text', e.target.value)} placeholder="Titre..." />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, color: COLORS.textSecondary, display: 'block', marginBottom: 4 }}>Niveau</Text>
                        <Select value={(element.props as any).level || 1} onChange={v => update('level', v)} style={{ width: '100%' }}
                          options={[
                            { value: 1, label: 'H1 — Titre principal' }, { value: 2, label: 'H2 — Sous-titre' },
                            { value: 3, label: 'H3 — Section' }, { value: 4, label: 'H4 — Sous-section' },
                            { value: 5, label: 'H5 — Paragraphe' }, { value: 6, label: 'H6 — Détail' }
                          ]} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, color: COLORS.textSecondary, display: 'block', marginBottom: 4 }}>Indentation</Text>
                        <InputNumber min={0} max={10} value={(element.props as any).indentation || 0} onChange={v => update('indentation', v)} style={{ width: '100%' }} />
                      </div>
                    </div>
                  </>
                )}
                {element.type === 'paragraph' && (
                  <div>
                    <Text style={{ fontSize: 11, color: COLORS.textSecondary, display: 'block', marginBottom: 4 }}>Texte</Text>
                    <Input.TextArea rows={4} value={(element.props as any).text || ''}
                      onChange={e => update('text', e.target.value)} placeholder="Saisissez votre texte..." />
                  </div>
                )}
                {['text_input', 'textarea', 'date_picker', 'signature_block', 'checkbox', 'radio'].includes(element.type) && (
                  <div>
                    <Text style={{ fontSize: 11, color: COLORS.textSecondary, display: 'block', marginBottom: 4 }}>Label / Question</Text>
                    <Input value={(element.props as any).label || ''} onChange={e => update('label', e.target.value)} />
                  </div>
                )}
                {['text_input', 'textarea', 'date_picker'].includes(element.type) && (
                  <div>
                    <Text style={{ fontSize: 11, color: COLORS.textSecondary, display: 'block', marginBottom: 4 }}>Placeholder</Text>
                    <Input value={(element.props as any).placeholder || ''} onChange={e => update('placeholder', e.target.value)} />
                  </div>
                )}
                {element.type === 'date_picker' && (
                  <>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, color: COLORS.textSecondary, display: 'block', marginBottom: 4 }}>Format</Text>
                        <Select value={(element.props as any).format || 'DD/MM/YYYY'} onChange={v => update('format', v)} style={{ width: '100%' }}
                          options={[{ value: 'DD/MM/YYYY', label: 'JJ/MM/AAAA' }, { value: 'MM/DD/YYYY', label: 'MM/JJ/AAAA' }, { value: 'YYYY-MM-DD', label: 'AAAA-MM-JJ' }]} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, color: COLORS.textSecondary, display: 'block', marginBottom: 4 }}>Valeur par défaut</Text>
                        <Select value={(element.props as any).defaultValue || 'today'} onChange={v => update('defaultValue', v)} style={{ width: '100%' }}
                          options={[{ value: 'today', label: "Aujourd'hui" }, { value: 'none', label: 'Aucune' }]} />
                      </div>
                    </div>
                  </>
                )}
                {['text_input', 'textarea', 'date_picker', 'checkbox', 'radio'].includes(element.type) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12 }}>Champ obligatoire</Text>
                    <Switch size="small" checked={(element.props as any).required} onChange={v => update('required', v)} />
                  </div>
                )}
                {['checkbox', 'radio'].includes(element.type) && (
                  <>
                    <Divider style={{ margin: '8px 0' }} />
                    <div>
                      <Text style={{ fontSize: 11, color: COLORS.textSecondary, display: 'block', marginBottom: 4 }}>Disposition</Text>
                      <Select value={(element.props as any).layout || 'vertical'} onChange={v => update('layout', v)} style={{ width: '100%' }}
                        options={[{ value: 'vertical', label: 'Verticale' }, { value: 'horizontal', label: 'Horizontale' }]} />
                    </div>
                    <div>
                      <Text style={{ fontSize: 11, color: COLORS.textSecondary, display: 'block', marginBottom: 4 }}>Options</Text>
                      <OptionsEditor
                        options={(element.props as any).options || [{ id: 'opt1', label: 'Option 1', value: 'opt1' }, { id: 'opt2', label: 'Option 2', value: 'opt2' }]}
                        onChange={opts => update('options', opts)}
                      />
                    </div>
                  </>
                )}
                {element.type === 'table' && (
                  <>
                    <Divider style={{ margin: '8px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <Text style={{ fontSize: 11, fontWeight: 600 }}>Structure du tableau</Text>
                    </div>
                    <Space size="small" wrap style={{ marginBottom: 16 }}>
                      <Button size="small" onClick={() => {
                        const newColId = `c_${nanoid(5)}`;
                        const cols = (element.props as any).columns || [];
                        const rows = (element.props as any).rows || [];
                        const newColumns = [...cols, { id: newColId, title: 'Nouv. Col', type: 'txt', width: 130, align: 'left', visible: true }];
                        const newRows = rows.map((r: any) => ({ ...r, cells: { ...(r.cells || {}), [newColId]: { value: '', type: 'text' } } }));
                        onUpdate(element.id, { ...element.props, columns: newColumns, rows: newRows });
                      }}>+ Colonne</Button>
                      <Button size="small" onClick={() => {
                        const newRowId = `r_${nanoid(5)}`;
                        const newCells: Record<string, any> = {};
                        const cols = (element.props as any).columns || [];
                        cols.forEach((c: any) => { newCells[c.id] = { value: '', type: 'text' }; });
                        const newRows = [...((element.props as any).rows || []), { id: newRowId, cells: newCells }];
                        onUpdate(element.id, { ...element.props, rows: newRows });
                      }}>+ Ligne</Button>
                      <Button size="small" danger onClick={() => {
                        const cols = (element.props as any).columns || [];
                        if (cols.length <= 1) return; // Ne pas supprimer la dernière
                        const newColumns = [...cols];
                        const removedColId = newColumns.pop()?.id;
                        const newRows = ((element.props as any).rows || []).map((r: any) => {
                          const newCells = { ...(r.cells || {}) };
                          if (removedColId) delete newCells[removedColId];
                          return { ...r, cells: newCells };
                        });
                        onUpdate(element.id, { ...element.props, columns: newColumns, rows: newRows });
                      }}>- Colonne</Button>
                      <Button size="small" danger onClick={() => {
                        const rows = (element.props as any).rows || [];
                        if (rows.length <= 1) return;
                        const newRows = [...rows];
                        newRows.pop();
                        onUpdate(element.id, { ...element.props, rows: newRows });
                      }}>- Ligne</Button>
                    </Space>

                    <div style={{ marginTop: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.textSecondary, display: 'block', marginBottom: 8 }}>Colonnes (Gérer & Editer)</Text>
                      {((element.props as any).columns || []).map((col: any, i: number) => (
                        <div key={col.id} style={{ display: 'flex', gap: 6, marginBottom: 8, padding: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, flexWrap: 'wrap' }}>
                          <Input size="small" value={col.title} onChange={e => {
                            const cols = (element.props as any).columns || [];
                            const newCols = [...cols];
                            newCols[i] = { ...col, title: e.target.value };
                            update('columns', newCols);
                          }} placeholder="Nom" style={{ flex: 1, minWidth: 100 }} />
                          <Select size="small" value={col.type} onChange={v => {
                            const cols = (element.props as any).columns || [];
                            const newCols = [...cols];
                            newCols[i] = { ...col, type: v };
                            update('columns', newCols);
                          }} style={{ width: 80 }} options={[{ value: 'txt', label: 'Texte' }, { value: 'num', label: 'Nombre' }, { value: 'bool', label: 'Bool.' }, { value: 'date', label: 'Date' }]} />

                          <div style={{ display: 'flex', width: '100%', gap: 6, marginTop: 4 }}>
                            <InputNumber size="small" value={col.width} onChange={v => {
                              const cols = (element.props as any).columns || [];
                              const newCols = [...cols];
                              newCols[i] = { ...col, width: v };
                              update('columns', newCols);
                            }} placeholder="L. px" style={{ width: 70 }} />
                            <Space.Compact size="small" style={{ flex: 1 }}>
                              <Button icon={<AlignLeftOutlined />} type={col.align === 'left' ? 'primary' : 'default'} onClick={() => {
                                const cols = (element.props as any).columns || [];
                                const newCols = [...cols];
                                newCols[i] = { ...col, align: 'left' };
                                update('columns', newCols);
                              }} />
                              <Button icon={<AlignCenterOutlined />} type={col.align === 'center' ? 'primary' : 'default'} onClick={() => {
                                const cols = (element.props as any).columns || [];
                                const newCols = [...cols];
                                newCols[i] = { ...col, align: 'center' };
                                update('columns', newCols);
                              }} />
                              <Button icon={<AlignRightOutlined />} type={col.align === 'right' ? 'primary' : 'default'} onClick={() => {
                                const cols = (element.props as any).columns || [];
                                const newCols = [...cols];
                                newCols[i] = { ...col, align: 'right' };
                                update('columns', newCols);
                              }} />
                            </Space.Compact>
                            <Button size="small" type={col.visible === false ? 'dashed' : 'default'} icon={<EyeOutlined />} onClick={() => {
                              const cols = (element.props as any).columns || [];
                              const newCols = [...cols];
                              newCols[i] = { ...col, visible: col.visible === false ? true : false };
                              update('columns', newCols);
                            }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: 16 }}>
                      <Text style={{ fontSize: 11, color: COLORS.textSecondary, display: 'block', marginBottom: 8 }}>Lignes (Gérer & Editer)</Text>
                      {((element.props as any).rows || []).map((row: any, i: number) => (
                        <div key={row.id} style={{ display: 'flex', gap: 6, marginBottom: 8, padding: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          <Text style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>Ligne {i + 1}</Text>

                          <div style={{ display: 'flex', gap: 6 }}>
                            <InputNumber size="small" value={row.height} onChange={v => {
                              const rows = (element.props as any).rows || [];
                              const newRows = [...rows];
                              newRows[i] = { ...row, height: v };
                              update('rows', newRows);
                            }} placeholder="H. px" style={{ width: 70 }} />

                            <Space.Compact size="small">
                              <Button icon={<AlignLeftOutlined style={{ transform: 'rotate(-90deg)' }} />} type={row.align === 'top' ? 'primary' : 'default'} onClick={() => {
                                const rows = (element.props as any).rows || [];
                                const newRows = [...rows];
                                newRows[i] = { ...row, align: 'top' };
                                update('rows', newRows);
                              }} />
                              <Button icon={<AlignCenterOutlined style={{ transform: 'rotate(-90deg)' }} />} type={row.align === 'middle' ? 'primary' : 'default'} onClick={() => {
                                const rows = (element.props as any).rows || [];
                                const newRows = [...rows];
                                newRows[i] = { ...row, align: 'middle' };
                                update('rows', newRows);
                              }} />
                              <Button icon={<AlignRightOutlined style={{ transform: 'rotate(-90deg)' }} />} type={row.align === 'bottom' ? 'primary' : 'default'} onClick={() => {
                                const rows = (element.props as any).rows || [];
                                const newRows = [...rows];
                                newRows[i] = { ...row, align: 'bottom' };
                                update('rows', newRows);
                              }} />
                            </Space.Compact>

                            <Button size="small" type={row.visible === false ? 'dashed' : 'default'} icon={<EyeOutlined />} onClick={() => {
                              const rows = (element.props as any).rows || [];
                              const newRows = [...rows];
                              newRows[i] = { ...row, visible: row.visible === false ? true : false };
                              update('rows', newRows);
                            }} />
                            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => {
                              const rows = (element.props as any).rows || [];
                              const newRows = rows.filter((r: any) => r.id !== row.id);
                              update('rows', newRows);
                            }} />
                          </div>
                        </div>
                      ))}
                    </div>


                    <Divider style={{ margin: '16px 0 8px 0' }} />
                    <Text style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 8 }}>Style du tableau</Text>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ fontSize: 12 }}>Lignes alternées</Text>
                      <Switch size="small" checked={(element.props as any).style?.alternateRows} onChange={v => update('style', { ...(element.props as any).style, alternateRows: v })} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ fontSize: 12 }}>Bordures</Text>
                      <Switch size="small" checked={(element.props as any).style?.borders} onChange={v => update('style', { ...(element.props as any).style, borders: v })} />
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.textSecondary, display: 'block', marginBottom: 4 }}>Couleur d'en-tête (Fond)</Text>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input type="color" value={(element.props as any).style?.headerBg || '#F9FAFB'} onChange={e => update('style', { ...(element.props as any).style, headerBg: e.target.value })}
                          style={{ width: 32, height: 32, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer' }} />
                        <Input size="small" value={(element.props as any).style?.headerBg || '#F9FAFB'} onChange={e => update('style', { ...(element.props as any).style, headerBg: e.target.value })} style={{ flex: 1 }} />
                      </div>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.textSecondary, display: 'block', marginBottom: 4 }}>Couleur d'en-tête (Texte)</Text>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input type="color" value={(element.props as any).style?.headerColor || '#1e293b'} onChange={e => update('style', { ...(element.props as any).style, headerColor: e.target.value })}
                          style={{ width: 32, height: 32, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer' }} />
                        <Input size="small" value={(element.props as any).style?.headerColor || '#1e293b'} onChange={e => update('style', { ...(element.props as any).style, headerColor: e.target.value })} style={{ flex: 1 }} />
                      </div>
                    </div>
                  </>
                )}
              </Space>
            )
          },
          ...(isTextElement ? [{
            key: 'text', label: <Text strong style={{ fontSize: 12 }}>Texte & Paragraphe</Text>,
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <div>
                  <Text style={{ fontSize: 11, color: COLORS.textSecondary, display: 'block', marginBottom: 4 }}>Police (Font)</Text>
                  <Select value={(element.props as any).fontFamily || 'Inter'} onChange={v => update('fontFamily', v)} style={{ width: '100%' }}
                    options={[{ value: 'Inter', label: 'Inter' }, { value: 'Montserrat', label: 'Montserrat' }, { value: 'Lato', label: 'Lato' }]} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: COLORS.textSecondary, display: 'block', marginBottom: 4 }}>Taille (px)</Text>
                    <InputNumber style={{ width: '100%' }} value={(element.props as any).fontSize || 16} onChange={v => update('fontSize', v)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: COLORS.textSecondary, display: 'block', marginBottom: 4 }}>Poids</Text>
                    <Select value={(element.props as any).fontWeight || 'normal'} onChange={v => update('fontWeight', v)} style={{ width: '100%' }}
                      options={[{ value: 'normal', label: 'Normal' }, { value: 'bold', label: 'Gras' }, { value: '600', label: 'Semi-Gras' }]} />
                  </div>
                </div>
                <div>
                  <Text style={{ fontSize: 11, color: COLORS.textSecondary, display: 'block', marginBottom: 4 }}>Couleur</Text>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="color" value={(element.props as any).color || '#0f172a'} onChange={e => update('color', e.target.value)}
                      style={{ width: 32, height: 32, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer' }} />
                    <Input value={(element.props as any).color || '#0f172a'} onChange={e => update('color', e.target.value)} style={{ flex: 1 }} />
                  </div>
                </div>
                <div>
                  <Text style={{ fontSize: 11, color: COLORS.textSecondary, display: 'block', marginBottom: 4 }}>Alignement</Text>
                  <Space.Compact style={{ width: '100%' }}>
                    <Button style={{ flex: 1 }} icon={<AlignLeftOutlined />} type={(element.props as any).textAlign === 'left' ? 'primary' : 'default'} onClick={() => update('textAlign', 'left')} />
                    <Button style={{ flex: 1 }} icon={<AlignCenterOutlined />} type={(element.props as any).textAlign === 'center' ? 'primary' : 'default'} onClick={() => update('textAlign', 'center')} />
                    <Button style={{ flex: 1 }} icon={<AlignRightOutlined />} type={(element.props as any).textAlign === 'right' ? 'primary' : 'default'} onClick={() => update('textAlign', 'right')} />
                  </Space.Compact>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 11, color: COLORS.textSecondary }}>Line Height (px)</Text>
                    <Text style={{ fontSize: 11 }}>{(element.props as any).lineHeight || 24}px</Text>
                  </div>
                  <Slider min={10} max={60} value={(element.props as any).lineHeight || 24} onChange={v => update('lineHeight', v)} />
                </div>
              </Space>
            )
          }] : []),
          {
            key: 'spacing', label: <Text strong style={{ fontSize: 12 }}>Espacement & Layout</Text>,
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <BoxModelEditor
                  margin={(element.props as any).margin}
                  padding={(element.props as any).padding}
                  onChange={updateBoxModel}
                />
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 11, color: COLORS.textSecondary }}>Largeur (Colonnes de grille)</Text>
                    <Text style={{ fontSize: 11 }}>{(element.props as any).gridSpan || 12} / 12</Text>
                  </div>
                  <Slider min={1} max={12} step={1} value={(element.props as any).gridSpan || 12} onChange={v => update('gridSpan', v)} />
                </div>
              </Space>
            )
          },
          {
            key: 'border', label: <Text strong style={{ fontSize: 12 }}>Bordure & Fond</Text>,
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 11, color: COLORS.textSecondary }}>Corner radius</Text>
                    <Text style={{ fontSize: 11 }}>{(element.props as any).borderRadius || 0}px</Text>
                  </div>
                  <Slider min={0} max={40} value={(element.props as any).borderRadius || 0} onChange={v => update('borderRadius', v)} />
                </div>
                <div>
                  <Text style={{ fontSize: 11, color: COLORS.textSecondary, display: 'block', marginBottom: 4 }}>Bordure (px)</Text>
                  <InputNumber style={{ width: '100%' }} min={0} max={10} value={(element.props as any).borderWidth || 0} onChange={v => update('borderWidth', v)} />
                </div>
                <div>
                  <Text style={{ fontSize: 11, color: COLORS.textSecondary, display: 'block', marginBottom: 4 }}>Background Color</Text>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="color" value={(element.props as any).backgroundColor || '#ffffff'} onChange={e => update('backgroundColor', e.target.value)}
                      style={{ width: 32, height: 32, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer' }} />
                    <Input value={(element.props as any).backgroundColor || '#ffffff'} onChange={e => update('backgroundColor', e.target.value)} style={{ flex: 1 }} />
                  </div>
                </div>
              </Space>
            )
          }
        ]}
      />
    </div>
  );
};

// ── Palette Item Button ──────────────────────────────────────────────────────
const PaletteItem: React.FC<{ type: ElementType; onAdd: (t: ElementType) => void }> = ({ type, onAdd }) => {
  const meta = ELEMENT_META[type];
  if (!meta) return null;
  return (
    <div
      onClick={() => onAdd(type)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
        border: `1px solid ${COLORS.border}`, background: '#fff',
        marginBottom: 4, transition: 'all 0.15s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = COLORS.primaryBorder; (e.currentTarget as HTMLElement).style.background = COLORS.primaryLight; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = COLORS.border; (e.currentTarget as HTMLElement).style.background = '#fff'; }}
    >
      <span style={{ color: COLORS.primary, fontSize: 16, width: 20, textAlign: 'center' }}>{meta.icon}</span>
      <div>
        <Text style={{ fontSize: 12, fontWeight: 600, color: COLORS.text, display: 'block', lineHeight: 1.2 }}>{meta.label}</Text>
        <Text style={{ fontSize: 10, color: COLORS.textMuted }}>{meta.desc}</Text>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN BUILDER PAGE
// ══════════════════════════════════════════════════════════════════════════════
const TemplateBuilderPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [draftVersionId, setDraftVersionId] = useState<string | null>(null);

  const {
    elements, selectedId, previewMode, isDirty, meta,
    addElement, removeElement, reorderElements, selectElement,
    togglePreview, undo, redo, past, future, loadStructure, resetDirty,
    updateElement, setMeta,
  } = useBuilderStore();

  // ── Pagination Logic ────────────────────────────────────────────────────────
  const pages = React.useMemo(() => {
    const p: TemplateElement[][] = [];
    let current: TemplateElement[] = [];
    elements.forEach((el) => {
      if (el.type === 'page_break') {
        p.push(current);
        current = [el]; // The page break starts the new page visually
      } else {
        current.push(el);
      }
    });
    p.push(current);
    return p;
  }, [elements]);

  // Ensure current page is valid
  useEffect(() => {
    if (currentPageIndex >= pages.length) {
      setCurrentPageIndex(Math.max(0, pages.length - 1));
    }
  }, [pages.length, currentPageIndex]);

  const currentElements = pages[currentPageIndex] || [];
  // ───────────────────────────────────────────────────────────────────────────

  const deferredSelectedId = useDeferredValue(selectedId);
  const selectedEl = elements.find(e => e.id === deferredSelectedId);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorderElements(
      elements.findIndex(e => e.id === active.id),
      elements.findIndex(e => e.id === over.id),
    );
  }, [elements, reorderElements]);

  const handleDuplicate = useCallback((el: TemplateElement) => {
    addElement(el.type);
  }, [addElement]);

  const handleSave = async (silent = false) => {
    setIsSaving(true);
    try {
      if (id) {
        const v = await templateBuilderService.createDraftVersion(id, elements, 'Mise à jour');
        setDraftVersionId(v.id);
      } else {
        const v = await templateBuilderService.create({
          title: meta.title,
          description: meta.description,
          scope: 'LOCAL',
          structure: elements,
        });
        setDraftVersionId(v.id);
        navigate(`/templates/${v.templateId}/edit`);
      }
      resetDirty();
      if (!silent) message.success('Brouillon sauvegardé avec succès !');
    } catch {
      if (!silent) message.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = () => {
    if (!draftVersionId) {
      message.warning('Veuillez sauvegarder le brouillon d\'abord.');
      return;
    }
    Modal.confirm({
      title: 'Publier la version ?',
      content: 'Cette action va verrouiller ce brouillon. Les prochaines modifications créeront une nouvelle version.',
      okText: 'Publier',
      cancelText: 'Annuler',
      onOk: async () => {
        try {
          await templateBuilderService.publishVersion(draftVersionId);
          message.success('Version publiée avec succès !');
          setDraftVersionId(null);
        } catch {
          message.error('Erreur lors de la publication');
        }
      }
    });
  };

  // Auto-save effect
  useEffect(() => {
    if (isDirty && elements.length > 0) {
      const timer = setTimeout(() => {
        handleSave(true);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [elements, isDirty]);

  const handleExportPdf = async () => {
    if (!id) {
      message.warning('Veuillez sauvegarder le modèle au moins une fois avant d\'exporter.');
      return;
    }
    
    // We need a version ID to export. Force save draft if not available.
    let exportVersionId = draftVersionId;
    if (!exportVersionId) {
       message.info('Enregistrement du brouillon avant export...');
       try {
         const v = await templateBuilderService.createDraftVersion(id, elements, 'Auto-save pour export');
         exportVersionId = v.id;
         setDraftVersionId(v.id);
       } catch {
         message.error('Impossible d\'enregistrer le brouillon.');
         return;
       }
    }

    const hide = message.loading('Génération du PDF en cours...', 0);
    try {
      const blob = await templateBuilderService.downloadVersionPdf(id, exportVersionId);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Brouillon-${meta.title || 'Modele'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      message.success('Export PDF réussi !');
    } catch (error) {
      console.error(error);
      message.error('Erreur lors de l\'export PDF');
    } finally {
      hide();
    }
  };

  const canvasWidth = viewMode === 'desktop' ? '210mm' : viewMode === 'tablet' ? '600px' : '375px';

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden', background: COLORS.canvas }}>
      {/* ── Top Toolbar ─────────────────────────────────────────── */}
      <Header style={{
        background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`,
        padding: '0 20px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 52, lineHeight: '52px',
      }}>
        <Space size={12}>
          <Tooltip title="Retour à la liste">
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/templates')} type="text"
              style={{ color: COLORS.textSecondary }} />
          </Tooltip>
          <Divider type="vertical" />
          <Text strong style={{ fontSize: 16, color: COLORS.text }}>Conception de Modèle</Text>
          <Input
            value={meta.title}
            onChange={e => setMeta?.({ title: e.target.value })}
            bordered={false}
            style={{ fontSize: 14, width: 260, color: COLORS.textSecondary, marginLeft: 16 }}
            placeholder="Nom du modèle..."
          />
          {isSaving ? (
            <Tag icon={<CloudSyncOutlined />} color="processing">Enregistrement...</Tag>
          ) : isDirty ? (
            <Badge status="warning" text={<Text style={{ fontSize: 11, color: COLORS.warning }}>Modifié</Text>} />
          ) : (
            <Tag icon={<CheckSquareOutlined />} color="success">Brouillon à jour</Tag>
          )}
        </Space>

        <Space size={4}>
          {/* Responsive preview buttons */}
          <Tooltip title="Bureau"><Button size="small" type="text" style={{ color: viewMode === 'desktop' ? COLORS.activeMode : COLORS.textSecondary, background: viewMode === 'desktop' ? '#fee2e2' : 'transparent' }} icon={<DesktopOutlined />} onClick={() => setViewMode('desktop')} /></Tooltip>
          <Tooltip title="Tablette"><Button size="small" type="text" style={{ color: viewMode === 'tablet' ? COLORS.primary : COLORS.textSecondary, background: viewMode === 'tablet' ? COLORS.primaryLight : 'transparent' }} icon={<TabletOutlined />} onClick={() => setViewMode('tablet')} /></Tooltip>
          <Tooltip title="Mobile"><Button size="small" type="text" style={{ color: viewMode === 'mobile' ? COLORS.primary : COLORS.textSecondary, background: viewMode === 'mobile' ? COLORS.primaryLight : 'transparent' }} icon={<MobileOutlined />} onClick={() => setViewMode('mobile')} /></Tooltip>
          <Divider type="vertical" />
          <Tooltip title="Annuler"><Button icon={<UndoOutlined />} disabled={past.length === 0} onClick={undo} type="text" /></Tooltip>
          <Tooltip title="Rétablir"><Button icon={<RedoOutlined />} disabled={future.length === 0} onClick={redo} type="text" /></Tooltip>
          <Divider type="vertical" />
          <Tooltip title="Exporter en PDF via Serveur">
            <Button icon={<FilePdfOutlined style={{ color: COLORS.danger }} />} onClick={handleExportPdf} style={{ borderColor: COLORS.border }} />
          </Tooltip>
          <Button icon={previewMode ? <EditOutlined /> : <EyeOutlined />} onClick={togglePreview}
            style={{ borderColor: COLORS.border }}>
            {previewMode ? 'Éditer' : 'Aperçu'}
          </Button>
          <Tooltip title="Enregistrer le brouillon">
            <Button icon={<SaveOutlined />} onClick={() => handleSave(false)} style={{ borderColor: COLORS.border }} loading={isSaving} />
          </Tooltip>
          <Button type="primary" icon={<SendOutlined />} onClick={handlePublish}
            disabled={!id || isDirty}
            style={{ background: COLORS.success, borderColor: COLORS.success }}>
            Publier
          </Button>
        </Space>
      </Header>

      <Layout style={{ background: COLORS.canvas }}>
        {/* ── Left Sidebar — Element Palette ────────────────────── */}
        {!previewMode && (
          <Sider width={240} style={{
            background: COLORS.surface, borderRight: `1px solid ${COLORS.border}`,
            overflowY: 'auto', padding: '16px 12px',
          }}>
            <Text style={{
              fontSize: 10, fontWeight: 700, color: COLORS.textMuted,
              textTransform: 'uppercase', letterSpacing: 1.5, display: 'block', marginBottom: 12,
            }}>
              Bibliothèque d'éléments
            </Text>

            <Input
              prefix={<SearchOutlined style={{ color: COLORS.textMuted }} />}
              placeholder="Recherche"
              style={{ marginBottom: 16, borderRadius: 8 }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />

            {PALETTE_GROUPS.map(group => {
              const filteredItems = group.items.filter(type => {
                const meta = ELEMENT_META[type];
                return meta && meta.label.toLowerCase().includes(searchTerm.toLowerCase());
              });

              if (filteredItems.length === 0) return null;

              return (
                <div key={group.label} style={{ marginBottom: 16 }}>
                  <div style={{
                    fontSize: 9, fontWeight: 700, color: group.color,
                    textTransform: 'uppercase', letterSpacing: 1.5,
                    marginBottom: 6, paddingLeft: 2,
                  }}>
                    {group.label}
                  </div>
                  {filteredItems.map(type => (
                    <PaletteItem key={type} type={type} onAdd={addElement} />
                  ))}
                </div>
              );
            })}

            {/* Element count */}
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ textAlign: 'center' }}>
              <Tag color={COLORS.primary} style={{ fontSize: 11 }}>
                {elements.length} élément{elements.length !== 1 ? 's' : ''} dans le modèle
              </Tag>
            </div>
          </Sider>
        )}

        {/* ── Center Canvas ─────────────────────────────────────── */}
        <Content style={{
          overflowY: 'auto',
          background: COLORS.canvas,
          padding: '40px 24px',
          backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px',
          position: 'relative'
        }}>
          {/* Top Ruler */}
          {!previewMode && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 24, borderBottom: `1px solid ${COLORS.border}`, background: '#fff', display: 'flex', zIndex: 10 }}>
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} style={{ flex: 1, borderLeft: i > 0 ? '1px solid #e2e8f0' : 'none', fontSize: 9, color: '#94a3b8', paddingLeft: 4, paddingTop: 2 }}>{i}</div>
              ))}
            </div>
          )}
          {/* Left Ruler */}
          {!previewMode && (
            <div style={{ position: 'absolute', top: 24, left: 0, bottom: 0, width: 24, borderRight: `1px solid ${COLORS.border}`, background: '#fff', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
              {Array.from({ length: 40 }).map((_, i) => (
                <div key={i} style={{ flex: 1, borderTop: i > 0 ? '1px solid #e2e8f0' : 'none', fontSize: 9, color: '#94a3b8', paddingTop: 2, textAlign: 'center' }}>{i}</div>
              ))}
            </div>
          )}

          {previewMode ? (
            <div style={{ maxWidth: canvasWidth, margin: '0 auto' }}>
              <RenderEngine structure={elements} mode="preview" />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%', alignItems: 'center' }}>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={elements.map(e => e.id)} strategy={verticalListSortingStrategy}>
                  {pages.map((pageElements, pageIndex) => (
                    <div key={`page-${pageIndex}`} style={{
                      background: COLORS.surface, minHeight: '297mm', width: canvasWidth,
                      padding: '20mm 25mm',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.08)', borderRadius: 4,
                      transition: 'width 0.3s ease',
                      position: 'relative',
                      zIndex: 5,
                      display: 'grid', // Grid system for layout
                      gridTemplateColumns: 'repeat(12, 1fr)',
                      alignContent: 'start',
                      gap: '0px'
                    }}
                      onClick={() => selectElement('')}
                    >
                      {pageElements.length === 0 && elements.length === 0 && (
                        <div style={{
                          textAlign: 'center', color: COLORS.textMuted, paddingTop: 100, gridColumn: 'span 12'
                        }}>
                          <PlusOutlined style={{ fontSize: 40, color: COLORS.border, marginBottom: 16 }} />
                          <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 6 }}>
                            Commencez à construire
                          </div>
                          <div style={{ fontSize: 12, color: COLORS.textMuted }}>
                            Glissez ou cliquez sur un élément depuis le panneau de gauche
                          </div>
                        </div>
                      )}
                      {pageElements.length === 0 && elements.length > 0 && (
                        <div style={{ textAlign: 'center', color: COLORS.textMuted, paddingTop: 100, gridColumn: 'span 12' }}>
                          <div style={{ fontSize: 14 }}>Page {pageIndex + 1} vide</div>
                        </div>
                      )}
                      {pageElements.map(el => (
                        <SortableElementCard
                          key={el.id} id={el.id} el={el}
                          isSelected={selectedId === el.id}
                          isHovered={hoveredId === el.id}
                          onSelect={() => selectElement(el.id)}
                          onRemove={() => removeElement(el.id)}
                          onDuplicate={() => handleDuplicate(el)}
                          onHover={setHoveredId}
                        />
                      ))}
                    </div>
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          )}


        </Content>

        {/* ── Right Sidebar — Contextual Properties ─────────────── */}
        {!previewMode && (
          <Sider width={280} style={{
            background: COLORS.surface, borderLeft: `1px solid ${COLORS.border}`,
            padding: 16, overflowY: 'auto',
          }}>
            <Text style={{
              fontSize: 10, fontWeight: 700, color: COLORS.textMuted,
              textTransform: 'uppercase', letterSpacing: 1.5, display: 'block', marginBottom: 12,
            }}>
              Propriétés
            </Text>

            {selectedEl ? (
              <PropertiesPanel
                element={selectedEl}
                onUpdate={(elId, props) => updateElement?.(elId, props)}
              />
            ) : (
              <div style={{ textAlign: 'center', paddingTop: 40, color: COLORS.textMuted }}>
                <EditOutlined style={{ fontSize: 32, color: COLORS.border, marginBottom: 12 }} />
                <div style={{ fontSize: 13, color: COLORS.textSecondary }}>
                  Sélectionnez un élément pour modifier ses propriétés
                </div>
              </div>
            )}
          </Sider>
        )}
      </Layout>
    </Layout>
  );
};

export default TemplateBuilderPage;

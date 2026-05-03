/**
 * TableElement — Tableau dynamique pro
 * ─────────────────────────────────────────────────────────────────────────────
 * ✦ Ajout / Suppression de colonnes et lignes
 * ✦ Redimensionnement des colonnes par glisser
 * ✦ Réordonnancement des colonnes par glisser (drag header)
 * ✦ Tri multi-colonnes + recherche
 * ✦ Menu contextuel (clic droit) sur cellule, ligne et en-tête
 * ✦ Sélection de cellule avec navigation clavier (Tab, Shift+Tab, Entrée, flèches)
 * ✦ Éditeur de colonne inline (titre, type, alignement, largeur, figée, visible)
 * ✦ Export CSV + copie presse-papier
 * ✦ Accessibilité ARIA complète (rôles table, grille, rowheader)
 * ✦ Types de colonnes : txt, num, bool, date, select, badge, url, email
 * ✦ Animations et micro-interactions
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, {
  useState, useMemo, useRef, useEffect, useCallback, useId,
} from 'react';
import type { TableProps, TemplateElement, TableColumn, TableRow } from '../../../types/template.types';
import { TableCellRenderer } from './TableCellRenderer';
import { Input, Button, Tooltip, Dropdown, Modal, Select, InputNumber, Tag, message, Popconfirm } from 'antd';
import {
  SearchOutlined, DownloadOutlined, PlusOutlined, DeleteOutlined,
  CopyOutlined, EllipsisOutlined, LockOutlined, EyeInvisibleOutlined,
  EyeOutlined, ArrowUpOutlined, ArrowDownOutlined, ArrowLeftOutlined,
  ArrowRightOutlined, SortAscendingOutlined, SortDescendingOutlined,
  FilterOutlined, SettingOutlined, TableOutlined, AlignLeftOutlined,
  AlignCenterOutlined, AlignRightOutlined, DragOutlined,
} from '@ant-design/icons';
import { useBuilderStore } from '@/stores/builderStore';
import { nanoid } from 'nanoid';

const { Option } = Select;

// ──────────────────────────────────────────────────────────────────────────────
// Design Tokens
// ──────────────────────────────────────────────────────────────────────────────
const T = {
  primary: '#6366f1',
  primaryLight: 'rgba(99,102,241,0.08)',
  primaryBorder: 'rgba(99,102,241,0.3)',
  danger: '#ef4444',
  dangerLight: 'rgba(239,68,68,0.08)',
  success: '#10b981',
  warning: '#f59e0b',
  border: '#e2e8f0',
  borderHover: '#a5b4fc',
  surface: '#ffffff',
  headerBg: '#f8fafc',
  altRowBg: '#fafbff',
  text: '#1e293b',
  textMuted: '#94a3b8',
  textSoft: '#475569',
  shadow: '0 4px 24px rgba(0,0,0,0.08)',
  shadowHover: '0 8px 32px rgba(99,102,241,0.15)',
  radius: 10,
  cellH: 38,
};

const COLUMN_TYPES = [
  { value: 'txt', label: 'Texte', icon: '🔤' },
  { value: 'num', label: 'Nombre', icon: '🔢' },
  { value: 'bool', label: 'Case à cocher', icon: '☑️' },
  { value: 'date', label: 'Date', icon: '📅' },
  { value: 'select', label: 'Liste déroulante', icon: '▾' },
  { value: 'badge', label: 'Badge statut', icon: '🏷' },
  { value: 'url', label: 'Lien URL', icon: '🔗' },
  { value: 'email', label: 'Email', icon: '@' },
];

const BADGE_PRESETS = [
  { value: 'todo', label: 'À faire', color: 'default' },
  { value: 'in_progress', label: 'En cours', color: 'blue' },
  { value: 'done', label: 'Terminé', color: 'success' },
  { value: 'blocked', label: 'Bloqué', color: 'error' },
];

// ──────────────────────────────────────────────────────────────────────────────
// Helper to create default column / row
// ──────────────────────────────────────────────────────────────────────────────
const makeColumn = (title = 'Nouvelle colonne', type: TableColumn['type'] = 'txt'): TableColumn => ({
  id: nanoid(8),
  title,
  type,
  width: 140,
  align: 'left',
  visible: true,
  frozen: false,
  selectOptions: [],
  badgeOptions: [...BADGE_PRESETS],
});

const makeRow = (columns: TableColumn[]): TableRow => ({
  id: nanoid(8),
  cells: Object.fromEntries(columns.map(c => [c.id, { value: '' }])),
});

// ──────────────────────────────────────────────────────────────────────────────
// ContextMenu component
// ──────────────────────────────────────────────────────────────────────────────
interface CtxMenuProps {
  x: number; y: number;
  items: { label: React.ReactNode; icon?: React.ReactNode; danger?: boolean; disabled?: boolean; onClick: () => void; divider?: boolean }[];
  onClose: () => void;
}
const ContextMenu: React.FC<CtxMenuProps> = ({ x, y, items, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Menu contextuel"
      style={{
        position: 'fixed', left: x, top: y, zIndex: 9999,
        background: T.surface, borderRadius: 10,
        border: `1px solid ${T.border}`,
        boxShadow: '0 12px 40px rgba(0,0,0,0.14)',
        minWidth: 200, padding: '4px 0',
        animation: 'ctxFadeIn 0.12s ease',
      }}
    >
      <style>{`@keyframes ctxFadeIn{from{opacity:0;transform:scale(0.95) translateY(-4px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
      {items.map((item, i) => (
        item.divider
          ? <div key={`div-${i}`} style={{ height: 1, background: T.border, margin: '4px 0' }} />
          : (
            <div
              key={i}
              role="menuitem"
              tabIndex={0}
              onClick={() => { if (!item.disabled) { item.onClick(); onClose(); } }}
              onKeyDown={e => { if (e.key === 'Enter' && !item.disabled) { item.onClick(); onClose(); } }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 14px', cursor: item.disabled ? 'not-allowed' : 'pointer',
                color: item.danger ? T.danger : item.disabled ? T.textMuted : T.text,
                fontSize: 13, fontWeight: 500, transition: 'background 0.1s',
                opacity: item.disabled ? 0.5 : 1,
                userSelect: 'none',
              }}
              onMouseEnter={e => { if (!item.disabled) (e.target as HTMLDivElement).style.background = item.danger ? T.dangerLight : T.primaryLight; }}
              onMouseLeave={e => { (e.target as HTMLDivElement).style.background = 'transparent'; }}
            >
              {item.icon && <span style={{ fontSize: 14, width: 16, textAlign: 'center' }}>{item.icon}</span>}
              {item.label}
            </div>
          )
      ))}
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// Column Editor Modal
// ──────────────────────────────────────────────────────────────────────────────
interface ColEditorProps {
  col: TableColumn;
  onSave: (updated: TableColumn) => void;
  onClose: () => void;
}
const ColumnEditor: React.FC<ColEditorProps> = ({ col, onSave, onClose }) => {
  const [draft, setDraft] = useState<TableColumn>({ ...col });

  const set = (k: keyof TableColumn, v: any) => setDraft(d => ({ ...d, [k]: v }));

  return (
    <Modal
      open title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SettingOutlined style={{ color: T.primary }} />
          <span>Configurer la colonne</span>
        </div>
      }
      onOk={() => { onSave(draft); onClose(); }}
      onCancel={onClose}
      okText="Enregistrer"
      cancelText="Annuler"
      okButtonProps={{ style: { background: T.primary, borderColor: T.primary } }}
      width={440}
      styles={{ body: { padding: '20px 24px' } }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: T.textSoft, display: 'block', marginBottom: 4 }}>Titre de la colonne</label>
          <Input value={draft.title} onChange={e => set('title', e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: T.textSoft, display: 'block', marginBottom: 4 }}>Type de données</label>
          <Select value={draft.type} onChange={v => set('type', v)} style={{ width: '100%' }}>
            {COLUMN_TYPES.map(t => (
              <Option key={t.value} value={t.value}>
                <span style={{ marginRight: 8 }}>{t.icon}</span>{t.label}
              </Option>
            ))}
          </Select>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: T.textSoft, display: 'block', marginBottom: 4 }}>Largeur (px)</label>
          <InputNumber min={60} max={600} value={draft.width} onChange={v => set('width', v)} style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: T.textSoft, display: 'block', marginBottom: 4 }}>Alignement</label>
          <Select value={draft.align || 'left'} onChange={v => set('align', v)} style={{ width: '100%' }}>
            <Option value="left"><AlignLeftOutlined /> Gauche</Option>
            <Option value="center"><AlignCenterOutlined /> Centre</Option>
            <Option value="right"><AlignRightOutlined /> Droite</Option>
          </Select>
        </div>
        {(draft.type === 'select' || draft.type === 'badge') && (
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: T.textSoft, display: 'block', marginBottom: 4 }}>
              {draft.type === 'badge' ? 'Options de badge' : 'Options de liste'}
            </label>
            {draft.type === 'badge'
              ? (draft.badgeOptions || []).map((opt, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <Input size="small" value={opt.value} placeholder="Valeur" style={{ flex: 1 }}
                    onChange={e => set('badgeOptions', draft.badgeOptions?.map((o, j) => j === i ? { ...o, value: e.target.value } : o))} />
                  <Input size="small" value={opt.label} placeholder="Libellé" style={{ flex: 1 }}
                    onChange={e => set('badgeOptions', draft.badgeOptions?.map((o, j) => j === i ? { ...o, label: e.target.value } : o))} />
                  <Select size="small" value={opt.color} style={{ width: 100 }}
                    onChange={v => set('badgeOptions', draft.badgeOptions?.map((o, j) => j === i ? { ...o, color: v } : o))}>
                    {['default', 'blue', 'green', 'red', 'orange', 'purple', 'success', 'error', 'warning'].map(c => (
                      <Option key={c} value={c}><Tag color={c}>{c}</Tag></Option>
                    ))}
                  </Select>
                  <Button size="small" danger icon={<DeleteOutlined />}
                    onClick={() => set('badgeOptions', draft.badgeOptions?.filter((_, j) => j !== i))} />
                </div>
              ))
              : (draft.selectOptions || []).map((opt, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <Input size="small" value={opt.value} placeholder="Valeur"
                    onChange={e => set('selectOptions', draft.selectOptions?.map((o, j) => j === i ? { ...o, value: e.target.value } : o))} />
                  <Input size="small" value={opt.label} placeholder="Libellé"
                    onChange={e => set('selectOptions', draft.selectOptions?.map((o, j) => j === i ? { ...o, label: e.target.value } : o))} />
                  <Button size="small" danger icon={<DeleteOutlined />}
                    onClick={() => set('selectOptions', draft.selectOptions?.filter((_, j) => j !== i))} />
                </div>
              ))
            }
            <Button size="small" icon={<PlusOutlined />} onClick={() => {
              if (draft.type === 'badge') set('badgeOptions', [...(draft.badgeOptions || []), { value: '', label: '', color: 'default' }]);
              else set('selectOptions', [...(draft.selectOptions || []), { value: '', label: '' }]);
            }} style={{ marginTop: 4 }}>Ajouter option</Button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 24 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={!!draft.frozen} onChange={e => set('frozen', e.target.checked)} />
            <LockOutlined style={{ color: T.textMuted }} /> Colonne figée
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={draft.visible !== false} onChange={e => set('visible', e.target.checked)} />
            <EyeOutlined style={{ color: T.textMuted }} /> Visible
          </label>
        </div>
      </div>
    </Modal>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// Main TableElement
// ──────────────────────────────────────────────────────────────────────────────
interface TableElementProps {
  el: TemplateElement;
  filledData: Record<string, any>;
  onChange?: (id: string, val: any) => void;
  mode: 'fill' | 'preview' | 'readonly';
}

export const TableElement: React.FC<TableElementProps> = ({ el, filledData, onChange, mode }) => {
  const isEditable = mode === 'fill';
  const props = el.props as unknown as TableProps;
  const updateElement = useBuilderStore(state => state.updateElement);
  const tableId = useId();

  // ── State ─────────────────────────────────────────────────────────────────
  const [columns, setColumns] = useState<TableColumn[]>(props.columns || []);
  const [rows, setRows] = useState<TableRow[]>(props.rows || []);
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedCell, setSelectedCell] = useState<{ rowId: string; colId: string } | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; type: 'cell' | 'header' | 'row'; rowId?: string; colId?: string } | null>(null);
  const [editingCol, setEditingCol] = useState<TableColumn | null>(null);

  // Resizing
  const resizingRef = useRef<{ colId: string; startX: number; startWidth: number } | null>(null);
  const [resizingColId, setResizingColId] = useState<string | null>(null);

  // Drag-reorder headers
  const draggingColRef = useRef<string | null>(null);
  const [draggingColId, setDraggingColId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  const style = props.style || {
    headerBg: T.headerBg, headerColor: T.text,
    alternateRows: true, borders: true,
    borderColor: T.border, padding: 0, fontSize: 13,
  };

  // Sync from store
  useEffect(() => { setColumns(props.columns || []); }, [props.columns]);
  useEffect(() => { setRows(props.rows || []); }, [props.rows]);

  // Persist to store
  const persist = useCallback((newCols?: TableColumn[], newRows?: TableRow[]) => {
    const c = newCols ?? columns;
    const r = newRows ?? rows;
    updateElement(el.id, { columns: c, rows: r });
  }, [columns, rows, el.id, updateElement]);

  // ── Cell value ───────────────────────────────────────────────────────────
  const getCellValue = useCallback((rowId: string, colId: string) => {
    const filled = filledData[`${el.id}_${rowId}_${colId}`];
    if (filled !== undefined) return filled;
    const row = rows.find(r => r.id === rowId);
    return row?.cells[colId]?.value ?? '';
  }, [filledData, el.id, rows]);

  // ── Sort ─────────────────────────────────────────────────────────────────
  const handleSort = (colId: string) => {
    if (sortCol === colId) {
      sortDir === 'asc' ? setSortDir('desc') : setSortCol(null);
    } else {
      setSortCol(colId);
      setSortDir('asc');
    }
  };

  // ── Resize ───────────────────────────────────────────────────────────────
  const handleResizeStart = (e: React.MouseEvent, colId: string, currentWidth: number) => {
    e.stopPropagation(); e.preventDefault();
    resizingRef.current = { colId, startX: e.clientX, startWidth: currentWidth || 140 };
    setResizingColId(colId);
  };

  useEffect(() => {
    if (!resizingColId) return;
    const onMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const { colId, startX, startWidth } = resizingRef.current;
      const newW = Math.max(60, startWidth + e.clientX - startX);
      setColumns(cols => cols.map(c => c.id === colId ? { ...c, width: newW } : c));
    };
    const onUp = () => {
      setColumns(cols => { persist(cols); return cols; });
      resizingRef.current = null;
      setResizingColId(null);
      document.body.style.cursor = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize';
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
    };
  }, [resizingColId, persist]);

  // ── Drag-reorder columns ──────────────────────────────────────────────────
  const handleColDragStart = (e: React.DragEvent, colId: string) => {
    draggingColRef.current = colId;
    setDraggingColId(colId);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleColDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColId(colId);
  };
  const handleColDrop = (targetColId: string) => {
    const srcId = draggingColRef.current;
    if (!srcId || srcId === targetColId) { setDraggingColId(null); setDragOverColId(null); return; }
    setColumns(cols => {
      const srcIdx = cols.findIndex(c => c.id === srcId);
      const tgtIdx = cols.findIndex(c => c.id === targetColId);
      const next = [...cols];
      const [moved] = next.splice(srcIdx, 1);
      next.splice(tgtIdx, 0, moved);
      persist(next);
      return next;
    });
    setDraggingColId(null);
    setDragOverColId(null);
    draggingColRef.current = null;
  };

  // ── Add / Remove Columns ──────────────────────────────────────────────────
  const addColumn = (afterId?: string) => {
    const newCol = makeColumn(`Col ${columns.length + 1}`);
    setColumns(cols => {
      let next: TableColumn[];
      if (afterId) {
        const idx = cols.findIndex(c => c.id === afterId);
        next = [...cols.slice(0, idx + 1), newCol, ...cols.slice(idx + 1)];
      } else {
        next = [...cols, newCol];
      }
      // Also add cell to each row
      setRows(rs => {
        const updatedRows = rs.map(r => ({ ...r, cells: { ...r.cells, [newCol.id]: { value: '' } } }));
        persist(next, updatedRows);
        return updatedRows;
      });
      return next;
    });
  };

  const removeColumn = (colId: string) => {
    if (columns.length <= 1) { message.warning('Impossible de supprimer la dernière colonne'); return; }
    setColumns(cols => {
      const next = cols.filter(c => c.id !== colId);
      setRows(rs => {
        const updatedRows = rs.map(r => {
          const cells = { ...r.cells };
          delete cells[colId];
          return { ...r, cells };
        });
        persist(next, updatedRows);
        return updatedRows;
      });
      return next;
    });
  };

  const updateColumn = (updated: TableColumn) => {
    setColumns(cols => {
      const next = cols.map(c => c.id === updated.id ? updated : c);
      persist(next);
      return next;
    });
  };

  const duplicateColumn = (colId: string) => {
    const src = columns.find(c => c.id === colId);
    if (!src) return;
    const newCol: TableColumn = { ...src, id: nanoid(8), title: `${src.title} (copie)` };
    setColumns(cols => {
      const idx = cols.findIndex(c => c.id === colId);
      const next = [...cols.slice(0, idx + 1), newCol, ...cols.slice(idx + 1)];
      setRows(rs => {
        const updatedRows = rs.map(r => ({
          ...r,
          cells: { ...r.cells, [newCol.id]: { value: r.cells[colId]?.value ?? '' } },
        }));
        persist(next, updatedRows);
        return updatedRows;
      });
      return next;
    });
  };

  // ── Add / Remove Rows ────────────────────────────────────────────────────
  const addRow = (afterId?: string) => {
    const newRow = makeRow(columns);
    setRows(rs => {
      let next: TableRow[];
      if (afterId) {
        const idx = rs.findIndex(r => r.id === afterId);
        next = [...rs.slice(0, idx + 1), newRow, ...rs.slice(idx + 1)];
      } else {
        next = [...rs, newRow];
      }
      persist(undefined, next);
      return next;
    });
  };

  const removeRow = (rowId: string) => {
    if (rows.length <= 1) { message.warning('Impossible de supprimer la dernière ligne'); return; }
    setRows(rs => {
      const next = rs.filter(r => r.id !== rowId);
      persist(undefined, next);
      return next;
    });
  };

  const duplicateRow = (rowId: string) => {
    const src = rows.find(r => r.id === rowId);
    if (!src) return;
    const newRow: TableRow = { id: nanoid(8), cells: { ...src.cells } };
    setRows(rs => {
      const idx = rs.findIndex(r => r.id === rowId);
      const next = [...rs.slice(0, idx + 1), newRow, ...rs.slice(idx + 1)];
      persist(undefined, next);
      return next;
    });
  };

  const clearRow = (rowId: string) => {
    setRows(rs => {
      const next = rs.map(r => r.id === rowId
        ? { ...r, cells: Object.fromEntries(Object.keys(r.cells).map(k => [k, { value: '' }])) }
        : r
      );
      persist(undefined, next);
      return next;
    });
  };

  // ── Move rows / columns ───────────────────────────────────────────────────
  const moveRow = (rowId: string, dir: 'up' | 'down') => {
    setRows(rs => {
      const idx = rs.findIndex(r => r.id === rowId);
      const newIdx = dir === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= rs.length) return rs;
      const next = [...rs];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      persist(undefined, next);
      return next;
    });
  };

  const moveColumn = (colId: string, dir: 'left' | 'right') => {
    setColumns(cols => {
      const idx = cols.findIndex(c => c.id === colId);
      const newIdx = dir === 'left' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= cols.length) return cols;
      const next = [...cols];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      persist(next);
      return next;
    });
  };

  // ── Context Menu ──────────────────────────────────────────────────────────
  const openCtxMenu = (e: React.MouseEvent, type: 'cell' | 'header' | 'row', rowId?: string, colId?: string) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, type, rowId, colId });
  };

  const mergeCell = (rowId: string, colId: string, dir: 'right' | 'down') => {
    setRows(rs => {
      const next = [...rs];
      const rIdx = next.findIndex(r => r.id === rowId);
      const cIdx = visibleColumns.findIndex(c => c.id === colId);
      if (rIdx === -1 || cIdx === -1) return rs;
      
      const currentCell = next[rIdx].cells[colId] || { value: '' };
      const rowSpan = currentCell.rowSpan || 1;
      const colSpan = currentCell.colSpan || 1;

      if (dir === 'right') {
        if (cIdx + colSpan >= visibleColumns.length) return rs;
        next[rIdx].cells[colId] = { ...currentCell, colSpan: colSpan + 1 };
      } else if (dir === 'down') {
        if (rIdx + rowSpan >= next.length) return rs;
        next[rIdx].cells[colId] = { ...currentCell, rowSpan: rowSpan + 1 };
      }
      persist(undefined, next);
      return next;
    });
  };

  const splitCell = (rowId: string, colId: string) => {
    setRows(rs => {
      const next = [...rs];
      const rIdx = next.findIndex(r => r.id === rowId);
      if (rIdx === -1) return rs;
      const currentCell = next[rIdx].cells[colId];
      if (currentCell) {
        next[rIdx].cells[colId] = { ...currentCell, colSpan: 1, rowSpan: 1 };
      }
      persist(undefined, next);
      return next;
    });
  };

  const cellCtxItems = ctxMenu?.type === 'cell' && ctxMenu.rowId && ctxMenu.colId ? [
    { label: 'Fusionner à droite', icon: <ArrowRightOutlined />, onClick: () => mergeCell(ctxMenu.rowId!, ctxMenu.colId!, 'right') },
    { label: 'Fusionner en bas', icon: <ArrowDownOutlined />, onClick: () => mergeCell(ctxMenu.rowId!, ctxMenu.colId!, 'down') },
    { label: 'Diviser la cellule', icon: <AlignLeftOutlined />, onClick: () => splitCell(ctxMenu.rowId!, ctxMenu.colId!) },
    { divider: true, label: '', onClick: () => { } },
    { label: 'Ajouter une ligne après', icon: <PlusOutlined />, onClick: () => addRow(ctxMenu.rowId) },
    { label: 'Dupliquer la ligne', icon: <CopyOutlined />, onClick: () => duplicateRow(ctxMenu.rowId!) },
    { label: 'Vider la ligne', icon: '🗑', onClick: () => clearRow(ctxMenu.rowId!) },
    { divider: true, label: '', onClick: () => { } },
    { label: 'Déplacer vers le haut', icon: <ArrowUpOutlined />, onClick: () => moveRow(ctxMenu.rowId!, 'up') },
    { label: 'Déplacer vers le bas', icon: <ArrowDownOutlined />, onClick: () => moveRow(ctxMenu.rowId!, 'down') },
    { divider: true, label: '', onClick: () => { } },
    { label: 'Supprimer la ligne', icon: <DeleteOutlined />, danger: true, onClick: () => removeRow(ctxMenu.rowId!) },
  ] : [];

  const headerCtxItems = ctxMenu?.type === 'header' && ctxMenu.colId ? [
    { label: 'Configurer la colonne', icon: <SettingOutlined />, onClick: () => { const col = columns.find(c => c.id === ctxMenu.colId); if (col) setEditingCol(col); } },
    { label: 'Ajouter une colonne après', icon: <PlusOutlined />, onClick: () => addColumn(ctxMenu.colId) },
    { label: 'Dupliquer la colonne', icon: <CopyOutlined />, onClick: () => duplicateColumn(ctxMenu.colId!) },
    { divider: true, label: '', onClick: () => { } },
    { label: 'Déplacer à gauche', icon: <ArrowLeftOutlined />, onClick: () => moveColumn(ctxMenu.colId!, 'left') },
    { label: 'Déplacer à droite', icon: <ArrowRightOutlined />, onClick: () => moveColumn(ctxMenu.colId!, 'right') },
    { divider: true, label: '', onClick: () => { } },
    { label: 'Masquer la colonne', icon: <EyeInvisibleOutlined />, onClick: () => updateColumn({ ...columns.find(c => c.id === ctxMenu.colId)!, visible: false }) },
    { label: 'Supprimer la colonne', icon: <DeleteOutlined />, danger: true, onClick: () => removeColumn(ctxMenu.colId!) },
  ] : [];

  // ── Keyboard navigation ───────────────────────────────────────────────────
  const handleCellKeyDown = (e: React.KeyboardEvent, rowId: string, colId: string) => {
    const visibleCols = columns.filter(c => c.visible !== false);
    const filteredRowIds = filteredAndSortedRows.map(r => r.id);
    const rIdx = filteredRowIds.indexOf(rowId);
    const cIdx = visibleCols.findIndex(c => c.id === colId);

    switch (e.key) {
      case 'Tab': {
        e.preventDefault();
        const nextC = e.shiftKey ? cIdx - 1 : cIdx + 1;
        if (nextC >= 0 && nextC < visibleCols.length) {
          setSelectedCell({ rowId, colId: visibleCols[nextC].id });
        } else if (!e.shiftKey && rIdx < filteredRowIds.length - 1) {
          setSelectedCell({ rowId: filteredRowIds[rIdx + 1], colId: visibleCols[0].id });
        } else if (e.shiftKey && rIdx > 0) {
          setSelectedCell({ rowId: filteredRowIds[rIdx - 1], colId: visibleCols[visibleCols.length - 1].id });
        }
        break;
      }
      case 'ArrowDown':
        if (rIdx < filteredRowIds.length - 1) setSelectedCell({ rowId: filteredRowIds[rIdx + 1], colId });
        break;
      case 'ArrowUp':
        if (rIdx > 0) setSelectedCell({ rowId: filteredRowIds[rIdx - 1], colId });
        break;
      case 'ArrowLeft':
        if (cIdx > 0) setSelectedCell({ rowId, colId: visibleCols[cIdx - 1].id });
        break;
      case 'ArrowRight':
        if (cIdx < visibleCols.length - 1) setSelectedCell({ rowId, colId: visibleCols[cIdx + 1].id });
        break;
      case 'Enter':
        if (rIdx < filteredRowIds.length - 1) setSelectedCell({ rowId: filteredRowIds[rIdx + 1], colId });
        break;
    }
  };

  // ── Export CSV ────────────────────────────────────────────────────────────
  const downloadCSV = () => {
    const vis = columns.filter(c => c.visible !== false);
    const header = vis.map(c => `"${c.title}"`).join(',');
    const body = filteredAndSortedRows.map(r =>
      vis.map(c => `"${String(getCellValue(r.id, c.id) ?? '').replace(/"/g, '""')}"`).join(',')
    );
    const blob = new Blob(['\uFEFF' + [header, ...body].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `tableau_${el.id}.csv` });
    a.click(); URL.revokeObjectURL(a.href);
    message.success('Export CSV réussi');
  };

  // ── Copy to clipboard ─────────────────────────────────────────────────────
  const copyClipboard = () => {
    const vis = columns.filter(c => c.visible !== false);
    const header = vis.map(c => c.title).join('\t');
    const body = filteredAndSortedRows.map(r => vis.map(c => getCellValue(r.id, c.id) ?? '').join('\t'));
    navigator.clipboard.writeText([header, ...body].join('\n'));
    message.success('Copié dans le presse-papier');
  };

  // ── Filtered & sorted rows ────────────────────────────────────────────────
  const visibleColumns = columns.filter(c => c.visible !== false);
  const filteredAndSortedRows = useMemo(() => {
    let result = rows.filter(r => r.visible !== false);
    if (search) {
      const lc = search.toLowerCase();
      result = result.filter(r => visibleColumns.some(c => String(getCellValue(r.id, c.id) ?? '').toLowerCase().includes(lc)));
    }
    if (sortCol) {
      result.sort((a, b) => {
        const vA = String(getCellValue(a.id, sortCol) ?? '');
        const vB = String(getCellValue(b.id, sortCol) ?? '');
        return sortDir === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
      });
    }
    return result;
  }, [rows, search, sortCol, sortDir, filledData]);
  const skipMap = useMemo(() => {
    const map = new Set<string>();
    filteredAndSortedRows.forEach((r, rIdx) => {
      visibleColumns.forEach((c, cIdx) => {
        const cell = r.cells[c.id];
        if (!cell) return;
        const rSpan = cell.rowSpan || 1;
        const cSpan = cell.colSpan || 1;
        if (rSpan > 1 || cSpan > 1) {
          for (let i = 0; i < rSpan; i++) {
            for (let j = 0; j < cSpan; j++) {
              if (i === 0 && j === 0) continue; // Don't skip the origin cell
              if (rIdx + i < filteredAndSortedRows.length && cIdx + j < visibleColumns.length) {
                const targetRowId = filteredAndSortedRows[rIdx + i].id;
                const targetColId = visibleColumns[cIdx + j].id;
                map.add(`${targetRowId}_${targetColId}`);
              }
            }
          }
        }
      });
    });
    return map;
  }, [filteredAndSortedRows, visibleColumns]);

  // ── Hidden columns badge ──────────────────────────────────────────────────
  const hiddenCols = columns.filter(c => c.visible === false);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ width: '100%', fontFamily: 'inherit' }} role="group" aria-label="Tableau de données">
      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
        flexWrap: 'wrap',
      }}>
        {mode !== 'preview' && (
          <Input
            placeholder="Rechercher dans le tableau..."
            prefix={<SearchOutlined style={{ color: T.textMuted }} />}
            size="small"
            value={search}
            onChange={e => setSearch(e.target.value)}
            allowClear
            aria-label="Rechercher"
            style={{
              width: 220, borderRadius: 8, borderColor: T.border,
              transition: 'border-color 0.2s',
            }}
          />
        )}

        <div style={{ flex: 1 }} />

        {hiddenCols.length > 0 && (
          <Tooltip title={`${hiddenCols.length} colonne(s) masquée(s) : ${hiddenCols.map(c => c.title).join(', ')}`}>
            <Button
              size="small" icon={<EyeInvisibleOutlined />}
              style={{ borderRadius: 8, fontSize: 12 }}
              onClick={() => {
                setColumns(cols => { const next = cols.map(c => ({ ...c, visible: true })); persist(next); return next; });
              }}
            >
              {hiddenCols.length} masquée(s)
            </Button>
          </Tooltip>
        )}

        {isEditable && (
          <>
            <Tooltip title="Ajouter une ligne">
              <Button size="small" icon={<PlusOutlined />} onClick={() => addRow()}
                style={{ borderRadius: 8, borderColor: T.primary, color: T.primary }}>Ligne</Button>
            </Tooltip>
            <Tooltip title="Ajouter une colonne">
              <Button size="small" icon={<PlusOutlined />} onClick={() => addColumn()}
                style={{ borderRadius: 8, borderColor: T.success, color: T.success }}>Colonne</Button>
            </Tooltip>
          </>
        )}

        {mode !== 'preview' && (
          <>
            <Tooltip title="Copier (presse-papier)">
              <Button size="small" icon={<CopyOutlined />} onClick={copyClipboard} style={{ borderRadius: 8 }} />
            </Tooltip>
            <Tooltip title="Exporter CSV">
              <Button size="small" icon={<DownloadOutlined />} onClick={downloadCSV} style={{ borderRadius: 8 }}>CSV</Button>
            </Tooltip>
          </>
        )}
      </div>

      {/* ── Table ── */}
      <div style={{
        overflowX: 'auto',
        border: `1px solid ${T.border}`,
        borderRadius: T.radius,
        boxShadow: T.shadow,
        background: T.surface,
        transition: 'box-shadow 0.2s',
      }}
        onMouseEnter={e => (e.currentTarget.style.boxShadow = T.shadowHover)}
        onMouseLeave={e => (e.currentTarget.style.boxShadow = T.shadow)}
      >
        <table
          role="grid"
          aria-label={`Tableau ${el.id}`}
          aria-rowcount={filteredAndSortedRows.length + 1}
          aria-colcount={visibleColumns.length}
          style={{
            width: 'max-content', minWidth: '100%',
            tableLayout: 'fixed', borderCollapse: 'collapse',
            fontSize: style.fontSize || 13,
          }}
        >
          {/* ── COLGROUP ── */}
          <colgroup>
            {visibleColumns.map(col => (
              <col key={col.id} style={{ width: col.width ? `${col.width}px` : '140px' }} />
            ))}
            {/* Row actions column */}
            {isEditable && <col style={{ width: 36 }} />}
          </colgroup>

          {/* ── THEAD ── */}
          <thead>
            <tr role="row" aria-rowindex={1}>
              {visibleColumns.map((col, ci) => (
                <th
                  key={col.id}
                  role="columnheader"
                  aria-sort={sortCol === col.id ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  aria-colindex={ci + 1}
                  draggable={isEditable}
                  onDragStart={e => isEditable && handleColDragStart(e, col.id)}
                  onDragOver={e => isEditable && handleColDragOver(e, col.id)}
                  onDrop={() => isEditable && handleColDrop(col.id)}
                  onDragEnd={() => { setDraggingColId(null); setDragOverColId(null); }}
                  onContextMenu={e => openCtxMenu(e, 'header', undefined, col.id)}
                  onClick={() => handleSort(col.id)}
                  style={{
                    position: col.frozen ? 'sticky' : 'relative',
                    left: col.frozen ? 0 : undefined,
                    zIndex: col.frozen ? 3 : 2,
                    background: dragOverColId === col.id
                      ? T.primaryLight
                      : draggingColId === col.id
                        ? 'rgba(99,102,241,0.04)'
                        : (style.headerBg || T.headerBg),
                    color: style.headerColor || T.text,
                    textAlign: col.align || 'left',
                    borderBottom: `2px solid ${T.border}`,
                    borderRight: `1px solid ${T.border}`,
                    padding: 0,
                    cursor: 'pointer',
                    userSelect: 'none',
                    fontWeight: 700,
                    fontSize: 12,
                    letterSpacing: 0.2,
                    transition: 'background 0.15s',
                    opacity: draggingColId === col.id ? 0.5 : 1,
                  }}
                >
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    padding: '0 10px', height: 38, gap: 5,
                    justifyContent: col.align === 'center' ? 'center' : col.align === 'right' ? 'flex-end' : 'flex-start',
                  }}>

                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {col.title}
                    </span>
                    {/* Sort indicator */}
                    {sortCol === col.id && (
                      <span style={{ fontSize: 10, color: T.primary }}>
                        {sortDir === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                    {col.frozen && <LockOutlined style={{ fontSize: 10, opacity: 0.4 }} />}
                    {/* Column menu */}
                    {isEditable && (
                      <span
                        onClick={e => { e.stopPropagation(); openCtxMenu(e, 'header', undefined, col.id); }}
                        style={{ fontSize: 12, opacity: 0, transition: 'opacity 0.15s', cursor: 'pointer', padding: 2 }}
                        className="col-menu-btn"
                      >
                        <EllipsisOutlined />
                      </span>
                    )}
                  </div>
                  {/* Resize handle */}
                  {isEditable && (
                    <div
                      onMouseDown={e => handleResizeStart(e, col.id, col.width || 140)}
                      onClick={e => e.stopPropagation()}
                      aria-hidden="true"
                      style={{
                        position: 'absolute', right: 0, top: 0, bottom: 0, width: 6,
                        cursor: 'col-resize', zIndex: 10,
                        background: resizingColId === col.id ? T.primary : 'transparent',
                        borderRadius: '0 4px 4px 0',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => { if (resizingColId !== col.id) (e.currentTarget as HTMLElement).style.background = T.primaryBorder; }}
                      onMouseLeave={e => { if (resizingColId !== col.id) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    />
                  )}
                </th>
              ))}
              {/* Row-actions header */}
              {isEditable && (
                <th aria-label="Actions" style={{ background: style.headerBg || T.headerBg, width: 36, borderBottom: `2px solid ${T.border}` }} />
              )}
            </tr>
          </thead>

          {/* ── TBODY ── */}
          <tbody>
            {filteredAndSortedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + (isEditable ? 1 : 0)}
                  style={{ textAlign: 'center', padding: 40, color: T.textMuted }}
                >
                  <TableOutlined style={{ fontSize: 32, opacity: 0.2, display: 'block', margin: '0 auto 10px' }} />
                  <div style={{ fontSize: 13 }}>Aucune donnée{search ? ` pour "${search}"` : ''}</div>
                  {isEditable && !search && (
                    <Button
                      type="dashed" size="small" icon={<PlusOutlined />}
                      onClick={() => addRow()}
                      style={{ marginTop: 10, borderRadius: 8 }}
                    >Ajouter une ligne</Button>
                  )}
                </td>
              </tr>
            ) : (
              filteredAndSortedRows.map((row, ri) => (
                <tr
                  key={row.id}
                  role="row"
                  aria-rowindex={ri + 2}
                  onContextMenu={e => openCtxMenu(e, 'cell', row.id)}
                  style={{
                    background: style.alternateRows && ri % 2 !== 0 ? T.altRowBg : T.surface,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = T.primaryLight)}
                  onMouseLeave={e => (e.currentTarget.style.background = style.alternateRows && ri % 2 !== 0 ? T.altRowBg : T.surface)}
                >
                  {visibleColumns.map((col, ci) => {
                    const cellKey = `${row.id}_${col.id}`;
                    if (skipMap.has(cellKey)) return null;

                    const cellData = row.cells[col.id] || {};
                    const cSpan = cellData.colSpan || 1;
                    const rSpan = cellData.rowSpan || 1;
                    const isSel = selectedCell?.rowId === row.id && selectedCell?.colId === col.id;
                    
                    return (
                      <td
                        key={col.id}
                        colSpan={cSpan}
                        rowSpan={rSpan}
                        role="gridcell"
                        aria-colindex={ci + 1}
                        tabIndex={isSel ? 0 : -1}
                        aria-selected={isSel}
                        onKeyDown={e => handleCellKeyDown(e, row.id, col.id)}
                        onClick={() => setSelectedCell({ rowId: row.id, colId: col.id })}
                        onContextMenu={e => openCtxMenu(e, 'cell', row.id, col.id)}
                        style={{
                          padding: 0,
                          borderBottom: `1px solid ${T.border}`,
                          borderRight: `1px solid ${T.border}`,
                          textAlign: col.align || 'left',
                          position: col.frozen ? 'sticky' : 'static',
                          left: col.frozen ? 0 : undefined,
                          background: isSel ? T.primaryLight : 'inherit',
                          zIndex: col.frozen ? 1 : 0,
                          outline: isSel ? `2px solid ${T.primary}` : 'none',
                          outlineOffset: -2,
                          transition: 'background 0.1s, outline 0.1s',
                          height: row.height || T.cellH,
                          verticalAlign: row.align || 'top',
                          boxSizing: 'border-box',
                        }}
                      >
                        <TableCellRenderer
                          col={col}
                          value={getCellValue(row.id, col.id)}
                          isEditable={isEditable}
                          mode={mode}
                          isSelected={isSel}
                          onSelect={() => setSelectedCell({ rowId: row.id, colId: col.id })}
                          onChange={(val) => {
                            if (onChange) onChange(`${el.id}_${row.id}_${col.id}`, val);
                            // Also update rows state directly for local consistency
                            setRows(rs => rs.map(r => r.id === row.id
                              ? { ...r, cells: { ...r.cells, [col.id]: { value: val } } }
                              : r
                            ));
                          }}
                        />
                      </td>
                    );
                  })}
                  {/* Row action button */}
                  {isEditable && (
                    <td style={{
                      padding: 0, borderBottom: `1px solid ${T.border}`,
                      width: 36, verticalAlign: 'middle', textAlign: 'center',
                    }}>
                      <Dropdown
                        menu={{
                          items: [
                            { key: 'add', label: 'Ajouter après', icon: <PlusOutlined />, onClick: () => addRow(row.id) },
                            { key: 'dup', label: 'Dupliquer', icon: <CopyOutlined />, onClick: () => duplicateRow(row.id) },
                            { key: 'up', label: 'Monter', icon: <ArrowUpOutlined />, onClick: () => moveRow(row.id, 'up'), disabled: ri === 0 },
                            { key: 'down', label: 'Descendre', icon: <ArrowDownOutlined />, onClick: () => moveRow(row.id, 'down'), disabled: ri === filteredAndSortedRows.length - 1 },
                            { type: 'divider' },
                            { key: 'clear', label: 'Vider', icon: '🗑', onClick: () => clearRow(row.id) },
                            { key: 'del', label: 'Supprimer', icon: <DeleteOutlined />, danger: true, onClick: () => removeRow(row.id) },
                          ],
                        }}
                        trigger={['click']}
                        placement="bottomRight"
                      >
                        <button
                          aria-label={`Actions ligne ${ri + 1}`}
                          style={{
                            border: 'none', background: 'transparent', cursor: 'pointer',
                            color: T.textMuted, padding: '4px 8px', borderRadius: 6,
                            fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'color 0.15s, background 0.15s',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = T.primary; (e.currentTarget as HTMLElement).style.background = T.primaryLight; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = T.textMuted; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        >
                          <EllipsisOutlined />
                        </button>
                      </Dropdown>
                    </td>
                  )}
                </tr>
              ))
            )}

            {/* ── Add row button inline ── */}
            {isEditable && (
              <tr>
                <td
                  colSpan={visibleColumns.length + 1}
                  onClick={() => addRow()}
                  role="button"
                  tabIndex={0}
                  aria-label="Ajouter une ligne"
                  onKeyDown={e => { if (e.key === 'Enter') addRow(); }}
                  style={{
                    padding: '7px 12px', cursor: 'pointer',
                    color: T.textMuted, fontSize: 12,
                    borderTop: `1px dashed ${T.border}`,
                    transition: 'background 0.15s, color 0.15s',
                    userSelect: 'none',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.primaryLight; (e.currentTarget as HTMLElement).style.color = T.primary; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = T.textMuted; }}
                >
                  <PlusOutlined style={{ marginRight: 6 }} />
                  Ajouter une ligne
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, fontSize: 11, color: T.textMuted }}>
        <span>
          {filteredAndSortedRows.length} ligne{filteredAndSortedRows.length !== 1 ? 's' : ''}
          {search && ` · filtré${filteredAndSortedRows.length !== 1 ? 's' : ''}`}
          {rows.length !== filteredAndSortedRows.length && ` sur ${rows.length}`}
        </span>
        <span>{visibleColumns.length} colonne{visibleColumns.length !== 1 ? 's' : ''}{hiddenCols.length > 0 ? ` (${hiddenCols.length} masquée${hiddenCols.length !== 1 ? 's' : ''})` : ''}</span>
      </div>

      {/* ── Context Menu ── */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x} y={ctxMenu.y}
          items={(ctxMenu.type === 'header' ? headerCtxItems : cellCtxItems) as any}
          onClose={() => setCtxMenu(null)}
        />
      )}

      {/* ── Column Editor Modal ── */}
      {editingCol && (
        <ColumnEditor
          col={editingCol}
          onSave={updateColumn}
          onClose={() => setEditingCol(null)}
        />
      )}

      {/* ── Hover style for column menu button ── */}
      <style>{`
        th:hover .col-menu-btn { opacity: 1 !important; }
        th .col-menu-btn:hover { color: ${T.primary}; }
      `}</style>
    </div>
  );
};
import React, { useState, useRef } from 'react';
import { Input, InputNumber, Checkbox, DatePicker, Select, Tag, ColorPicker } from 'antd';
import type { TableColumn } from '../../../types/template.types';
import dayjs from 'dayjs';

const { Option } = Select;

interface TableCellRendererProps {
  col: TableColumn;
  value: any;
  isEditable: boolean;
  mode: 'fill' | 'preview' | 'readonly';
  onChange: (val: any) => void;
  rowIndex?: number;
  colIndex?: number;
  isSelected?: boolean;
  onSelect?: () => void;
}

const CELL_BASE_STYLE: React.CSSProperties = {
  width: '100%',
  border: 'none',
  background: 'transparent',
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
  padding: '5px 10px',
  boxSizing: 'border-box',
  transition: 'background 0.15s',
};

export const TableCellRenderer: React.FC<TableCellRendererProps> = ({
  col, value, isEditable, mode, onChange, isSelected, onSelect,
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [focused, setFocused] = useState(false);
  const disabled = !isEditable;

  // Sync with external value
  React.useEffect(() => { setLocalValue(value); }, [value]);

  const commitChange = (val: any) => {
    setLocalValue(val);
    onChange(val);
  };

  const cellStyle: React.CSSProperties = {
    ...CELL_BASE_STYLE,
    background: focused ? 'rgba(99,102,241,0.05)' : 'transparent',
    cursor: disabled ? 'default' : 'text',
  };

  if (mode === 'readonly') {
    switch (col.type) {
      case 'bool':
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5px 10px' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 18, height: 18, borderRadius: 4,
              background: value ? '#6366f1' : '#f1f5f9',
              border: `1.5px solid ${value ? '#6366f1' : '#cbd5e1'}`,
            }}>
              {value && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
            </span>
          </div>
        );
      case 'badge':
        return (
          <div style={{ padding: '4px 10px' }}>
            {value ? (
              <Tag color={col.badgeOptions?.find(o => o.value === value)?.color || 'default'}
                style={{ margin: 0, borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                {col.badgeOptions?.find(o => o.value === value)?.label || value}
              </Tag>
            ) : <span style={{ color: '#94a3b8', padding: '5px 10px' }}>—</span>}
          </div>
        );
      case 'num':
        return <span style={{ padding: '5px 10px', display: 'block', textAlign: 'right', color: '#1e293b' }}>{value ?? '—'}</span>;
      case 'date':
        return <span style={{ padding: '5px 10px', display: 'block', color: '#1e293b' }}>{value ? dayjs(value).format('DD/MM/YYYY') : '—'}</span>;
      default:
        return <span style={{ padding: '5px 10px', display: 'block', color: '#1e293b' }}>{value || '—'}</span>;
    }
  }

  switch (col.type) {
    case 'num':
      return (
        <InputNumber
          size="small"
          value={localValue}
          onChange={(v) => commitChange(v)}
          disabled={disabled}
          onFocus={() => { setFocused(true); onSelect?.(); }}
          onBlur={() => setFocused(false)}
          style={{ ...cellStyle, textAlign: 'right' }}
          controls={false}
          bordered={false}
        />
      );

    case 'bool':
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5px 10px', minHeight: 34 }}
          onClick={() => { if (!disabled) { commitChange(!localValue); onSelect?.(); } }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 18, height: 18, borderRadius: 4, cursor: disabled ? 'default' : 'pointer',
            background: localValue ? '#6366f1' : 'transparent',
            border: `1.5px solid ${localValue ? '#6366f1' : '#cbd5e1'}`,
            transition: 'all 0.15s ease',
            boxShadow: localValue ? '0 0 0 3px rgba(99,102,241,0.15)' : 'none',
          }}>
            {localValue && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
          </span>
        </div>
      );

    case 'date':
      return (
        <DatePicker
          size="small"
          value={localValue ? dayjs(localValue) : null}
          onChange={(_, dateStr) => commitChange(dateStr)}
          disabled={disabled}
          onFocus={() => { setFocused(true); onSelect?.(); }}
          onBlur={() => setFocused(false)}
          style={{ ...cellStyle, minWidth: 120 }}
          bordered={false}
          format="DD/MM/YYYY"
          placeholder="jj/mm/aaaa"
        />
      );

    case 'select':
      return (
        <Select
          size="small"
          value={localValue || undefined}
          onChange={(v) => commitChange(v)}
          disabled={disabled}
          onFocus={() => { setFocused(true); onSelect?.(); }}
          onBlur={() => setFocused(false)}
          style={{ width: '100%', fontSize: 13 }}
          bordered={false}
          placeholder="Choisir..."
          dropdownStyle={{ borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
        >
          {(col.selectOptions || []).map(opt => (
            <Option key={opt.value} value={opt.value}>{opt.label}</Option>
          ))}
        </Select>
      );

    case 'badge':
      return (
        <Select
          size="small"
          value={localValue || undefined}
          onChange={(v) => commitChange(v)}
          disabled={disabled}
          onFocus={() => { setFocused(true); onSelect?.(); }}
          onBlur={() => setFocused(false)}
          style={{ width: '100%', fontSize: 13 }}
          bordered={false}
          placeholder="Statut..."
          dropdownStyle={{ borderRadius: 8 }}
          optionLabelProp="label"
        >
          {(col.badgeOptions || []).map(opt => (
            <Option key={opt.value} value={opt.value} label={
              <Tag color={opt.color} style={{ margin: 0, borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{opt.label}</Tag>
            }>
              <Tag color={opt.color} style={{ borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{opt.label}</Tag>
            </Option>
          ))}
        </Select>
      );

    case 'url':
      return (
        <Input
          size="small"
          value={localValue || ''}
          onChange={(e) => { setLocalValue(e.target.value); }}
          onBlur={(e) => { commitChange(e.target.value); setFocused(false); }}
          onFocus={() => { setFocused(true); onSelect?.(); }}
          disabled={disabled}
          style={cellStyle}
          bordered={false}
          placeholder="https://..."
          prefix={<span style={{ color: '#94a3b8', fontSize: 11 }}>🔗</span>}
        />
      );

    case 'email':
      return (
        <Input
          size="small"
          type="email"
          value={localValue || ''}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={(e) => { commitChange(e.target.value); setFocused(false); }}
          onFocus={() => { setFocused(true); onSelect?.(); }}
          disabled={disabled}
          style={cellStyle}
          bordered={false}
          placeholder="exemple@email.com"
          prefix={<span style={{ color: '#94a3b8', fontSize: 11 }}>@</span>}
        />
      );

    case 'txt':
    default:
      return (
        <Input
          size="small"
          value={localValue || ''}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={(e) => { commitChange(e.target.value); setFocused(false); }}
          onFocus={() => { setFocused(true); onSelect?.(); }}
          disabled={disabled}
          style={cellStyle}
          bordered={false}
          placeholder={disabled ? '' : 'Saisir...'}
        />
      );
  }
};
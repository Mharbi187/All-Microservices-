// ============================================================
// Shared: StatusBadge — Modern pill badge for report workflow status
// Red Crescent branding · Size variants · Accessible
// ============================================================
import React from 'react';
import type { ReportWorkflowStatus } from '@/types/template.types';

const STATUS_CONFIG: Record<
  ReportWorkflowStatus,
  { bg: string; color: string; border: string; dot: string; label: string; icon: string }
> = {
  DRAFT: { bg: '#F3F4F6', color: '#4B5563', border: '#E5E7EB', dot: '#9CA3AF', label: 'Brouillon', icon: '✎' },
  SUBMITTED: { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A', dot: '#F59E0B', label: 'Soumis', icon: '⬆' },
  VALIDATED: { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', dot: '#3B82F6', label: 'Validé', icon: '✓' },
  FINALIZED: { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0', dot: '#22C55E', label: 'Finalisé', icon: '⚑' },
  ARCHIVED: { bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE', dot: '#8B5CF6', label: 'Archivé', icon: '⊡' },
};

const RC_FONT = "'DM Sans', 'Segoe UI', system-ui, sans-serif";

interface StatusBadgeProps {
  status: ReportWorkflowStatus;
  /** 'sm' = compact, 'md' = default, 'lg' = large */
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = false,
}) => {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;

  const styles: Record<string, React.CSSProperties> = {
    sm: { padding: '2px 8px', fontSize: 11, gap: 4 },
    md: { padding: '4px 10px', fontSize: 12, gap: 5 },
    lg: { padding: '5px 14px', fontSize: 13, gap: 6 },
  };
  const dotSize: Record<string, number> = { sm: 5, md: 6, lg: 7 };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 20,
        background: cfg.bg,
        color: cfg.color,
        fontWeight: 600,
        fontFamily: RC_FONT,
        letterSpacing: '0.01em',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        border: `1px solid ${cfg.border}`,
        ...styles[size],
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: dotSize[size],
          height: dotSize[size],
          borderRadius: '50%',
          background: cfg.dot,
          flexShrink: 0,
        }}
      />
      {showIcon && (
        <span style={{ fontSize: (styles[size].fontSize as number) - 1, lineHeight: 1 }}>
          {cfg.icon}
        </span>
      )}
      {cfg.label}
    </span>
  );
};

export default StatusBadge;
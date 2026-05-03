// ============================================================
// Shared: WorkflowTimeline — Visual step-by-step workflow indicator
// RC branding · Responsive (horizontal ≥sm, vertical on xs)
// ============================================================
import React from 'react';
import type { ReportWorkflowStatus } from '@/types/template.types';

const STEPS: { key: ReportWorkflowStatus; label: string; icon: string }[] = [
  { key: 'DRAFT', label: 'Brouillon', icon: '✎' },
  { key: 'SUBMITTED', label: 'Soumis', icon: '⬆' },
  { key: 'VALIDATED', label: 'Validé', icon: '✓' },
  { key: 'FINALIZED', label: 'Finalisé', icon: '⚑' },
  { key: 'ARCHIVED', label: 'Archivé', icon: '⊡' },
];

const STEP_COLORS: Record<ReportWorkflowStatus, { active: string; light: string }> = {
  DRAFT: { active: '#9CA3AF', light: '#F3F4F6' },
  SUBMITTED: { active: '#F59E0B', light: '#FFFBEB' },
  VALIDATED: { active: '#3B82F6', light: '#EFF6FF' },
  FINALIZED: { active: '#22C55E', light: '#F0FDF4' },
  ARCHIVED: { active: '#8B5CF6', light: '#F5F3FF' },
};

const STATUS_INDEX: Record<ReportWorkflowStatus, number> = {
  DRAFT: 0, SUBMITTED: 1, VALIDATED: 2, FINALIZED: 3, ARCHIVED: 4,
};

const RC_RED = '#CC0000';
const RC_FONT = "'DM Sans', 'Segoe UI', system-ui, sans-serif";
const DONE_CLR = '#16A34A';

interface WorkflowTimelineProps {
  status: ReportWorkflowStatus;
  /** compact = smaller version for table rows */
  compact?: boolean;
}

const WorkflowTimeline: React.FC<WorkflowTimelineProps> = ({ status, compact = false }) => {
  const current = STATUS_INDEX[status] ?? 0;
  const stepSize = compact ? 24 : 32;
  const fontSize = compact ? 10 : 11;
  const iconSize = compact ? 11 : 13;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        width: '100%',
        fontFamily: RC_FONT,
        overflowX: 'auto',
        paddingBottom: compact ? 0 : 4,
      }}
    >
      {STEPS.map((step, i) => {
        const isDone = i < current;
        const isActive = i === current;
        const isPending = i > current;
        const clr = STEP_COLORS[step.key];

        const circleBg = isDone ? DONE_CLR : isActive ? clr.active : '#E5E7EB';
        const circleColor = isDone || isActive ? '#fff' : '#9CA3AF';
        const labelColor = isDone ? DONE_CLR : isActive ? clr.active : '#9CA3AF';
        const connectorBg = isDone ? DONE_CLR : '#E5E7EB';

        return (
          <div
            key={step.key}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              flex: i < STEPS.length - 1 ? 1 : 'none',
              minWidth: compact ? 60 : 72,
            }}
          >
            {/* Step circle + label */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div
                style={{
                  width: stepSize,
                  height: stepSize,
                  borderRadius: '50%',
                  background: circleBg,
                  border: isActive ? `2px solid ${clr.active}` : '2px solid transparent',
                  boxShadow: isActive ? `0 0 0 3px ${clr.light}` : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: circleColor,
                  fontSize: iconSize,
                  fontWeight: 700,
                  transition: 'all 0.3s ease',
                  flexShrink: 0,
                }}
              >
                {isDone ? '✓' : step.icon}
              </div>
              <span
                style={{
                  fontSize,
                  color: labelColor,
                  fontWeight: isActive ? 700 : isDone ? 600 : 400,
                  whiteSpace: 'nowrap',
                  transition: 'color 0.3s',
                  textAlign: 'center',
                  maxWidth: compact ? 56 : 68,
                }}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  background: connectorBg,
                  margin: `${stepSize / 2 - 1}px 4px 0`,
                  borderRadius: 2,
                  transition: 'background 0.3s',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default WorkflowTimeline;
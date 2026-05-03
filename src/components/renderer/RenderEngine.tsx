// ============================================================
// RenderEngine — detects v2 (JSONB) vs legacy (blocks) templates
// and delegates to the appropriate renderer.
// ============================================================
import React from 'react';
import type { TemplateElement } from '@/types/template.types';

// V2 renderer (new JSONB structure)
import V2Renderer from './V2Renderer';

interface RenderEngineProps {
  /** v2 structure (JSONB array of elements) */
  structure?: TemplateElement[];
  /** Legacy block data (v1 templates) */
  legacyBlocks?: unknown[];
  /** Current filled values: elementId -> value */
  filledData?: Record<string, unknown>;
  /** 'preview' = show blank fields, 'fill' = editable, 'readonly' = filled but locked */
  mode?: 'preview' | 'fill' | 'readonly';
  /** Callback when a field value changes (fill mode) */
  onChange?: (id: string, value: unknown) => void;
}

const RenderEngine: React.FC<RenderEngineProps> = ({
  structure,
  legacyBlocks,
  filledData = {},
  mode = 'preview',
  onChange,
}) => {
  // v2: JSONB structure is present
  if (structure && structure.length > 0) {
    return (
      <V2Renderer
        elements={structure}
        filledData={filledData}
        mode={mode}
        onChange={onChange}
      />
    );
  }

  // Legacy: old block-based template
  if (legacyBlocks && legacyBlocks.length > 0) {
    return (
      <div style={{ padding: 16 }}>
        <p style={{ color: '#888', fontStyle: 'italic' }}>
          [Modèle classique — affichage simplifié]
        </p>
        {legacyBlocks.map((block: any, idx) => (
          <div
            key={idx}
            style={{
              borderLeft: '3px solid #d9d9d9',
              paddingLeft: 12,
              marginBottom: 12,
            }}
          >
            <strong>{block.label ?? `Bloc ${idx + 1}`}</strong>
            {mode !== 'preview' && (
              <input
                style={{
                  display: 'block',
                  marginTop: 6,
                  border: '1px solid #d9d9d9',
                  borderRadius: 4,
                  padding: '4px 8px',
                  width: '100%',
                }}
                placeholder={block.label}
                onChange={(e) => onChange?.(String(idx), e.target.value)}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', color: '#aaa', padding: 48 }}>
      Aucun contenu à afficher.
    </div>
  );
};

export default RenderEngine;

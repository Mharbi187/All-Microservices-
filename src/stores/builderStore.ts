// ============================================================
// Builder Zustand Store — Template Canvas State
// ============================================================
// Uses immer middleware for immutable state updates.
// Supports full undo/redo history (max 50 steps).
//
// Performance:
// - Per-element selectors: useBuilderStore(s => s.elements.find(e => e.id === id))
// - ElementCard wrapped in React.memo
// - PropertiesPanel uses useDeferredValue
// ============================================================

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { nanoid } from 'nanoid';
import type { TemplateElement, ElementType } from '@/types/template.types';

const MAX_HISTORY = 50;

interface BuilderMeta {
  title: string;
  description: string;
  templateId?: string;
  templateVersionId?: string;
}

interface BuilderState {
  // Canvas state
  elements: TemplateElement[];
  selectedId: string | null;
  previewMode: boolean;
  isDirty: boolean;

  // Template metadata
  meta: BuilderMeta;

  // Undo/Redo
  past: TemplateElement[][];
  future: TemplateElement[][];

  // Actions
  setMeta: (meta: Partial<BuilderMeta>) => void;
  addElement: (type: ElementType) => void;
  removeElement: (id: string) => void;
  updateElement: (id: string, props: Partial<TemplateElement['props']>) => void;
  reorderElements: (fromIndex: number, toIndex: number) => void;
  selectElement: (id: string | null) => void;
  togglePreview: () => void;
  undo: () => void;
  redo: () => void;
  loadStructure: (elements: TemplateElement[]) => void;
  exportStructure: () => TemplateElement[];
  resetDirty: () => void;
}

// Default props for each element type
function defaultProps(type: ElementType): TemplateElement['props'] {
  switch (type) {
    case 'heading': return { text: 'Nouveau titre', level: 1 };
    case 'paragraph': return { text: 'Saisissez votre texte ici...' };
    case 'divider': return {};
    case 'image': return { src: '', alt: 'Image' };
    case 'table': {
      const c1 = `c_${nanoid(5)}`;
      const c2 = `c_${nanoid(5)}`;
      return {
        columns: [
          { id: c1, title: 'Colonne 1', type: 'txt', width: 200, align: 'left', visible: true },
          { id: c2, title: 'Colonne 2', type: 'txt', width: 200, align: 'left', visible: true }
        ],
        rows: [
          {
            id: `r_${nanoid(5)}`,
            cells: {
              [c1]: { value: 'Valeur 1', type: 'text' },
              [c2]: { value: 'Valeur 2', type: 'text' }
            }
          }
        ],
        style: {
          headerBg: '#f1f5f9',
          headerColor: '#1e293b',
          alternateRows: true,
          borderColor: '#e2e8f0',
          borders: true,
          fontSize: 13,
          padding: 8
        }
      };
    }
    case 'text_input': return { label: 'Champ texte', placeholder: '', required: true };
    case 'textarea': return { label: 'Zone de texte', required: false };
    case 'checkbox': return { label: 'Options', layout: 'vertical', options: [{ id: nanoid(4), label: 'Option 1', value: 'opt1' }] };
    case 'radio': return { label: 'Question', layout: 'vertical', options: [{ id: nanoid(4), label: 'Option 1', value: 'opt1' }, { id: nanoid(4), label: 'Option 2', value: 'opt2' }] };
    case 'date_picker': return { label: 'Date', required: false, defaultValue: 'today' };
    case 'signature_block': return { label: 'Signature', required: true };
    default: return {};
  }
}

// Push current state to history before a mutation
function pushHistory(past: TemplateElement[][], current: TemplateElement[]): TemplateElement[][] {
  const next = [...past, current];
  if (next.length > MAX_HISTORY) next.shift();
  return next;
}

export const useBuilderStore = create<BuilderState>()(
  immer((set, get) => ({
    elements: [],
    selectedId: null,
    previewMode: false,
    isDirty: false,
    meta: { title: 'Nouveau modèle', description: '' },
    past: [],
    future: [],

    setMeta: (meta) =>
      set((state) => {
        Object.assign(state.meta, meta);
        state.isDirty = true;
      }),

    addElement: (type) =>
      set((state) => {
        state.past = pushHistory(state.past, state.elements.map(e => ({ ...e })));
        state.future = [];
        state.elements.push({ id: nanoid(8), type, props: defaultProps(type) });
        state.isDirty = true;
      }),

    removeElement: (id) =>
      set((state) => {
        state.past = pushHistory(state.past, state.elements.map(e => ({ ...e })));
        state.future = [];
        state.elements = state.elements.filter((e) => e.id !== id);
        if (state.selectedId === id) state.selectedId = null;
        state.isDirty = true;
      }),

    updateElement: (id, props) =>
      set((state) => {
        const el = state.elements.find((e) => e.id === id);
        if (el) {
          Object.assign(el.props, props);
          state.isDirty = true;
        }
      }),

    reorderElements: (fromIndex, toIndex) =>
      set((state) => {
        state.past = pushHistory(state.past, state.elements.map(e => ({ ...e })));
        state.future = [];
        const [moved] = state.elements.splice(fromIndex, 1);
        state.elements.splice(toIndex, 0, moved);
        state.isDirty = true;
      }),

    selectElement: (id) =>
      set((state) => {
        state.selectedId = id;
      }),

    togglePreview: () =>
      set((state) => {
        state.previewMode = !state.previewMode;
        state.selectedId = null;
      }),

    undo: () =>
      set((state) => {
        if (state.past.length === 0) return;
        const previous = state.past[state.past.length - 1];
        state.future = [state.elements.map(e => ({ ...e })), ...state.future];
        state.past = state.past.slice(0, -1);
        state.elements = previous;
        state.isDirty = true;
      }),

    redo: () =>
      set((state) => {
        if (state.future.length === 0) return;
        const next = state.future[0];
        state.past = pushHistory(state.past, state.elements.map(e => ({ ...e })));
        state.future = state.future.slice(1);
        state.elements = next;
        state.isDirty = true;
      }),

    loadStructure: (elements) =>
      set((state) => {
        state.elements = elements;
        state.past = [];
        state.future = [];
        state.isDirty = false;
        state.selectedId = null;
      }),

    exportStructure: () => get().elements,

    resetDirty: () =>
      set((state) => {
        state.isDirty = false;
      }),
  }))
);

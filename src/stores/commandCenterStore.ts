import { create } from 'zustand';
import type { RoleType } from '../types';

export type CommandCenterPanel = 'radar' | 'incidents' | 'responders';

interface CommandCenterState {
    role: RoleType;
    selectedWilaya: string | null;
    panel: CommandCenterPanel;
    setRole: (role: RoleType) => void;
    setSelectedWilaya: (wilaya: string | null) => void;
    setPanel: (panel: CommandCenterPanel) => void;
}

export const useCommandCenter = create<CommandCenterState>((set) => ({
    role: 'NATIONAL',
    selectedWilaya: null,
    panel: 'radar',
    setRole: (role) => set((state) => ({ role, selectedWilaya: role === 'NATIONAL' ? null : state.selectedWilaya })),
    setSelectedWilaya: (wilaya) => set({ selectedWilaya: wilaya }),
    setPanel: (panel) => set({ panel }),
}));

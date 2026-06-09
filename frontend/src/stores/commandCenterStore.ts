import { create } from 'zustand';
import type { RoleType } from '../types';

interface CommandCenterState {
    role: RoleType;
    selectedWilaya: string | null;
    setRole: (role: RoleType) => void;
    setSelectedWilaya: (wilaya: string | null) => void;
}

export const useCommandCenter = create<CommandCenterState>((set) => ({
    role: 'NATIONAL',
    selectedWilaya: null,
    setRole: (role) => set({ role, selectedWilaya: role === 'NATIONAL' ? null : undefined }),
    setSelectedWilaya: (wilaya) => set({ selectedWilaya: wilaya }),
}));

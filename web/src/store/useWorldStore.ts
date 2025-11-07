import { create } from 'zustand';

interface WorldState {
  time: number;
  objects: any[];
  aiPosition: { x: number; y: number; z: number } | null;
  objectCount: number;
  physicsTime: number;
}

interface WorldStore {
  state: WorldState;
  updateWorld: (newWorld: Partial<WorldState>) => void;
  reset: () => void;
}

const initialState: WorldState = {
  time: 0,
  objects: [],
  aiPosition: null,
  objectCount: 0,
  physicsTime: 0
};

export const useWorldStore = create<WorldStore>((set, get) => ({
  state: initialState,

  updateWorld: (newWorld) => {
    set((state) => ({
      state: { ...state.state, ...newWorld }
    }));
  },

  reset: () => {
    set({ state: initialState });
  }
}));
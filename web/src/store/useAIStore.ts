import { create } from 'zustand';

interface AIState {
  id: string;
  age: number;
  totalExperiences: number;
  emotions: {
    valence: number;
    arousal: number;
    dimensions: number[];
  };
  thoughts: Array<{
    id: string;
    type: 'abstract' | 'linguistic';
    content: string;
    timestamp: number;
  }>;
  attention: any;
  curiosity: number;
  learning: {
    rate: number;
    totalAdjustments: number;
  };
  memory: {
    episodicCount: number;
    semanticCount: number;
    vocabularySize: number;
  };
  language: {
    currentThought: string | null;
    comprehensionLevel: number;
  };
}

interface AIStore {
  state: AIState;
  updateState: (newState: Partial<AIState>) => void;
  reset: () => void;
}

const initialState: AIState = {
  id: '',
  age: 0,
  totalExperiences: 0,
  emotions: {
    valence: 0,
    arousal: 0.5,
    dimensions: new Array(8).fill(0)
  },
  thoughts: [],
  attention: null,
  curiosity: 1.0,
  learning: {
    rate: 0.001,
    totalAdjustments: 0
  },
  memory: {
    episodicCount: 0,
    semanticCount: 0,
    vocabularySize: 0
  },
  language: {
    currentThought: null,
    comprehensionLevel: 0
  }
};

export const useAIStore = create<AIStore>((set, get) => ({
  state: initialState,

  updateState: (newState) => {
    set((state) => ({
      state: { ...state.state, ...newState }
    }));
  },

  reset: () => {
    set({ state: initialState });
  }
}));
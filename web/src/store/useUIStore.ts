import { create } from 'zustand';

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  timestamp: number;
}

interface UIState {
  isLoading: boolean;
  loadingProgress: number;
  showDebugPanel: boolean;
  showWorldBuilder: boolean;
  notifications: Notification[];
  error: string | null;
}

interface UIStore {
  state: UIState;
  setLoading: (loading: boolean) => void;
  setLoadingProgress: (progress: number) => void;
  setShowDebugPanel: (show: boolean) => void;
  setShowWorldBuilder: (show: boolean) => void;
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  clearNotifications: () => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: UIState = {
  isLoading: true,
  loadingProgress: 0,
  showDebugPanel: false,
  showWorldBuilder: false,
  notifications: [],
  error: null
};

export const useUIStore = create<UIStore>((set, get) => ({
  state: initialState,

  setLoading: (loading) => {
    set((state) => ({
      state: { ...state.state, isLoading: loading }
    }));
  },

  setLoadingProgress: (progress) => {
    set((state) => ({
      state: { ...state.state, loadingProgress: progress }
    }));
  },

  setShowDebugPanel: (show) => {
    set((state) => ({
      state: { ...state.state, showDebugPanel: show }
    }));
  },

  setShowWorldBuilder: (show) => {
    set((state) => ({
      state: { ...state.state, showWorldBuilder: show }
    }));
  },

  showNotification: (message, type = 'info') => {
    const notification: Notification = {
      id: Date.now().toString(),
      message,
      type,
      timestamp: Date.now()
    };

    set((state) => ({
      state: {
        ...state.state,
        notifications: [...state.state.notifications, notification]
      }
    }));

    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      set((state) => ({
        state: {
          ...state.state,
          notifications: state.state.notifications.filter(n => n.id !== notification.id)
        }
      }));
    }, 5000);
  },

  clearNotifications: () => {
    set((state) => ({
      state: {
        ...state.state,
        notifications: []
      }
    }));
  },

  setError: (error) => {
    set((state) => ({
      state: { ...state.state, error }
    }));
  },

  reset: () => {
    set({ state: initialState });
  }
}));
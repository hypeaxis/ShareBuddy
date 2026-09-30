/**
 * UI Redux slice for ShareBuddy
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// UI slice
interface UIState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  loading: {
    [key: string]: boolean;
  };
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    duration?: number;
  }>;
  modals: {
    [key: string]: boolean;
  };
  searchQuery: string;
  searchFilters: {
    category?: string;
    subject?: string;
    minRating?: number;
    maxCreditCost?: number;
    sortBy?: string;
  };
}

const initialState: UIState = {
  theme: 'dark', // Default to dark theme as requested
  sidebarOpen: false,
  loading: {},
  notifications: [],
  modals: {},
  searchQuery: '',
  searchFilters: {},
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
      localStorage.setItem('sharebuddy_theme', action.payload);
    },
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('sharebuddy_theme', state.theme);
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setLoading: (state, action: PayloadAction<{ key: string; loading: boolean }>) => {
      const { key, loading } = action.payload;
      state.loading[key] = loading;
    },
    addNotification: (state, action: PayloadAction<{
      type: 'success' | 'error' | 'warning' | 'info';
      message: string;
      duration?: number;
    }>) => {
      const notification = {
        id: Date.now().toString(),
        ...action.payload,
      };
      state.notifications.push(notification);
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        notification => notification.id !== action.payload
      );
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    setModal: (state, action: PayloadAction<{ key: string; open: boolean }>) => {
      const { key, open } = action.payload;
      state.modals[key] = open;
    },
    closeAllModals: (state) => {
      Object.keys(state.modals).forEach(key => {
        state.modals[key] = false;
      });
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setSearchFilters: (state, action: PayloadAction<Partial<UIState['searchFilters']>>) => {
      state.searchFilters = { ...state.searchFilters, ...action.payload };
    },
    clearSearchFilters: (state) => {
      state.searchFilters = {};
    },
    initializeTheme: (state) => {
      const savedTheme = localStorage.getItem('sharebuddy_theme') as 'light' | 'dark';
      if (savedTheme) {
        state.theme = savedTheme;
      }
    },
  },
});

export const {
  setTheme,
  toggleTheme,
  setSidebarOpen,
  toggleSidebar,
  setLoading,
  addNotification,
  removeNotification,
  clearNotifications,
  setModal,
  closeAllModals,
  setSearchQuery,
  setSearchFilters,
  clearSearchFilters,
  initializeTheme,
} = uiSlice.actions;

export default uiSlice.reducer;
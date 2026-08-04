import { create } from 'zustand';
import type { ToastMessage } from '@/types';

/**
 * Editor view mode:
 * - 'edit'   single-page fabric canvas (annotation workspace)
 * - 'scroll' read-only continuous vertical page preview (like a PDF reader)
 */
export type ViewMode = 'edit' | 'scroll';

/**
 * Mobile bottom-sheet panels (<md only). Single field guarantees at most one
 * sheet is open at a time — opening one implicitly closes the rest.
 * Desktop layout ignores this entirely.
 */
export type ActiveSheet = 'draw' | 'shapes' | 'more' | 'properties' | null;

interface UIState {
  sidebarOpen: boolean;
  propertiesPanelOpen: boolean;
  viewMode: ViewMode;
  activeSheet: ActiveSheet;
  loading: boolean;
  loadingMessage: string;
  toasts: ToastMessage[];

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  togglePropertiesPanel: () => void;
  setPropertiesPanelOpen: (open: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  setActiveSheet: (sheet: ActiveSheet) => void;
  setLoading: (loading: boolean, message?: string) => void;
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

let toastCounter = 0;

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  propertiesPanelOpen: true,
  viewMode: 'edit',
  activeSheet: null,
  loading: false,
  loadingMessage: '',
  toasts: [],

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  togglePropertiesPanel: () => set((s) => ({ propertiesPanelOpen: !s.propertiesPanelOpen })),
  setPropertiesPanelOpen: (open) => set({ propertiesPanelOpen: open }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setActiveSheet: (sheet) => set({ activeSheet: sheet }),
  setLoading: (loading, message = '') => set({ loading, loadingMessage: message }),

  addToast: (toast) => {
    const id = `toast-${++toastCounter}`;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    // Auto-remove after duration
    const duration = toast.duration ?? 4000;
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },

  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

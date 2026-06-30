import { create } from 'zustand';

interface NotificationState {
  readIds: string[];
  markAsRead: (id: string) => void;
  markAllAsRead: (ids: string[]) => void;
  clearRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  readIds: [],
  markAsRead: (id) =>
    set((state) => ({
      readIds: state.readIds.includes(id) ? state.readIds : [...state.readIds, id],
    })),
  markAllAsRead: (ids) =>
    set((state) => ({
      readIds: Array.from(new Set([...state.readIds, ...ids])),
    })),
  clearRead: () => set({ readIds: [] }),
}));

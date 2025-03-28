// frontend/src/stores/notificationStore.js
import { create } from "zustand";
import axios from "axios";
import { useAuthStore } from "./authStore";

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
  lastFetched: null,

  fetchNotifications: async (forceRefresh = false) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    // Check if we need to refresh (only if forced or no recent fetch)
    const now = Date.now();
    const lastFetched = get().lastFetched;
    if (!forceRefresh && lastFetched && now - lastFetched < 30000) {
      return; // Don't fetch if less than 30 seconds have passed
    }

    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(
        `http://localhost:8000/api/notifications/?user_id=${user.user_id}`
      );
      const notifications = response.data || [];
      set({
        notifications,
        unreadCount: notifications.filter((n) => !n.is_read).length,
        isLoading: false,
        lastFetched: now,
        error: null,
      });
    } catch (error) {
      set({
        error: error.response?.data?.message || "Failed to fetch notifications",
        isLoading: false,
        notifications: [],
        unreadCount: 0,
      });
    }
  },

  markAsRead: async (notificationId) => {
    const user = useAuthStore.getState().user;
    if (!user) return false;

    // Optimistically update UI
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.notification_id === notificationId ? { ...n, is_read: true } : n
      ),
      unreadCount: state.notifications.filter(
        (n) => n.notification_id !== notificationId && !n.is_read
      ).length,
    }));

    try {
      await axios.put(
        `http://localhost:8000/api/notifications/${notificationId}/read/`,
        { user_id: user.user_id }
      );
      return true;
    } catch (error) {
      // Revert optimistic update on failure
      await get().fetchNotifications(true);
      set({
        error:
          error.response?.data?.message ||
          "Failed to mark notification as read",
      });
      return false;
    }
  },

  markAllAsRead: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return false;

    // Optimistically update UI
    const previousState = get().notifications;
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    }));

    try {
      await axios.put(
        "http://localhost:8000/api/notifications/mark-all-read/",
        { user_id: user.user_id }
      );
      return true;
    } catch (error) {
      // Revert optimistic update on failure
      set({
        notifications: previousState,
        unreadCount: previousState.filter((n) => !n.is_read).length,
        error:
          error.response?.data?.message ||
          "Failed to mark all notifications as read",
      });
      return false;
    }
  },

  deleteNotification: async (notificationId) => {
    const user = useAuthStore.getState().user;
    if (!user) return false;

    // Optimistically update UI
    const previousState = get().notifications;
    set((state) => ({
      notifications: state.notifications.filter(
        (n) => n.notification_id !== notificationId
      ),
      unreadCount: state.notifications.filter(
        (n) => n.notification_id !== notificationId && !n.is_read
      ).length,
    }));

    try {
      await axios.delete(
        `http://localhost:8000/api/notifications/${notificationId}/delete/`,
        { params: { user_id: user.user_id } }
      );
      return true;
    } catch (error) {
      // Revert optimistic update on failure
      set({
        notifications: previousState,
        unreadCount: previousState.filter((n) => !n.is_read).length,
        error: error.response?.data?.message || "Failed to delete notification",
      });
      return false;
    }
  },

  getUnreadNotifications: () => {
    return get().notifications.filter((n) => !n.is_read);
  },

  getReadNotifications: () => {
    return get().notifications.filter((n) => n.is_read);
  },

  clearError: () => set({ error: null }),

  // Reset store state
  reset: () => {
    set({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      error: null,
      lastFetched: null,
    });
  },
}));

// Set up auto-refresh interval
if (typeof window !== "undefined") {
  setInterval(() => {
    const store = useNotificationStore.getState();
    const user = useAuthStore.getState().user;
    if (user && !store.isLoading) {
      store.fetchNotifications(true);
    }
  }, 60000); // Refresh every minute
}

import { create } from "zustand";
import axios from "axios";

const SESSION_KEY = "fedlearn_session";
const TIMEOUT_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

const getStoredSession = () => {
  const sessionData = localStorage.getItem(SESSION_KEY);
  if (!sessionData) return null;

  try {
    const { user, timestamp } = JSON.parse(sessionData);
    const now = new Date().getTime();

    // Check if session has expired
    if (now - timestamp > TIMEOUT_DURATION) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }

    return user;
  } catch (error) {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
};

const updateSessionTimestamp = () => {
  const sessionData = localStorage.getItem(SESSION_KEY);
  if (sessionData) {
    const data = JSON.parse(sessionData);
    data.timestamp = new Date().getTime();
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  }
};

export const useAuthStore = create((set) => {
  // Initialize state from stored session
  const storedUser = getStoredSession();

  // Set up activity listener
  if (typeof window !== "undefined") {
    ["mousedown", "keydown", "scroll", "touchstart"].forEach((event) => {
      window.addEventListener(event, updateSessionTimestamp);
    });
  }

  return {
    user: storedUser,
    isAuthenticated: !!storedUser,
    isLoading: false,
    error: null,

    login: async (username, password) => {
      set({ isLoading: true, error: null });
      try {
        const response = await axios.post("http://localhost:8000/api/login/", {
          username,
          password,
        });

        const { user } = response.data;

        // Store session with timestamp
        localStorage.setItem(
          SESSION_KEY,
          JSON.stringify({
            user,
            timestamp: new Date().getTime(),
          })
        );

        set({ user, isAuthenticated: true, isLoading: false });
        return true;
      } catch (error) {
        set({
          error: error.response?.data?.message || "Login failed",
          isLoading: false,
        });
        return false;
      }
    },

    logout: () => {
      localStorage.removeItem(SESSION_KEY);
      set({ user: null, isAuthenticated: false });
    },

    checkSession: () => {
      const user = getStoredSession();
      set({ user, isAuthenticated: !!user });
    },

    clearError: () => {
      set({ error: null });
    },

    updateUser: (userData) => {
      // Update session storage
      const sessionData = {
        user: userData,
        timestamp: new Date().getTime(),
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));

      // Update store state
      set({ user: userData });
    },

    fetchGDriveConfig: async () => {
      const user = getStoredSession();
      if (!user) return null;

      try {
        const response = await axios.get(
          `http://localhost:8000/api/users/gdrive-config/?user_id=${user.user_id}`
        );
        return response.data.gdrive;
      } catch (error) {
        console.error("Error fetching GDrive config:", error);
        return null;
      }
    },
  };
});

// Set up periodic session check
if (typeof window !== "undefined") {
  setInterval(() => {
    useAuthStore.getState().checkSession();
  }, 60000); // Check every minute
}

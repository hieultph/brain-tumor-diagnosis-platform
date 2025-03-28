import { create } from "zustand";
import axios from "axios";
import { useAuthStore } from "./authStore";

export const useProfileStore = create((set) => ({
  contributions: [],
  isLoading: false,
  error: null,

  fetchContributions: async () => {
    const user = useAuthStore.getState().user;
    set({ isLoading: true });
    try {
      const response = await axios.get(
        `http://localhost:8000/api/contributions/?researcher_id=${user.user_id}`
      );
      set({ contributions: response.data, isLoading: false });
    } catch (error) {
      set({ error: "Failed to fetch contributions", isLoading: false });
    }
  },

  uploadContribution: async (weights, modelId) => {
    const user = useAuthStore.getState().user;
    set({ isLoading: true });
    try {
      const response = await axios.post(
        "http://localhost:8000/api/contributions/upload/",
        {
          researcher_id: user.user_id,
          researcher: user.user_id,
          model: modelId,
          weights,
          status: "pending",
        }
      );

      // Update local state with the new contribution
      set((state) => ({
        contributions: [...state.contributions, response.data],
        isLoading: false,
        error: null,
      }));

      return true;
    } catch (error) {
      set({
        error: error.response?.data?.message || "Failed to upload contribution",
        isLoading: false,
      });
      return false;
    }
  },

  deleteContribution: async (contributionId) => {
    const user = useAuthStore.getState().user;
    try {
      await axios.delete(
        `http://localhost:8000/api/contributions/${contributionId}/delete/?researcher_id=${user.user_id}`
      );
      set((state) => ({
        contributions: state.contributions.filter(
          (c) => c.contribution_id !== contributionId
        ),
        error: null,
      }));
      return true;
    } catch (error) {
      set({
        error: error.response?.data?.message || "Failed to delete contribution",
      });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));

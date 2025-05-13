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
      console.error("Error fetching contributions:", error);
      set({
        error: error.response?.data?.message || "Failed to fetch contributions",
        isLoading: false,
      });
    }
  },

  uploadContribution: async (formData) => {
    const user = useAuthStore.getState().user;

    if (!user.gdrive?.client_id || !user.gdrive?.contributions_url) {
      const error = new Error("Google Drive not configured");
      console.error(error);
      set({ error: error.message });
      throw error;
    }

    set({ isLoading: true });
    try {
      const response = await axios.post(
        "http://localhost:8000/api/contributions/upload/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          timeout: 300000, // Increase timeout to 5 minutes
          maxContentLength: Infinity, // Remove content length restriction
          maxBodyLength: Infinity, // Remove body length restriction
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            console.log(`Upload Progress: ${percentCompleted}%`);
          },
        }
      );

      // Update contributions list with new contribution
      set((state) => ({
        contributions: [...state.contributions, response.data],
        isLoading: false,
        error: null,
      }));

      return true;
    } catch (error) {
      console.error("Contribution upload error:", error.response || error);

      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to upload contribution";

      set({
        error: errorMessage,
        isLoading: false,
      });

      throw new Error(errorMessage);
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
      console.error("Error deleting contribution:", error);
      set({
        error: error.response?.data?.message || "Failed to delete contribution",
      });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));

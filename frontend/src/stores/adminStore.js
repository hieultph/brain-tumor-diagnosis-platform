import { create } from "zustand";
import axios from "axios";
import { useAuthStore } from "./authStore";

export const useAdminStore = create((set, get) => ({
  contributions: [],
  users: [],
  isLoading: false,
  error: null,

  fetchUsers: async () => {
    const user = useAuthStore.getState().user;
    set({ isLoading: true });
    try {
      const response = await axios.get(
        `http://localhost:8000/api/users/?admin_id=${user.user_id}`
      );
      set({ users: response.data, isLoading: false });
    } catch (error) {
      set({ error: "Failed to fetch users", isLoading: false });
    }
  },

  fetchContributions: async () => {
    const user = useAuthStore.getState().user;
    set({ isLoading: true });
    try {
      const url = `http://localhost:8000/api/contributions/review/?admin_id=${user.user_id}&status=all`;
      const response = await axios.get(url);
      set({ contributions: response.data, isLoading: false });
    } catch (error) {
      set({ error: "Failed to fetch contributions", isLoading: false });
    }
  },

  fetchContributionWeights: async (contributionId) => {
    const user = useAuthStore.getState().user;
    try {
      const response = await axios.get(
        `http://localhost:8000/api/contributions/${contributionId}/weights/?user_id=${user.user_id}`
      );
      return response.data.weights;
    } catch (error) {
      set({ error: "Failed to fetch contribution weights" });
      return null;
    }
  },

  deleteContribution: async (contributionId) => {
    const user = useAuthStore.getState().user;

    if (!user || !user.user_id) {
      const error = new Error("User not authenticated");
      set({ error: error.message });
      throw error;
    }

    if (!contributionId) {
      const error = new Error("Invalid contribution ID");
      set({ error: error.message });
      throw error;
    }

    try {
      const response = await axios.delete(
        `http://localhost:8000/api/contributions/${contributionId}/delete/`,
        {
          params: {
            researcher_id: user.user_id,
          },
        }
      );

      if (response.status === 200) {
        // Update local state
        set((state) => ({
          contributions: state.contributions.filter(
            (c) => c.contribution_id !== contributionId
          ),
          error: null,
        }));
        return true;
      }

      throw new Error("Failed to delete contribution");
    } catch (error) {
      console.error("Delete contribution error:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to delete contribution";
      set({ error: errorMessage });
      throw error;
    }
  },

  updateContributionStatus: async (contributionId, status, points) => {
    const user = useAuthStore.getState().user;
    try {
      const response = await axios.put(
        `http://localhost:8000/api/contributions/${contributionId}/update-status/`,
        {
          admin_id: user.user_id,
          status: status,
          points_earned: parseInt(points) || 0,
        }
      );

      set((state) => ({
        contributions: state.contributions.map((contribution) =>
          contribution.contribution_id === contributionId
            ? { ...contribution, status: status, points_earned: points }
            : contribution
        ),
        error: null,
      }));

      return true;
    } catch (error) {
      console.error(
        "Error updating contribution status:",
        error.response?.data || error.message
      );
      set({ error: "Failed to update contribution status" });
      return false;
    }
  },

  createExperimentalModel: async ({
    contribution_ids,
    model_name,
    model_description,
    points_per_contribution,
    target_model_id,
  }) => {
    const user = useAuthStore.getState().user;
    try {
      const response = await axios.post(
        "http://localhost:8000/api/experimental-models/create/",
        {
          admin_id: user.user_id,
          contribution_ids,
          model_name,
          model_description,
          points_per_contribution,
          target_model_id,
        }
      );

      // Refresh contributions after successful creation
      await get().fetchContributions();
      return true;
    } catch (error) {
      console.error(
        "Error creating experimental model:",
        error.response?.data || error.message
      );
      set({ error: "Failed to create experimental model" });
      return false;
    }
  },

  publishModel: async (modelId) => {
    const user = useAuthStore.getState().user;
    try {
      const response = await axios.post(
        "http://localhost:8000/api/models/publish/",
        {
          admin_id: user.user_id,
          model_id: modelId,
        }
      );
      return true;
    } catch (error) {
      set({ error: "Failed to publish model" });
      return false;
    }
  },

  moderateComment: async (commentId, isApproved) => {
    const user = useAuthStore.getState().user;
    try {
      await axios.put(
        `http://localhost:8000/api/comments/${commentId}/moderate/`,
        {
          admin_id: user.user_id,
          is_approved: isApproved,
        }
      );
      return true;
    } catch (error) {
      set({ error: "Failed to moderate comment" });
      return false;
    }
  },

  createFAQ: async (question, answer) => {
    const user = useAuthStore.getState().user;
    try {
      const response = await axios.post(
        "http://localhost:8000/api/faq/create/",
        {
          created_by: user.user_id,
          question,
          answer,
        }
      );
      return response.data;
    } catch (error) {
      set({ error: "Failed to create FAQ" });
      return null;
    }
  },

  deleteUser: async (userId) => {
    const user = useAuthStore.getState().user;
    try {
      await axios.delete(
        `http://localhost:8000/api/users/${userId}/delete/?admin_id=${user.user_id}`
      );
      set((state) => ({
        users: state.users.filter((u) => u.user_id !== userId),
      }));
      return true;
    } catch (error) {
      set({ error: "Failed to delete user" });
      return false;
    }
  },

  assignRole: async (userId, roleId) => {
    const user = useAuthStore.getState().user;
    try {
      const response = await axios.post(
        "http://localhost:8000/api/users/assign-role/",
        {
          admin_id: user.user_id,
          user_id: userId,
          role_id: roleId,
        }
      );
      set((state) => ({
        users: state.users.map((u) =>
          u.user_id === userId ? { ...u, role: roleId } : u
        ),
      }));
      return response.data;
    } catch (error) {
      set({ error: "Failed to assign role" });
      return null;
    }
  },

  clearError: () => set({ error: null }),
}));

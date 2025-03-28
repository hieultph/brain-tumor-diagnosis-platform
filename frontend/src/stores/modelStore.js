import { create } from "zustand";
import axios from "axios";
import { useAuthStore } from "./authStore";

export const useModelStore = create((set) => ({
  models: [],
  experimentalModels: [],
  selectedModel: null,
  modelComments: [],
  isLoading: false,
  error: null,

  createModel: async (modelData) => {
    const user = useAuthStore.getState().user;
    try {
      const response = await axios.post(`http://localhost:8000/api/models/`, {
        admin_id: user.user_id,
        ...modelData,
      });
      return true;
    } catch (error) {
      set({ error: "Failed to create model" });
      return false;
    }
  },

  editModel: async (modelId, modelData) => {
    const user = useAuthStore.getState().user;
    try {
      const response = await axios.put(
        `http://localhost:8000/api/models/${modelId}/`,
        {
          ...modelData,
          admin_id: user.user_id,
        },
        {
          params: {
            user_id: user.user_id,
          },
        }
      );

      // Update the models list with the edited model
      set((state) => ({
        models: state.models.map((model) =>
          model.model_id === modelId ? { ...model, ...response.data } : model
        ),
      }));

      return true;
    } catch (error) {
      set({ error: "Failed to edit model" });
      return false;
    }
  },

  fetchModels: async () => {
    const user = useAuthStore.getState().user;
    set({ isLoading: true });
    try {
      const response = await axios.get(
        `http://localhost:8000/api/models/?user_id=${user.user_id}`
      );
      set({ models: response.data, isLoading: false });
    } catch (error) {
      set({ error: "Failed to fetch models", isLoading: false });
    }
  },

  fetchModelWeights: async (modelId) => {
    const user = useAuthStore.getState().user;
    try {
      const response = await axios.get(
        `http://localhost:8000/api/models/${modelId}/weights/?user_id=${user.user_id}`
      );
      return response.data.weights;
    } catch (error) {
      set({ error: "Failed to fetch model weights" });
      return null;
    }
  },

  deleteModel: async (modelId) => {
    const user = useAuthStore.getState().user;
    try {
      await axios.delete(
        `http://localhost:8000/api/models/${modelId}/delete/?admin_id=${user.user_id}`
      );
      set((state) => ({
        models: state.models.filter((model) => model.model_id !== modelId),
      }));
      return true;
    } catch (error) {
      set({ error: "Failed to delete model" });
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

  fetchExperimentalModels: async () => {
    const user = useAuthStore.getState().user;
    set({ isLoading: true });
    try {
      const response = await axios.get(
        `http://localhost:8000/api/models/?user_id=${user.user_id}&status=experimental`
      );
      set({ experimentalModels: response.data, isLoading: false });
    } catch (error) {
      set({ error: "Failed to fetch experimental models", isLoading: false });
    }
  },

  fetchModelById: async (modelId) => {
    const user = useAuthStore.getState().user;
    set({ isLoading: true });
    try {
      const response = await axios.get(
        `http://localhost:8000/api/models/${modelId}/?user_id=${user.user_id}`
      );
      set({ selectedModel: response.data, isLoading: false });

      // Fetch comments after loading model
      await set.getState().fetchModelComments(modelId);
    } catch (error) {
      set({ error: "Failed to fetch model details", isLoading: false });
    }
  },

  fetchModelComments: async (modelId) => {
    const user = useAuthStore.getState().user;
    set({ isLoading: true });
    try {
      const response = await axios.get(
        `http://localhost:8000/api/comments/${modelId}/?user_id=${user.user_id}`
      );
      set({ modelComments: response.data, isLoading: false });
    } catch (error) {
      set({ error: "Failed to fetch comments", isLoading: false });
    }
  },

  rateModel: async (modelId, rating) => {
    const user = useAuthStore.getState().user;
    try {
      await axios.post("http://localhost:8000/api/rate-model/", {
        user_id: user.user_id,
        user: user.user_id,
        model: modelId,
        rating,
      });
      return true;
    } catch (error) {
      set({ error: "Failed to rate model" });
      return false;
    }
  },

  commentOnModel: async (modelId, comment) => {
    const user = useAuthStore.getState().user;
    try {
      await axios.post("http://localhost:8000/api/comment-model/", {
        user_id: user.user_id,
        user: user.user_id,
        model: modelId,
        comment_text: comment,
      });
      // Refresh comments after posting
      await set.getState().fetchModelComments(modelId);
      return true;
    } catch (error) {
      set({ error: "Failed to post comment" });
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
      // Refresh comments after moderation
      if (set.getState().selectedModel) {
        await set
          .getState()
          .fetchModelComments(set.getState().selectedModel.model_id);
      }
      return true;
    } catch (error) {
      set({ error: "Failed to moderate comment" });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));

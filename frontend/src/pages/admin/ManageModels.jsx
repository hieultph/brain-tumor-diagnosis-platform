import { useEffect, useState } from "react";
import { useModelStore } from "../../stores/modelStore";
import { useAuthStore } from "../../stores/authStore";
import toast from "react-hot-toast";
import { Dialog } from "@headlessui/react";
import { TrashIcon, PlusIcon, PencilIcon } from "@heroicons/react/24/outline";
import Pagination from "../../components/Pagination";
import axios from "axios";

const ITEMS_PER_PAGE = 10;

export default function ManageModels() {
  const {
    models,
    fetchModels,
    publishModel,
    deleteModel,
    createModel,
    editModel,
  } = useModelStore();
  const user = useAuthStore((state) => state.user);
  const [modelStatus, setModelStatus] = useState("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState(null);
  const [editingModel, setEditingModel] = useState(null);
  const [newMetricKey, setNewMetricKey] = useState("");
  const [newMetricValue, setNewMetricValue] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isPublishing, setIsPublishing] = useState(false);
  const [newModel, setNewModel] = useState({
    model_name: "",
    model_description: "",
    model_file: null,
  });

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    await fetchModels();
  };

  const handleFileUpload = async (event, isEditing = false) => {
    if (!user?.gdrive?.client_id || !user?.gdrive?.models_url) {
      toast.error(
        "Please configure Google Drive settings in your profile first"
      );
      return;
    }

    const file = event.target.files[0];
    if (file) {
      if (!file.name.endsWith(".h5")) {
        toast.error("Please select a .h5 model file");
        return;
      }

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await axios.post(
          "http://localhost:8000/api/models/upload-weights/",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
            params: {
              admin_id: user.user_id,
            },
          }
        );

        if (response.data.weights_url) {
          if (isEditing) {
            setEditingModel((prev) => ({
              ...prev,
              weights: { weights_url: response.data.weights_url },
            }));
          } else {
            setNewModel((prev) => ({
              ...prev,
              model_file: file,
              weights: { weights_url: response.data.weights_url },
            }));
          }
          toast.success("Model file uploaded successfully");
        } else {
          throw new Error("Failed to get weights URL");
        }
      } catch (error) {
        console.error("Upload error:", error);
        toast.error(
          error.response?.data?.message || "Failed to upload model file"
        );
      }
    }
  };

  const handleCreateModel = async (e) => {
    e.preventDefault();

    if (!newModel.model_name || !newModel.model_description) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const success = await createModel({
        ...newModel,
        metrics: {
          accuracy: 0,
          precision: 0,
          recall: 0,
          f1_score: 0,
        },
        status: "experimental",
      });

      if (success) {
        toast.success("Model created successfully");
        setIsCreateModalOpen(false);
        setNewModel({
          model_name: "",
          model_description: "",
          model_file: null,
        });
        loadModels();
      } else {
        const error = useModelStore.getState().error;
        toast.error(error || "Failed to create model");
      }
    } catch (error) {
      console.error("Model creation error:", error);
      toast.error("An unexpected error occurred while creating the model");
    }
  };

  const handleEditClick = (model) => {
    setEditingModel({
      ...model,
      weights: null,
    });
    setIsEditModalOpen(true);
  };

  const handleEditModel = async (e) => {
    e.preventDefault();

    if (!editingModel.model_name || !editingModel.model_description) {
      toast.error("Please fill in all required fields");
      return;
    }

    const metrics = editingModel.metrics || {};
    for (const [key, value] of Object.entries(metrics)) {
      if (value < 0 || value > 1) {
        toast.error(`${key} must be between 0 and 1`);
        return;
      }
    }

    const modelData = {
      model_name: editingModel.model_name,
      model_description: editingModel.model_description,
      status: editingModel.status,
      version: editingModel.version,
      metrics: editingModel.metrics,
    };

    if (editingModel.weights) {
      modelData.weights = editingModel.weights;
    }

    const success = await editModel(editingModel.model_id, modelData);

    if (success) {
      toast.success("Model updated successfully");
      setIsEditModalOpen(false);
      setEditingModel(null);
      loadModels();
    } else {
      toast.error("Failed to update model");
    }
  };

  const handlePublish = async (modelId) => {
    const model = models.find((m) => m.model_id === modelId);
    if (!model?.weights?.weights_url) {
      toast.error("No model weights found");
      return;
    }

    if (!user?.gdrive?.client_id || !user?.gdrive?.models_url) {
      toast.error(
        "Please configure Google Drive settings in your profile first"
      );
      return;
    }

    setSelectedModelId(modelId);
    setIsPublishModalOpen(true);
  };

  const confirmPublish = async () => {
    setIsPublishing(true);
    try {
      const model = models.find((m) => m.model_id === selectedModelId);
      if (!model) {
        throw new Error("Model not found");
      }

      // Get the file ID from Google Drive URL
      const fileId = model.weights.weights_url.match(/[-\w]{25,}/);
      if (!fileId) {
        throw new Error("Invalid Google Drive URL");
      }

      // Create proxy URL through backend
      const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId[0]}?alt=media`;
      const proxyUrl = `http://localhost:8000/api/proxy-download/?url=${encodeURIComponent(
        downloadUrl
      )}&user_id=${user.user_id}`;

      // Download the model file
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error("Failed to download model file");
      }

      // Get the blob from the response
      const blob = await response.blob();

      // Create FormData to send the file
      const formData = new FormData();
      formData.append("file", blob, `model_${model.model_id}.h5`);
      formData.append("admin_id", user.user_id);
      formData.append("model_id", model.model_id);

      // Upload to global models and publish
      const publishResponse = await axios.post(
        "http://localhost:8000/api/models/publish/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (publishResponse.data.success) {
        toast.success("Model published successfully");
        setIsPublishModalOpen(false);
        setSelectedModelId(null);
        loadModels();
      } else {
        throw new Error("Failed to publish model");
      }
    } catch (error) {
      console.error("Publish error:", error);
      toast.error(error.message || "Failed to publish model");
    } finally {
      setIsPublishing(false);
      setIsPublishModalOpen(false);
      setSelectedModelId(null);
    }
  };

  const handleDelete = async (modelId) => {
    try {
      if (
        window.confirm(
          "Are you sure you want to delete this model? This will also delete all related contributions, ratings, and comments. This action cannot be undone."
        )
      ) {
        await deleteModel(modelId);
        toast.success("Model and related data deleted successfully");
        await loadModels();
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(error.message || "Failed to delete model");
    }
  };

  const handleAddMetric = () => {
    if (!newMetricKey || !newMetricValue) {
      toast.error("Please enter both metric name and value");
      return;
    }

    const value = parseFloat(newMetricValue);
    if (isNaN(value) || value < 0 || value > 1) {
      toast.error("Metric value must be between 0 and 1");
      return;
    }

    setEditingModel((prev) => ({
      ...prev,
      metrics: {
        ...prev.metrics,
        [newMetricKey]: value,
      },
    }));

    setNewMetricKey("");
    setNewMetricValue("");
  };

  const handleRemoveMetric = (metricKey) => {
    setEditingModel((prev) => {
      const newMetrics = { ...prev.metrics };
      delete newMetrics[metricKey];
      return {
        ...prev,
        metrics: newMetrics,
      };
    });
  };

  const handleMetricChange = (metric, value) => {
    setEditingModel((prev) => ({
      ...prev,
      metrics: {
        ...prev.metrics,
        [metric]: parseFloat(value) || 0,
      },
    }));
  };

  const filteredModels =
    modelStatus === "all"
      ? models
      : models.filter((model) => model.status === modelStatus);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedModels = filteredModels.slice(startIndex, endIndex);

  const getStatusBadge = (status) => {
    const badges = {
      experimental: "bg-yellow-100 text-yellow-800",
      active: "bg-green-100 text-green-800",
      archived: "bg-gray-100 text-gray-800",
    };

    return (
      <span
        className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${badges[status]}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold leading-6 text-gray-900">
            Manage Models
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage experimental and published models for the platform.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
            Create New Model
          </button>
        </div>
      </div>

      {/* Create Model Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              Create New Model
            </h3>
            <form onSubmit={handleCreateModel} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Model Name
                </label>
                <input
                  type="text"
                  value={newModel.model_name}
                  onChange={(e) =>
                    setNewModel((prev) => ({
                      ...prev,
                      model_name: e.target.value,
                    }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={newModel.model_description}
                  onChange={(e) =>
                    setNewModel((prev) => ({
                      ...prev,
                      model_description: e.target.value,
                    }))
                  }
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Model File (.h5)
                </label>
                <input
                  type="file"
                  accept=".h5"
                  onChange={(e) => handleFileUpload(e, false)}
                  className="mt-1 block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-indigo-50 file:text-indigo-700
                    hover:file:bg-indigo-100"
                />
              </div>
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Model Modal */}
      {isEditModalOpen && editingModel && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              Edit Model
            </h3>
            <form onSubmit={handleEditModel} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Model Name
                </label>
                <input
                  type="text"
                  value={editingModel.model_name}
                  onChange={(e) =>
                    setEditingModel((prev) => ({
                      ...prev,
                      model_name: e.target.value,
                    }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={editingModel.model_description}
                  onChange={(e) =>
                    setEditingModel((prev) => ({
                      ...prev,
                      model_description: e.target.value,
                    }))
                  }
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Version
                </label>
                <input
                  type="number"
                  value={editingModel.version}
                  onChange={(e) =>
                    setEditingModel((prev) => ({
                      ...prev,
                      version: parseInt(e.target.value),
                    }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  value={editingModel.status}
                  onChange={(e) =>
                    setEditingModel((prev) => ({
                      ...prev,
                      status: e.target.value,
                    }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="experimental">Experimental</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              {/* Metrics Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-700">
                  Performance Metrics
                </h4>

                {/* Add New Metric */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Metric name"
                    value={newMetricKey}
                    onChange={(e) => setNewMetricKey(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Value (0-1)"
                    step="0.01"
                    min="0"
                    max="1"
                    value={newMetricValue}
                    onChange={(e) => setNewMetricValue(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleAddMetric}
                    className="mt-1 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                </div>

                {/* Existing Metrics */}
                <div className="grid gap-4">
                  {Object.entries(editingModel.metrics || {}).map(
                    ([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700 min-w-[120px]">
                          {key}
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value={value}
                          onChange={(e) =>
                            handleMetricChange(key, e.target.value)
                          }
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveMetric(key)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Update Model File (.h5) - Optional
                </label>
                <input
                  type="file"
                  accept=".h5"
                  onChange={(e) => handleFileUpload(e, true)}
                  className="mt-1 block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-indigo-50 file:text-indigo-700
                    hover:file:bg-indigo-100"
                />
              </div>
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingModel(null);
                  }}
                  className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Publish Confirmation Modal */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              Publish Model
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to publish this model? This will make it
              available to all users and notify them of the new version.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsPublishModalOpen(false);
                  setSelectedModelId(null);
                }}
                className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                disabled={isPublishing}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPublish}
                disabled={isPublishing}
                className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:bg-indigo-400"
              >
                {isPublishing ? "Publishing..." : "Confirm Publish"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="sm:flex sm:items-center">
            <div className="sm:flex-auto">
              <h3 className="text-base font-semibold leading-6 text-gray-900">
                Models
              </h3>
            </div>
            <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
              <select
                value={modelStatus}
                onChange={(e) => setModelStatus(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="all">All Status</option>
                <option value="experimental">Experimental</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="mt-8 flow-root">
            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr>
                      <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                        Name
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Version
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Description
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Created Date
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Published Date
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Accuracy
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedModels.map((model) => (
                      <tr key={model.model_id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                          {model.model_name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          v{model.version}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500">
                          {model.model_description}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {new Date(model.created_date).toLocaleDateString()}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {model.published_date
                            ? new Date(
                                model.published_date
                              ).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {(model.metrics.accuracy * 100).toFixed(1)}%
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {getStatusBadge(model.status)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <div className="flex space-x-4">
                            <button
                              onClick={() => handleEditClick(model)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            {model.status === "experimental" && (
                              <button
                                onClick={() => handlePublish(model.model_id)}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                Publish
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(model.model_id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination
                  totalItems={filteredModels.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

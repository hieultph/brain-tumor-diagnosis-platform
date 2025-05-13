import { useState, useEffect } from "react";
import { useProfileStore } from "../../stores/profileStore";
import { useModelStore } from "../../stores/modelStore";
import { useAuthStore } from "../../stores/authStore";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

export default function UploadContribution() {
  const { uploadContribution } = useProfileStore();
  const { models, fetchModels } = useModelStore();
  const user = useAuthStore((state) => state.user);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchModels();
  }, []);

  // Check if Google Drive is configured
  const isGDriveConfigured =
    user?.gdrive?.client_id &&
    user?.gdrive?.client_secret &&
    user?.gdrive?.refresh_token &&
    user?.gdrive?.contributions_url;

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file extension
      if (!file.name.endsWith(".h5")) {
        toast.error("Please select a .h5 model file");
        setSelectedFile(null);
        event.target.value = null; // Reset file input
        return;
      }

      // Validate file size (max 100MB)
      if (file.size > 100 * 1024 * 1024) {
        toast.error("File size must be less than 100MB");
        setSelectedFile(null);
        event.target.value = null; // Reset file input
        return;
      }

      setSelectedFile(file);
      toast.success("Model file selected successfully");
    }
  };

  const handleUpload = async () => {
    if (!isGDriveConfigured) {
      toast.error(
        "Please configure Google Drive settings in your profile first"
      );
      return;
    }

    if (!selectedFile) {
      toast.error("Please select a model file");
      return;
    }

    if (!selectedModelId) {
      toast.error("Please select a target model");
      return;
    }

    setIsUploading(true);
    try {
      // Create FormData object
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("researcher_id", user.user_id);
      formData.append("model", selectedModelId);

      const success = await uploadContribution(formData);
      if (success) {
        toast.success("Contribution uploaded successfully");
        setSelectedFile(null);
        setSelectedModelId("");
        // Reset file input
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) {
          fileInput.value = "";
        }
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload contribution");
    } finally {
      setIsUploading(false);
    }
  };

  // Filter models to show only active and experimental ones
  const availableModels = models.filter((model) =>
    ["active", "experimental"].includes(model.status)
  );

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold leading-6 text-gray-900">
            Upload Contribution
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Share your locally trained model to contribute to the global model
          </p>
        </div>
      </div>

      {!isGDriveConfigured ? (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Google Drive configuration is required to upload contributions.{" "}
                <Link
                  to="/profile"
                  className="font-medium underline text-yellow-700 hover:text-yellow-600"
                >
                  Configure Google Drive in your profile
                </Link>
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-base font-semibold leading-6 text-gray-900">
              Model File
            </h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>Upload your trained model in .h5 format.</p>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="model"
                  className="block text-sm font-medium text-gray-700"
                >
                  Target Model
                </label>
                <select
                  id="model"
                  value={selectedModelId}
                  onChange={(e) => setSelectedModelId(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Select a model</option>
                  {availableModels.map((model) => (
                    <option key={model.model_id} value={model.model_id}>
                      {model.model_name} (v{model.version}) - {model.status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="modelFile"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Model File (.h5)
                </label>
                <input
                  id="modelFile"
                  type="file"
                  accept=".h5"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-indigo-50 file:text-indigo-700
                    hover:file:bg-indigo-100"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Maximum file size: 100MB
                </p>
              </div>
            </div>

            <div className="mt-5">
              <button
                type="button"
                onClick={handleUpload}
                disabled={isUploading || !selectedFile || !selectedModelId}
                className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-gray-300"
              >
                {isUploading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Uploading...
                  </>
                ) : (
                  "Upload Contribution"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-base font-semibold leading-6 text-gray-900">
            Guidelines for Contributing
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <ul className="list-disc pl-5 space-y-2">
              <li>Upload your model in .h5 format</li>
              <li>Only upload models trained on approved datasets</li>
              <li>Contributions will be reviewed by administrators</li>
              <li>
                Accepted contributions earn points based on quality and impact
              </li>
              <li>
                You can track the status of your contributions in your profile
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

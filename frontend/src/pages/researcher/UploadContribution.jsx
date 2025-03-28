import { useState, useEffect } from "react";
import { useProfileStore } from "../../stores/profileStore";
import { useModelStore } from "../../stores/modelStore";
import toast from "react-hot-toast";

export default function UploadContribution() {
  const { uploadContribution } = useProfileStore();
  const { models, fetchModels } = useModelStore();
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    // Fetch active and experimental models
    fetchModels();
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (!data.weights || !data.architecture) {
            toast.error(
              "Invalid model file format. File must contain weights and architecture."
            );
            return;
          }
          setSelectedFile(data);
          toast.success("Model file loaded successfully");
        } catch (error) {
          toast.error("Invalid JSON file");
          setSelectedFile(null);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleUpload = async () => {
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
      const success = await uploadContribution(selectedFile, selectedModelId);
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
        toast.error("Failed to upload contribution");
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold leading-6 text-gray-900">
            Upload Contribution
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Share your locally trained model weights to contribute to the global
            model
          </p>
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-base font-semibold leading-6 text-gray-900">
            Model Weights
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>Upload your model weights in JSON format.</p>
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
                {models.map((model) => (
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
                Model File (JSON)
              </label>
              <input
                id="modelFile"
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-indigo-50 file:text-indigo-700
                  hover:file:bg-indigo-100"
              />
            </div>
          </div>

          <div className="mt-5">
            <button
              type="button"
              onClick={handleUpload}
              disabled={isUploading || !selectedFile || !selectedModelId}
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-gray-300"
            >
              {isUploading ? "Uploading..." : "Upload Contribution"}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-base font-semibold leading-6 text-gray-900">
            Guidelines for Contributing
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <ul className="list-disc pl-5 space-y-2">
              <li>Ensure your model weights are properly formatted in JSON</li>
              <li>Only upload weights trained on approved datasets</li>
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

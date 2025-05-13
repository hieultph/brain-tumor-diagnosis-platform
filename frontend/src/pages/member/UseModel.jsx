import { useState, useEffect } from "react";
import { useModelStore } from "../../stores/modelStore";
import axios from "axios";
import toast from "react-hot-toast";

export default function UseModel() {
  const { models, fetchModels } = useModelStore();
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const loadModels = async () => {
      await fetchModels();
    };
    loadModels();
  }, []);

  // Get active models only
  const activeModels = models.filter((model) => model.status === "active");

  // Set default model (latest version)
  useEffect(() => {
    if (activeModels.length > 0 && !selectedModel) {
      const latestModel = activeModels.reduce((latest, current) => {
        return latest.version > current.version ? latest : current;
      });
      setSelectedModel(latestModel);
    }
  }, [activeModels]);

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);

      setSelectedImage(file);
      setPrediction(null);
    }
  };

  const handlePredict = async () => {
    if (!selectedImage || !selectedModel) {
      toast.error("Please select both a model and an image");
      return;
    }

    setIsProcessing(true);
    setPrediction(null);

    try {
      // Create form data
      const formData = new FormData();
      formData.append("image", selectedImage);
      formData.append("model_id", selectedModel.model_id);

      // Make prediction request
      const response = await axios.post(
        "http://localhost:8000/api/predict/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setPrediction(response.data);
      toast.success("Prediction completed successfully");
    } catch (error) {
      console.error("Prediction error:", error);
      toast.error("Failed to process image");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold leading-6 text-gray-900">
            Use Model
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Upload an MRI scan to get predictions from the global model
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-base font-semibold leading-6 text-gray-900">
              Select Model & Upload Image
            </h3>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Model Version
                </label>
                <select
                  value={selectedModel?.model_id || ""}
                  onChange={(e) => {
                    const model = activeModels.find(
                      (m) => m.model_id === parseInt(e.target.value)
                    );
                    setSelectedModel(model);
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  {activeModels.map((model) => (
                    <option key={model.model_id} value={model.model_id}>
                      {model.model_name} (v{model.version})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Upload Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="mt-1 block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-indigo-50 file:text-indigo-700
                    hover:file:bg-indigo-100"
                />
              </div>

              {imagePreview && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Preview
                  </p>
                  <img
                    src={imagePreview}
                    alt="Selected scan"
                    className="max-w-full h-auto rounded-lg"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={handlePredict}
                disabled={isProcessing || !selectedImage || !selectedModel}
                className="mt-4 inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-gray-300"
              >
                {isProcessing ? "Processing..." : "Get Prediction"}
              </button>
            </div>
          </div>
        </div>

        {prediction && (
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-base font-semibold leading-6 text-gray-900">
                Prediction Results
              </h3>

              <div className="mt-4 space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">
                    Predicted Class
                  </h4>
                  <p className="mt-1 text-2xl font-semibold text-gray-900 capitalize">
                    {prediction.prediction}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">
                    Confidence Scores
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(prediction.confidence_scores).map(
                      ([label, score]) => (
                        <div key={label} className="flex items-center">
                          <span className="w-24 text-sm capitalize">
                            {label}:
                          </span>
                          <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-600 rounded-full"
                              style={{ width: `${score * 100}%` }}
                            />
                          </div>
                          <span className="ml-2 text-sm text-gray-600">
                            {(score * 100).toFixed(1)}%
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

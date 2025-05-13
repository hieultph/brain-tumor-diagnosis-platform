import React, { useState, useEffect } from "react";
import { useAuthStore } from "../stores/authStore";
import axios from "axios";
import toast from "react-hot-toast";

export default function GoogleDriveSetup() {
  const { user, updateUser, fetchGDriveConfig } = useAuthStore();
  const [gdriveConfig, setGdriveConfig] = useState({
    client_id: "",
    client_secret: "",
    refresh_token: "",
    contributions_url: "",
    models_url: "",
  });
  const [isValidating, setIsValidating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGDriveConfig();
  }, []);

  const loadGDriveConfig = async () => {
    setIsLoading(true);
    try {
      const config = await fetchGDriveConfig();
      if (config) {
        setGdriveConfig({
          client_id: config.client_id || "",
          client_secret: config.client_secret || "",
          refresh_token: config.refresh_token || "",
          contributions_url: config.contributions_url || "",
          models_url: config.models_url || "",
        });
      }
    } catch (error) {
      console.error("Error loading GDrive config:", error);
      toast.error("Failed to load Google Drive configuration");
    } finally {
      setIsLoading(false);
    }
  };

  const validateGoogleDriveUrl = (url) => {
    if (!url) return true; // Empty URL is allowed
    const driveUrlPattern =
      /^https:\/\/drive\.google\.com\/(drive\/folders\/|folders\/)[a-zA-Z0-9-_]+$/;
    return driveUrlPattern.test(url);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsValidating(true);

    try {
      // Validate required fields
      if (
        !gdriveConfig.client_id ||
        !gdriveConfig.client_secret ||
        !gdriveConfig.refresh_token
      ) {
        toast.error("Please fill in all required fields");
        return;
      }

      // Validate folder URLs if provided
      if (
        gdriveConfig.contributions_url &&
        !validateGoogleDriveUrl(gdriveConfig.contributions_url)
      ) {
        toast.error("Invalid contributions folder URL format");
        return;
      }

      if (
        gdriveConfig.models_url &&
        !validateGoogleDriveUrl(gdriveConfig.models_url)
      ) {
        toast.error("Invalid models folder URL format");
        return;
      }

      const response = await axios.post(
        "http://localhost:8000/api/users/gdrive-setup/",
        {
          user_id: user.user_id,
          gdrive: gdriveConfig,
        }
      );

      if (response.data.success) {
        toast.success("Google Drive settings updated successfully");
        // Update the user state with new gdrive config
        updateUser({ ...user, gdrive: gdriveConfig });
      }
    } catch (error) {
      console.error("Google Drive setup error:", error);
      toast.error(
        error.response?.data?.message ||
          "Failed to update Google Drive settings. Please check your credentials and try again."
      );
    } finally {
      setIsValidating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">
          Google Drive Configuration
        </h3>
        <div className="mt-2 max-w-xl text-sm text-gray-500">
          <p>Configure your Google Drive settings for storing model weights.</p>
          <p className="mt-1 text-xs text-red-600">* Required fields</p>
        </div>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Client ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={gdriveConfig.client_id}
              onChange={(e) =>
                setGdriveConfig((prev) => ({
                  ...prev,
                  client_id: e.target.value,
                }))
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              From Google Cloud Console OAuth 2.0 credentials
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Client Secret <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={gdriveConfig.client_secret}
              onChange={(e) =>
                setGdriveConfig((prev) => ({
                  ...prev,
                  client_secret: e.target.value,
                }))
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Refresh Token <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={gdriveConfig.refresh_token}
              onChange={(e) =>
                setGdriveConfig((prev) => ({
                  ...prev,
                  refresh_token: e.target.value,
                }))
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Contributions Folder URL
            </label>
            <input
              type="text"
              value={gdriveConfig.contributions_url}
              onChange={(e) =>
                setGdriveConfig((prev) => ({
                  ...prev,
                  contributions_url: e.target.value,
                }))
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="https://drive.google.com/drive/folders/your-folder-id"
            />
            <p className="mt-1 text-xs text-gray-500">
              Full URL to your Google Drive folder for storing contributions
            </p>
          </div>

          {user?.role === 4 && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Models Folder URL
              </label>
              <input
                type="text"
                value={gdriveConfig.models_url}
                onChange={(e) =>
                  setGdriveConfig((prev) => ({
                    ...prev,
                    models_url: e.target.value,
                  }))
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="https://drive.google.com/drive/folders/your-folder-id"
              />
              <p className="mt-1 text-xs text-gray-500">
                Full URL to your Google Drive folder for storing models
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isValidating}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-300"
          >
            {isValidating ? "Validating..." : "Save Settings"}
          </button>
        </form>
      </div>
    </div>
  );
}

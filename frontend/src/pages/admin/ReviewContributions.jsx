import { useEffect, useState } from "react";
import { useAdminStore } from "../../stores/adminStore";
import { useModelStore } from "../../stores/modelStore";
import { useAuthStore } from "../../stores/authStore";
import toast from "react-hot-toast";
import { Dialog } from "@headlessui/react";
import Pagination from "../../components/Pagination";
import { ArrowDownTrayIcon, TrashIcon } from "@heroicons/react/24/outline";

const ITEMS_PER_PAGE = 10;

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  aggregated: "bg-blue-100 text-blue-800",
  error: "bg-gray-100 text-gray-800",
};

export default function ReviewContributions() {
  const {
    contributions,
    fetchContributions,
    updateContributionStatus,
    fetchContributionWeights,
    deleteContribution,
  } = useAdminStore();
  const { models, fetchModels } = useModelStore();
  const user = useAuthStore((state) => state.user);
  const [selectedContributions, setSelectedContributions] = useState([]);
  const [pointsToAward, setPointsToAward] = useState(10);
  const [statusFilter, setStatusFilter] = useState("all");
  const [modelFilter, setModelFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [downloadingIds, setDownloadingIds] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([fetchContributions(), fetchModels()]);
  };

  // Convert Google Drive view URL to direct download URL
  const getDirectDownloadUrl = (url) => {
    // Extract file ID from Google Drive URL
    const fileId = url.match(/[-\w]{25,}/);
    if (!fileId) return null;

    // Return the export download URL
    return `https://www.googleapis.com/drive/v3/files/${fileId[0]}?alt=media`;
  };

  const handleDownloadSelected = async () => {
    if (selectedContributions.length === 0) {
      toast.error("Please select contributions to download");
      return;
    }

    try {
      // Create a directory picker dialog
      const dirHandle = await window.showDirectoryPicker();

      // Download each selected contribution
      for (const contributionId of selectedContributions) {
        setDownloadingIds((prev) => [...prev, contributionId]);
        try {
          // Get the weights data from the API
          const weights = await fetchContributionWeights(contributionId);
          if (!weights?.weights_url) {
            throw new Error("No weights URL found for contribution");
          }

          // Get the direct download URL
          const downloadUrl = getDirectDownloadUrl(weights.weights_url);
          if (!downloadUrl) {
            throw new Error("Invalid Google Drive URL");
          }

          // Create a proxy URL through our backend
          const proxyUrl = `http://localhost:8000/api/proxy-download/?url=${encodeURIComponent(
            downloadUrl
          )}&user_id=${user.user_id}`;

          // Fetch the file
          const response = await fetch(proxyUrl);

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          // Get the blob from the response
          const blob = await response.blob();

          // Create a file in the selected directory
          const contribution = contributions.find(
            (c) => c.contribution_id === contributionId
          );
          const fileName = `contribution_${contributionId}_${
            contribution?.model_details?.model_name || "unknown"
          }.h5`;
          const fileHandle = await dirHandle.getFileHandle(fileName, {
            create: true,
          });
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();

          toast.success(`Downloaded: ${fileName}`);
        } catch (error) {
          console.error(
            `Error downloading contribution ${contributionId}:`,
            error
          );
          toast.error(
            `Failed to download contribution ${contributionId}: ${error.message}`
          );
        } finally {
          setDownloadingIds((prev) =>
            prev.filter((id) => id !== contributionId)
          );
        }
      }

      toast.success("All selected contributions downloaded successfully");
    } catch (error) {
      if (error.name === "AbortError") {
        toast.error("Directory selection was cancelled");
      } else {
        console.error("Download error:", error);
        toast.error(`Failed to download contributions: ${error.message}`);
      }
    }

    // Clear selection after downloads are complete
    setSelectedContributions([]);
  };

  const handleDeleteContribution = async (contributionId) => {
    if (!contributionId) {
      toast.error("Invalid contribution ID");
      return;
    }

    try {
      setIsDeleting(true);
      setDeleteConfirmationId(null);

      const success = await deleteContribution(contributionId);

      if (success) {
        toast.success("Contribution deleted successfully");
        // Refresh the contributions list
        await loadData();
      } else {
        throw new Error("Failed to delete contribution");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(
        error.response?.data?.message || "Failed to delete contribution"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadContribution = async (contributionId) => {
    setDownloadingIds((prev) => [...prev, contributionId]);
    try {
      // Get the weights data from the API
      const weights = await fetchContributionWeights(contributionId);
      if (!weights?.weights_url) {
        // Update status to error if no weights URL found
        await updateContributionStatus(contributionId, "error", 0);
        throw new Error("No weights URL found for contribution");
      }

      // Get the direct download URL
      const downloadUrl = getDirectDownloadUrl(weights.weights_url);
      if (!downloadUrl) {
        await updateContributionStatus(contributionId, "error", 0);
        throw new Error("Invalid Google Drive URL");
      }

      // Create a proxy URL through our backend
      const proxyUrl = `http://localhost:8000/api/proxy-download/?url=${encodeURIComponent(
        downloadUrl
      )}&user_id=${user.user_id}`;

      // Fetch the file
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        await updateContributionStatus(contributionId, "error", 0);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Get the blob from the response
      const blob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `contribution_${contributionId}.h5`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Download started successfully");
    } catch (error) {
      console.error("Download error:", error);
      toast.error(`Failed to download: ${error.message}`);
    } finally {
      setDownloadingIds((prev) => prev.filter((id) => id !== contributionId));
    }
  };

  // Updated filtering logic
  const filteredContributions = contributions.filter((contribution) => {
    if (!contribution) return false;

    const matchesStatus =
      statusFilter === "all" || contribution.status === statusFilter;
    const matchesModel =
      modelFilter === "all" ||
      (contribution.model_details &&
        contribution.model_details.model_id.toString() === modelFilter);
    return matchesStatus && matchesModel;
  });

  // Pagination logic
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedContributions = filteredContributions.slice(
    startIndex,
    endIndex
  );

  const handleStatusUpdate = async (contributionId, newStatus) => {
    const success = await updateContributionStatus(
      contributionId,
      newStatus,
      pointsToAward
    );
    if (success) {
      toast.success(`Contribution status updated to ${newStatus}`);
      await loadData();
    } else {
      toast.error("Failed to update contribution status");
    }
  };

  const getModelInfo = (modelDetails) => {
    if (!modelDetails) return "No target model";
    return `${modelDetails.model_name || "Unnamed Model"} (v${
      modelDetails.version
    })`;
  };

  const DeleteConfirmationDialog = ({ isOpen, onClose, onConfirm }) => (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-10 overflow-y-auto"
    >
      <div className="flex items-center justify-center min-h-screen">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
        <div className="relative bg-white rounded-lg p-6 max-w-sm mx-auto">
          <Dialog.Title className="text-lg font-medium text-gray-900">
            Delete Contribution
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-gray-500">
            Are you sure you want to delete this contribution? This action
            cannot be undone.
          </Dialog.Description>
          <div className="mt-4 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Review Contributions
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Review and manage contributions from researchers.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            onClick={handleDownloadSelected}
            disabled={selectedContributions.length === 0}
            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-gray-300"
          >
            <ArrowDownTrayIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
            Download Selected ({selectedContributions.length})
          </button>
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="sm:flex sm:items-center">
            <div className="sm:flex-auto">
              <h3 className="text-base font-semibold leading-6 text-gray-900">
                Contributions
              </h3>
            </div>
            <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex space-x-4">
              <div>
                <select
                  value={modelFilter}
                  onChange={(e) => setModelFilter(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="all">All Models</option>
                  {models.map((model) => (
                    <option key={model.model_id} value={model.model_id}>
                      {model.model_name} (v{model.version})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="aggregated">Aggregated</option>
                  <option value="error">Error</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <label className="block text-sm font-medium text-gray-700">
                  Points:
                </label>
                <input
                  type="number"
                  value={pointsToAward}
                  onChange={(e) => setPointsToAward(parseInt(e.target.value))}
                  className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 flow-root">
            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            if (e.target.checked) {
                              const validIds = filteredContributions
                                .filter((c) =>
                                  ["approved", "aggregated"].includes(c.status)
                                )
                                .map((c) => c.contribution_id);
                              setSelectedContributions(validIds);
                            } else {
                              setSelectedContributions([]);
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </th>
                      <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                        ID
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Researcher
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Target Model
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Upload Date
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Points
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedContributions.map((contribution) => (
                      <tr key={contribution.contribution_id}>
                        <td className="px-3 py-4 text-sm text-gray-500">
                          {["approved", "aggregated"].includes(
                            contribution.status
                          ) && (
                            <input
                              type="checkbox"
                              checked={selectedContributions.includes(
                                contribution.contribution_id
                              )}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedContributions([
                                    ...selectedContributions,
                                    contribution.contribution_id,
                                  ]);
                                } else {
                                  setSelectedContributions(
                                    selectedContributions.filter(
                                      (id) =>
                                        id !== contribution.contribution_id
                                    )
                                  );
                                }
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          )}
                        </td>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                          {contribution.contribution_id}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {contribution.researcher_name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {getModelInfo(contribution.model_details)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {new Date(
                            contribution.upload_date
                          ).toLocaleDateString()}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <select
                            value={contribution.status}
                            onChange={(e) =>
                              handleStatusUpdate(
                                contribution.contribution_id,
                                e.target.value
                              )
                            }
                            className={`rounded-md border-0 px-2 py-1 text-sm font-medium ${
                              STATUS_COLORS[contribution.status]
                            }`}
                          >
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="aggregated">Aggregated</option>
                            <option value="error">Error</option>
                          </select>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {contribution.points_earned}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-4">
                            {downloadingIds.includes(
                              contribution.contribution_id
                            ) ? (
                              <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                            ) : (
                              <button
                                onClick={() =>
                                  handleDownloadContribution(
                                    contribution.contribution_id
                                  )
                                }
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                <ArrowDownTrayIcon className="h-5 w-5" />
                              </button>
                            )}
                            <button
                              onClick={() =>
                                setDeleteConfirmationId(
                                  contribution.contribution_id
                                )
                              }
                              disabled={isDeleting}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50"
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
                  totalItems={filteredContributions.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <DeleteConfirmationDialog
        isOpen={!!deleteConfirmationId}
        onClose={() => setDeleteConfirmationId(null)}
        onConfirm={() => handleDeleteContribution(deleteConfirmationId)}
      />
    </div>
  );
}

import { useEffect, useState } from "react";
import { useAdminStore } from "../../stores/adminStore";
import { useModelStore } from "../../stores/modelStore";
import toast from "react-hot-toast";
import { Dialog } from "@headlessui/react";
import Pagination from "../../components/Pagination";

const ITEMS_PER_PAGE = 10;

export default function ReviewContributions() {
  const {
    contributions,
    fetchContributions,
    updateContributionStatus,
    createExperimentalModel,
  } = useAdminStore();
  const { models, fetchModels } = useModelStore();
  const [selectedContributions, setSelectedContributions] = useState([]);
  const [pointsToAward, setPointsToAward] = useState(10);
  const [statusFilter, setStatusFilter] = useState("all");
  const [modelFilter, setModelFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetModel, setTargetModel] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [newModel, setNewModel] = useState({
    model_name: "",
    model_description: "",
    version: 1,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([fetchContributions(), fetchModels()]);
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

  const handleCreateExperimental = () => {
    if (selectedContributions.length === 0) {
      toast.error("Please select contributions to aggregate");
      return;
    }

    const selectedContributionDetails = contributions.filter((c) =>
      selectedContributions.includes(c.contribution_id)
    );

    // Check if all selected contributions target the same model
    const targetModelId = selectedContributionDetails[0].model_details.model_id;
    const hasMultipleTargets = selectedContributionDetails.some(
      (c) => c.model_details.model_id !== targetModelId
    );

    if (hasMultipleTargets) {
      toast.error("All selected contributions must target the same model");
      return;
    }

    const hasInvalidContributions = selectedContributionDetails.some(
      (c) => !["approved", "aggregated"].includes(c.status)
    );

    if (hasInvalidContributions) {
      toast.error("Only approved or aggregated contributions can be used");
      return;
    }

    // Get target model and set initial values
    const targetModelDetails = models.find((m) => m.model_id === targetModelId);
    if (!targetModelDetails) {
      toast.error("Target model not found");
      return;
    }

    setTargetModel(targetModelDetails);
    setNewModel({
      model_name: `${targetModelDetails.model_name} (Experimental)`,
      model_description: targetModelDetails.model_description,
      version: targetModelDetails.version + 1,
    });

    setIsModalOpen(true);
  };

  const handleConfirmCreate = async (e) => {
    e.preventDefault();

    try {
      if (!newModel.model_name || !newModel.model_description) {
        toast.error("Model name and description are required");
        return;
      }

      if (!targetModel) {
        toast.error("Target model not found");
        return;
      }

      const success = await createExperimentalModel({
        contribution_ids: selectedContributions,
        model_name: newModel.model_name,
        model_description: newModel.model_description,
        points_per_contribution: pointsToAward,
        target_model_id: targetModel.model_id,
      });

      if (success) {
        toast.success("Experimental model created successfully");
        setSelectedContributions([]);
        setIsModalOpen(false);
        await loadData();
      } else {
        toast.error("Failed to create experimental model");
      }
    } catch (error) {
      toast.error(`Failed to create model: ${error.message}`);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      aggregated: "bg-blue-100 text-blue-800",
    };

    return (
      <span
        className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${badges[status]}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getModelInfo = (modelDetails) => {
    if (!modelDetails) return "No target model";
    return `${modelDetails.model_name || "Unnamed Model"} (v${
      modelDetails.version
    })`;
  };

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
            onClick={handleCreateExperimental}
            disabled={selectedContributions.length === 0}
            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-gray-300"
          >
            Create Experimental Model
          </button>
        </div>
      </div>

      {/* Create Experimental Model Modal */}
      {isModalOpen && targetModel && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              Create Experimental Model
            </h3>
            <form onSubmit={handleConfirmCreate} className="space-y-4">
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
                  Version
                </label>
                <input
                  type="number"
                  value={newModel.version}
                  disabled
                  className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <input
                  type="text"
                  value="experimental"
                  disabled
                  className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Target Model
                </label>
                <input
                  type="text"
                  value={`${targetModel.model_name} (v${targetModel.version})`}
                  disabled
                  className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Selected Contributions
                </label>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedContributions.length} contributions selected for
                  aggregation
                </p>
              </div>
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setNewModel({
                      model_name: "",
                      model_description: "",
                      version: 1,
                    });
                  }}
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
                            className="rounded-md border-gray-300 text-sm"
                          >
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="aggregated">Aggregated</option>
                          </select>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {contribution.points_earned}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {getStatusBadge(contribution.status)}
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
    </div>
  );
}

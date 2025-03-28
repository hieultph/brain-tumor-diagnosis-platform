import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useModelStore } from "../stores/modelStore";
import { useAuthStore } from "../stores/authStore";
import { StarIcon } from "@heroicons/react/20/solid";
import {
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

export default function ModelDetails() {
  const { id } = useParams();
  const {
    selectedModel,
    modelComments,
    fetchModelById,
    fetchModelComments,
    rateModel,
    commentOnModel,
    moderateComment,
    fetchModelWeights,
  } = useModelStore();
  const user = useAuthStore((state) => state.user);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const loadModelData = async () => {
      await fetchModelById(id);
      await fetchModelComments(id);
    };
    loadModelData();
  }, [id]);

  const handleDownload = async () => {
    if (!selectedModel) return;

    setIsDownloading(true);
    try {
      // Fetch weights separately
      const weights = await fetchModelWeights(selectedModel.model_id);
      if (!weights) {
        toast.error("Failed to fetch model weights");
        return;
      }

      // Create a complete model object with metadata
      const modelData = {
        model_name: selectedModel.model_name,
        version: selectedModel.version,
        description: selectedModel.model_description,
        created_date: selectedModel.created_date,
        metrics: selectedModel.metrics,
        weights: weights,
      };

      // Create a Blob containing the model data
      const modelBlob = new Blob([JSON.stringify(modelData, null, 2)], {
        type: "application/json",
      });

      // Create a download link and trigger it
      const downloadUrl = URL.createObjectURL(modelBlob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${selectedModel.model_name}_v${selectedModel.version}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      toast.success("Model downloaded successfully");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download model");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRating = async (value) => {
    const success = await rateModel(id, value);
    if (success) {
      setRating(value);
      toast.success("Rating submitted successfully");
    } else {
      toast.error("Failed to submit rating");
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    const success = await commentOnModel(id, comment);
    if (success) {
      setComment("");
      toast.success("Comment submitted successfully");
      // Refresh comments after posting
      await fetchModelComments(id);
    } else {
      toast.error("Failed to submit comment");
    }
  };

  const handleModerateComment = async (commentId, isApproved) => {
    const success = await moderateComment(commentId, isApproved);
    if (success) {
      toast.success(
        `Comment ${isApproved ? "approved" : "rejected"} successfully`
      );
      // Refresh comments after moderation
      await fetchModelComments(id);
    } else {
      toast.error("Failed to moderate comment");
    }
  };

  if (!selectedModel) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          {selectedModel.model_name}
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Version {selectedModel.version} • Published on{" "}
          {new Date(selectedModel.published_date).toLocaleDateString()}
        </p>
        <p className="mt-2 text-base text-gray-700">
          {selectedModel.model_description}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Performance Metrics
          </h3>
          <dl className="mt-5 grid grid-cols-1 gap-5">
            {Object.entries(selectedModel.metrics).map(([key, value]) => (
              <div
                key={key}
                className="px-4 py-5 bg-gray-50 shadow rounded-lg overflow-hidden sm:p-6"
              >
                <dt className="text-sm font-medium text-gray-500 truncate">
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">
                  {(value * 100).toFixed(1)}%
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Actions
          </h3>
          <div className="mt-6 space-y-4">
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-gray-300"
            >
              <ArrowDownTrayIcon
                className="-ml-0.5 mr-1.5 h-5 w-5"
                aria-hidden="true"
              />
              {isDownloading ? "Downloading..." : "Download Model"}
            </button>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Rate this model
              </label>
              <div className="mt-1 flex items-center">
                {[1, 2, 3, 4, 5].map((value) => (
                  <StarIcon
                    key={value}
                    className={`h-5 w-5 cursor-pointer ${
                      value <= rating ? "text-yellow-400" : "text-gray-300"
                    }`}
                    onClick={() => handleRating(value)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
          Comments
        </h3>
        <form onSubmit={handleComment} className="space-y-4">
          <div>
            <label htmlFor="comment" className="sr-only">
              Add a comment
            </label>
            <textarea
              id="comment"
              name="comment"
              rows={3}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="Add your comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Post Comment
          </button>
        </form>

        <div className="mt-8 space-y-4">
          {modelComments && modelComments.length > 0 ? (
            modelComments.map((comment) => (
              <div
                key={comment.comment_id}
                className={`bg-gray-50 rounded-lg p-4 ${
                  !comment.is_approved && user?.role === 4
                    ? "border border-yellow-300"
                    : ""
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {comment.user.username}
                    </p>
                    <p className="mt-1 text-sm text-gray-700">
                      {comment.comment_text}
                    </p>
                    <p className="mt-2 text-xs text-gray-500">
                      {new Date(comment.comment_date).toLocaleString()}
                    </p>
                  </div>
                  {user?.role === 4 && (
                    <div className="flex space-x-2">
                      {!comment.is_approved && (
                        <button
                          onClick={() =>
                            handleModerateComment(comment.comment_id, true)
                          }
                          className="text-green-600 hover:text-green-800"
                        >
                          <CheckCircleIcon className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={() =>
                          handleModerateComment(comment.comment_id, false)
                        }
                        className="text-red-600 hover:text-red-800"
                      >
                        <XCircleIcon className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                </div>
                {user?.role === 4 && (
                  <div className="mt-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        comment.is_approved
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {comment.is_approved ? "Approved" : "Pending Approval"}
                    </span>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center">No comments yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

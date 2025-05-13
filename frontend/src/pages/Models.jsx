import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useModelStore } from "../stores/modelStore";
import { useAuthStore } from "../stores/authStore";
import { StarIcon } from "@heroicons/react/20/solid";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { Line } from "react-chartjs-2";
import Pagination from "../components/Pagination";
import toast from "react-hot-toast";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const ITEMS_PER_PAGE = 10;

export default function Models() {
  const { models, isLoading, error, fetchModels, fetchModelWeights } =
    useModelStore();
  const { user, isAuthenticated } = useAuthStore();
  const [selectedMetrics, setSelectedMetrics] = useState([]);
  const [selectedModelName, setSelectedModelName] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [downloadingModelId, setDownloadingModelId] = useState(null);

  useEffect(() => {
    if (isAuthenticated && retryCount < 3) {
      const fetchData = async () => {
        try {
          await fetchModels();
        } catch (error) {
          setRetryCount((prev) => prev + 1);
          setTimeout(() => {
            fetchModels();
          }, 1000);
        }
      };
      fetchData();
    }
  }, [isAuthenticated, retryCount]);

  const modelNames = useMemo(() => {
    const names = new Set();
    models
      .filter((model) => model.status === "active")
      .forEach((model) => {
        names.add(model.model_name);
      });
    return Array.from(names);
  }, [models]);

  const availableMetrics = useMemo(() => {
    if (!selectedModelName) return [];

    const selectedModels = models.filter(
      (model) => model.model_name === selectedModelName
    );

    const metricsSet = new Set();
    selectedModels.forEach((model) => {
      Object.keys(model.metrics || {}).forEach((metric) => {
        metricsSet.add(metric);
      });
    });
    return Array.from(metricsSet);
  }, [models, selectedModelName]);

  useEffect(() => {
    setSelectedMetrics(
      availableMetrics.length > 0 ? [availableMetrics[0]] : []
    );
  }, [selectedModelName, availableMetrics]);

  useEffect(() => {
    if (modelNames.length > 0 && !selectedModelName) {
      setSelectedModelName(modelNames[0]);
    }
  }, [modelNames]);

  const filteredModels = useMemo(() => {
    return models.filter(
      (model) =>
        model.status === "active" &&
        (!selectedModelName || model.model_name === selectedModelName)
    );
  }, [models, selectedModelName]);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedModels = filteredModels.slice(startIndex, endIndex);

  const handleDownload = async (model) => {
    if (!model) return;

    setDownloadingModelId(model.model_id);
    try {
      // Fetch weights URL
      const weights = await fetchModelWeights(model.model_id);
      if (!weights?.weights_url) {
        toast.error("Failed to fetch model file");
        return;
      }

      // Create a link element and trigger download
      const link = document.createElement("a");
      link.href = weights.weights_url;
      link.download = `${model.model_name}_v${model.version}.h5`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Model download started");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download model");
    } finally {
      setDownloadingModelId(null);
    }
  };

  const handleMetricToggle = (metric) => {
    setSelectedMetrics((prev) => {
      if (prev.includes(metric)) {
        return prev.filter((m) => m !== metric);
      } else {
        return [...prev, metric];
      }
    });
  };

  const chartData = {
    labels: filteredModels.map((model) => `v${model.version}`),
    datasets: selectedMetrics.map((metric) => ({
      label: metric.charAt(0).toUpperCase() + metric.slice(1),
      data: filteredModels.map((model) => model.metrics[metric] || 0),
      borderColor: `hsl(${Math.random() * 360}, 70%, 50%)`,
      backgroundColor: `hsla(${Math.random() * 360}, 70%, 50%, 0.5)`,
    })),
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: `Model Performance Over Versions${
          selectedModelName ? ` - ${selectedModelName}` : ""
        }`,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 1,
      },
    },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => {
            setRetryCount(0);
            fetchModels();
          }}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold leading-6 text-gray-900">
            Global Models
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all active global models with their performance metrics
            and download options.
          </p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="mb-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Model
            </label>
            <select
              value={selectedModelName}
              onChange={(e) => setSelectedModelName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              {modelNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Performance Metrics
            </label>
            <div className="flex flex-wrap gap-2">
              {availableMetrics.map((metric) => (
                <button
                  key={metric}
                  onClick={() => handleMetricToggle(metric)}
                  className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                    selectedMetrics.includes(metric)
                      ? "bg-indigo-100 text-indigo-800 ring-2 ring-indigo-500"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {metric.charAt(0).toUpperCase() + metric.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="h-64">
          <Line options={chartOptions} data={chartData} />
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <ul role="list" className="divide-y divide-gray-100">
          {paginatedModels.map((model) => (
            <li
              key={model.model_id}
              className="flex items-center justify-between gap-x-6 p-5"
            >
              <div className="min-w-0">
                <div className="flex items-start gap-x-3">
                  <p className="text-sm font-semibold leading-6 text-gray-900">
                    {model.model_name}
                  </p>
                  <p className="rounded-md whitespace-nowrap mt-0.5 px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset text-green-700 bg-green-50 ring-green-600/20">
                    v{model.version}
                  </p>
                  <p className="rounded-md whitespace-nowrap mt-0.5 px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset text-green-700 bg-green-50 ring-green-600/20">
                    {model.status}
                  </p>
                </div>
                <div className="mt-1">
                  <p className="text-sm text-gray-600">
                    {model.model_description}
                  </p>
                </div>
                <div className="mt-1 flex items-center gap-x-2 text-xs leading-5 text-gray-500">
                  <p className="whitespace-nowrap">
                    Published{" "}
                    {new Date(model.published_date).toLocaleDateString()}
                  </p>
                  <svg viewBox="0 0 2 2" className="h-0.5 w-0.5 fill-current">
                    <circle cx={1} cy={1} r={1} />
                  </svg>
                  <div className="flex gap-2">
                    {Object.entries(model.metrics).map(([key, value]) => (
                      <p key={key} className="truncate">
                        {key.charAt(0).toUpperCase() + key.slice(1)}:{" "}
                        {(value * 100).toFixed(1)}%
                      </p>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-none items-center gap-x-4">
                <Link
                  to={`/models/${model.model_id}`}
                  className="hidden rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:block"
                >
                  View details
                </Link>
                <button
                  type="button"
                  onClick={() => handleDownload(model)}
                  disabled={downloadingModelId === model.model_id}
                  className="rounded-md bg-indigo-600 p-2 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-indigo-400"
                >
                  {downloadingModelId === model.model_id ? (
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <ArrowDownTrayIcon className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </li>
          ))}
        </ul>
        <Pagination
          totalItems={filteredModels.length}
          itemsPerPage={ITEMS_PER_PAGE}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}

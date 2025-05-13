import { useEffect, useState, useMemo } from "react";
import { useModelStore } from "../../stores/modelStore";
import { useAdminStore } from "../../stores/adminStore";
import { useAuthStore } from "../../stores/authStore";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function Analytics() {
  const { models, fetchModels } = useModelStore();
  const { users, contributions, fetchUsers, fetchContributions } =
    useAdminStore();
  const [timeRange, setTimeRange] = useState("month");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedModelName, setSelectedModelName] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedMetrics, setSelectedMetrics] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([fetchModels(), fetchUsers(), fetchContributions()]);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Get all unique model names
  const modelNames = useMemo(() => {
    const names = new Set();
    models.forEach((model) => {
      names.add(model.model_name);
    });
    return Array.from(names);
  }, [models]);

  // Get metrics available for the selected model name
  const availableMetrics = useMemo(() => {
    if (!selectedModelName) return [];

    // Get all models with the selected name
    const selectedModels = models.filter(
      (model) => model.model_name === selectedModelName
    );

    // Get unique metrics from these models
    const metricsSet = new Set();
    selectedModels.forEach((model) => {
      Object.keys(model.metrics || {}).forEach((metric) => {
        metricsSet.add(metric);
      });
    });
    return Array.from(metricsSet);
  }, [models, selectedModelName]);

  // Reset selected metrics when model name changes
  useEffect(() => {
    setSelectedMetrics(
      availableMetrics.length > 0 ? [availableMetrics[0]] : []
    );
  }, [selectedModelName, availableMetrics]);

  // Initialize selected model name
  useEffect(() => {
    if (modelNames.length > 0 && !selectedModelName) {
      setSelectedModelName(modelNames[0]);
    }
  }, [modelNames]);

  const handleMetricToggle = (metric) => {
    setSelectedMetrics((prev) => {
      if (prev.includes(metric)) {
        return prev.filter((m) => m !== metric);
      } else {
        return [...prev, metric];
      }
    });
  };

  // Filter models based on selected name and status
  const filteredModels = useMemo(() => {
    return models.filter((model) => {
      const matchesName =
        !selectedModelName || model.model_name === selectedModelName;
      const matchesStatus =
        selectedStatus === "all" || model.status === selectedStatus;
      return matchesName && matchesStatus;
    });
  }, [models, selectedModelName, selectedStatus]);

  // Calculate statistics
  const totalUsers = users.length;
  const activeUsers = users.filter((user) => user.is_active).length;
  const totalResearchers = users.filter((user) => user.role === 3).length;
  const totalContributions = contributions.length;
  const approvedContributions = contributions.filter(
    (c) => c.status === "approved" || c.status === "aggregated"
  ).length;
  const totalModels = models.length;
  const activeModels = models.filter((m) => m.status === "active").length;

  // Model Performance Chart Data
  const performanceChartData = {
    labels: filteredModels.map((model) => `v${model.version}`),
    datasets: selectedMetrics.map((metric) => ({
      label: metric.charAt(0).toUpperCase() + metric.slice(1),
      data: filteredModels.map((model) => model.metrics[metric] || 0),
      borderColor: `hsl(${Math.random() * 360}, 70%, 50%)`,
      backgroundColor: `hsla(${Math.random() * 360}, 70%, 50%, 0.5)`,
      tension: 0.1,
    })),
  };

  const performanceChartOptions = {
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

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Analytics Dashboard
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Platform statistics and performance metrics
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="bg-indigo-500 rounded-md p-3">
                  <svg
                    className="h-6 w-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Users
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {totalUsers}
                    </div>
                    <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                      <span className="text-xs text-gray-500">
                        ({activeUsers} active)
                      </span>
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="bg-green-500 rounded-md p-3">
                  <svg
                    className="h-6 w-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Contributions
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {totalContributions}
                    </div>
                    <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                      <span className="text-xs text-gray-500">
                        ({approvedContributions} approved)
                      </span>
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="bg-blue-500 rounded-md p-3">
                  <svg
                    className="h-6 w-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Models
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {activeModels}
                    </div>
                    <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                      <span className="text-xs text-gray-500">
                        (of {totalModels} total)
                      </span>
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="bg-purple-500 rounded-md p-3">
                  <svg
                    className="h-6 w-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Researchers
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {totalResearchers}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
            Model Performance Trends
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
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
                <label className="block text-sm font-medium text-gray-700">
                  Model Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="experimental">Experimental</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Performance Metrics
              </label>
              <div className="mt-1 flex flex-wrap gap-2">
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
          <div className="h-80 mt-4">
            <Line
              data={performanceChartData}
              options={performanceChartOptions}
            />
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
            Contribution Status Distribution
          </h3>
          <div className="h-80">
            <Doughnut
              data={{
                labels: ["Pending", "Approved", "Rejected", "Aggregated"],
                datasets: [
                  {
                    data: [
                      contributions.filter((c) => c.status === "pending")
                        .length,
                      contributions.filter((c) => c.status === "approved")
                        .length,
                      contributions.filter((c) => c.status === "rejected")
                        .length,
                      contributions.filter((c) => c.status === "aggregated")
                        .length,
                    ],
                    backgroundColor: [
                      "rgb(255, 205, 86)",
                      "rgb(75, 192, 192)",
                      "rgb(255, 99, 132)",
                      "rgb(54, 162, 235)",
                    ],
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
            User Role Distribution
          </h3>
          <div className="h-80">
            <Doughnut
              data={{
                labels: ["Visitors", "Members", "Researchers", "Admins"],
                datasets: [
                  {
                    data: [
                      users.filter((user) => user.role === 1).length,
                      users.filter((user) => user.role === 2).length,
                      users.filter((user) => user.role === 3).length,
                      users.filter((user) => user.role === 4).length,
                    ],
                    backgroundColor: [
                      "rgb(255, 99, 132)",
                      "rgb(54, 162, 235)",
                      "rgb(255, 205, 86)",
                      "rgb(75, 192, 192)",
                    ],
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
              }}
            />
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
            Top Contributors
          </h3>
          <div className="flow-root">
            <ul role="list" className="divide-y divide-gray-200">
              {users
                .filter((user) => user.total_points > 0)
                .sort((a, b) => b.total_points - a.total_points)
                .slice(0, 5)
                .map((user, index) => (
                  <li key={user.user_id} className="py-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-indigo-100">
                          <span className="text-sm font-medium leading-none text-indigo-700">
                            {index + 1}
                          </span>
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.username}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {user.role === 3 ? "Researcher" : "Member"}
                        </p>
                      </div>
                      <div>
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                          {user.total_points} points
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

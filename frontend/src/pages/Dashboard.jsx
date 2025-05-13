import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { useModelStore } from "../stores/modelStore";
import { useNotificationStore } from "../stores/notificationStore";
import { useProfileStore } from "../stores/profileStore";
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  UserGroupIcon,
  ChartBarIcon,
  BookOpenIcon,
} from "@heroicons/react/24/outline";

export default function Dashboard() {
  const user = useAuthStore((state) => state.user);
  const { models, fetchModels } = useModelStore();
  const { notifications, fetchNotifications } = useNotificationStore();
  const { contributions, fetchContributions } = useProfileStore();

  useEffect(() => {
    fetchModels();
    fetchNotifications();
    if (user?.role >= 3) {
      // Only fetch contributions for researchers and admins
      fetchContributions();
    }
  }, []);

  // Filter active models
  const activeModels = models.filter((model) => model.status === "active");

  const getRoleName = (roleId) => {
    switch (roleId) {
      case 4:
        return "Admin";
      case 3:
        return "Researcher";
      case 2:
        return "Member";
      default:
        return "Visitor";
    }
  };

  const stats = [
    { name: "Active Models", value: activeModels.length },
    {
      name: "Your Contributions",
      value: user?.role >= 3 ? contributions.length : "N/A",
    },
    {
      name: "Unread Notifications",
      value: notifications.filter((n) => !n.is_read).length,
    },
    {
      name: "Your Role",
      value: getRoleName(user?.role),
      color: "text-indigo-600",
    },
  ];

  const quickActions = [
    {
      name: "Platform Guide",
      description: "Learn how to use and contribute to the platform",
      href: "/guide",
      icon: BookOpenIcon,
      highlight: true,
    },
    {
      name: "Download Model",
      description: "Download the latest global model for local training",
      href: "/models",
      icon: ArrowDownTrayIcon,
    },
    {
      name: "Contribute Weights",
      description: "Upload your locally trained model weights",
      href: "/contributions/upload",
      icon: ArrowUpTrayIcon,
      researcherOnly: true,
    },
    {
      name: "Manage Users",
      description: "Approve new users and manage permissions",
      href: "/admin/users",
      icon: UserGroupIcon,
      adminOnly: true,
    },
    {
      name: "View Analytics",
      description: "Check platform statistics and performance",
      href: "/admin/analytics",
      icon: ChartBarIcon,
      adminOnly: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          Dashboard
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Welcome to the Federated Learning Platform for Brain Tumor Research
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6"
          >
            <dt className="truncate text-sm font-medium text-gray-500">
              {stat.name}
            </dt>
            <dd
              className={`mt-1 text-3xl font-semibold tracking-tight ${
                stat.color || "text-gray-900"
              }`}
            >
              {stat.value}
            </dd>
          </div>
        ))}
      </div>

      {activeModels.length > 0 && (
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-base font-semibold leading-6 text-gray-900">
              Latest Active Model
            </h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>GliomaClassifier (v{activeModels[0].version})</p>
              <p className="mt-1">
                Accuracy: {(activeModels[0].metrics.accuracy * 100).toFixed(1)}%
              </p>
            </div>
            <div className="mt-5">
              <Link
                to={`/models/${activeModels[0].model_id}`}
                className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                View Details
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickActions.map(
          (action) =>
            (!action.adminOnly || user?.role === 4) &&
            (!action.researcherOnly || user?.role >= 3) && (
              <Link
                key={action.name}
                to={action.href}
                className={`relative flex items-center space-x-3 rounded-lg border px-6 py-5 shadow-sm hover:border-gray-400 ${
                  action.highlight
                    ? "border-indigo-500 bg-gradient-to-r from-indigo-50 to-blue-50"
                    : "border-gray-300 bg-white"
                }`}
              >
                <div className="flex-shrink-0">
                  <action.icon
                    className={`h-6 w-6 ${
                      action.highlight ? "text-indigo-600" : "text-gray-600"
                    }`}
                    aria-hidden="true"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="absolute inset-0" aria-hidden="true" />
                  <p
                    className={`text-sm font-medium ${
                      action.highlight ? "text-indigo-900" : "text-gray-900"
                    }`}
                  >
                    {action.name}
                  </p>
                  <p
                    className={`truncate text-sm ${
                      action.highlight ? "text-indigo-700" : "text-gray-500"
                    }`}
                  >
                    {action.description}
                  </p>
                </div>
                {action.highlight && (
                  <div className="absolute top-0 right-0 -mt-2 -mr-2">
                    <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
                      New
                    </span>
                  </div>
                )}
              </Link>
            )
        )}
      </div>
    </div>
  );
}

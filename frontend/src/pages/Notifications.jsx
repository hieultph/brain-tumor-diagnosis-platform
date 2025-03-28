import { useEffect, useState } from "react";
import { useNotificationStore } from "../stores/notificationStore";
import { CheckCircleIcon, BellIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import Pagination from "../components/Pagination";

const ITEMS_PER_PAGE = 10;

export default function Notifications() {
  const { notifications, fetchNotifications, markAllAsRead, isLoading } =
    useNotificationStore();
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllAsRead = async () => {
    if (!Array.isArray(notifications) || notifications.length === 0) return;

    const success = await markAllAsRead();
    if (success) {
      toast.success("All notifications marked as read");
    } else {
      toast.error("Failed to mark notifications as read");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const hasUnreadNotifications =
    Array.isArray(notifications) && notifications.some((n) => !n.is_read);

  // Pagination logic
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedNotifications = Array.isArray(notifications)
    ? notifications.slice(startIndex, endIndex)
    : [];

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Notifications
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Stay updated with the latest platform activities and announcements
          </p>
        </div>
        {hasUnreadNotifications && (
          <button
            onClick={handleMarkAllAsRead}
            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Mark All as Read
          </button>
        )}
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="flow-root">
          <ul role="list" className="divide-y divide-gray-200">
            {Array.isArray(notifications) && notifications.length > 0 ? (
              paginatedNotifications.map((notification) => (
                <li
                  key={notification.notification_id}
                  className={`p-4 ${
                    !notification.is_read ? "bg-indigo-50" : ""
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <span
                        className={`h-8 w-8 rounded-full ${
                          !notification.is_read
                            ? "bg-indigo-100"
                            : "bg-gray-100"
                        } flex items-center justify-center`}
                      >
                        <BellIcon
                          className={`h-5 w-5 ${
                            !notification.is_read
                              ? "text-indigo-600"
                              : "text-gray-500"
                          }`}
                        />
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm ${
                          !notification.is_read
                            ? "font-medium text-gray-900"
                            : "text-gray-600"
                        }`}
                      >
                        {notification.message}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(notification.sent_date).toLocaleString()}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <div>
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                          New
                        </span>
                      </div>
                    )}
                  </div>
                </li>
              ))
            ) : (
              <li className="p-4 text-center text-gray-500">
                No notifications to display
              </li>
            )}
          </ul>
          {Array.isArray(notifications) &&
            notifications.length > ITEMS_PER_PAGE && (
              <div className="border-t border-gray-200">
                <Pagination
                  totalItems={notifications.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

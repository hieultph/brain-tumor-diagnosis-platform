import { useEffect, useState } from "react";
import { useAdminStore } from "../../stores/adminStore";
import toast from "react-hot-toast";
import { TrashIcon } from "@heroicons/react/24/outline";
import Pagination from "../../components/Pagination";

const ITEMS_PER_PAGE = 10;

const ROLE_COLORS = {
  1: "bg-gray-100 text-gray-800", // Visitor
  2: "bg-blue-100 text-blue-800", // Member
  3: "bg-purple-100 text-purple-800", // Researcher
  4: "bg-indigo-100 text-indigo-800", // Admin
};

const ROLE_NAMES = {
  1: "Visitor",
  2: "Member",
  3: "Researcher",
  4: "Admin",
};

export default function ManageUsers() {
  const [selectedRole, setSelectedRole] = useState("all");
  const { users, fetchUsers, assignRole, deleteUser } = useAdminStore();
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedRole === "all") {
      setFilteredUsers(users);
    } else {
      setFilteredUsers(
        users.filter((user) => user.role === parseInt(selectedRole))
      );
    }
  }, [selectedRole, users]);

  // Pagination logic
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  const handleRoleChange = async (userId, roleId) => {
    const success = await assignRole(userId, roleId);
    if (success) {
      toast.success("Role updated successfully");
    } else {
      toast.error("Failed to update role");
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      const success = await deleteUser(userId);
      if (success) {
        toast.success("User deleted successfully");
      } else {
        toast.error("Failed to delete user");
      }
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold leading-6 text-gray-900">
            Manage Users
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all users in the platform including their role and account
            status.
          </p>
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="sm:flex sm:items-center">
            <div className="sm:flex-auto">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Users
              </h3>
            </div>
            <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="all">All Roles</option>
                <option value="1">Visitor</option>
                <option value="2">Member</option>
                <option value="3">Researcher</option>
                <option value="4">Admin</option>
              </select>
            </div>
          </div>

          <div className="mt-8 flow-root">
            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr>
                      <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                        Username
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Email
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Role
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Joined
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
                    {paginatedUsers.map((user) => (
                      <tr key={user.user_id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                          {user.username}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {user.email}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <select
                            value={user.role}
                            onChange={(e) =>
                              handleRoleChange(
                                user.user_id,
                                parseInt(e.target.value)
                              )
                            }
                            className={`rounded-md border-0 px-2 py-1 text-sm font-medium ${
                              ROLE_COLORS[user.role]
                            }`}
                          >
                            {Object.entries(ROLE_NAMES).map(([value, name]) => (
                              <option
                                key={value}
                                value={value}
                                className="text-gray-900 bg-white"
                              >
                                {name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {formatDate(user.created_at)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {user.total_points}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <button
                            onClick={() => handleDeleteUser(user.user_id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination
                  totalItems={filteredUsers.length}
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

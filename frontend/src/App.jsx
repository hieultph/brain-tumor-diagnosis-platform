import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Models from "./pages/Models";
import ModelDetails from "./pages/ModelDetails";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import ManageUsers from "./pages/admin/ManageUsers";
import ManageModels from "./pages/admin/ManageModels";
import ReviewContributions from "./pages/admin/ReviewContributions";
import Analytics from "./pages/admin/Analytics";
import FAQ from "./pages/FAQ";
import Guide from "./pages/Guide";
import UseModel from "./pages/member/UseModel";
import UploadContribution from "./pages/researcher/UploadContribution";
import PrivateRoute from "./components/PrivateRoute";
import { useAuthStore } from "./stores/authStore";

function App() {
  const { isAuthenticated, checkSession } = useAuthStore();

  useEffect(() => {
    checkSession();
  }, []);

  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<Layout />}>
          <Route
            path="/"
            element={
              <PrivateRoute isAuthenticated={isAuthenticated}>
                <Dashboard />
              </PrivateRoute>
            }
          />

          <Route
            path="/guide"
            element={
              <PrivateRoute isAuthenticated={isAuthenticated}>
                <Guide />
              </PrivateRoute>
            }
          />

          <Route
            path="/models"
            element={
              <PrivateRoute isAuthenticated={isAuthenticated}>
                <Models />
              </PrivateRoute>
            }
          />

          <Route
            path="/models/:id"
            element={
              <PrivateRoute isAuthenticated={isAuthenticated}>
                <ModelDetails />
              </PrivateRoute>
            }
          />

          <Route
            path="/use-model"
            element={
              <PrivateRoute
                isAuthenticated={isAuthenticated}
                requiredRole="Member"
              >
                <UseModel />
              </PrivateRoute>
            }
          />

          <Route
            path="/contributions/upload"
            element={
              <PrivateRoute
                isAuthenticated={isAuthenticated}
                requiredRole="Researcher"
              >
                <UploadContribution />
              </PrivateRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <PrivateRoute isAuthenticated={isAuthenticated}>
                <Profile />
              </PrivateRoute>
            }
          />

          <Route
            path="/notifications"
            element={
              <PrivateRoute isAuthenticated={isAuthenticated}>
                <Notifications />
              </PrivateRoute>
            }
          />

          <Route
            path="/admin/users"
            element={
              <PrivateRoute
                isAuthenticated={isAuthenticated}
                requiredRole="Admin"
              >
                <ManageUsers />
              </PrivateRoute>
            }
          />

          <Route
            path="/admin/models"
            element={
              <PrivateRoute
                isAuthenticated={isAuthenticated}
                requiredRole="Admin"
              >
                <ManageModels />
              </PrivateRoute>
            }
          />

          <Route
            path="/admin/contributions"
            element={
              <PrivateRoute
                isAuthenticated={isAuthenticated}
                requiredRole="Admin"
              >
                <ReviewContributions />
              </PrivateRoute>
            }
          />

          <Route
            path="/admin/analytics"
            element={
              <PrivateRoute
                isAuthenticated={isAuthenticated}
                requiredRole="Admin"
              >
                <Analytics />
              </PrivateRoute>
            }
          />

          <Route path="/faq" element={<FAQ />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;

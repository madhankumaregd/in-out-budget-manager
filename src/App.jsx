import { lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { AdminProvider, useAdmin } from "./contexts/AdminContext";
import { Toaster } from "react-hot-toast";

// ─── Eagerly loaded (always needed on first paint) ─────────────
import Login from "./pages/Login";
import Navigation from "./components/Navigation";

// ─── Lazy-loaded user pages ────────────────────────────────────
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Transactions = lazy(() => import("./pages/Transactions"));
const Accounts = lazy(() => import("./pages/Accounts"));
const Onboarding = lazy(() => import("./pages/Onboarding"));

// ─── Lazy-loaded admin pages ───────────────────────────────────
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminTrash = lazy(() => import("./pages/admin/AdminTrash"));
const AdminApiKeys = lazy(() => import("./pages/admin/AdminApiKeys"));

// ─── Shared loading fallback ───────────────────────────────────
const PageLoader = ({ dark = false }) => (
  <div
    className={`min-h-screen flex items-center justify-center ${dark ? "bg-slate-950" : "bg-gray-50"}`}
  >
    <div className="flex flex-col items-center space-y-4">
      <div
        className={`animate-spin rounded-full h-10 w-10 border-[3px] border-transparent ${dark ? "border-t-purple-500" : "border-t-indigo-600"}`}
      />
      <p className={`text-sm ${dark ? "text-gray-500" : "text-gray-400"}`}>
        Loading…
      </p>
    </div>
  </div>
);

const PrivateRoute = ({ children }) => {
  const { currentUser, userProfile, loading } = useAuth();
  
  if (loading) {
    return <PageLoader />;
  }

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  // Force onboarding if email is not verified or phone is missing
  if (currentUser && (!currentUser.emailVerified || !userProfile?.phone)) {
    return <Navigate to="/onboarding" />;
  }

  return children;
};

const AdminRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAdmin();

  if (isLoading) {
    return <PageLoader dark />;
  }

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<PageLoader dark />}>
        <AdminLogin />
      </Suspense>
    );
  }

  return children;
};

function App() {
  const { currentUser, loading, userProfile } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  return (
    <Router>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#363636",
            color: "#fff",
            borderRadius: "10px",
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: "#10B981",
              secondary: "#fff",
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: "#EF4444",
              secondary: "#fff",
            },
          },
        }}
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Routes>
          {/* ─── Admin Portal Routes ─── */}
          <Route
            path="/in-out-manager/*"
            element={
              <AdminProvider>
                <AdminRoute>
                  <Suspense fallback={<PageLoader dark />}>
                    <AdminLayout />
                  </Suspense>
                </AdminRoute>
              </AdminProvider>
            }
          >
            <Route
              index
              element={
                <Suspense fallback={<PageLoader dark />}>
                  <AdminDashboard />
                </Suspense>
              }
            />
            <Route
              path="users"
              element={
                <Suspense fallback={<PageLoader dark />}>
                  <AdminUsers />
                </Suspense>
              }
            />
            <Route
              path="settings"
              element={
                <Suspense fallback={<PageLoader dark />}>
                  <AdminSettings />
                </Suspense>
              }
            />
            <Route
              path="trash"
              element={
                <Suspense fallback={<PageLoader dark />}>
                  <AdminTrash />
                </Suspense>
              }
            />
            <Route
              path="api-keys"
              element={
                <Suspense fallback={<PageLoader dark />}>
                  <AdminApiKeys />
                </Suspense>
              }
            />
          </Route>

          {/* ─── User App Routes ─── */}
          <Route
            path="/*"
            element={
              <>
                {currentUser && userProfile?.phone && currentUser.emailVerified && <Navigation />}
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route
                    path="/onboarding"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <Onboarding />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/dashboard"
                    element={
                      <PrivateRoute>
                        <Suspense fallback={<PageLoader />}>
                          <Dashboard />
                        </Suspense>
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/transactions"
                    element={
                      <PrivateRoute>
                        <Suspense fallback={<PageLoader />}>
                          <Transactions />
                        </Suspense>
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/accounts"
                    element={
                      <PrivateRoute>
                        <Suspense fallback={<PageLoader />}>
                          <Accounts />
                        </Suspense>
                      </PrivateRoute>
                    }
                  />
                  <Route path="/" element={<Navigate to="/dashboard" />} />
                </Routes>
              </>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

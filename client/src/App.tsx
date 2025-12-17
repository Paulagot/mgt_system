// client/src/App.tsx
import { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
  Navigate,
  Outlet,
} from "react-router-dom";

import ClubDashboard from "./components/dashboard/ClubDashboard";
import CreateEventForm from "./components/events/CreateEventForm";
import CreateCampaignForm from "./components/campaigns/CreateCampaignForm";
import EventExpenseManager from "./components/events/EventExpenseManager";
import AuthPage from "./components/auth/AuthPage";
import AuthGuard from "./components/auth/AuthGuard";

import AppShell from "./components/layout/AppShell";

import UserManagement from "./components/users/UserManagement";
import PrizeManagement from "./components/prizes/PrizeManagement";
import TaskManagement from "./components/users/TaskManagement";

import { useAuth } from "./store/app_store";
import { apiService } from "./services/apiService";
import type { UserRole, Expense } from "./types/types";

// ------------------------------
// Types
// ------------------------------
interface NavItem {
  path: string;
  label: string;
  exact?: boolean;
  roles?: UserRole[];
}

// ------------------------------
// Public Navigation (ONLY for / and /auth)
// ------------------------------
const Navigation = () => {
  const location = useLocation();
  const { isAuthenticated, logout, user, club } = useAuth();

  const navItems: NavItem[] = [
    { path: "/", label: "🏠 Home", exact: true },
    { path: "/auth", label: "🔐 Login/Register" },

    // NOTE: we keep these for convenience when logged in,
    // but Navigation is only rendered on public pages anyway.
    ...(isAuthenticated
      ? [
          { path: "/dashboard", label: "📊 Dashboard" },
          { path: "/create-event", label: "📅 Create Event" },
          { path: "/create-campaign", label: "🎯 Create Campaign" },
          { path: "/expense-manager", label: "💰 Expense Manager" },
          { path: "/users", label: "👥 Team Management", roles: ["host", "admin"] as UserRole[] },
          { path: "/prizes", label: "🏆 Prize Management" },
          { path: "/tasks", label: "📋 Task Management" },
        ]
      : []),
  ];

  const canSeeNavItem = (item: NavItem): boolean => {
    if (!item.roles) return true;
    if (!user?.role) return false;
    return item.roles.includes(user.role);
  };

  return (
    <nav
      style={{
        backgroundColor: "#1e40af",
        padding: "1rem",
        marginBottom: "2rem",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          {navItems.filter(canSeeNavItem).map((item) => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                color: location.pathname === item.path ? "#fbbf24" : "white",
                textDecoration: "none",
                padding: "0.5rem 1rem",
                borderRadius: "4px",
                backgroundColor: location.pathname === item.path ? "#1e3a8a" : "transparent",
                fontSize: "0.875rem",
                fontWeight: location.pathname === item.path ? "bold" : "normal",
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {isAuthenticated && club && (
            <span
              style={{
                color: "white",
                fontSize: "0.875rem",
                opacity: 0.9,
              }}
            >
              👋 {club.name} ({user?.role})
            </span>
          )}

          {isAuthenticated && (
            <button
              onClick={logout}
              style={{
                color: "white",
                textDecoration: "none",
                padding: "0.5rem 1rem",
                borderRadius: "4px",
                backgroundColor: "#dc2626",
                fontSize: "0.875rem",
                border: "none",
                cursor: "pointer",
              }}
            >
              🚪 Logout
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

// ------------------------------
// Public Layout (wraps Navigation + Outlet)
// ------------------------------
const PublicLayout = () => {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb" }}>
      <Navigation />
      <Outlet />
    </div>
  );
};

// ------------------------------
// Home Page (unchanged, trimmed only if needed)
// ------------------------------
const HomePage = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div
      style={{
        minHeight: "80vh",
        backgroundColor: "#f9fafb",
        padding: "2rem",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <h1
          style={{
            fontSize: "3rem",
            fontWeight: "bold",
            textAlign: "center",
            marginBottom: "2rem",
            color: "#1e40af",
          }}
        >
          🎯 FundRaisely Club
        </h1>

        <div
          style={{
            backgroundColor: "white",
            padding: "2rem",
            borderRadius: "8px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            marginBottom: "2rem",
          }}
        >
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              marginBottom: "1rem",
              color: "#374151",
            }}
          >
            {isAuthenticated
              ? "✅ Available Components (Click navigation above)"
              : "🔐 Please login or register to access components"}
          </h2>

          {isAuthenticated ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "1rem",
                marginTop: "1rem",
              }}
            >
              <div
                style={{
                  backgroundColor: "#f0fdf4",
                  border: "1px solid #22c55e",
                  padding: "1rem",
                  borderRadius: "4px",
                }}
              >
                <h3 style={{ color: "#14532d", margin: "0 0 0.5rem 0" }}>📊 Dashboard</h3>
                <p style={{ color: "#374151", fontSize: "0.875rem", margin: 0 }}>
                  Full dashboard with metrics, events, campaigns
                </p>
              </div>

              <div
                style={{
                  backgroundColor: "#fef3c7",
                  border: "1px solid #f59e0b",
                  padding: "1rem",
                  borderRadius: "4px",
                }}
              >
                <h3 style={{ color: "#92400e", margin: "0 0 0.5rem 0" }}>📅 Create Event</h3>
                <p style={{ color: "#374151", fontSize: "0.875rem", margin: 0 }}>
                  Event creation form with API integration
                </p>
              </div>

              <div
                style={{
                  backgroundColor: "#fdf2f8",
                  border: "1px solid #ec4899",
                  padding: "1rem",
                  borderRadius: "4px",
                }}
              >
                <h3 style={{ color: "#831843", margin: "0 0 0.5rem 0" }}>🎯 Create Campaign</h3>
                <p style={{ color: "#374151", fontSize: "0.875rem", margin: 0 }}>
                  Campaign setup with API integration
                </p>
              </div>

              <div
                style={{
                  backgroundColor: "#f5f3ff",
                  border: "1px solid #8b5cf6",
                  padding: "1rem",
                  borderRadius: "4px",
                }}
              >
                <h3 style={{ color: "#581c87", margin: "0 0 0.5rem 0" }}>💰 Expense Manager</h3>
                <p style={{ color: "#374151", fontSize: "0.875rem", margin: 0 }}>
                  Track expenses with categories and totals
                </p>
              </div>

              {user?.role && (["host", "admin"] as UserRole[]).includes(user.role) && (
                <div
                  style={{
                    backgroundColor: "#ecfdf5",
                    border: "1px solid #10b981",
                    padding: "1rem",
                    borderRadius: "4px",
                  }}
                >
                  <h3 style={{ color: "#047857", margin: "0 0 0.5rem 0" }}>👥 Team Management</h3>
                  <p style={{ color: "#374151", fontSize: "0.875rem", margin: 0 }}>
                    ✨ Manage club members and roles (Now Available!)
                  </p>
                </div>
              )}

              <div
                style={{
                  backgroundColor: "#fef7cd",
                  border: "1px solid #d97706",
                  padding: "1rem",
                  borderRadius: "4px",
                }}
              >
                <h3 style={{ color: "#92400e", margin: "0 0 0.5rem 0" }}>🏆 Prize Management</h3>
                <p style={{ color: "#374151", fontSize: "0.875rem", margin: 0 }}>
                  ✨ Manage event prizes and donor tracking (Now Available!)
                </p>
              </div>

              <div
                style={{
                  backgroundColor: "#f0f9ff",
                  border: "1px solid #0ea5e9",
                  padding: "1rem",
                  borderRadius: "4px",
                }}
              >
                <h3 style={{ color: "#0c4a6e", margin: "0 0 0.5rem 0" }}>📋 Task Management</h3>
                <p style={{ color: "#374151", fontSize: "0.875rem", margin: 0 }}>
                  ✨ Assign and track tasks for events (Now Available!)
                </p>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "2rem" }}>
              <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
                Please login or register your club to access the fundraising tools.
              </p>
              <Link
                to="/auth"
                style={{
                  backgroundColor: "#1e40af",
                  color: "white",
                  padding: "0.75rem 1.5rem",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontSize: "1rem",
                  fontWeight: "bold",
                }}
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ------------------------------
// API handlers
// ------------------------------
const apiHandlers = {
  handleEventCreation: async (data: any) => {
    try {
      console.log("🚀 Creating event via API:", data);

      const eventData = {
        ...data,
        type: data.type.trim().toLowerCase(),
      };

      console.log("🔧 Processed event data:", eventData);

      const response = await apiService.createEvent(eventData);
      console.log("✅ Event created successfully:", response);

      return response;
    } catch (error) {
      console.error("❌ Failed to create event:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create event";
      alert(`Error creating event: ${errorMessage}`);
      throw error;
    }
  },

  handleCampaignCreation: async (data: any) => {
    try {
      console.log("🚀 App.tsx handling campaign creation:", data);

      const response = await apiService.createCampaign(data);
      console.log("✅ Campaign created successfully:", response);

      return response;
    } catch (error) {
      console.error("❌ Failed to create campaign:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create campaign";
      alert(`Error creating campaign: ${errorMessage}`);
      throw error;
    }
  },
};

// ------------------------------
// Mock Expense Manager data (kept)
// ------------------------------
const mockExpenses: Expense[] = [
  {
    id: "1",
    club_id: "demo-club-1",
    event_id: "demo-event-1",
    category: "Venue",
    description: "Hall rental",
    amount: 250,
    date: "2024-06-15",
    vendor: "City Hall",
    payment_method: "card",
    status: "approved",
    created_by: "demo-user-1",
    created_at: "2024-06-15T10:00:00Z",
  },
  {
    id: "2",
    club_id: "demo-club-1",
    event_id: "demo-event-1",
    category: "Food",
    description: "Catering service",
    amount: 450,
    date: "2024-06-15",
    vendor: "Local Catering Co.",
    payment_method: "transfer",
    status: "pending",
    created_by: "demo-user-1",
    created_at: "2024-06-15T11:00:00Z",
  },
];

const mockExpenseHandlers = {
  handleAddExpense: async (expense: any) => {
    console.log("Adding expense:", expense);
    alert("Expense added! (Mock handler)");
  },
  handleUpdateExpense: async (id: string, expense: any) => {
    console.log("Updating expense:", id, expense);
    alert("Expense updated! (Mock handler)");
  },
  handleDeleteExpense: async (id: string) => {
    console.log("Deleting expense:", id);
    alert("Expense deleted! (Mock handler)");
  },
};

function App() {
  const { user, isAuthenticated, initialize } = useAuth();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <Router>
      <Routes>
        {/* ✅ Public routes: show top Navigation */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />

          <Route
            path="/auth"
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <AuthPage />}
          />
        </Route>

        {/* ✅ App routes: wrapped by AppShell (sidebar drawer lives there) */}
        <Route element={<AppShell />}>
          <Route
            path="/dashboard"
            element={
              <AuthGuard>
                <div
                  style={{
                    padding: "2rem",
                    backgroundColor: "#f9fafb",
                    minHeight: "100vh",
                  }}
                >
                  <ClubDashboard />
                </div>
              </AuthGuard>
            }
          />

          <Route
            path="/create-event"
            element={
              <AuthGuard>
                <div
                  style={{
                    padding: "2rem",
                    maxWidth: "800px",
                    margin: "0 auto",
                    backgroundColor: "#f9fafb",
                    minHeight: "100vh",
                  }}
                >
                  <div
                    style={{
                      backgroundColor: "white",
                      padding: "2rem",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                    }}
                  >
                    <h2
                      style={{
                        fontSize: "2rem",
                        fontWeight: "bold",
                        marginBottom: "2rem",
                        color: "#1e40af",
                        textAlign: "center",
                      }}
                    >
                      Create New Event
                    </h2>
                    <CreateEventForm
                      onSubmit={apiHandlers.handleEventCreation}
                      onCancel={() => window.history.back()}
                    />
                  </div>
                </div>
              </AuthGuard>
            }
          />

          <Route
            path="/create-campaign"
            element={
              <AuthGuard>
                <div
                  style={{
                    padding: "2rem",
                    maxWidth: "800px",
                    margin: "0 auto",
                    backgroundColor: "#f9fafb",
                    minHeight: "100vh",
                  }}
                >
                  <div
                    style={{
                      backgroundColor: "white",
                      padding: "2rem",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                    }}
                  >
                    <h2
                      style={{
                        fontSize: "2rem",
                        fontWeight: "bold",
                        marginBottom: "2rem",
                        color: "#16a34a",
                        textAlign: "center",
                      }}
                    >
                      Create New Campaign
                    </h2>
                    <CreateCampaignForm
                      onSubmit={apiHandlers.handleCampaignCreation}
                      onCancel={() => window.history.back()}
                    />
                  </div>
                </div>
              </AuthGuard>
            }
          />

          <Route
            path="/expense-manager"
            element={
              <AuthGuard>
                <div
                  style={{
                    padding: "2rem",
                    backgroundColor: "#f9fafb",
                    minHeight: "100vh",
                  }}
                >
                  <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
                    <h2
                      style={{
                        fontSize: "2rem",
                        fontWeight: "bold",
                        marginBottom: "2rem",
                        color: "#1e40af",
                        textAlign: "center",
                      }}
                    >
                      Event Expense Manager
                    </h2>

                    <EventExpenseManager
                      eventId="demo-event-1"
                      eventTitle="Demo Quiz Night"
                      expenses={mockExpenses}
                      onAddExpense={mockExpenseHandlers.handleAddExpense}
                      onUpdateExpense={mockExpenseHandlers.handleUpdateExpense}
                      onDeleteExpense={mockExpenseHandlers.handleDeleteExpense}
                    />
                  </div>
                </div>
              </AuthGuard>
            }
          />

          <Route
            path="/users"
            element={
              <AuthGuard>
                <div
                  style={{
                    padding: "2rem",
                    backgroundColor: "#f9fafb",
                    minHeight: "100vh",
                  }}
                >
                  <UserManagement clubId={user?.club_id || ""} />
                </div>
              </AuthGuard>
            }
          />

          <Route
            path="/prizes"
            element={
              <AuthGuard>
                <div
                  style={{
                    padding: "2rem",
                    backgroundColor: "#f9fafb",
                    minHeight: "100vh",
                  }}
                >
                  <PrizeManagement />
                </div>
              </AuthGuard>
            }
          />

          <Route
            path="/tasks"
            element={
              <AuthGuard>
                <div
                  style={{
                    padding: "2rem",
                    backgroundColor: "#f9fafb",
                    minHeight: "100vh",
                  }}
                >
                  <TaskManagement />
                </div>
              </AuthGuard>
            }
          />
        </Route>

        {/* Catch all */}
        <Route
          path="*"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/auth" replace />}
        />
      </Routes>
    </Router>
  );
}

export default App;

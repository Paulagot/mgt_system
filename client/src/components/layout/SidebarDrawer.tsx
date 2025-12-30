// client/src/components/Navigation/SidebarDrawer.tsx
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  Users,
  Settings,
  Sliders,
  LayoutDashboard,
  LogOut,
  Building2,
  CreditCard,
  CheckCircle,
} from "lucide-react";
import { useAuth } from "../../store/app_store";
import type { UserRole } from "../../types/types";

type NavLinkItem = {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles?: UserRole[];
  disabled?: boolean;
  badge?: string;
  badgeColor?: string;
};

export default function SidebarDrawer() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user, club, logout } = useAuth();

  const links: NavLinkItem[] = [
    { 
      to: "/dashboard", 
      label: "Dashboard", 
      icon: <LayoutDashboard className="h-4 w-4" /> 
    },

    // ✅ Entity Setup (onboarding)
    {
      to: "/entity-setup",
      label: "Entity Setup",
      icon: <Building2 className="h-4 w-4" />,
      roles: ["host", "admin"],
    },

    // ✅ Verification Status
    {
      to: "/verification-status",
      label: "Verification Status",
      icon: <CheckCircle className="h-4 w-4" />,
      roles: ["host", "admin"],
      // TODO: Add badge based on status dynamically
    },

    // ✅ Payment Setup
    {
      to: "/payment-setup",
      label: "Payment Methods",
      icon: <CreditCard className="h-4 w-4" />,
      roles: ["host", "admin"],
      disabled: true, // Will be enabled in Phase 3
    },

    // ✅ Team Management (role gated)
    {
      to: "/users",
      label: "Team Management",
      icon: <Users className="h-4 w-4" />,
      roles: ["host", "admin"],
    },

    // ✅ Placeholders
    { 
      to: "/settings", 
      label: "Account Settings", 
      icon: <Settings className="h-4 w-4" />, 
      disabled: true 
    },
    { 
      to: "/preferences", 
      label: "Preferences", 
      icon: <Sliders className="h-4 w-4" />, 
      disabled: true 
    },
  ];

  const canSee = (item: NavLinkItem) => {
    if (!item.roles) return true;
    if (!user?.role) return false;
    return item.roles.includes(user.role);
  };

  const isActive = (to: string) => location.pathname === to;

  return (
    <>
      {/* Top strip for logged-in pages (just hamburger + club) */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            <Menu className="h-5 w-5" />
            <span className="text-sm font-medium">Menu</span>
          </button>

          <div className="text-sm text-gray-600">
            {club?.name ? (
              <>
                <span className="font-semibold text-gray-900">{club.name}</span>
                {user?.role ? <span className="ml-2 opacity-80">({user.role})</span> : null}
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-80 bg-white z-50 border-r border-gray-200 shadow-xl transform transition-transform ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <div className="text-lg font-bold text-gray-900">
              {club?.name || "FundRaisely Club"}
            </div>
            <div className="text-sm text-gray-600">
              {user?.name ? `Signed in as ${user.name}` : ""}
            </div>
          </div>

          <button
            onClick={() => setOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="p-3 space-y-1">
          {links.filter(canSee).map((item) => {
            const active = isActive(item.to);

            if (item.disabled) {
              return (
                <div
                  key={item.to}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 cursor-not-allowed"
                  title="Coming soon"
                >
                  {item.icon}
                  <span className="text-sm font-medium flex-1">{item.label}</span>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    soon
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span 
                    className={`text-xs text-white px-2 py-0.5 rounded-full ${
                      item.badgeColor || 'bg-blue-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-200 bg-white">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}

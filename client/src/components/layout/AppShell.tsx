import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../store/app_store";
import SidebarDrawer from "./SidebarDrawer";

export default function AppShell() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // Public routes still use the old top nav
  const isPublicRoute =
    location.pathname === "/" || location.pathname.startsWith("/auth");

  const showSidebar = isAuthenticated && !isPublicRoute;

  return (
    <div className="min-h-screen bg-gray-50">
      {showSidebar && <SidebarDrawer />}

      {/* main content */}
      <main>{<Outlet />}</main>
    </div>
  );
}

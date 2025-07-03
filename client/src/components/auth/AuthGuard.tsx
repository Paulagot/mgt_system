// client/src/components/auth/AuthGuard.tsx
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../store/app_store';
import { apiService } from '../../services/apiService';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, user, setUser, setClub } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);

  useEffect(() => {
    const checkAuthStatus = async () => {
      // ✅ Fixed: Use 'auth_token' to match your app_store.ts
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        setIsLoading(false);
        return;
      }

      if (isAuthenticated && user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsCheckingAuth(true);
        const response = await apiService.getCurrentUser();
        
        // ✅ Fixed: Response is { user: any; club: any } directly, no .data wrapper
        setUser(response.user);
        setClub(response.club);
        
      } catch (error) {
        // Token is invalid, clear it
        // ✅ Fixed: Use 'auth_token' to match your app_store.ts
        localStorage.removeItem('auth_token');
        console.error('Auth check failed:', error);
      } finally {
        setIsCheckingAuth(false);
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, [isAuthenticated, user, setUser, setClub]);

  // Loading state while checking authentication
  if (isLoading || isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth page if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/auth" replace />;
  }

  // Render protected content
  return <>{children}</>;
}
// client/src/store/authStore.ts
import { create } from 'zustand';
import { apiService } from '../services/apiService';

interface User {
  id: string;
  club_id: string;
  name: string;
  email: string;
  role: string;
}

interface Club {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  user: User | null;
  club: Club | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  register: (data: { name: string; email: string; password: string }) => Promise<void>;
  login: (data: { email: string; password: string }) => Promise<void>;
  logout: () => void;
  getProfile: () => Promise<void>;
  setError: (error: string) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  initialize: () => void;
}

type AuthStore = AuthState & AuthActions;

const useAuthStore = create<AuthStore>((set, get) => ({
  // Initial state
  user: null,
  club: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // Initialize auth state from localStorage
  initialize: () => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      set({ 
        token, 
        isAuthenticated: true 
      });
      // Optionally get user profile on initialization
      get().getProfile().catch(() => {
        // If profile fetch fails, clear auth state
        get().logout();
      });
    }
  },

  // Register new club
  register: async (data) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await apiService.registerClub(data);
      
      // Store token in localStorage
      localStorage.setItem('auth_token', response.token);
      
      // Update state
      set({
        user: response.user,
        club: response.club,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      
      console.log('✅ Registration successful:', response.message);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      set({ 
        isLoading: false, 
        error: errorMessage,
        user: null,
        club: null,
        token: null,
        isAuthenticated: false,
      });
      
      // Remove any stored token on error
      localStorage.removeItem('auth_token');
      
      throw error; // Re-throw so the component can handle it
    }
  },

  // Login existing club
  login: async (data) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await apiService.loginClub(data);
      
      // Store token in localStorage
      localStorage.setItem('auth_token', response.token);
      
      // Update state
      set({
        user: response.user,
        club: response.club,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      
      console.log('✅ Login successful:', response.message);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      set({ 
        isLoading: false, 
        error: errorMessage,
        user: null,
        club: null,
        token: null,
        isAuthenticated: false,
      });
      
      // Remove any stored token on error
      localStorage.removeItem('auth_token');
      
      throw error; // Re-throw so the component can handle it
    }
  },

  // Logout
  logout: () => {
    localStorage.removeItem('auth_token');
    set({
      user: null,
      club: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    console.log('✅ Logged out successfully');
  },

  // Get current user profile
  getProfile: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await apiService.getCurrentUser();
      
      set({
        user: response.user,
        club: response.club,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get profile';
      set({ 
        isLoading: false, 
        error: errorMessage,
      });
      
      // If unauthorized, clear auth state
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        get().logout();
      }
      
      throw error;
    }
  },

  // Utility actions
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
  setLoading: (loading) => set({ isLoading: loading }),
}));

export default useAuthStore;
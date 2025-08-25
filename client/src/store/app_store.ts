// client/src/store/app_store.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { 
  Club, 
  User, 
  Campaign, 
  Event, 
  Supporter,
  AppState as BaseAppState 
} from '../types/types';
import { apiService } from '../services/apiService';

// API Response types that match your backend exactly
interface ApiUser {
  id: string;
  club_id: string;
  name: string;
  email: string;
  role: string;
  created_at?: string; // FIX: Added optional created_at field
}

interface ApiClub {
  id: string;
  name: string;
  email: string;
  created_at?: string; // FIX: Added optional created_at field
}

interface AuthResponse {
  message: string;
  token: string;
  user: ApiUser;
  club: ApiClub;
}

// Store interface
interface AppState extends Omit<BaseAppState, 'user' | 'club'> {
  user: User | null;
  club: Club | null;
  isAuthenticated: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setClub: (club: Club | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (clubData: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
  initialize: () => void;
  
  // Campaign actions
  setCampaigns: (campaigns: Campaign[]) => void;
  addCampaign: (campaign: Campaign) => void;
  updateCampaign: (id: string, updates: Partial<Campaign>) => void;
  deleteCampaign: (id: string) => void;
  
  // Event actions
  setEvents: (events: Event[]) => void;
  addEvent: (event: Event) => void;
  updateEvent: (id: string, updates: Partial<Event>) => void;
  deleteEvent: (id: string) => void;
  
  // Supporter actions
  setSupporters: (supporters: Supporter[]) => void;
  addSupporter: (supporter: Supporter) => void;
  updateSupporter: (id: string, updates: Partial<Supporter>) => void;
  deleteSupporter: (id: string) => void;
  
  // Utility actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Load data action
  loadClubData: () => Promise<void>;
}

// Helper functions
function convertApiUser(apiUser: ApiUser): User {
  return {
    ...apiUser,
    role: apiUser.role as User['role'],
    created_at: apiUser.created_at || new Date().toISOString(), // FIX: Provide string date or current ISO string
  };
}

function convertApiClub(apiClub: ApiClub): Club {
  return {
    ...apiClub,
    created_at: apiClub.created_at || new Date().toISOString(), // FIX: Provide string date or current ISO string
  };
}

// Zustand store
export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        club: null,
        isAuthenticated: false,
        campaigns: [],
        events: [],
        supporters: [],
        isLoading: false,
        error: null,
        
        // Auth actions
        setUser: (user) => set({ user, isAuthenticated: !!user }),
        setClub: (club) => set({ club }),
        
        initialize: () => {
          const token = localStorage.getItem('auth_token');
          console.log('🔄 Initializing auth state, token:', token ? 'Present' : 'Missing');
          if (token) {
            set({ isAuthenticated: true });
            get().loadClubData().catch((error) => {
              console.error('❌ Failed to load club data during initialization:', error);
              get().logout();
            });
          }
        },
        
        login: async (email, password) => {
          set({ isLoading: true, error: null });
          try {
            console.log('🔐 Attempting login for:', email);
            const response = await apiService.loginClub({ email, password }) as AuthResponse;
            
            localStorage.setItem('auth_token', response.token);
            console.log('✅ Login successful, token stored');
            
            const user = convertApiUser(response.user);
            const club = convertApiClub(response.club);
            
            set({
              user,
              club,
              isAuthenticated: true,
              isLoading: false,
            });
            
            // Load initial data
            await get().loadClubData();
          } catch (error) {
            console.error('❌ Login failed:', error);
            set({
              error: error instanceof Error ? error.message : 'Login failed',
              isLoading: false,
            });
            localStorage.removeItem('auth_token');
            throw error;
          }
        },

        register: async (clubData) => {
          set({ isLoading: true, error: null });
          try {
            console.log('📝 Attempting registration for:', clubData.email);
            const response = await apiService.registerClub(clubData) as AuthResponse;
            
            localStorage.setItem('auth_token', response.token);
            console.log('✅ Registration successful, token stored');
            
            const user = convertApiUser(response.user);
            const club = convertApiClub(response.club);
            
            set({
              user,
              club,
              isAuthenticated: true,
              isLoading: false,
            });
            
            // Load initial data (might be empty for new clubs)
            await get().loadClubData();
          } catch (error) {
            console.error('❌ Registration failed:', error);
            set({
              error: error instanceof Error ? error.message : 'Registration failed',
              isLoading: false,
            });
            localStorage.removeItem('auth_token');
            throw error;
          }
        },
        
        logout: () => {
          console.log('🚪 Logging out, clearing auth state');
          localStorage.removeItem('auth_token');
          set({
            user: null,
            club: null,
            isAuthenticated: false,
            campaigns: [],
            events: [],
            supporters: [],
            error: null,
          });
        },
        
        // Campaign actions
        setCampaigns: (campaigns) => set({ campaigns }),
        
        addCampaign: (campaign) => set((state) => ({
          campaigns: [...state.campaigns, campaign],
        })),
        
        updateCampaign: (id, updates) => set((state) => ({
          campaigns: state.campaigns.map((campaign) =>
            campaign.id === id ? { ...campaign, ...updates } : campaign
          ),
        })),
        
        deleteCampaign: (id) => set((state) => ({
          campaigns: state.campaigns.filter((campaign) => campaign.id !== id),
        })),
        
        // Event actions
        setEvents: (events) => set({ events }),
        
        addEvent: (event) => set((state) => ({
          events: [...state.events, event],
        })),
        
        updateEvent: (id, updates) => set((state) => ({
          events: state.events.map((event) =>
            event.id === id ? { ...event, ...updates } : event
          ),
        })),
        
        deleteEvent: (id) => set((state) => ({
          events: state.events.filter((event) => event.id !== id),
        })),
        
        // Supporter actions
        setSupporters: (supporters) => set({ supporters }),
        
        addSupporter: (supporter) => set((state) => ({
          supporters: [...state.supporters, supporter],
        })),
        
        updateSupporter: (id, updates) => set((state) => ({
          supporters: state.supporters.map((supporter) =>
            supporter.id === id ? { ...supporter, ...updates } : supporter
          ),
        })),
        
        deleteSupporter: (id) => set((state) => ({
          supporters: state.supporters.filter((supporter) => supporter.id !== id),
        })),
        
        // Utility actions
        setLoading: (isLoading) => set({ isLoading }),
        setError: (error) => set({ error }),
        clearError: () => set({ error: null }),
        
        // FIXED: Load all club data with correct response format handling
        loadClubData: async () => {
          const { club } = get();
          if (!club?.id) {
            console.log('⚠️ No club ID found, skipping data load');
            return;
          }
          
          console.log('📊 Loading club data for club:', club.id);
          set({ isLoading: true });
          
          try {
            const [campaignResponse, eventResponse, supporterResponse] = await Promise.all([
              apiService.getClubCampaigns(club.id),
              apiService.getClubEvents(club.id),
              apiService.getClubSupporters(club.id),
            ]);
            
            console.log('📋 Campaign response:', campaignResponse);
            console.log('📅 Event response:', eventResponse);
            console.log('👥 Supporter response:', supporterResponse);
            
            // FIXED: Handle correct response format from backend
            set({
              campaigns: campaignResponse.campaigns || [],
              events: eventResponse.events || [],
              supporters: supporterResponse.supporters || [],
              isLoading: false,
            });
            
            console.log('✅ Club data loaded successfully');
          } catch (error) {
            console.error('❌ Failed to load club data:', error);
            set({
              error: error instanceof Error ? error.message : 'Failed to load data',
              isLoading: false,
            });
          }
        },
        
      }),
      {
        name: 'fundraisely-storage',
        partialize: (state) => ({
          user: state.user,
          club: state.club,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    {
      name: 'fundraisely-store',
    }
  )
);

// Selector hooks
export const useAuth = () => useAppStore((state) => ({
  user: state.user,
  club: state.club,
  isAuthenticated: state.isAuthenticated,
  login: state.login,
  register: state.register,
  logout: state.logout,
  setUser: state.setUser,
  setClub: state.setClub,
  initialize: state.initialize,
}));

export const useCampaigns = () => useAppStore((state) => ({
  campaigns: state.campaigns,
  addCampaign: state.addCampaign,
  updateCampaign: state.updateCampaign,
  deleteCampaign: state.deleteCampaign,
}));

export const useEvents = () => useAppStore((state) => ({
  events: state.events,
  addEvent: state.addEvent,
  updateEvent: state.updateEvent,
  deleteEvent: state.deleteEvent,
}));

export const useSupporters = () => useAppStore((state) => ({
  supporters: state.supporters,
  addSupporter: state.addSupporter,
  updateSupporter: state.updateSupporter,
  deleteSupporter: state.deleteSupporter,
}));

export const useUI = () => useAppStore((state) => ({
  isLoading: state.isLoading,
  error: state.error,
  setLoading: state.setLoading,
  setError: state.setError,
  clearError: state.clearError,
}));
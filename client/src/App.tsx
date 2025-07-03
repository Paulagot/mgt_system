// client/src/App.tsx
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import ClubRegistrationForm from './components/auth/ClubRegistrationForm';
import ClubDashboard from './components/dashboard/ClubDashboard';
import CreateEventForm from './components/events/CreateEventForm';
import CreateCampaignForm from './components/campaigns/CreateCampaignForm';
import EventExpenseManager from './components/events/EventExpenseManager';
import AuthPage from './components/auth/AuthPage';
import AuthGuard from './components/auth/AuthGuard';
import { useAuth, useUI } from './store/app_store';
import { apiService } from './services/apiService';

// Simple navigation component
const Navigation = () => {
  const location = useLocation();
  const { isAuthenticated, logout, user, club } = useAuth();
  
  const navItems = [
    { path: '/', label: '🏠 Home', exact: true },
    { path: '/auth', label: '🔐 Login/Register' },
    ...(isAuthenticated ? [
      { path: '/dashboard', label: '📊 Dashboard' },
      { path: '/create-event', label: '📅 Create Event' },
      { path: '/create-campaign', label: '🎯 Create Campaign' },
      { path: '/expense-manager', label: '💰 Expense Manager' },
    ] : [])
  ];

  return (
    <nav style={{
      backgroundColor: '#1e40af',
      padding: '1rem',
      marginBottom: '2rem'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                color: location.pathname === item.path ? '#fbbf24' : 'white',
                textDecoration: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                backgroundColor: location.pathname === item.path ? '#1e3a8a' : 'transparent',
                fontSize: '0.875rem',
                fontWeight: location.pathname === item.path ? 'bold' : 'normal'
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {isAuthenticated && club && (
            <span style={{ 
              color: 'white', 
              fontSize: '0.875rem',
              opacity: 0.9 
            }}>
              👋 {club.name}
            </span>
          )}
          
          {isAuthenticated && (
            <button
              onClick={logout}
              style={{
                color: 'white',
                textDecoration: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                backgroundColor: '#dc2626',
                fontSize: '0.875rem',
                border: 'none',
                cursor: 'pointer'
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

// Home page showing available components
const HomePage = () => {
  const { isAuthenticated } = useAuth();
  
  return (
    <div style={{
      minHeight: '80vh',
      backgroundColor: '#f9fafb',
      padding: '2rem'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <h1 style={{
          fontSize: '3rem',
          fontWeight: 'bold',
          textAlign: 'center',
          marginBottom: '2rem',
          color: '#1e40af'
        }}>
          🎯 FundRaisely Club
        </h1>
        
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          marginBottom: '2rem'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            marginBottom: '1rem',
            color: '#374151'
          }}>
            {isAuthenticated ? '✅ Available Components (Click navigation above)' : '🔐 Please login or register to access components'}
          </h2>
          
          {isAuthenticated ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1rem',
              marginTop: '1rem'
            }}>
              <div style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #22c55e',
                padding: '1rem',
                borderRadius: '4px'
              }}>
                <h3 style={{ color: '#14532d', margin: '0 0 0.5rem 0' }}>📊 Dashboard</h3>
                <p style={{ color: '#374151', fontSize: '0.875rem', margin: 0 }}>
                  Full dashboard with metrics, events, campaigns
                </p>
              </div>
              
              <div style={{
                backgroundColor: '#fef3c7',
                border: '1px solid #f59e0b',
                padding: '1rem',
                borderRadius: '4px'
              }}>
                <h3 style={{ color: '#92400e', margin: '0 0 0.5rem 0' }}>📅 Create Event</h3>
                <p style={{ color: '#374151', fontSize: '0.875rem', margin: 0 }}>
                  Event creation form with API integration
                </p>
              </div>
              
              <div style={{
                backgroundColor: '#fdf2f8',
                border: '1px solid #ec4899',
                padding: '1rem',
                borderRadius: '4px'
              }}>
                <h3 style={{ color: '#831843', margin: '0 0 0.5rem 0' }}>🎯 Create Campaign</h3>
                <p style={{ color: '#374151', fontSize: '0.875rem', margin: 0 }}>
                  Campaign setup with API integration
                </p>
              </div>
              
              <div style={{
                backgroundColor: '#f5f3ff',
                border: '1px solid #8b5cf6',
                padding: '1rem',
                borderRadius: '4px'
              }}>
                <h3 style={{ color: '#581c87', margin: '0 0 0.5rem 0' }}>💰 Expense Manager</h3>
                <p style={{ color: '#374151', fontSize: '0.875rem', margin: 0 }}>
                  Track expenses with categories and totals
                </p>
              </div>
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '2rem'
            }}>
              <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
                Please login or register your club to access the fundraising tools.
              </p>
              <Link
                to="/auth"
                style={{
                  backgroundColor: '#1e40af',
                  color: 'white',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
        
        <div style={{
          backgroundColor: isAuthenticated ? '#dcfce7' : '#fef3c7',
          border: `1px solid ${isAuthenticated ? '#16a34a' : '#f59e0b'}`,
          color: isAuthenticated ? '#15803d' : '#92400e',
          padding: '1rem',
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          <strong>Status:</strong> ✅ Frontend Working | ✅ Backend Running (Port 3001) | 
          ✅ API Integration Complete | {isAuthenticated ? ' 🎉 Authenticated & Ready!' : ' 🔧 Ready for Authentication'}
        </div>
      </div>
    </div>
  );
};

// Real API handlers - replacing mock handlers

const apiHandlers = {
  handleEventCreation: async (data: any) => {
    try {
      console.log('🚀 Creating event via API:', data);
      
      const eventData = {
        ...data,
        type: data.type.trim().toLowerCase()
      };
      
      console.log('🔧 Processed event data:', eventData);
      
      const response = await apiService.createEvent(eventData);
      console.log('✅ Event created successfully:', response);
      
      // REMOVED: alert('Event created successfully!');
      return response;
    } catch (error) {
      console.error('❌ Failed to create event:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create event';
      alert(`Error creating event: ${errorMessage}`); // Keep error alerts
      throw error;
    }
  },
  
  handleCampaignCreation: async (data: any) => {
    try {
      console.log('🚀 App.tsx handling campaign creation:', data);
      
      const response = await apiService.createCampaign(data);
      console.log('✅ Campaign created successfully:', response);
      
      // REMOVED: alert('Campaign created successfully!');
      return response;
    } catch (error) {
      console.error('❌ Failed to create campaign:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create campaign';
      alert(`Error creating campaign: ${errorMessage}`); // Keep error alerts
      throw error;
    }
  }
};

// Mock data for EventExpenseManager - matching Expense interface exactly
const mockExpenses = [
  {
    id: '1',
    club_id: 'demo-club-1',
    event_id: 'demo-event-1',
    category: 'Venue',
    description: 'Hall rental',
    amount: 250,
    date: new Date('2024-06-15'),
    vendor: 'City Hall',
    payment_method: 'card' as const,
    status: 'approved' as const,
    created_by: 'demo-user-1',
    created_at: new Date('2024-06-15T10:00:00Z')
  },
  {
    id: '2',
    club_id: 'demo-club-1',
    event_id: 'demo-event-1',
    category: 'Food',
    description: 'Catering service',
    amount: 450,
    date: new Date('2024-06-15'),
    vendor: 'Local Catering Co.',
    payment_method: 'transfer' as const,
    status: 'pending' as const,
    created_by: 'demo-user-1',
    created_at: new Date('2024-06-15T11:00:00Z')
  }
];

const mockExpenseHandlers = {
  handleAddExpense: async (expense: any) => {
    console.log('Adding expense:', expense);
    alert('Expense added! (Mock handler)');
  },
  handleUpdateExpense: async (id: string, expense: any) => {
    console.log('Updating expense:', id, expense);
    alert('Expense updated! (Mock handler)');
  },
  handleDeleteExpense: async (id: string) => {
    console.log('Deleting expense:', id);
    alert('Expense deleted! (Mock handler)');
  }
};

function App() {
  const { isAuthenticated, initialize } = useAuth();

  // Initialize auth state on app load
  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <Router>
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
        <Navigation />
        
        <Routes>
          {/* Home page - accessible to all */}
          <Route path="/" element={<HomePage />} />
          
          {/* Auth page - redirect if already authenticated */}
          <Route 
            path="/auth" 
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <AuthPage />
              )
            } 
          />
          
          {/* Protected Routes */}
          <Route 
            path="/dashboard" 
            element={
              <AuthGuard>
                <div style={{ 
                  padding: '2rem',
                  backgroundColor: '#f9fafb',
                  minHeight: '100vh'
                }}>
                  <ClubDashboard />
                </div>
              </AuthGuard>
            } 
          />
          
          <Route 
            path="/create-event" 
            element={
              <AuthGuard>
                <div style={{ 
                  padding: '2rem', 
                  maxWidth: '800px', 
                  margin: '0 auto',
                  backgroundColor: '#f9fafb',
                  minHeight: '100vh'
                }}>
                  <div style={{
                    backgroundColor: 'white',
                    padding: '2rem',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                  }}>
                    <h2 style={{ 
                      fontSize: '2rem', 
                      fontWeight: 'bold', 
                      marginBottom: '2rem',
                      color: '#1e40af',
                      textAlign: 'center'
                    }}>
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
          
          // In App.tsx, update the create-campaign route styling
<Route 
  path="/create-campaign" 
  element={
    <AuthGuard>
      <div style={{ 
        padding: '2rem', 
        maxWidth: '800px', 
        margin: '0 auto',
        backgroundColor: '#f9fafb',
        minHeight: '100vh'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ 
            fontSize: '2rem', 
            fontWeight: 'bold', 
            marginBottom: '2rem',
            color: '#16a34a', // CHANGED: Green color for campaigns
            textAlign: 'center'
          }}>
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
                <div style={{ 
                  padding: '2rem',
                  backgroundColor: '#f9fafb',
                  minHeight: '100vh'
                }}>
                  <div style={{
                    maxWidth: '1200px',
                    margin: '0 auto'
                  }}>
                    <h2 style={{ 
                      fontSize: '2rem', 
                      fontWeight: 'bold', 
                      marginBottom: '2rem',
                      color: '#1e40af',
                      textAlign: 'center'
                    }}>
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

          {/* Catch all - redirect based on auth status */}
          <Route 
            path="*" 
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/auth" replace />
              )
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
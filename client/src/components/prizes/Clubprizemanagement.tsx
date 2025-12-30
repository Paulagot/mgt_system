// client/src/components/prizes/ClubPrizeManagement.tsx
import React, { useState, useEffect } from 'react';
import { Prize, CreatePrizeData, Event, Supporter } from '../../types/types';
import prizeService from '../../services/prizeServices';
import supporterService from '../../services/supporterService';
import { useAuth } from '../../store/app_store';
import CreatePrizeForm from './CreatePrizeForm';

interface ClubPrizeManagementProps {
  events: Event[];
  clubId: string;
}

interface PrizeStats {
  total: number;
  totalValue: number;
  confirmed: number;
  pending: number;
  byEvent: Record<string, { count: number; value: number }>;
}

const ClubPrizeManagement: React.FC<ClubPrizeManagementProps> = ({ events, clubId }) => {
  const { user: currentUser } = useAuth();

  // State management
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'pending'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'value' | 'date' | 'status'>('value');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Modal state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [prizeToEdit, setPrizeToEdit] = useState<Prize | null>(null);
  const [eventForNewPrize, setEventForNewPrize] = useState<string>('');
  const [confirmModal, setConfirmModal] = useState<{ 
    isOpen: boolean; 
    prize?: Prize; 
    action?: 'delete' | 'confirm' 
  }>({ isOpen: false });

  // Load data on mount
  useEffect(() => {
    loadAllPrizes();
    loadSupporters();
  }, [clubId]);

  const loadAllPrizes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load prizes for all events
      const allPrizes: Prize[] = [];
      
      for (const event of events) {
        try {
          const response = await prizeService.getPrizes(event.id);
          if (response.prizes) {
            allPrizes.push(...response.prizes);
          }
        } catch (err) {
          console.error(`Failed to load prizes for event ${event.id}:`, err);
        }
      }
      
      setPrizes(prizeService.sortPrizes(allPrizes, sortBy));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prizes');
    } finally {
      setLoading(false);
    }
  };

  const loadSupporters = async () => {
    if (!currentUser?.club_id) return;
    
    try {
      const response = await supporterService.getSupportersByClub(currentUser.club_id);
      setSupporters(response.supporters || []);
    } catch (err) {
      console.error('Failed to load supporters:', err);
    }
  };

  const handleCreatePrize = (eventId?: string) => {
    if (events.length === 0) {
      setError('Please create an event first');
      return;
    }
    
    setEventForNewPrize(eventId || events[0]?.id || '');
    setShowCreateForm(true);
  };

  const handleEditPrize = (prize: Prize) => {
    setPrizeToEdit(prize);
    setShowEditForm(true);
  };

  const handleDeletePrize = (prize: Prize) => {
    setConfirmModal({ isOpen: true, prize, action: 'delete' });
  };

  const handleConfirmPrize = (prize: Prize) => {
    setConfirmModal({ isOpen: true, prize, action: 'confirm' });
  };

  const handleCreateSubmit = async (data: CreatePrizeData) => {
    if (!eventForNewPrize) return;
    
    try {
      await prizeService.createPrize(eventForNewPrize, data);
      await loadAllPrizes();
      setShowCreateForm(false);
    } catch (err) {
      throw err;
    }
  };

  const handleEditSubmit = async (data: CreatePrizeData) => {
    if (!prizeToEdit) return;
    
    try {
      await prizeService.updatePrize(prizeToEdit.event_id, prizeToEdit.id, data);
      await loadAllPrizes();
      setShowEditForm(false);
      setPrizeToEdit(null);
    } catch (err) {
      throw err;
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmModal.prize) return;

    try {
      if (confirmModal.action === 'delete') {
        await prizeService.deletePrize(confirmModal.prize.event_id, confirmModal.prize.id);
      } else if (confirmModal.action === 'confirm') {
        await prizeService.confirmPrize(confirmModal.prize.id);
      }
      
      setConfirmModal({ isOpen: false });
      await loadAllPrizes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
      setConfirmModal({ isOpen: false });
    }
  };

  // Handle sort change
  useEffect(() => {
    setPrizes(prev => prizeService.sortPrizes([...prev], sortBy));
  }, [sortBy]);

  // Filter prizes by selected event
  let displayPrizes = prizes;
  if (selectedEventId !== 'all') {
    displayPrizes = prizes.filter(prize => prize.event_id === selectedEventId);
  }

  // Apply filters and search
  const filteredPrizes = prizeService.filterPrizes(displayPrizes, {
    confirmed: statusFilter === 'all' ? undefined : statusFilter === 'confirmed',
    search: searchTerm
  });

  // Calculate stats with proper number conversion
  const stats: PrizeStats = {
    total: displayPrizes.length,
    totalValue: displayPrizes.reduce((sum, p) => sum + (parseFloat(String(p.value)) || 0), 0),
    confirmed: displayPrizes.filter(p => p.confirmed).length,
    pending: displayPrizes.filter(p => !p.confirmed).length,
    byEvent: {}
  };

  // Calculate per-event stats with proper number conversion
  events.forEach(event => {
    const eventPrizes = prizes.filter(p => p.event_id === event.id);
    stats.byEvent[event.id] = {
      count: eventPrizes.length,
      value: eventPrizes.reduce((sum, p) => sum + (parseFloat(String(p.value)) || 0), 0)
    };
  });

  const canManagePrizes = ['host', 'admin', 'treasurer'].includes(currentUser?.role || '');
  const selectedEvent = events.find(e => e.id === selectedEventId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Events Yet</h3>
        <p className="text-gray-500 mb-6">Create an event first before adding prizes</p>
        <button
          onClick={() => window.location.hash = '#events'}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
        >
          Go to Events
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Prize Management</h2>
            <p className="text-gray-600 mt-1">Manage prizes across all your events</p>
          </div>
          {canManagePrizes && (
            <button
              onClick={() => handleCreatePrize()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Add Prize
            </button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Prizes</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">£{stats.totalValue.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Total Value</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.confirmed}</div>
            <div className="text-sm text-gray-600">Confirmed</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Event Filter */}
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Events ({prizes.length} prizes)</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>
                  {event.title} ({stats.byEvent[event.id]?.count || 0})
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'confirmed' | 'pending')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
            </select>

            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'value' | 'date' | 'status')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="value">Sort by Value</option>
              <option value="name">Sort by Name</option>
              <option value="date">Sort by Date</option>
              <option value="status">Sort by Status</option>
            </select>

            {/* Search */}
            <input
              type="text"
              placeholder="Search prizes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              title="Grid View"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              title="List View"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Prizes Display */}
      {viewMode === 'grid' ? (
        <div className="bg-white rounded-lg shadow-sm">
          {filteredPrizes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-4">🏆</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No prizes found</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Start by adding your first prize'}
              </p>
              {canManagePrizes && !searchTerm && statusFilter === 'all' && (
                <button
                  onClick={() => handleCreatePrize()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
                >
                  Add First Prize
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {filteredPrizes.map((prize: Prize) => {
                const formatted = prizeService.formatPrizeForDisplay(prize);
                const event = events.find(e => e.id === prize.event_id);
                
                return (
                  <div key={prize.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-gray-900 truncate pr-2">{prize.name}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        prize.confirmed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {prize.confirmed ? '✓ Confirmed' : '⏳ Pending'}
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Value:</span>
                        <span className="font-medium text-gray-900">£{prize.value.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Donated by:</span>
                        <span className="font-medium text-gray-900 truncate ml-2">{prize.donor_name || 'Anonymous'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Event:</span>
                        <span className="font-medium text-gray-900 truncate ml-2">{event?.title || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Added:</span>
                        <span className="text-gray-700">{new Date(prize.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {canManagePrizes && (
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditPrize(prize)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Edit
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={() => handleDeletePrize(prize)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </div>
                        
                        {!prize.confirmed && (
                          <button
                            onClick={() => handleConfirmPrize(prize)}
                            className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1 rounded text-sm font-medium"
                          >
                            Confirm
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        // List View
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {filteredPrizes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-4">🏆</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No prizes found</h3>
              <p className="text-gray-500">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredPrizes.map((prize: Prize) => {
                const formatted = prizeService.formatPrizeForDisplay(prize);
                const event = events.find(e => e.id === prize.event_id);
                
                return (
                  <div key={prize.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-gray-900">{prize.name}</h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${formatted.status_bg} ${formatted.status_color}`}>
                            {formatted.status_display}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                          <span>💰 £{prize.value.toLocaleString()}</span>
                          <span>👤 {prize.donor_name || 'Anonymous'}</span>
                          <span>🎯 {event?.title || 'Unknown Event'}</span>
                          <span>📅 {new Date(prize.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {canManagePrizes && (
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => handleEditPrize(prize)}
                            className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                            title="Edit"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeletePrize(prize)}
                            className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                            title="Delete"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                          {!prize.confirmed && (
                            <button
                              onClick={() => handleConfirmPrize(prize)}
                              className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1 rounded text-sm font-medium"
                            >
                              Confirm
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create Prize Form Modal */}
      {showCreateForm && (
        <CreatePrizeForm
          onSubmit={handleCreateSubmit}
          onCancel={() => setShowCreateForm(false)}
          eventTitle={events.find(e => e.id === eventForNewPrize)?.title}
        />
      )}

      {/* Edit Prize Form Modal */}
      {showEditForm && prizeToEdit && (
        <CreatePrizeForm
          onSubmit={handleEditSubmit}
          onCancel={() => {
            setShowEditForm(false);
            setPrizeToEdit(null);
          }}
          editMode={true}
          existingPrize={prizeToEdit}
          eventTitle={events.find(e => e.id === prizeToEdit.event_id)?.title}
        />
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && confirmModal.prize && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full sm:mx-0 sm:h-10 sm:w-10 ${
                    confirmModal.action === 'delete' ? 'bg-red-100' : 'bg-green-100'
                  }`}>
                    {confirmModal.action === 'delete' ? (
                      <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    ) : (
                      <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      {confirmModal.action === 'delete' ? 'Delete Prize' : 'Confirm Prize'}
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        {confirmModal.action === 'delete' 
                          ? `Are you sure you want to delete "${confirmModal.prize.name}"? This action cannot be undone.`
                          : `Confirm that "${confirmModal.prize.name}" has been received and is ready for the event?`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleConfirmAction}
                  className={`w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${
                    confirmModal.action === 'delete'
                      ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                      : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                  }`}
                >
                  {confirmModal.action === 'delete' ? 'Delete' : 'Confirm'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmModal({ isOpen: false })}
                  className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClubPrizeManagement;
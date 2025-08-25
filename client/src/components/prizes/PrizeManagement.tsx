//client/src/components/prizes/PrizeManagement.tsx

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Prize, CreatePrizeData, PrizeFormState, ModalState, Supporter, Event } from '../../types/types';

import prizeService from '../../services/prizeServices';
import supporterService from '../../services/supporterService';
import { useAuth } from '../../store/app_store';
import { apiService } from '../../services/apiService';

interface PrizeStats {
  total: number;
  totalValue: number;
  confirmed: number;
  pending: number;
}

const PrizeManagement: React.FC = () => {
  const { eventId: urlEventId } = useParams<{ eventId: string }>();
  const { user: currentUser } = useAuth();
  
  // State management
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(urlEventId || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'pending'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'value' | 'date' | 'status'>('date');
  
  // Modal and form state
  const [prizeModal, setPrizeModal] = useState<ModalState>({ isOpen: false, mode: 'create' });
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; prize?: Prize; action?: 'delete' | 'confirm' }>({ isOpen: false });
  const [formState, setFormState] = useState<PrizeFormState>({
    name: '',
    value: 0,
    donated_by: '',
    isSubmitting: false,
    errors: {}
  });

  // Load data on component mount
  useEffect(() => {
    loadEvents();
    loadSupporters();
  }, []);

  // Load prizes when selected event changes
  useEffect(() => {
    if (selectedEventId) {
      loadPrizes();
    } else {
      setPrizes([]);
      setLoading(false);
    }
  }, [selectedEventId]);

  const loadEvents = async () => {
    if (!currentUser?.club_id) return;
    
    try {
      setLoading(true);
      const response = await apiService.getClubEvents(currentUser.club_id);
      setEvents(response.events || []);
      
      // If no event is selected and we have events, select the first one
      if (!selectedEventId && response.events && response.events.length > 0) {
        setSelectedEventId(response.events[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
    }
  };

  const loadPrizes = async () => {
    if (!selectedEventId) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await prizeService.getPrizes(selectedEventId);
      setPrizes(prizeService.sortPrizes(response.prizes || [], sortBy));
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

  const handleCreatePrize = () => {
    if (!selectedEventId) {
      setError('Please select an event first');
      return;
    }
    
    setFormState({
      name: '',
      value: 0,
      donated_by: '',
      isSubmitting: false,
      errors: {}
    });
    setPrizeModal({ isOpen: true, mode: 'create' });
  };

  const handleEditPrize = (prize: Prize) => {
    setFormState({
      name: prize.name,
      value: prize.value,
      donated_by: prize.donated_by || '',
      isSubmitting: false,
      errors: {}
    });
    setPrizeModal({ isOpen: true, mode: 'edit', item: prize });
  };

  const handleDeletePrize = (prize: Prize) => {
    setConfirmModal({ isOpen: true, prize, action: 'delete' });
  };

  const handleConfirmPrize = (prize: Prize) => {
    setConfirmModal({ isOpen: true, prize, action: 'confirm' });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return;
    
    const prizeData: CreatePrizeData = {
      name: formState.name.trim(),
      value: formState.value,
      donated_by: formState.donated_by || undefined
    };

    const validationErrors = prizeService.validatePrizeData(prizeData);
    if (validationErrors.length > 0) {
      setFormState(prev => ({
        ...prev,
        errors: { general: validationErrors.join(', ') }
      }));
      return;
    }

    setFormState(prev => ({ ...prev, isSubmitting: true, errors: {} }));

    try {
      if (prizeModal.mode === 'create') {
        await prizeService.createPrize(selectedEventId, prizeData);
      } else if (prizeModal.item) {
        await prizeService.updatePrize(selectedEventId, prizeModal.item.id, prizeData);
      }
      
      setPrizeModal({ isOpen: false, mode: 'create' });
      await loadPrizes();
    } catch (err) {
      setFormState(prev => ({
        ...prev,
        errors: { general: err instanceof Error ? err.message : 'Operation failed' }
      }));
    } finally {
      setFormState(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmModal.prize) return;

    try {
      if (confirmModal.action === 'delete') {
        if (!selectedEventId) return;
        await prizeService.deletePrize(selectedEventId, confirmModal.prize.id);
      } else if (confirmModal.action === 'confirm') {
        await prizeService.confirmPrize(confirmModal.prize.id);
      }
      
      setConfirmModal({ isOpen: false });
      await loadPrizes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
      setConfirmModal({ isOpen: false });
    }
  };

  // Handle sort change
  useEffect(() => {
    setPrizes(prev => prizeService.sortPrizes([...prev], sortBy));
  }, [sortBy]);

  // Filter and search prizes
  const filteredPrizes = prizeService.filterPrizes(prizes, {
    confirmed: statusFilter === 'all' ? undefined : statusFilter === 'confirmed',
    search: searchTerm
  });

  // Calculate stats
  const stats: PrizeStats = {
    total: prizes.length,
    totalValue: prizes.reduce((sum, p) => sum + p.value, 0),
    confirmed: prizes.filter(p => p.confirmed).length,
    pending: prizes.filter(p => !p.confirmed).length
  };

  const canManagePrizes = ['host', 'admin', 'treasurer'].includes(currentUser?.role || '');
  const selectedEvent = events.find(e => e.id === selectedEventId);

  if (loading && events.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Prize Management</h2>
          <p className="text-gray-600">Manage event prizes and donations</p>
        </div>
        
        {canManagePrizes && selectedEventId && (
          <button
            onClick={handleCreatePrize}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <span>+</span>
            <span>Add Prize</span>
          </button>
        )}
      </div>

      {/* Event Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Select Event:</label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="flex-1 max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Choose an event...</option>
            {events.map((event: Event) => (
              <option key={event.id} value={event.id}>
                {event.title} ({new Date(event.event_date).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>
        
        {selectedEvent && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span><strong>Selected:</strong> {selectedEvent.title}</span>
              <span><strong>Date:</strong> {new Date(selectedEvent.event_date).toLocaleDateString()}</span>
              <span><strong>Goal:</strong> £{selectedEvent.goal_amount.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Show stats only if event is selected */}
      {selectedEventId && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500">Total Prizes</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-green-600">£{stats.totalValue.toLocaleString()}</div>
            <div className="text-sm text-gray-500">Total Value</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-blue-600">{stats.confirmed}</div>
            <div className="text-sm text-gray-500">Confirmed</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-gray-500">Pending</div>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Show content only if event is selected */}
      {!selectedEventId ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-gray-400 text-4xl mb-4">🏆</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Event</h3>
          <p className="text-gray-500">
            Choose an event from the dropdown above to manage its prizes
          </p>
        </div>
      ) : (
        <>
          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search prizes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="sm:w-40">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'confirmed' | 'pending')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Prizes</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div className="sm:w-40">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'value' | 'date' | 'status')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="date">Sort by Date</option>
                <option value="name">Sort by Name</option>
                <option value="value">Sort by Value</option>
                <option value="status">Sort by Status</option>
              </select>
            </div>
          </div>

          {/* Prizes Grid */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredPrizes.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-4xl mb-4">🏆</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No prizes found</h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Start by adding your first prize'}
                </p>
                {canManagePrizes && !searchTerm && statusFilter === 'all' && (
                  <button
                    onClick={handleCreatePrize}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
                  >
                    Add First Prize
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                {filteredPrizes.map((prize: Prize) => {
                  const formattedPrize = prizeService.formatPrizeForDisplay(prize);
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
        </>
      )}

      {/* Prize Form Modal */}
      {prizeModal.isOpen && selectedEventId && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleFormSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="mb-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      {prizeModal.mode === 'create' ? 'Add New Prize' : 'Edit Prize'}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {prizeModal.mode === 'create' 
                        ? `Add a new prize for ${selectedEvent?.title}` 
                        : 'Update prize information'}
                    </p>
                  </div>

                  {formState.errors.general && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                      {formState.errors.general}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                        Prize Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={formState.name}
                        onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter prize name"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="value" className="block text-sm font-medium text-gray-700 mb-1">
                        Prize Value (£)
                      </label>
                      <input
                        type="number"
                        id="value"
                        min="0"
                        step="0.01"
                        value={formState.value}
                        onChange={(e) => setFormState(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                      />
                      <p className="mt-1 text-sm text-gray-500">Leave as 0 if value is not specified</p>
                    </div>

                    <div>
                      <label htmlFor="donated_by" className="block text-sm font-medium text-gray-700 mb-1">
                        Donated By
                      </label>
                      <select
                        id="donated_by"
                        value={formState.donated_by}
                        onChange={(e) => setFormState(prev => ({ ...prev, donated_by: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Anonymous / Not specified</option>
                        {supporters.map((supporter: Supporter) => (
                          <option key={supporter.id} value={supporter.id}>
                            {supporter.name} {supporter.email && `(${supporter.email})`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={formState.isSubmitting}
                    className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {formState.isSubmitting ? 'Saving...' : (prizeModal.mode === 'create' ? 'Add Prize' : 'Save Changes')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrizeModal({ isOpen: false, mode: 'create' })}
                    className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
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

export default PrizeManagement;

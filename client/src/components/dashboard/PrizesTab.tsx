// client/src/components/prizes/PrizesTab.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Gift, Search } from 'lucide-react';
import PrizeCard from '../cards/PrizeCard';
import CreatePrizeForm from '../prizes/CreatePrizeForm';
import { Prize, CreatePrizeData, Event } from '../../types/types';
import prizeService from '../../services/prizeServices';
import { useAuth } from '../../store/app_store';

interface PrizesTabProps {
  events: Event[];
  selectedEventId?: string;
  onEventSelect?: (eventId: string) => void;
}

const PrizesTab: React.FC<PrizesTabProps> = ({
  events,
  selectedEventId,
  onEventSelect
}) => {
  const { user } = useAuth();
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [currentEventId, setCurrentEventId] = useState(selectedEventId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'pending'>('all');
  
  // Form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [prizeToEdit, setPrizeToEdit] = useState<Prize | null>(null);

  // Load prizes when event changes
  const loadPrizes = useCallback(async () => {
    if (!currentEventId) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await prizeService.getPrizes(currentEventId);
      setPrizes(response.prizes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prizes');
    } finally {
      setLoading(false);
    }
  }, [currentEventId]);

  useEffect(() => {
    if (currentEventId) {
      loadPrizes();
    } else {
      setPrizes([]);
    }
  }, [currentEventId, loadPrizes]);

  const handleEventSelect = (eventId: string) => {
    setCurrentEventId(eventId);
    onEventSelect?.(eventId);
  };

  const handleCreatePrize = async (prizeData: CreatePrizeData) => {
    if (!currentEventId) throw new Error('No event selected');
    
    await prizeService.createPrize(currentEventId, prizeData);
    await loadPrizes();
  };

  const handleEditPrize = (prize: Prize) => {
    setPrizeToEdit(prize);
    setShowEditForm(true);
  };

  const handleUpdatePrize = async (prizeData: CreatePrizeData) => {
    if (!prizeToEdit || !currentEventId) return;
    
    await prizeService.updatePrize(currentEventId, prizeToEdit.id, prizeData);
    await loadPrizes();
  };

  const handleDeletePrize = async (prizeId: string) => {
    if (!currentEventId) return;
    
    if (window.confirm('Are you sure you want to delete this prize?')) {
      try {
        await prizeService.deletePrize(currentEventId, prizeId);
        await loadPrizes();
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to delete prize');
      }
    }
  };

  const handleConfirmPrize = async (prizeId: string) => {
    try {
      await prizeService.confirmPrize(prizeId);
      await loadPrizes();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to confirm prize');
    }
  };

  // Filter prizes
  const filteredPrizes = prizes.filter(prize => {
    const matchesSearch = prize.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (prize.donor_name && prize.donor_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'confirmed' && prize.confirmed) ||
                         (statusFilter === 'pending' && !prize.confirmed);
    
    return matchesSearch && matchesStatus;
  });

  const canManagePrizes = ['host', 'admin', 'treasurer'].includes(user?.role || '');
  const selectedEvent = events.find(e => e.id === currentEventId);

  // Calculate stats
  const stats = {
    total: prizes.length,
    totalValue: prizes.reduce((sum, p) => sum + Number(p.value || 0), 0),
    confirmed: prizes.filter(p => p.confirmed).length,
    pending: prizes.filter(p => !p.confirmed).length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Prize Management</h2>
          <p className="text-gray-600">Manage event prizes and donations</p>
        </div>
        
        {canManagePrizes && currentEventId && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Prize</span>
          </button>
        )}
      </div>

      {/* Event Selection */}
 <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
    <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Select Event:</label>
    <select
      value={selectedEventId}
      onChange={(e) => handleEventSelect(e.target.value)}
      className="flex-1 w-full sm:max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    >
            <option value="">Choose an event...</option>
            {events.map((event) => (
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

      {/* Show content only if event is selected */}
      {currentEventId ? (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
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

          {/* Error display */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search prizes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
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
          </div>

          {/* Prizes Grid */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredPrizes.length === 0 ? (
              <div className="text-center py-12">
                <Gift className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">No prizes found</h3>
                <p className="mt-1 text-sm text-gray-500 mb-6">
                  {searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Start by adding your first prize'}
                </p>
                {canManagePrizes && !searchTerm && statusFilter === 'all' && (
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
                  >
                    Add First Prize
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 sm:p-6">
                {filteredPrizes.map((prize) => (
                  <PrizeCard
                    key={prize.id}
                    prize={prize}
                    onEdit={handleEditPrize}
                    onDelete={handleDeletePrize}
                    onConfirm={handleConfirmPrize}
                    canManage={canManagePrizes}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Gift className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Select an Event</h3>
          <p className="mt-1 text-sm text-gray-500">
            Choose an event from the dropdown above to manage its prizes
          </p>
        </div>
      )}

      {/* Create Prize Form */}
      {showCreateForm && (
        <CreatePrizeForm
          onSubmit={handleCreatePrize}
          onCancel={() => setShowCreateForm(false)}
          eventTitle={selectedEvent?.title}
        />
      )}

      {/* Edit Prize Form */}
      {showEditForm && prizeToEdit && (
        <CreatePrizeForm
          onSubmit={handleUpdatePrize}
          onCancel={() => {
            setShowEditForm(false);
            setPrizeToEdit(null);
          }}
          editMode={true}
          existingPrize={prizeToEdit}
          eventTitle={selectedEvent?.title}
        />
      )}
    </div>
  );
};

export default PrizesTab;
// client/src/components/impact/EventImpactManager.tsx
import React, { useState, useEffect } from 'react';
import { Plus, Eye, Edit, Trash2, CheckCircle, AlertCircle, TrendingUp, DollarSign, MapPin } from 'lucide-react';
import ImpactService, { ImpactUpdate, ImpactSummary } from '../../services/impactService';
import { IMPACT_AREA_MAP } from '../../types/impactAreas';
import ImpactUpdateForm from './Impactupdateform';
import ImpactCard from '../cards/ImpactCard';
import ConfirmModal from '../shared/Confirmmodal';
import AlertModal from '../shared/Alertmodal';

interface EventImpactManagerProps {
  eventId: string;
  campaignId?: string;
  userRole: 'host' | 'admin' | 'treasurer' | 'communications' | 'volunteer';
}

const EventImpactManager: React.FC<EventImpactManagerProps> = ({
  eventId,
  campaignId,
  userRole,
}) => {
  const [impacts, setImpacts] = useState<ImpactUpdate[]>([]);
  const [summary, setSummary] = useState<ImpactSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingImpact, setEditingImpact] = useState<ImpactUpdate | undefined>(undefined);
  const [selectedTab, setSelectedTab] = useState<'all' | 'draft' | 'published'>('all');

  // Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info' | 'success';
    itemName?: string;
    confirmText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant?: 'error' | 'warning' | 'info' | 'success';
  }>({
    isOpen: false,
    title: '',
    message: '',
  });

  const canManageImpact = userRole === 'host' || userRole === 'admin';

  useEffect(() => {
    loadImpacts();
    loadSummary();
  }, [eventId]);

  const loadImpacts = async () => {
    setLoading(true);
    setError(null);
    try {
      const { impacts: data } = await ImpactService.getEventImpact(eventId);
      setImpacts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load impact updates');
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const { summary: data } = await ImpactService.getEventImpactSummary(eventId);
      setSummary(data);
    } catch (err) {
      console.error('Failed to load impact summary:', err);
    }
  };

  const handleCreate = () => {
    setEditingImpact(undefined);
    setShowForm(true);
  };

  const handleEdit = (impact: ImpactUpdate) => {
    setEditingImpact(impact);
    setShowForm(true);
  };

  const handleDelete = async (impactId: string) => {
    const impact = impacts.find(i => i.id === impactId);
    
    setConfirmModal({
      isOpen: true,
      title: 'Delete Impact Update',
      message: 'Are you sure you want to delete this impact update? This action cannot be undone.',
      itemName: impact?.title,
      variant: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await ImpactService.deleteImpact(impactId);
          setConfirmModal({ ...confirmModal, isOpen: false });
          await loadImpacts();
          await loadSummary();
        } catch (err: any) {
          setConfirmModal({ ...confirmModal, isOpen: false });
          setAlertModal({
            isOpen: true,
            title: 'Error',
            message: err.message || 'Failed to delete impact update',
            variant: 'error',
          });
        }
      },
    });
  };

  const handlePublish = async (impactId: string) => {
    try {
      const validation = await ImpactService.validateImpact(impactId);
      
      if (!validation.canPublish) {
        setAlertModal({
          isOpen: true,
          title: 'Cannot Publish',
          message: validation.reason || 'This impact update does not meet publishing requirements.',
          variant: 'warning',
        });
        return;
      }

      const impact = impacts.find(i => i.id === impactId);
      
      setConfirmModal({
        isOpen: true,
        title: 'Publish Impact Update',
        message: 'Publish this impact update? It will be visible to everyone.',
        itemName: impact?.title,
        variant: 'info',
        confirmText: 'Publish',
        onConfirm: async () => {
          try {
            await ImpactService.publishImpact(impactId);
            setConfirmModal({ ...confirmModal, isOpen: false });
            await loadImpacts();
            await loadSummary();
          } catch (err: any) {
            setConfirmModal({ ...confirmModal, isOpen: false });
            setAlertModal({
              isOpen: true,
              title: 'Error',
              message: err.message || 'Failed to publish impact update',
              variant: 'error',
            });
          }
        },
      });
    } catch (err: any) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: err.message || 'Failed to publish impact update',
        variant: 'error',
      });
    }
  };

  const handleMarkFinal = async (impactId: string) => {
    try {
      const validation = await ImpactService.canMarkAsFinal(impactId);
      
      if (!validation.allowed) {
        setAlertModal({
          isOpen: true,
          title: 'Cannot Mark as Final',
          message: validation.reason || 'Requirements not met to mark this as final.',
          variant: 'warning',
        });
        return;
      }

      const impact = impacts.find(i => i.id === impactId);
      
      setConfirmModal({
        isOpen: true,
        title: 'Mark as Final Impact Update',
        message: 'Mark this as the final impact update? This will complete the impact reporting for this event and prevent further edits.',
        itemName: impact?.title,
        variant: 'warning',
        confirmText: 'Mark as Final',
        onConfirm: async () => {
          try {
            await ImpactService.markAsFinal(impactId);
            setConfirmModal({ ...confirmModal, isOpen: false });
            await loadImpacts();
            await loadSummary();
            
            setAlertModal({
              isOpen: true,
              title: 'Impact Marked as Final',
              message: 'This event\'s impact reporting is now complete!',
              variant: 'success',
            });
          } catch (err: any) {
            setConfirmModal({ ...confirmModal, isOpen: false });
            setAlertModal({
              isOpen: true,
              title: 'Error',
              message: err.message || 'Failed to mark impact as final',
              variant: 'error',
            });
          }
        },
      });
    } catch (err: any) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: err.message || 'Failed to mark impact as final',
        variant: 'error',
      });
    }
  };

  const handleFormSuccess = async () => {
    setShowForm(false);
    setEditingImpact(undefined);
    await loadImpacts();
    await loadSummary();
  };

  const filteredImpacts = impacts.filter(impact => {
    if (selectedTab === 'all') return true;
    if (selectedTab === 'draft') return impact.status === 'draft';
    if (selectedTab === 'published') return impact.status === 'published';
    return true;
  });

  const hasFinalUpdate = impacts.some(i => i.is_final);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      {summary && summary.totalUpdates > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp size={20} className="mr-2 text-blue-600" />
            Impact Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-blue-600 font-medium">Total Updates</div>
              <div className="text-2xl font-bold text-blue-900">{summary.totalUpdates}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-green-600 font-medium">Total Spent</div>
              <div className="text-2xl font-bold text-green-900">
                €{summary.totalAmountSpent.toFixed(2)}
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-purple-600 font-medium">Proof Completeness</div>
              <div className="text-2xl font-bold text-purple-900">{summary.proofCompleteness}%</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="text-sm text-orange-600 font-medium">Locations</div>
              <div className="text-2xl font-bold text-orange-900">{summary.locations.length}</div>
            </div>
          </div>

          {/* Aggregated Metrics */}
          {Object.keys(summary.aggregatedMetrics).length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Key Metrics</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(summary.aggregatedMetrics).map(([label, value]) => (
                  <div key={label} className="bg-gray-50 rounded p-3">
                    <div className="text-xs text-gray-600">{label}</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {value.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Impact Updates</h2>
            <p className="text-sm text-gray-600 mt-1">
              Track and share the real-world impact of this event
            </p>
          </div>
          {canManageImpact && (
            <button
              onClick={handleCreate}
              disabled={hasFinalUpdate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title={hasFinalUpdate ? 'Cannot create more updates - final update already marked' : 'Create Impact Update'}
            >
              <Plus size={20} />
              Create Impact Update
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 border-b">
          <div className="flex gap-4">
            <button
              onClick={() => setSelectedTab('all')}
              className={`pb-2 px-1 border-b-2 transition-colors ${
                selectedTab === 'all'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              All ({impacts.length})
            </button>
            <button
              onClick={() => setSelectedTab('draft')}
              className={`pb-2 px-1 border-b-2 transition-colors ${
                selectedTab === 'draft'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Drafts ({impacts.filter(i => i.status === 'draft').length})
            </button>
            <button
              onClick={() => setSelectedTab('published')}
              className={`pb-2 px-1 border-b-2 transition-colors ${
                selectedTab === 'published'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Published ({impacts.filter(i => i.status === 'published').length})
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Impact List */}
        <div className="p-6">
          {filteredImpacts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-2">
                <AlertCircle size={48} className="mx-auto" />
              </div>
              <p className="text-gray-600">No impact updates yet</p>
              {canManageImpact && (
                <p className="text-sm text-gray-500 mt-2">
                  Create your first impact update to show the real-world results
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredImpacts.map((impact) => (
                <ImpactCard
                  key={impact.id}
                  impact={impact}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onPublish={handlePublish}
                  onMarkFinal={handleMarkFinal}
                  showActions={canManageImpact}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <ImpactUpdateForm
          eventId={eventId}
          campaignId={campaignId}
          existingImpact={editingImpact}
          onClose={() => {
            setShowForm(false);
            setEditingImpact(undefined);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Modals */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        itemName={confirmModal.itemName}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        variant={confirmModal.variant}
        confirmText={confirmModal.confirmText}
      />

      <AlertModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        variant={alertModal.variant}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
      />
    </div>
  );
};

export default EventImpactManager;
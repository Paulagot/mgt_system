// client/src/components/impact/ClubImpactDashboard.tsx
import React, { useState, useEffect } from 'react';
import { AlertTriangle, TrendingUp, DollarSign, CheckCircle, Calendar, Plus, Download, Filter } from 'lucide-react';
import ImpactService, { ImpactServiceClass, ImpactUpdate, TrustStatus, OutstandingReport } from '../../services/impactService';
import ImpactUpdateForm from './Impactupdateform';
import ImpactCard from '../cards/ImpactCard';
import ImpactScoreDisplay from './Impactscoredisplay';
import ConfirmModal from '../shared/Confirmmodal';
import AlertModal from '../shared/Alertmodal';

interface ClubImpactDashboardProps {
  clubId: string;
  userRole: 'host' | 'admin' | 'treasurer' | 'communications' | 'volunteer';
}

const ClubImpactDashboard: React.FC<ClubImpactDashboardProps> = ({ clubId, userRole }) => {
  const [impacts, setImpacts] = useState<ImpactUpdate[]>([]);
  const [trustStatus, setTrustStatus] = useState<TrustStatus | null>(null);
  const [outstandingReports, setOutstandingReports] = useState<OutstandingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter state variables
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'published' | 'verified'>('all');
  const [filterEvent, setFilterEvent] = useState<string>('');
  const [filterCampaign, setFilterCampaign] = useState<string>('');
  const [filterFinal, setFilterFinal] = useState<string>('all'); // 'all' | 'final' | 'not-final'
  
  const [showForm, setShowForm] = useState(false);
  const [editingImpact, setEditingImpact] = useState<ImpactUpdate | undefined>(undefined);
  const [events, setEvents] = useState<Array<{ id: string; title: string; campaign_id?: string; impact_area_ids?: string[] }>>([]);
  const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string; impact_area_ids?: string[] }>>([]);
  const [eventsMap, setEventsMap] = useState<Map<string, string>>(new Map());
  const [campaignsMap, setCampaignsMap] = useState<Map<string, string>>(new Map());

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
    loadData();
    loadEventsAndCampaigns();
  }, [clubId]);

  const loadEventsAndCampaigns = async () => {
    try {
      // Load events
      const eventsResponse = await fetch(`/api/clubs/${clubId}/events`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      const eventsData = await eventsResponse.json();
      const eventsList = eventsData.events || [];
      setEvents(eventsList);
      
      // Build events map for quick lookup
      const eMap = new Map<string, string>();
      eventsList.forEach((event: any) => {
        eMap.set(event.id, event.title);
      });
      setEventsMap(eMap);

      // Load campaigns
      const campaignsResponse = await fetch(`/api/clubs/${clubId}/campaigns`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      const campaignsData = await campaignsResponse.json();
      const campaignsList = campaignsData.campaigns || [];
      setCampaigns(campaignsList);
      
      // Build campaigns map for quick lookup
      const cMap = new Map<string, string>();
      campaignsList.forEach((campaign: any) => {
        cMap.set(campaign.id, campaign.name);
      });
      setCampaignsMap(cMap);
    } catch (err) {
      console.error('Failed to load events/campaigns:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load all impact updates (we'll filter on the frontend)
      const { impacts: data } = await ImpactService.getClubImpact(clubId, {});
      setImpacts(data);

      // Load trust status if user can manage impact
      if (canManageImpact) {
        const { trustStatus: trust, outstandingReports: outstanding } =
          await ImpactService.getClubTrustStatus(clubId);
        setTrustStatus(trust);
        setOutstandingReports(outstanding);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load impact data');
    } finally {
      setLoading(false);
    }
  };

  // Apply all filters
  const filteredImpacts = impacts.filter(impact => {
    // Status filter
    if (filterStatus !== 'all' && impact.status !== filterStatus) {
      return false;
    }
    
    // Event filter
    if (filterEvent && impact.event_id !== filterEvent) {
      return false;
    }
    
    // Campaign filter
    if (filterCampaign && impact.campaign_id !== filterCampaign) {
      return false;
    }
    
    // Final status filter
    if (filterFinal === 'final' && !impact.is_final) {
      return false;
    }
    if (filterFinal === 'not-final' && impact.is_final) {
      return false;
    }
    
    return true;
  });

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
          await loadData();
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
            await loadData();
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
        message: 'Mark this as the final impact update? This will complete the impact reporting and prevent further edits.',
        itemName: impact?.title,
        variant: 'warning',
        confirmText: 'Mark as Final',
        onConfirm: async () => {
          try {
            await ImpactService.markAsFinal(impactId);
            setConfirmModal({ ...confirmModal, isOpen: false });
            await loadData();
            
            setAlertModal({
              isOpen: true,
              title: 'Impact Marked as Final',
              message: 'This impact update has been marked as final. Impact reporting is now complete!',
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

  const handleExportCSV = () => {
    // Placeholder for CSV export functionality
    console.log('Export CSV functionality to be implemented');
  };

  // Calculate summary stats based on filtered impacts
  const stats = {
    totalReports: filteredImpacts.length,
    totalSpent: filteredImpacts.reduce((sum, i) => sum + (i.amount_spent || 0), 0),
    withMedia: filteredImpacts.filter((i) => i.proof.media.length > 0).length,
    finalReports: impacts.filter(i => i.is_final).length,
  };

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
      {/* Trust Status Warning */}
      {canManageImpact && trustStatus && !trustStatus.canCreateEvent && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Impact Reporting Required</h3>
              <p className="mt-1 text-sm text-red-700">{trustStatus.reason}</p>
              <p className="mt-2 text-sm text-red-700">
                You cannot create new campaigns or events until impact is reported for outstanding events.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Outstanding Reports */}
      {canManageImpact && outstandingReports.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
            <h3 className="text-sm font-semibold text-yellow-800">
              Outstanding Impact Reports ({outstandingReports.length})
            </h3>
          </div>
          <div className="space-y-2">
            {outstandingReports.slice(0, 5).map((report) => (
              <div key={report.id} className="flex items-center justify-between text-sm">
                <span className="text-yellow-900">{report.title}</span>
                <span className="text-yellow-700">
                  {new Date(report.event_date).toLocaleDateString('en-GB')}
                </span>
              </div>
            ))}
            {outstandingReports.length > 5 && (
              <p className="text-xs text-yellow-700 mt-2">
                and {outstandingReports.length - 5} more...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Main Card with Header, Filters, and Summary Stats */}
      <div className="bg-white rounded-lg shadow">
        {/* Header Section */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {/* Title */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Impact Management</h1>
              <p className="text-sm text-gray-600 mt-1">
                Track and manage all impact reports for your club
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3">
              <button 
                onClick={handleExportCSV}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              {canManageImpact && (
                <button
                  onClick={() => setShowForm(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Plus size={20} />
                  Record Impact
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-700">Filters</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="verified">Verified</option>
              </select>
            </div>

            {/* Event Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Event
              </label>
              <select
                value={filterEvent}
                onChange={(e) => setFilterEvent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Events</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>{event.title}</option>
                ))}
              </select>
            </div>

            {/* Campaign Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Campaign
              </label>
              <select
                value={filterCampaign}
                onChange={(e) => setFilterCampaign(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Campaigns</option>
                {campaigns.map(campaign => (
                  <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                ))}
              </select>
            </div>

            {/* Completion Status Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Completion
              </label>
              <select
                value={filterFinal}
                onChange={(e) => setFilterFinal(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="final">Final Only</option>
                <option value="not-final">Not Final</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-white border-b border-gray-200">
          {/* Total Reports Card */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">
                  Total Reports
                </p>
                <p className="text-2xl font-bold text-blue-900 mt-1">
                  {stats.totalReports}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Total Spent Card */}
          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-600 uppercase tracking-wide">
                  Total Spent
                </p>
                <p className="text-2xl font-bold text-green-900 mt-1">
                  €{stats.totalSpent.toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* With Evidence Card */}
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">
                  With Evidence
                </p>
                <p className="text-2xl font-bold text-purple-900 mt-1">
                  {stats.withMedia}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Final Reports Card */}
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-yellow-600 uppercase tracking-wide">
                  Final Reports
                </p>
                <p className="text-2xl font-bold text-yellow-900 mt-1">
                  {stats.finalReports}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Calendar className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reputation Score */}
      {(() => {
        const scoreData = ImpactServiceClass.calculateAggregateScore(impacts);
        return scoreData.score > 0 ? (
          <ImpactScoreDisplay
            score={scoreData.score}
            variant="full"
            showBreakdown={true}
            breakdown={scoreData.breakdown}
          />
        ) : null;
      })()}

      {/* Impact Reports Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Impact Reports</h2>
            <p className="text-sm text-gray-600">
              Showing {filteredImpacts.length} of {impacts.length} reports
            </p>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {filteredImpacts.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <TrendingUp className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium">No impact reports found</p>
              <p className="text-sm text-gray-500 mt-2">
                {filterStatus !== 'all' || filterEvent || filterCampaign || filterFinal !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first impact report to get started'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredImpacts.map((impact) => (
                <ImpactCard
                  key={impact.id}
                  impact={impact}
                  eventName={impact.event_id ? eventsMap.get(impact.event_id) : undefined}
                  campaignName={impact.campaign_id ? campaignsMap.get(impact.campaign_id) : undefined}
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
          events={events}
          campaigns={campaigns}
          existingImpact={editingImpact}
          onClose={() => {
            setShowForm(false);
            setEditingImpact(undefined);
          }}
          onSuccess={() => {
            setShowForm(false);
            setEditingImpact(undefined);
            loadData();
          }}
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

export default ClubImpactDashboard;
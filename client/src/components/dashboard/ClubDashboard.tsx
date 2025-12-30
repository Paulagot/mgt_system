// client/src/components/dashboard/ClubDashboard.tsx
// FIXES APPLIED: Added clubId props, null checks, and publish handlers

import React, { useEffect, useRef, useState } from 'react';
import DashboardHeader from './DashboardHeader';
import DashboardTabs from './DashboardTabs';
import OverviewTab from './OverviewTab';
import CampaignsTab from './CampaignsTab';
import EventsTab from './EventsTab';
import SupportersTab from './SupportersTab';
import FinancialsTab from './FinancialsTab';
import PrizesTab from '../prizes/PrizesTab';
import CreateEventForm from '../events/CreateEventForm';
import CreateCampaignForm from '../campaigns/CreateCampaignForm';
import CreateSupporterForm from '../supporters/forms/CreateSupporterForm';
import SupporterDetailPanel from '../supporters/panels/SupporterDetailPanel';
import ConfirmDeleteModal from '../shared/ConfirmDeleteModal';
import ConfirmArchiveModal from '../shared/ConfirmArchiveModal';
import { useClubDashboard } from '../../hooks/useClubDashboard';
import { useClubDashboardHandlers } from '../../hooks/useClubDashboardHandlers';
import PrizeFinderTab from './PrizeFinderTab';
import { Supporter } from '../../types/types';
import TaskManagement from '../users/TaskManagement';
import ClubExpenseManager from '../financial/ClubExpenseManager';
import ClubIncomeManager from '../financial/Clubincomemanager';
import ClubImpactDashboard from '../impact/ClubImpactDashboard';
import eventsService from '../../services/eventsServices'; // ADD THIS
import campaignsService from '../../services/campaignsServices'; // ADD THIS

export default function ClubDashboard() {
  const dashboard = useClubDashboard();
  const [showArchivedSupporters, setShowArchivedSupporters] = useState(false);
  
  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [supporterToDelete, setSupporterToDelete] = useState<Supporter | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Archive modal state
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [supporterToArchive, setSupporterToArchive] = useState<Supporter | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  const handlers = useClubDashboardHandlers({
    club: dashboard.club!,
    campaigns: dashboard.campaigns,
    events: dashboard.events,
    supporters: dashboard.supporters,
    addEvent: dashboard.addEvent,
    updateEvent: dashboard.updateEvent,
    deleteEvent: dashboard.deleteEvent,
    addCampaign: dashboard.addCampaign,
    updateCampaign: dashboard.updateCampaign,
    deleteCampaign: dashboard.deleteCampaign,
    loadFinancialData: dashboard.loadFinancialData,
    loadClubData: dashboard.loadClubData,
    setEventToEdit: dashboard.setEventToEdit,
    setShowEditEventForm: dashboard.setShowEditEventForm,
    setCampaignToEdit: dashboard.setCampaignToEdit,
    setShowEditCampaignForm: dashboard.setShowEditCampaignForm,
    setSupporterToEdit: dashboard.setSupporterToEdit,
    setShowEditSupporterForm: dashboard.setShowEditSupporterForm,
    setSelectedSupporter: dashboard.setSelectedSupporter,
    setShowSupporterDetailPanel: dashboard.setShowSupporterDetailPanel,
  });

  // ===== NEW: PUBLISH HANDLERS =====
  
  /**
   * Handle publishing an event (trust check happens in backend)
   */
  const handlePublishEvent = async (eventId: string) => {
    try {
      console.log('📤 Publishing event:', eventId);
      await eventsService.publishEvent(eventId);
      
      // Reload club data to get updated events
      await dashboard.loadClubData();
      
      console.log('✅ Event published successfully');
    } catch (error: any) {
      console.error('❌ Failed to publish event:', error);
      // Re-throw so EventsTab can show error modal with trust warning
      throw error;
    }
  };

  /**
   * Handle publishing a campaign (trust check happens in backend)
   */
  const handlePublishCampaign = async (campaignId: string) => {
    try {
      console.log('📤 Publishing campaign:', campaignId);
      await campaignsService.publishCampaign(campaignId);
      
      // Reload club data to get updated campaigns
      await dashboard.loadClubData();
      
      console.log('✅ Campaign published successfully');
    } catch (error: any) {
      console.error('❌ Failed to publish campaign:', error);
      // Re-throw so CampaignsTab can show error modal with trust warning
      throw error;
    }
  };

  // ===== END NEW HANDLERS =====

  // Callback for when financial data changes
  const handleFinancialDataChange = async () => {
    console.log('Financial data changed, refreshing club data...');
    await dashboard.loadClubData();
  };

  // Wrapper for delete supporter that shows modal
  const handleDeleteSupporterClick = (supporter: Supporter) => {
    setSupporterToDelete(supporter);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!supporterToDelete) return;
    
    setIsDeleting(true);
    try {
      await handlers.handleDeleteSupporter(supporterToDelete);
      setDeleteModalOpen(false);
      setSupporterToDelete(null);
    } catch (err: any) {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      
      // If supporter has records, show archive modal instead
      if (err.canArchive || (err.message && err.message.includes('archive'))) {
        setSupporterToArchive(supporterToDelete);
        setArchiveModalOpen(true);
      } else {
        alert(err.message || 'Failed to delete supporter. Please try again.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmArchive = async () => {
    if (!supporterToArchive) return;
    
    setIsArchiving(true);
    try {
      await handlers.handleArchiveSupporter(supporterToArchive);
      setArchiveModalOpen(false);
      setSupporterToArchive(null);
    } catch (err: any) {
      alert(err.message || 'Failed to archive supporter. Please try again.');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleUnarchiveSupporter = async (supporter: Supporter) => {
    try {
      await handlers.handleUnarchiveSupporter(supporter);
    } catch (err: any) {
      alert(err.message || 'Failed to unarchive supporter. Please try again.');
    }
  };

  const { user, club, isLoading, error, activeTab, setActiveTab } = dashboard;

  // ✅ Only show the full-page loader on the FIRST load.
  const hasLoadedOnceRef = useRef(false);
  useEffect(() => {
    if (!isLoading && club) {
      hasLoadedOnceRef.current = true;
    }
  }, [isLoading, club]);

  
  React.useEffect(() => {
    console.log('[ClubDashboard] isLoading:', isLoading, 'club:', club?.id, 'activeTab:', activeTab);
  }, [isLoading, club?.id, activeTab]);

  if (isLoading && !hasLoadedOnceRef.current) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        clubName={club?.name}
        userName={user?.name}
        onNewEvent={() => dashboard.setShowCreateEventForm(true)}
        onNewCampaign={() => dashboard.setShowCreateCampaignForm(true)}
        onNewSupporter={() => dashboard.setShowCreateSupporterForm(true)}
        onNewPrize={() => setActiveTab('prizes')}
        onNewExpense={() => setActiveTab('expenses')}
        onNewIncome={() => setActiveTab('income')}
        onQuickTask={() => setActiveTab('tasks')}
      />

      <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* ✅ Optional: subtle "refreshing" banner instead of nuking the UI */}
      {isLoading && hasLoadedOnceRef.current && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3">
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
            Refreshing…
          </div>
        </div>
      )}

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <OverviewTab
            metrics={{
              total_raised: dashboard.financials?.total_income || 0,
              active_campaigns: dashboard.campaigns.length,
              upcoming_events: dashboard.events.filter(e => new Date(e.event_date) > new Date()).length,
              totalEvents: dashboard.events.length,
              totalCampaigns: dashboard.campaigns.length,
              totalExpenses: dashboard.financials?.total_expenses || 0,
              totalIncome: dashboard.financials?.total_income || 0,
              netProfit: dashboard.financials?.net_profit || 0,
              totalSupporters: dashboard.supporters.length,
              totalDonors: dashboard.supporters.filter(s => s.type === 'donor').length,
              totalVolunteers: dashboard.supporters.filter(s => s.type === 'volunteer').length,
              totalSponsors: dashboard.supporters.filter(s => s.type === 'sponsor').length,
              avgDonation:
                dashboard.supporters
                  .filter(s => s.type === 'donor' && s.average_donation)
                  .reduce((sum, s) => sum + (s.average_donation || 0), 0) /
                Math.max(dashboard.supporters.filter(s => s.type === 'donor' && s.average_donation).length, 1),
              donorRetentionRate: 85,
              totalUsers: 0,
              totalPrizes: 0,
              totalPrizeValue: 0,
              totalTasks: 0,
              overdueTasks: 0,
              completedTasks: 0,
              supporter_breakdown: {
                volunteers: dashboard.supporters.filter(s => s.type === 'volunteer').length,
                donors: dashboard.supporters.filter(s => s.type === 'donor').length,
                sponsors: dashboard.supporters.filter(s => s.type === 'sponsor').length,
              },
              top_donors: dashboard.supporters
                .filter(s => s.type === 'donor' && s.total_donated && s.total_donated > 0)
                .sort((a, b) => (b.total_donated || 0) - (a.total_donated || 0))
                .slice(0, 5),
              recent_supporters: dashboard.supporters
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 5),
              pending_follow_ups: dashboard.supporters.filter(s =>
                s.next_contact_date && new Date(s.next_contact_date) <= new Date()
              ).length,
            }}
            financialData={{
              monthly_income: dashboard.financials?.total_income || 0,
              monthly_expenses: dashboard.financials?.total_expenses || 0,
              net_profit: dashboard.financials?.net_profit || 0,
              pending_expenses: 0,
            }}
            upcomingEvents={dashboard.events.filter(e => new Date(e.event_date) > new Date()).slice(0, 2)}
            campaigns={dashboard.campaigns}
            getCampaignName={handlers.getCampaignName}
            onEditEvent={handlers.handleEditEvent}
            onDeleteEvent={handlers.handleDeleteEvent}
            onViewEvent={() => {}}
            onEditCampaign={handlers.handleEditCampaign}
            onDeleteCampaign={handlers.handleDeleteCampaign}
            onViewCampaign={() => {}}
            onNavigateToTab={setActiveTab} 
          />
        )}

        {activeTab === 'campaigns' && (
          <CampaignsTab
            campaigns={dashboard.campaigns}
            clubId={club?.id || ''} // ✅ FIXED: Added clubId
            onCreateCampaign={() => dashboard.setShowCreateCampaignForm(true)}
            onEditCampaign={handlers.handleEditCampaign}
            onDeleteCampaign={handlers.handleDeleteCampaign}
            onViewCampaign={() => {}}
            onPublishCampaign={handlePublishCampaign} // ✅ FIXED: Added publish handler
          />
        )}

        {activeTab === 'events' && (
          <EventsTab
            events={dashboard.events}
            clubId={club?.id || ''} // ✅ FIXED: Added clubId
            getCampaignName={handlers.getCampaignName}
            onCreateEvent={() => dashboard.setShowCreateEventForm(true)}
            onEditEvent={handlers.handleEditEvent}
            onDeleteEvent={handlers.handleDeleteEvent}
            onViewEvent={() => {}}
            onPublishEvent={handlePublishEvent} // ✅ FIXED: Added publish handler
            getPrizeDataForEvent={dashboard.getPrizeDataForEvent}
          />
        )}

        {activeTab === 'supporters' && (
          <SupportersTab
            supporters={dashboard.supporters}
            onCreateSupporter={() => dashboard.setShowCreateSupporterForm(true)}
            onEditSupporter={handlers.handleEditSupporter}
            onDeleteSupporter={showArchivedSupporters ? handleUnarchiveSupporter : handleDeleteSupporterClick}
            onViewSupporter={handlers.handleViewSupporter}
            onQuickCall={(s) => alert(`Calling ${s.name}`)}
            onQuickEmail={(s) => window.open(`mailto:${s.email}`)}
            showArchived={showArchivedSupporters}
            onToggleArchived={() => setShowArchivedSupporters(!showArchivedSupporters)}
          />
        )}

        {activeTab === 'income' && club && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <ClubIncomeManager
              clubId={club.id}
              campaigns={dashboard.campaigns}
              events={dashboard.events}
              onDataChange={handleFinancialDataChange}
            />
          </div>
        )}

        {activeTab === 'expenses' && club && (
          <div>
            <ClubExpenseManager
              clubId={club.id}
              campaigns={dashboard.campaigns}
              events={dashboard.events}
              onDataChange={handleFinancialDataChange}
            />
          </div>
        )}

        {/* ✅ FIXED: Added null check for user */}
        {activeTab === 'impact' && user && (
          <ClubImpactDashboard 
            clubId={user.club_id}
            userRole={user.role}
          />
        )}

        {activeTab === 'tasks' && (
          <div>
            <TaskManagement />
          </div>
        )}

        {activeTab === 'prizes' && <PrizesTab events={dashboard.events} />}

        {activeTab === 'prizefinder' && club && (
          <PrizeFinderTab
            clubId={club.id}
            clubName={club.name}
            onSupporterCreated={() => dashboard.loadClubData()}
          />
        )}

        {activeTab === 'financials' && (
          <FinancialsTab financialData={dashboard.financials} loading={dashboard.loadingFinancials} />
        )}
      </div>

      {/* modals unchanged... */}
      {dashboard.showCreateEventForm && (
        <CreateEventForm
          onSubmit={handlers.handleCreateEvent}
          onCancel={() => dashboard.setShowCreateEventForm(false)}
          campaigns={dashboard.campaigns}
        />
      )}

      {dashboard.showEditEventForm && dashboard.eventToEdit && (
        <CreateEventForm
          onSubmit={(data) => handlers.handleUpdateEvent(dashboard.eventToEdit!.id, data)}
          onCancel={() => {
            dashboard.setShowEditEventForm(false);
            dashboard.setEventToEdit(null);
          }}
          campaigns={dashboard.campaigns}
          editMode={true}
          existingEvent={dashboard.eventToEdit}
        />
      )}

      {dashboard.showCreateCampaignForm && (
        <CreateCampaignForm
          onSubmit={handlers.handleCreateCampaign}
          onCancel={() => dashboard.setShowCreateCampaignForm(false)}
        />
      )}

      {dashboard.showEditCampaignForm && dashboard.campaignToEdit && (
        <CreateCampaignForm
          onSubmit={(data) => handlers.handleUpdateCampaign(dashboard.campaignToEdit!.id, data)}
          onCancel={() => {
            dashboard.setShowEditCampaignForm(false);
            dashboard.setCampaignToEdit(null);
          }}
          editMode={true}
          existingCampaign={dashboard.campaignToEdit}
        />
      )}

      {dashboard.showCreateSupporterForm && (
        <CreateSupporterForm
          onSubmit={handlers.handleCreateSupporter}
          onCancel={() => dashboard.setShowCreateSupporterForm(false)}
        />
      )}

      {dashboard.showEditSupporterForm && dashboard.supporterToEdit && (
        <CreateSupporterForm
          onSubmit={(data) => handlers.handleUpdateSupporter(dashboard.supporterToEdit!.id, data)}
          onCancel={() => {
            dashboard.setShowEditSupporterForm(false);
            dashboard.setSupporterToEdit(null);
          }}
          editMode={true}
          existingSupporter={dashboard.supporterToEdit}
        />
      )}

      {dashboard.showSupporterDetailPanel && dashboard.selectedSupporter && (
        <SupporterDetailPanel
          supporter={dashboard.selectedSupporter}
          isOpen={dashboard.showSupporterDetailPanel}
          onClose={() => {
            dashboard.setShowSupporterDetailPanel(false);
            dashboard.setSelectedSupporter(null);
          }}
          onEdit={handlers.handleEditSupporter}
          onDelete={handleDeleteSupporterClick}
          campaigns={dashboard.campaigns}
          events={dashboard.events}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        title="Delete Supporter"
        message="Are you sure you want to delete this supporter?"
        itemName={supporterToDelete?.name || ''}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setSupporterToDelete(null);
        }}
        isDeleting={isDeleting}
      />

      {/* Archive Confirmation Modal */}
      <ConfirmArchiveModal
        isOpen={archiveModalOpen}
        itemName={supporterToArchive?.name || ''}
        onConfirm={handleConfirmArchive}
        onCancel={() => {
          setArchiveModalOpen(false);
          setSupporterToArchive(null);
        }}
        isArchiving={isArchiving}
      />
    </div>
  );
}



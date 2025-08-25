// client/src/components/dashboard/ClubDashboard.tsx (UPDATED - add prizes tab)
import React from 'react';
import DashboardHeader from './DashboardHeader';
import DashboardTabs from './DashboardTabs';
import OverviewTab from './OverviewTab';
import CampaignsTab from './CampaignsTab';
import EventsTab from './EventsTab';
import SupportersTab from './SupportersTab';
import FinancialsTab from './FinancialsTab';
import PrizesTab from '../prizes/PrizesTab'; // NEW: Import PrizesTab
import CreateEventForm from '../events/CreateEventForm';
import CreateCampaignForm from '../campaigns/CreateCampaignForm';
import CreateSupporterForm from '../supporters/forms/CreateSupporterForm';
import SupporterDetailPanel from '../supporters/panels/SupporterDetailPanel';
import { useClubDashboard } from '../../hooks/useClubDashboard';
import { useClubDashboardHandlers } from '../../hooks/useClubDashboardHandlers';

export default function ClubDashboard() {
  const dashboard = useClubDashboard();

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

  const { user, club, isLoading, error, activeTab, setActiveTab } = dashboard;

  if (isLoading) {
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
      />

      <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />

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
              avgDonation: dashboard.supporters.filter(s => s.type === 'donor' && s.average_donation)
                .reduce((sum, s) => sum + (s.average_donation || 0), 0) / 
                Math.max(dashboard.supporters.filter(s => s.type === 'donor' && s.average_donation).length, 1),
              donorRetentionRate: 85,
              totalUsers: 0,
              totalPrizes: 0, // TODO: Load from prizes when implemented
              totalPrizeValue: 0, // TODO: Load from prizes when implemented
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
          />
        )}

        {activeTab === 'campaigns' && (
          <CampaignsTab
            campaigns={dashboard.campaigns}
            onCreateCampaign={() => dashboard.setShowCreateCampaignForm(true)}
            onEditCampaign={handlers.handleEditCampaign}
            onDeleteCampaign={handlers.handleDeleteCampaign}
            onViewCampaign={() => {}}
          />
        )}

        {activeTab === 'events' && (
          <EventsTab
            events={dashboard.events}
            getCampaignName={handlers.getCampaignName}
            onCreateEvent={() => dashboard.setShowCreateEventForm(true)}
            onEditEvent={handlers.handleEditEvent}
            onDeleteEvent={handlers.handleDeleteEvent}
            onViewEvent={() => {}}
             getPrizeDataForEvent={dashboard.getPrizeDataForEvent}
          />
        )}

        {activeTab === 'supporters' && (
          <SupportersTab
            supporters={dashboard.supporters}
            onCreateSupporter={() => dashboard.setShowCreateSupporterForm(true)}
            onEditSupporter={handlers.handleEditSupporter}
            onDeleteSupporter={handlers.handleDeleteSupporter}
            onViewSupporter={handlers.handleViewSupporter}
            onQuickCall={(s) => alert(`Calling ${s.name}`)}
            onQuickEmail={(s) => window.open(`mailto:${s.email}`)}
          />
        )}

        {/* NEW: Prizes Tab */}
        {activeTab === 'prizes' && (
          <PrizesTab
            events={dashboard.events}
          />
        )}

        {activeTab === 'financials' && (
          <FinancialsTab financialData={dashboard.financials} loading={dashboard.loadingFinancials} />
        )}
      </div>

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
    onEdit={handlers.handleEditSupporter}           // Add this
    onDelete={handlers.handleDeleteSupporter}       // Add this  
    campaigns={dashboard.campaigns}                  // Add this
    events={dashboard.events}                        // Add this
  />
)}
    </div>
  );
}


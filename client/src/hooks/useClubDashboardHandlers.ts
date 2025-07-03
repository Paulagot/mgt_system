import { useCallback } from 'react';
import { apiService } from '../services/apiService';
import { supporterService } from '../services';
import {
  Event,
  Campaign,
  Supporter,
  CreateEventForm,
  CreateCampaignForm,
   CreateSupporterData 
} from '../types/types';

interface UseHandlersProps {
  club: { id: string };
  campaigns: Campaign[];
  events: Event[];
  supporters: Supporter[];
  addEvent: (event: Event) => void;
  updateEvent: (id: string, event: Event) => void;
  deleteEvent: (id: string) => void;
  addCampaign: (campaign: Campaign) => void;
  updateCampaign: (id: string, campaign: Campaign) => void;
  deleteCampaign: (id: string) => void;
  loadFinancialData: () => void;
  loadClubData: () => void;
  setEventToEdit: (event: Event | null) => void;
  setShowEditEventForm: (open: boolean) => void;
  setCampaignToEdit: (campaign: Campaign | null) => void;
  setShowEditCampaignForm: (open: boolean) => void;
  setSupporterToEdit: (supporter: Supporter | null) => void;
  setShowEditSupporterForm: (open: boolean) => void;
  setSelectedSupporter: (supporter: Supporter | null) => void;
  setShowSupporterDetailPanel: (open: boolean) => void;
}

export function useClubDashboardHandlers({
  club,
  campaigns,
  events,
  supporters,
  addEvent,
  updateEvent,
  deleteEvent,
  addCampaign,
  updateCampaign,
  deleteCampaign,
  loadFinancialData,
  loadClubData,
  setEventToEdit,
  setShowEditEventForm,
  setCampaignToEdit,
  setShowEditCampaignForm,
  setSupporterToEdit,
  setShowEditSupporterForm,
  setSelectedSupporter,
  setShowSupporterDetailPanel,
}: UseHandlersProps) {
  const getCampaignName = useCallback(
    (campaignId?: string) => {
      if (!campaignId) return undefined;
      const campaign = campaigns.find(c => c.id === campaignId);
      return campaign?.name;
    },
    [campaigns]
  );

  const handleEditEvent = useCallback((e: Event) => {
    setEventToEdit(e);
    setShowEditEventForm(true);
  }, [setEventToEdit, setShowEditEventForm]);

  const handleDeleteEvent = useCallback(async (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const confirmMessage = `Are you sure you want to delete "${event.title}"? This action cannot be undone.`;

    if (window.confirm(confirmMessage)) {
      try {
        await apiService.deleteEvent(eventId);
        deleteEvent(eventId);
        loadFinancialData();
      } catch (err) {
        console.error('Failed to delete event:', err);
        alert('Failed to delete event. Please try again.');
      }
    }
  }, [events, deleteEvent, loadFinancialData]);

  const handleCreateEvent = useCallback(async (eventData: CreateEventForm) => {
    const response = await apiService.createEvent(eventData);
    addEvent(response.event);
    loadFinancialData();
    return response;
  }, [addEvent, loadFinancialData]);

  const handleUpdateEvent = useCallback(async (id: string, eventData: CreateEventForm) => {
    const response = await apiService.updateEvent(id, eventData);
    updateEvent(id, response.event);
    loadFinancialData();
    return response;
  }, [updateEvent, loadFinancialData]);

  const handleEditCampaign = useCallback((c: Campaign) => {
    setCampaignToEdit(c);
    setShowEditCampaignForm(true);
  }, [setCampaignToEdit, setShowEditCampaignForm]);

  const handleDeleteCampaign = useCallback(async (campaignId: string) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return;

    const confirmMessage = `Are you sure you want to delete "${campaign.name}"? This action cannot be undone.`;

    if (window.confirm(confirmMessage)) {
      try {
        await apiService.deleteCampaign(campaignId);
        deleteCampaign(campaignId);
        loadFinancialData();
      } catch (err) {
        console.error('Failed to delete campaign:', err);
        alert('Failed to delete campaign. Please try again.');
      }
    }
  }, [campaigns, deleteCampaign, loadFinancialData]);

  const handleCreateCampaign = useCallback(async (campaignData: CreateCampaignForm) => {
    const response = await apiService.createCampaign(campaignData);
    addCampaign(response.campaign);
    loadFinancialData();
    return response;
  }, [addCampaign, loadFinancialData]);

  const handleUpdateCampaign = useCallback(async (id: string, campaignData: CreateCampaignForm) => {
    const response = await apiService.updateCampaign(id, campaignData);
    updateCampaign(id, response.campaign);
    loadFinancialData();
    return response;
  }, [updateCampaign, loadFinancialData]);

  const handleDeleteSupporter = useCallback(async (supporterId: string) => {
    const supporter = supporters.find(s => s.id === supporterId);
    if (!supporter) return;

    const confirmMessage = `Are you sure you want to delete "${supporter.name}"? This action cannot be undone.`;

    if (window.confirm(confirmMessage)) {
      try {
        await supporterService.deleteSupporter(supporterId);
        loadClubData();
      } catch (err) {
        console.error('Failed to delete supporter:', err);
        alert('Failed to delete supporter. Please try again.');
      }
    }
  }, [supporters, loadClubData]);

const handleCreateSupporter = useCallback(async (data: CreateSupporterData) => {
  const response = await supporterService.createSupporter(club.id, data);
  loadClubData();
  return response;
}, [club.id, loadClubData]);

const handleUpdateSupporter = useCallback(async (id: string, data: CreateSupporterData) => {
  const response = await supporterService.updateSupporter(id, data);
  loadClubData();
  return response;
}, [loadClubData]);

  const handleViewSupporter = useCallback((s: Supporter) => {
    setSelectedSupporter(s);
    setShowSupporterDetailPanel(true);
  }, [setSelectedSupporter, setShowSupporterDetailPanel]);

  const handleEditSupporter = useCallback((s: Supporter) => {
    setSupporterToEdit(s);
    setShowEditSupporterForm(true);
  }, [setSupporterToEdit, setShowEditSupporterForm]);

  return {
    getCampaignName,
    handleEditEvent,
    handleDeleteEvent,
    handleCreateEvent,
    handleUpdateEvent,
    handleEditCampaign,
    handleDeleteCampaign,
    handleCreateCampaign,
    handleUpdateCampaign,
    handleDeleteSupporter,
    handleCreateSupporter,
    handleUpdateSupporter,
    handleViewSupporter,
    handleEditSupporter
  };
}

import { useCallback } from 'react';
import { apiService } from '../services/apiService';
import { supporterService, prizeService } from '../services';
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
  // NEW: Add loadPrizeData function
  loadPrizeData?: () => void;
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
  loadPrizeData, // NEW: Accept loadPrizeData as parameter
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
        // NEW: Reload prize data when events change (only if function is provided)
        if (loadPrizeData) {
          setTimeout(() => loadPrizeData(), 100);
        }
      } catch (err) {
        console.error('Failed to delete event:', err);
        alert('Failed to delete event. Please try again.');
      }
    }
  }, [events, deleteEvent, loadFinancialData, loadPrizeData]);

  const handleCreateEvent = useCallback(async (eventData: CreateEventForm) => {
    const response = await apiService.createEvent(eventData);
    addEvent(response.event);
    loadFinancialData();
    // NEW: Reload prize data when events change (only if function is provided)
    if (loadPrizeData) {
      setTimeout(() => loadPrizeData(), 100);
    }
    return response;
  }, [addEvent, loadFinancialData, loadPrizeData]);

  const handleUpdateEvent = useCallback(async (id: string, eventData: CreateEventForm) => {
    const response = await apiService.updateEvent(id, eventData);
    updateEvent(id, response.event);
    loadFinancialData();
    // NEW: Reload prize data when events change (only if function is provided)
    if (loadPrizeData) {
      setTimeout(() => loadPrizeData(), 100);
    }
    return response;
  }, [updateEvent, loadFinancialData, loadPrizeData]);

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

const handleDeleteSupporter = useCallback(async (supporter: Supporter) => {
  if (!supporter?.id) {
    console.warn('[handleDeleteSupporter] Missing supporter.id', supporter);
    return;
  }

  try {
    console.log('[handleDeleteSupporter] Attempting to delete', supporter.id);
    await supporterService.deleteSupporter(supporter.id);
    console.log('[handleDeleteSupporter] Delete successful, refreshing data');
    loadClubData();
  } catch (err: any) {
    console.error('[handleDeleteSupporter] Failed to delete supporter:', err);
    
    // Check if the error indicates the supporter should be archived instead
    if (err.canArchive || (err.message && err.message.includes('archive'))) {
      // This error will be handled by the UI component to show archive option
      throw err;
    } else {
      // Generic error
      throw new Error('Failed to delete supporter. Please try again.');
    }
  }
}, [loadClubData]);

const handleArchiveSupporter = useCallback(async (supporter: Supporter) => {
  if (!supporter?.id) {
    console.warn('[handleArchiveSupporter] Missing supporter.id', supporter);
    return;
  }

  try {
    console.log('[handleArchiveSupporter] Archiving', supporter.id);
    await supporterService.archiveSupporter(supporter.id);
    console.log('[handleArchiveSupporter] Archive successful, refreshing data');
    loadClubData();
  } catch (err) {
    console.error('[handleArchiveSupporter] Failed to archive supporter:', err);
    throw new Error('Failed to archive supporter. Please try again.');
  }
}, [loadClubData]);

const handleUnarchiveSupporter = useCallback(async (supporter: Supporter) => {
  if (!supporter?.id) {
    console.warn('[handleUnarchiveSupporter] Missing supporter.id', supporter);
    return;
  }

  try {
    console.log('[handleUnarchiveSupporter] Unarchiving', supporter.id);
    await supporterService.unarchiveSupporter(supporter.id);
    console.log('[handleUnarchiveSupporter] Unarchive successful, refreshing data');
    loadClubData();
  } catch (err) {
    console.error('[handleUnarchiveSupporter] Failed to unarchive supporter:', err);
    throw new Error('Failed to unarchive supporter. Please try again.');
  }
}, [loadClubData]);


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
    handleArchiveSupporter,
    handleUnarchiveSupporter,
    handleCreateSupporter,
    handleUpdateSupporter,
    handleViewSupporter,
    handleEditSupporter
  };
}

// client/src/hooks/useClubDashboard.ts (UPDATED)

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore, useAuth, useCampaigns, useEvents, useSupporters, useUI } from '../store/app_store';
import { apiService } from '../services/apiService';
import { supporterService, prizeService } from '../services'; // ADDED: prizeService
import { Event, Campaign, CreateEventForm, CreateCampaignForm } from '../types/types';

// NEW: Add prize data interface
interface EventWithPrizes extends Event {
  prizeCount?: number;
  prizeValue?: number;
}

export function useClubDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [financials, setFinancials] = useState<any>(null);
  const [loadingFinancials, setLoadingFinancials] = useState(false);
  
  // NEW: Add prize data state
  const [eventPrizeData, setEventPrizeData] = useState<Map<string, { count: number; value: number }>>(new Map());

  const [showCreateEventForm, setShowCreateEventForm] = useState(false);
  const [showEditEventForm, setShowEditEventForm] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<Event | null>(null);

  const [showCreateCampaignForm, setShowCreateCampaignForm] = useState(false);
  const [showEditCampaignForm, setShowEditCampaignForm] = useState(false);
  const [campaignToEdit, setCampaignToEdit] = useState<Campaign | null>(null);

  const [showCreateSupporterForm, setShowCreateSupporterForm] = useState(false);
  const [showEditSupporterForm, setShowEditSupporterForm] = useState(false);
  const [supporterToEdit, setSupporterToEdit] = useState<any>(null);
  const [showSupporterDetailPanel, setShowSupporterDetailPanel] = useState(false);
  const [selectedSupporter, setSelectedSupporter] = useState<any>(null);

  const navigate = useNavigate();

  const { user, club } = useAuth();
  const { campaigns, addCampaign, updateCampaign, deleteCampaign } = useCampaigns();
  const { events, addEvent, updateEvent, deleteEvent } = useEvents();
  const { supporters } = useSupporters();
  const { isLoading, error } = useUI();
  const { loadClubData } = useAppStore();

  const loadFinancialData = async () => {
    if (club?.id) {
      setLoadingFinancials(true);
      try {
        const financialData = await apiService.getClubFinancials(club.id);
        setFinancials(financialData);
      } catch (error) {
        console.error('Failed to load financial data:', error);
      } finally {
        setLoadingFinancials(false);
      }
    }
  };

  // NEW: Load prize data for all events
  const loadPrizeData = async () => {
    if (!events.length) return;

    try {
      const prizeDataMap = new Map<string, { count: number; value: number }>();
      
      // Load prizes for each event
      await Promise.all(
        events.map(async (event) => {
          try {
            const response = await prizeService.getPrizes(event.id);
            const prizes = response.prizes || [];
            
            const count = prizes.length;
            const value = prizes
              .filter((p: any) => p.confirmed) // Only count confirmed prizes
              .reduce((sum: number, p: any) => sum + (p.value || 0), 0);
            
            prizeDataMap.set(event.id, { count, value });
          } catch (error) {
            console.error(`Failed to load prizes for event ${event.id}:`, error);
            // Set default values on error
            prizeDataMap.set(event.id, { count: 0, value: 0 });
          }
        })
      );
      
      setEventPrizeData(prizeDataMap);
    } catch (error) {
      console.error('Failed to load prize data:', error);
    }
  };

  // Load prize data when events change
  useEffect(() => {
    if (events.length > 0) {
      loadPrizeData();
    }
  }, [events]);

  useEffect(() => {
    if (club?.id) {
      loadClubData();
      loadFinancialData();
    }
  }, [club?.id]);

  // NEW: Helper function to get prize data for an event
  const getPrizeDataForEvent = (eventId: string) => {
    return eventPrizeData.get(eventId) || { count: 0, value: 0 };
  };

  return {
    activeTab,
    setActiveTab,
    financials,
    loadingFinancials,
    showCreateEventForm,
    setShowCreateEventForm,
    showEditEventForm,
    setShowEditEventForm,
    eventToEdit,
    setEventToEdit,
    showCreateCampaignForm,
    setShowCreateCampaignForm,
    showEditCampaignForm,
    setShowEditCampaignForm,
    campaignToEdit,
    setCampaignToEdit,
    showCreateSupporterForm,
    setShowCreateSupporterForm,
    showEditSupporterForm,
    setShowEditSupporterForm,
    supporterToEdit,
    setSupporterToEdit,
    showSupporterDetailPanel,
    setShowSupporterDetailPanel,
    selectedSupporter,
    setSelectedSupporter,
    user,
    club,
    campaigns,
    addCampaign,
    updateCampaign,
    deleteCampaign,
    events,
    addEvent,
    updateEvent,
    deleteEvent,
    supporters,
    isLoading,
    error,
    navigate,
    loadClubData,
    loadFinancialData,
    // NEW: Export prize-related functions
    loadPrizeData,
    getPrizeDataForEvent,
  };
}

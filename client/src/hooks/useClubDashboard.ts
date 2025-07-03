import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore, useAuth, useCampaigns, useEvents, useSupporters, useUI } from '../store/app_store';
import { apiService } from '../services/apiService';
import { supporterService } from '../services';
import { Event, Campaign, CreateEventForm, CreateCampaignForm } from '../types/types';

export function useClubDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [financials, setFinancials] = useState<any>(null);
  const [loadingFinancials, setLoadingFinancials] = useState(false);

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

  useEffect(() => {
    if (club?.id) {
      loadClubData();
      loadFinancialData();
    }
  }, [club?.id]);

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
  };
}

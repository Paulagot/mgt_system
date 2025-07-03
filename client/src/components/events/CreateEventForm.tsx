// client/src/components/events/CreateEventForm.tsx (Enhanced for both create and edit)
import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, Tag, Users, Save, X, MapPin, FileText } from 'lucide-react';
import { CreateEventForm as CreateEventFormData, Campaign, Event } from '../../types/types';
import { useAuth, useCampaigns } from '../../store/app_store';
import { apiService } from '../../services/apiService';
import SuccessModal from '../shared/SuccessModal';

interface CreateEventFormProps {
  onSubmit: (eventData: CreateEventFormData) => Promise<any>;
  onCancel: () => void;
  campaigns?: Campaign[];
  // NEW: Add edit mode support
  editMode?: boolean;
  existingEvent?: Event;
}

interface FormErrors {
  [key: string]: string;
}

const CreateEventForm: React.FC<CreateEventFormProps> = ({ 
  onSubmit,
  onCancel, 
  campaigns = [],
  // NEW: Edit mode props with defaults
  editMode = false,
  existingEvent = null
}) => {
  const { club } = useAuth();
  const { campaigns: storeCampaigns } = useCampaigns();

  // Use campaigns from props or store
  const availableCampaigns = campaigns.length > 0 ? campaigns : storeCampaigns;

  // NEW: Initialize form data based on mode
  const getInitialFormData = (): CreateEventFormData => {
    if (editMode && existingEvent) {
      return {
        title: existingEvent.title,
        type: existingEvent.type,
        description: existingEvent.description || '',
        venue: existingEvent.venue || '',
        max_participants: existingEvent.max_participants,
        goal_amount: existingEvent.goal_amount,
        event_date: new Date(existingEvent.event_date).toISOString().split('T')[0],
        campaign_id: existingEvent.campaign_id || ''
      };
    }
    
    return {
      title: '',
      type: '',
      description: '',
      venue: '',
      max_participants: undefined,
      goal_amount: 0,
      event_date: '',
      campaign_id: ''
    };
  };

  const [formData, setFormData] = useState<CreateEventFormData>(getInitialFormData());
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdEventName, setCreatedEventName] = useState('');

  // NEW: Update form data when existingEvent changes (for edit mode)
  useEffect(() => {
    if (editMode && existingEvent) {
      setFormData(getInitialFormData());
    }
  }, [editMode, existingEvent]);

  // Load campaigns when component mounts
  useEffect(() => {
    const loadCampaigns = async () => {
      if (club?.id && availableCampaigns.length === 0) {
        try {
          const response = await apiService.getClubCampaigns(club.id);
          console.log('📋 Available campaigns:', response.campaigns || []);
        } catch (error) {
          console.error('❌ Failed to load campaigns:', error);
        }
      }
    };
    loadCampaigns();
  }, [club?.id, availableCampaigns.length]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Handle different input types properly
    let processedValue: any = value;
    
    if (name === 'goal_amount') {
      processedValue = value ? parseFloat(value) : 0;
    } else if (name === 'max_participants') {
      processedValue = value ? parseInt(value) : undefined;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Event title is required';
    }

    if (!formData.type.trim()) {
      newErrors.type = 'Event type is required';
    }

    if (!formData.event_date) {
      newErrors.event_date = 'Event date is required';
    } else {
      const eventDate = new Date(formData.event_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // NEW: For edit mode, allow past dates if the event was already in the past
      if (!editMode && eventDate < today) {
        newErrors.event_date = 'Event date cannot be in the past';
      }
    }

    if (!formData.goal_amount || formData.goal_amount <= 0) {
      newErrors.goal_amount = 'Goal amount must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (!club?.id) {
      console.error('❌ No club found. Please log in again.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      console.log(`📤 Submitting form data to parent handler (${editMode ? 'edit' : 'create'} mode)`);
      
      // Clean up form data before submitting
      const cleanedData = {
        title: formData.title.trim(),
        type: formData.type.trim(),
        description: formData.description?.trim() || '',
        venue: formData.venue?.trim() || '',
        max_participants: formData.max_participants,
        goal_amount: formData.goal_amount,
        event_date: formData.event_date,
        campaign_id: formData.campaign_id || ''
      };

      console.log('🔄 Cleaned form data:', cleanedData);

      // Call parent's submit handler and wait for result
      const result = await onSubmit(cleanedData);
      
      console.log(`✅ Form submitted successfully (${editMode ? 'updated' : 'created'}), showing success modal`);
      
      // Store event name for success modal
      setCreatedEventName(formData.title.trim());
      
      // Show success modal
      setShowSuccessModal(true);

    } catch (error) {
      console.error(`❌ Form submission failed (${editMode ? 'edit' : 'create'}):`, error);
      // Don't show success modal on error - let parent handle error display
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessConfirm = () => {
    console.log(`🧹 User confirmed success, clearing form and closing (${editMode ? 'edit' : 'create'} mode)`);
    
    // For create mode, clear form. For edit mode, just close
    if (!editMode) {
      setFormData({
        title: '',
        type: '',
        description: '',
        venue: '',
        max_participants: undefined,
        goal_amount: 0,
        event_date: '',
        campaign_id: ''
      });
    }
    
    // Clear any errors
    setErrors({});
    
    // Hide success modal
    setShowSuccessModal(false);
    
    // Close the form
    onCancel();
  };

  // Match backend validation - use lowercase values that map to backend
  const eventTypeSuggestions = [
    { label: 'Quiz Night', value: 'quiz' },
    { label: 'Bingo', value: 'bingo' },
    { label: 'Raffle', value: 'raffle' },
    { label: 'Auction', value: 'auction' },
    { label: 'Dinner/Social', value: 'dinner' },
    { label: 'Concert', value: 'concert' },
    { label: 'Sports Event', value: 'sports' },
    { label: 'Other', value: 'other' }
  ];

  return (
    <>
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header - NEW: Dynamic title based on mode */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editMode ? 'Edit Event' : 'Create New Event'}
              </h2>
              <button
                onClick={onCancel}
                className="text-gray-400 hover:text-gray-600"
                disabled={isSubmitting}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Form */}
          <div className="px-6 py-4 space-y-6">
            {/* Debug Info - NEW: Show edit mode info */}
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs">
                <strong>Debug Info:</strong> 
                Mode: {editMode ? 'Edit' : 'Create'} | 
                Club ID: {club?.id || 'None'} | 
                Available Campaigns: {availableCampaigns.length}
                {editMode && existingEvent && (
                  <> | Editing: {existingEvent.title}</>
                )}
              </div>
            )}

            {/* Event Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Event Title *
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  className={`w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.title ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                  } ${isSubmitting ? 'bg-gray-50' : ''}`}
                  placeholder="e.g., Christmas Quiz Night"
                />
              </div>
              {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
            </div>

            {/* Event Type */}
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                Event Type *
              </label>
              <div className="space-y-3">
                {/* Popular event type suggestions */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {eventTypeSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.value}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setFormData(prev => ({ 
                        ...prev, 
                        type: suggestion.value 
                      }))}
                      className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                        formData.type === suggestion.value
                          ? 'bg-blue-100 border-blue-300 text-blue-700'
                          : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                      } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {suggestion.label}
                    </button>
                  ))}
                </div>
                
                {/* Custom type input */}
                <div className="relative">
                  <Tag className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    className={`w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.type ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                    } ${isSubmitting ? 'bg-gray-50' : ''}`}
                    placeholder="Or type: quiz, bingo, raffle, auction, dinner, concert, sports, other"
                  />
                </div>
                {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type}</p>}
                <p className="text-xs text-gray-500">
                  Click a suggestion above or type any valid event type
                </p>
              </div>
            </div>

            {/* Date and Goal Amount */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="event_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Event Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    id="event_date"
                    name="event_date"
                    value={formData.event_date}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    className={`w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.event_date ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                    } ${isSubmitting ? 'bg-gray-50' : ''}`}
                  />
                </div>
                {errors.event_date && <p className="mt-1 text-sm text-red-600">{errors.event_date}</p>}
              </div>

              <div>
                <label htmlFor="goal_amount" className="block text-sm font-medium text-gray-700 mb-1">
                  Fundraising Goal *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    id="goal_amount"
                    name="goal_amount"
                    value={formData.goal_amount || ''}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    className={`w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.goal_amount ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                    } ${isSubmitting ? 'bg-gray-50' : ''}`}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                {errors.goal_amount && <p className="mt-1 text-sm text-red-600">{errors.goal_amount}</p>}
              </div>
            </div>

            {/* Campaign Assignment */}
            {availableCampaigns.length > 0 && (
              <div>
                <label htmlFor="campaign_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Assign to Campaign (Optional)
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <select
                    id="campaign_id"
                    name="campaign_id"
                    value={formData.campaign_id || ''}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      isSubmitting ? 'bg-gray-50' : ''
                    }`}
                  >
                    <option value="">Select a campaign (optional)</option>
                    {availableCampaigns.map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Venue and Max Participants */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="venue" className="block text-sm font-medium text-gray-700 mb-1">
                  Venue
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    id="venue"
                    name="venue"
                    value={formData.venue || ''}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      isSubmitting ? 'bg-gray-50' : ''
                    }`}
                    placeholder="e.g., Community Hall"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="max_participants" className="block text-sm font-medium text-gray-700 mb-1">
                  Max Participants
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    id="max_participants"
                    name="max_participants"
                    value={formData.max_participants || ''}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      isSubmitting ? 'bg-gray-50' : ''
                    }`}
                    placeholder="Unlimited"
                    min="1"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description || ''}
                onChange={handleInputChange}
                disabled={isSubmitting}
                rows={3}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  isSubmitting ? 'bg-gray-50' : ''
                }`}
                placeholder="Brief description of the event..."
              />
            </div>

            {/* Form Actions - NEW: Dynamic button text */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {editMode ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  editMode ? 'Update Event' : 'Create Event'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal - NEW: Dynamic success message */}
      <SuccessModal
        isOpen={showSuccessModal}
        title={editMode ? "Event Updated Successfully!" : "Event Created Successfully!"}
        message={editMode 
          ? `"${createdEventName}" has been updated with your changes.`
          : `"${createdEventName}" has been created and saved. You can now start planning and promoting your event.`
        }
        onConfirm={handleSuccessConfirm}
        color="blue"
      />
    </>
  );
};

export default CreateEventForm;

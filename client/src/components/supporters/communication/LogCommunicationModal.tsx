// File: /client/src/components/supporters/communication/LogCommunicationModal.tsx
import React, { useState, useEffect } from 'react';
import { 
  X, 
  Phone, 
  Mail, 
  MessageCircle, 
  Users, 
  FileText, 
  Smartphone,
  Share2,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  Link2,
  Tag,
  Paperclip,
  Save,
  Loader2
} from 'lucide-react';
import { Supporter, Campaign, Event } from '../../../types/types';
import { communicationService, CreateCommunicationData } from '../../../services';


interface LogCommunicationModalProps {
  supporter: Supporter;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  campaigns?: Campaign[];
  events?: Event[];
}

const LogCommunicationModal: React.FC<LogCommunicationModalProps> = ({
  supporter,
  isOpen,
  onClose,
  onSuccess,
  campaigns = [],
  events = []
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'outcome' | 'context'>('details');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [formData, setFormData] = useState<CreateCommunicationData>({
    type: 'call',
    direction: 'outbound',
    notes: '',
    subject: '',
    outcome: undefined,
    follow_up_required: false,
    follow_up_date: '',
    follow_up_notes: '',
    event_id: '',
    campaign_id: '',
    communication_channel: '',
    duration_minutes: undefined,
    attachment_urls: [],
    tags: []
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        type: 'call',
        direction: 'outbound',
        notes: '',
        subject: '',
        outcome: undefined,
        follow_up_required: false,
        follow_up_date: '',
        follow_up_notes: '',
        event_id: '',
        campaign_id: '',
        communication_channel: '',
        duration_minutes: undefined,
        attachment_urls: [],
        tags: []
      });
      setErrors({});
      setActiveTab('details');
    }
  }, [isOpen]);

  const handleInputChange = (field: keyof CreateCommunicationData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleTagsChange = (tagsString: string) => {
    const tags = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    handleInputChange('tags', tags);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required field validation
    if (!formData.type) {
      newErrors.type = 'Communication type is required';
    }

    if (!formData.direction) {
      newErrors.direction = 'Direction is required';
    }

    if (!formData.notes?.trim()) {
      newErrors.notes = 'Notes are required (minimum 5 characters)';
    } else if (formData.notes.trim().length < 5) {
      newErrors.notes = 'Notes must be at least 5 characters long';
    }

    // Follow-up validation
    if (formData.follow_up_required && !formData.follow_up_date) {
      newErrors.follow_up_date = 'Follow-up date is required when follow-up is marked as required';
    }

    if (formData.follow_up_date) {
      const followUpDate = new Date(formData.follow_up_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (followUpDate < today) {
        newErrors.follow_up_date = 'Follow-up date cannot be in the past';
      }
    }

    // Duration validation
    if (formData.duration_minutes && formData.duration_minutes < 0) {
      newErrors.duration_minutes = 'Duration cannot be negative';
    }

    // Email validation for email type
    if (formData.type === 'email' && formData.subject && !formData.subject.trim()) {
      newErrors.subject = 'Subject is recommended for email communications';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Clean up the data before submission
      const submitData: CreateCommunicationData = {
        ...formData,
        notes: formData.notes.trim(),
        subject: formData.subject?.trim() || undefined,
        event_id: formData.event_id || undefined,
        campaign_id: formData.campaign_id || undefined,
        communication_channel: formData.communication_channel?.trim() || undefined,
        follow_up_notes: formData.follow_up_notes?.trim() || undefined,
        duration_minutes: formData.duration_minutes || undefined,
        attachment_urls: formData.attachment_urls?.filter(url => url.trim()) || undefined,
        tags: formData.tags?.filter(tag => tag.trim()) || undefined
      };

      await communicationService.logCommunication(supporter.id, submitData);
      
      onSuccess(); // Refresh communication history
      onClose(); // Close modal
      
      // Show success feedback could be added here
    } catch (error) {
      console.error('Failed to log communication:', error);
      setErrors({ submit: 'Failed to log communication. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const communicationTypes = [
    { value: 'call', label: 'Phone Call', icon: Phone },
    { value: 'email', label: 'Email', icon: Mail },
    { value: 'meeting', label: 'Meeting', icon: Users },
    { value: 'letter', label: 'Letter', icon: FileText },
    { value: 'sms', label: 'SMS', icon: Smartphone },
    { value: 'social_media', label: 'Social Media', icon: Share2 },
    { value: 'event_interaction', label: 'Event Interaction', icon: Calendar },
    { value: 'other', label: 'Other', icon: MessageCircle }
  ];

  const outcomes = [
    { value: 'positive', label: 'Positive', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
    { value: 'neutral', label: 'Neutral', color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' },
    { value: 'negative', label: 'Negative', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
    { value: 'no_response', label: 'No Response', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
    { value: 'callback_requested', label: 'Callback Requested', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' }
  ];

  const tabs = [
    { id: 'details', label: 'Communication Details', icon: MessageCircle },
    { id: 'outcome', label: 'Outcome & Follow-up', icon: CheckCircle },
    { id: 'context', label: 'Context & Tags', icon: Tag }
  ] as const;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Log Communication</h2>
              <p className="text-sm text-gray-600 mt-1">
                Record interaction with {supporter.name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="mt-4 border-b border-gray-200">
            <nav className="flex space-x-8" aria-label="Tabs">
              {tabs.map((tab) => {
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <TabIcon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Submit Error */}
          {errors.submit && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <span className="text-red-800">{errors.submit}</span>
              </div>
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Communication Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Communication Type *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {communicationTypes.map((type) => {
                    const TypeIcon = type.icon;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => handleInputChange('type', type.value)}
                        className={`p-3 rounded-lg border-2 transition-colors flex flex-col items-center space-y-2 ${
                          formData.type === type.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-600 hover:text-gray-700'
                        }`}
                      >
                        <TypeIcon className="w-5 h-5" />
                        <span className="text-xs font-medium text-center">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
                {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type}</p>}
              </div>

              {/* Direction */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Direction *
                </label>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => handleInputChange('direction', 'outbound')}
                    className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                      formData.direction === 'outbound'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-center">
                      <div className="font-medium">Outbound</div>
                      <div className="text-sm text-gray-500">You contacted them</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInputChange('direction', 'inbound')}
                    className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                      formData.direction === 'inbound'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-center">
                      <div className="font-medium">Inbound</div>
                      <div className="text-sm text-gray-500">They contacted you</div>
                    </div>
                  </button>
                </div>
                {errors.direction && <p className="mt-1 text-sm text-red-600">{errors.direction}</p>}
              </div>

              {/* Subject */}
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                  Subject {formData.type === 'email' && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  id="subject"
                  value={formData.subject || ''}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.subject ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Brief subject or title for this communication"
                />
                {errors.subject && <p className="mt-1 text-sm text-red-600">{errors.subject}</p>}
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Notes *
                </label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.notes ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Detailed notes about this communication..."
                />
                <div className="mt-1 flex justify-between items-center">
                  {errors.notes ? (
                    <p className="text-sm text-red-600">{errors.notes}</p>
                  ) : (
                    <p className="text-sm text-gray-500">Minimum 5 characters required</p>
                  )}
                  <span className="text-sm text-gray-400">{formData.notes.length}/500</span>
                </div>
              </div>

              {/* Communication Channel */}
              <div>
                <label htmlFor="channel" className="block text-sm font-medium text-gray-700 mb-2">
                  Communication Channel
                </label>
                <input
                  type="text"
                  id="channel"
                  value={formData.communication_channel || ''}
                  onChange={(e) => handleInputChange('communication_channel', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 'mobile phone', 'work email', 'zoom', 'in person'"
                />
              </div>
            </div>
          )}

          {activeTab === 'outcome' && (
            <div className="space-y-6">
              {/* Outcome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Outcome
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {outcomes.map((outcome) => (
                    <button
                      key={outcome.value}
                      type="button"
                      onClick={() => handleInputChange('outcome', outcome.value)}
                      className={`p-3 rounded-lg border-2 transition-colors text-left ${
                        formData.outcome === outcome.value
                          ? `border-blue-500 ${outcome.bg} ${outcome.color}`
                          : `border-gray-200 hover:${outcome.border} ${outcome.bg}`
                      }`}
                    >
                      <div className="font-medium">{outcome.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              {(formData.type === 'call' || formData.type === 'meeting') && (
                <div>
                  <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    id="duration"
                    value={formData.duration_minutes || ''}
                    onChange={(e) => handleInputChange('duration_minutes', parseInt(e.target.value) || undefined)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.duration_minutes ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="How long did this communication take?"
                    min="0"
                  />
                  {errors.duration_minutes && <p className="mt-1 text-sm text-red-600">{errors.duration_minutes}</p>}
                </div>
              )}

              {/* Follow-up Required */}
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <input
                    type="checkbox"
                    id="follow_up_required"
                    checked={formData.follow_up_required}
                    onChange={(e) => handleInputChange('follow_up_required', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="follow_up_required" className="text-sm font-medium text-gray-700">
                    Follow-up required
                  </label>
                </div>

                {formData.follow_up_required && (
                  <div className="space-y-4 ml-6">
                    <div>
                      <label htmlFor="follow_up_date" className="block text-sm font-medium text-gray-700 mb-2">
                        Follow-up Date *
                      </label>
                      <input
                        type="date"
                        id="follow_up_date"
                        value={formData.follow_up_date || ''}
                        onChange={(e) => handleInputChange('follow_up_date', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.follow_up_date ? 'border-red-300' : 'border-gray-300'
                        }`}
                        min={new Date().toISOString().split('T')[0]}
                      />
                      {errors.follow_up_date && <p className="mt-1 text-sm text-red-600">{errors.follow_up_date}</p>}
                    </div>

                    <div>
                      <label htmlFor="follow_up_notes" className="block text-sm font-medium text-gray-700 mb-2">
                        Follow-up Notes
                      </label>
                      <textarea
                        id="follow_up_notes"
                        value={formData.follow_up_notes || ''}
                        onChange={(e) => handleInputChange('follow_up_notes', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="What should be discussed in the follow-up?"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'context' && (
            <div className="space-y-6">
              {/* Link to Event */}
              <div>
                <label htmlFor="event" className="block text-sm font-medium text-gray-700 mb-2">
                  <Link2 className="w-4 h-4 inline mr-1" />
                  Link to Event
                </label>
                <select
                  id="event"
                  value={formData.event_id || ''}
                  onChange={(e) => handleInputChange('event_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select an event (optional)</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title} - {new Date(event.event_date).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Link to Campaign */}
              <div>
                <label htmlFor="campaign" className="block text-sm font-medium text-gray-700 mb-2">
                  <Link2 className="w-4 h-4 inline mr-1" />
                  Link to Campaign
                </label>
                <select
                  id="campaign"
                  value={formData.campaign_id || ''}
                  onChange={(e) => handleInputChange('campaign_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a campaign (optional)</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tags */}
              <div>
                <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                  <Tag className="w-4 h-4 inline mr-1" />
                  Tags
                </label>
                <input
                  type="text"
                  id="tags"
                  value={formData.tags?.join(', ') || ''}
                  onChange={(e) => handleTagsChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter tags separated by commas (e.g., urgent, follow-up, donation-discussion)"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Tags help categorize and search communications later
                </p>
              </div>

              {/* Attachment URLs */}
              <div>
                <label htmlFor="attachments" className="block text-sm font-medium text-gray-700 mb-2">
                  <Paperclip className="w-4 h-4 inline mr-1" />
                  Attachment URLs
                </label>
                <textarea
                  id="attachments"
                  value={formData.attachment_urls?.join('\n') || ''}
                  onChange={(e) => {
                    const urls = e.target.value.split('\n').filter(url => url.trim());
                    handleInputChange('attachment_urls', urls);
                  }}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="One URL per line (e.g., links to documents, recordings, etc.)"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Add links to relevant documents, recordings, or other materials
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Communication
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogCommunicationModal;
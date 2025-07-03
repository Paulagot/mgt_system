// File: client/src/components/supporters/panels/SupporterDetailPanel.tsx
import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  DollarSign, 
  MessageCircle, 
  Clock, 
  Heart, 
  Building2, 
  Star, 
  Award, 
  AlertCircle, 
  CheckCircle, 
  Target, 
  Edit, 
  Save, 
  Users, 
  TrendingUp, 
  FileText, 
  Tag, 
  Shield, 
  ExternalLink,
  PhoneCall,
  Send,
  Plus,
  History,
  Coins,
  BarChart3
} from 'lucide-react';
import { Supporter } from '../../../types/types';
import { supporterService, communicationService } from '../../../services';

interface SupporterDetailPanelProps {
  supporter: Supporter;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (supporter: Supporter) => void;
  onDelete?: (supporterId: string) => void;
}

const SupporterDetailPanel: React.FC<SupporterDetailPanelProps> = ({ 
  supporter, 
  isOpen, 
  onClose,
  onEdit,
  onDelete
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'communications' | 'donations' | 'tasks'>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [engagement, setEngagement] = useState<any>(null);
  const [communications, setCommunications] = useState<any[]>([]);
  const [showQuickNote, setShowQuickNote] = useState(false);
  const [quickNote, setQuickNote] = useState('');

  // Load supporter engagement data
  useEffect(() => {
    if (isOpen && supporter?.id) {
      loadEngagementData();
      loadCommunications();
    }
  }, [isOpen, supporter?.id]);

  const loadEngagementData = async () => {
    try {
      setIsLoading(true);
      const response = await supporterService.getSupporterEngagement(supporter.id);
      setEngagement(response.engagement_report);
    } catch (error) {
      console.error('Failed to load engagement data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCommunications = async () => {
    try {
      const response = await communicationService.getCommunicationHistory(supporter.id, 10);
      setCommunications(response.communications || []);
    } catch (error) {
      console.error('Failed to load communications:', error);
    }
  };

  const handleQuickNote = async () => {
    if (!quickNote.trim()) return;
    
    try {
      await communicationService.logCommunication(supporter.id, {
        type: 'other',
        direction: 'outbound',
        notes: quickNote,
        subject: 'Quick Note',
        outcome: 'neutral'
      });
      setQuickNote('');
      setShowQuickNote(false);
      loadCommunications();
    } catch (error) {
      console.error('Failed to log note:', error);
    }
  };

  const formatCurrency = (amount: number) => `£${amount.toLocaleString()}`;
  
  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatRelativeDate = (date: string | Date) => {
    const now = new Date();
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    const diffTime = now.getTime() - targetDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
    return `${Math.ceil(diffDays / 365)} years ago`;
  };

  // Get styling for relationship strength
  const getRelationshipStyle = () => {
    const styles = {
      prospect: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300', icon: Target },
      new: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', icon: Star },
      regular: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', icon: CheckCircle },
      major: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300', icon: Award },
      lapsed: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', icon: Clock },
      inactive: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', icon: AlertCircle }
    };
    return styles[supporter.relationship_strength || 'prospect'];
  };

  const getTypeStyle = () => {
    const styles = {
      volunteer: { bg: 'bg-blue-50', text: 'text-blue-700', icon: Heart },
      donor: { bg: 'bg-green-50', text: 'text-green-700', icon: DollarSign },
      sponsor: { bg: 'bg-purple-50', text: 'text-purple-700', icon: Building2 }
    };
    return styles[supporter.type];
  };

  const relationshipStyle = getRelationshipStyle();
  const typeStyle = getTypeStyle();
  const RelationshipIcon = relationshipStyle.icon;
  const TypeIcon = typeStyle.icon;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'communications', label: 'Communications', icon: MessageCircle },
    { id: 'donations', label: 'Donations', icon: DollarSign },
    { id: 'tasks', label: 'Tasks', icon: CheckCircle }
  ] as const;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
      <div className="w-full max-w-2xl bg-white h-full overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4 flex-1 min-w-0">
              {/* Avatar */}
              <div className={`w-16 h-16 rounded-xl ${typeStyle.bg} flex items-center justify-center flex-shrink-0`}>
                <TypeIcon className={`w-8 h-8 ${typeStyle.text}`} />
              </div>
              
              {/* Basic Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-gray-900 truncate">{supporter.name}</h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {/* Type Badge */}
                  <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${typeStyle.bg} ${typeStyle.text} border`}>
                    <TypeIcon className="w-4 h-4 mr-1" />
                    {supporter.type.charAt(0).toUpperCase() + supporter.type.slice(1)}
                  </div>
                  
                  {/* Relationship Badge */}
                  <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${relationshipStyle.bg} ${relationshipStyle.text} border ${relationshipStyle.border}`}>
                    <RelationshipIcon className="w-4 h-4 mr-1" />
                    {supporter.relationship_strength?.replace('_', ' ').split(' ').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </div>
                </div>

                {/* Quick Contact Info */}
                <div className="mt-2 space-y-1">
                  {supporter.email && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="w-4 h-4 mr-2 text-gray-400" />
                      <a href={`mailto:${supporter.email}`} className="hover:text-blue-600">
                        {supporter.email}
                      </a>
                    </div>
                  )}
                  {supporter.phone && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="w-4 h-4 mr-2 text-gray-400" />
                      <a href={`tel:${supporter.phone}`} className="hover:text-blue-600">
                        {supporter.phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="ml-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 mt-4">
            {supporter.phone && (
              <button className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <PhoneCall className="w-4 h-4 mr-2" />
                Call
              </button>
            )}
            {supporter.email && (
              <button className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                <Send className="w-4 h-4 mr-2" />
                Email
              </button>
            )}
            <button 
              onClick={() => setShowQuickNote(!showQuickNote)}
              className="flex items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Quick Note
            </button>
            {onEdit && (
              <button 
                onClick={() => onEdit(supporter)}
                className="flex items-center px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </button>
            )}
          </div>

          {/* Quick Note Input */}
          {showQuickNote && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <textarea
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                placeholder="Add a quick note..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
              <div className="flex justify-end gap-2 mt-2">
                <button 
                  onClick={() => setShowQuickNote(false)}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleQuickNote}
                  disabled={!quickNote.trim()}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Save Note
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 flex-shrink-0">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
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

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="p-6 space-y-6">
              {/* Key Metrics */}
              {supporter.type === 'donor' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center">
                      <DollarSign className="w-5 h-5 text-green-600 mr-2" />
                      <span className="text-sm text-green-600 font-medium">Total Donated</span>
                    </div>
                    <p className="text-2xl font-bold text-green-700 mt-1">
                      {formatCurrency(supporter.total_donated || 0)}
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center">
                      <BarChart3 className="w-5 h-5 text-blue-600 mr-2" />
                      <span className="text-sm text-blue-600 font-medium">Donations</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-700 mt-1">
                      {supporter.donation_count || 0}
                    </p>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <div className="flex items-center">
                      <TrendingUp className="w-5 h-5 text-purple-600 mr-2" />
                      <span className="text-sm text-purple-600 font-medium">Avg Gift</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-700 mt-1">
                      {formatCurrency(supporter.average_donation || 0)}
                    </p>
                  </div>
                </div>
              )}

              {supporter.type === 'volunteer' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center">
                      <Clock className="w-5 h-5 text-blue-600 mr-2" />
                      <span className="text-sm text-blue-600 font-medium">Hours Volunteered</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-700 mt-1">
                      {supporter.volunteer_hours_total || 0}h
                    </p>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center">
                      <Heart className="w-5 h-5 text-green-600 mr-2" />
                      <span className="text-sm text-green-600 font-medium">This Year</span>
                    </div>
                    <p className="text-2xl font-bold text-green-700 mt-1">
                      {supporter.volunteer_hours_this_year || 0}h
                    </p>
                  </div>
                </div>
              )}

              {/* Contact Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <p className="text-sm text-gray-900">{supporter.email || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Phone</label>
                    <p className="text-sm text-gray-900">{supporter.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Preferred Contact</label>
                    <p className="text-sm text-gray-900 capitalize">
                      {supporter.preferred_contact_method || 'Email'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Location</label>
                    <p className="text-sm text-gray-900">
                      {[supporter.city, supporter.country].filter(Boolean).join(', ') || 'Not provided'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Relationship Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Heart className="w-5 h-5 mr-2" />
                  Relationship
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Lifecycle Stage</label>
                    <p className="text-sm text-gray-900 capitalize">
                      {supporter.lifecycle_stage?.replace('_', ' ') || 'Prospect'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Priority Level</label>
                    <p className="text-sm text-gray-900 capitalize">
                      {supporter.priority_level || 'Medium'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Last Contact</label>
                    <p className="text-sm text-gray-900">
                      {supporter.last_contact_date ? formatRelativeDate(supporter.last_contact_date) : 'Never'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Next Contact</label>
                    <p className="text-sm text-gray-900">
                      {supporter.next_contact_date ? formatDate(supporter.next_contact_date) : 'Not scheduled'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tags and Notes */}
              {(supporter.tags?.length || supporter.notes) && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Tag className="w-5 h-5 mr-2" />
                    Additional Information
                  </h3>
                  
                  {supporter.tags && supporter.tags.length > 0 && (
                    <div className="mb-4">
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Tags</label>
                      <div className="flex flex-wrap gap-2">
                        {supporter.tags.map((tag, index) => (
                          <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {supporter.notes && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Notes</label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{supporter.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'communications' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Communication History</h3>
                <button className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Log Communication
                </button>
              </div>

              {communications.length > 0 ? (
                <div className="space-y-4">
                  {communications.map((comm, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2">
                          <MessageCircle className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900 capitalize">
                            {comm.type.replace('_', ' ')}
                          </span>
                          <span className="text-sm text-gray-500">
                            {comm.direction === 'inbound' ? 'from' : 'to'} {supporter.name}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {formatRelativeDate(comm.created_at)}
                        </span>
                      </div>
                      
                      {comm.subject && (
                        <p className="font-medium text-gray-800 mb-1">{comm.subject}</p>
                      )}
                      
                      <p className="text-sm text-gray-600 mb-2">{comm.notes}</p>
                      
                      {comm.outcome && (
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">Outcome:</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            comm.outcome === 'positive' ? 'bg-green-100 text-green-800' :
                            comm.outcome === 'negative' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {comm.outcome}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageCircle className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No communications yet</h3>
                  <p className="mt-1 text-sm text-gray-500">Start building a relationship by logging your first interaction.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'donations' && (
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Donation History</h3>
              
              {supporter.type === 'donor' ? (
                <div className="text-center py-8">
                  <Coins className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Donation tracking coming soon</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Detailed donation history and trends will be available here.
                  </p>
                  <div className="mt-4 bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>Current total:</strong> {formatCurrency(supporter.total_donated || 0)}
                    </p>
                    <p className="text-sm text-green-600 mt-1">
                      {supporter.donation_count || 0} donations • 
                      Average: {formatCurrency(supporter.average_donation || 0)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Coins className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Not a donor</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    This supporter is registered as a {supporter.type}.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Tasks & Follow-ups</h3>
                <button className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </button>
              </div>

              <div className="text-center py-8">
                <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Create tasks and follow-up reminders for this supporter.
                </p>
                
                {supporter.next_contact_date && (
                  <div className="mt-4 bg-orange-50 p-4 rounded-lg">
                    <div className="flex items-center justify-center text-orange-800">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span className="text-sm font-medium">
                        Next contact scheduled: {formatDate(supporter.next_contact_date)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupporterDetailPanel;
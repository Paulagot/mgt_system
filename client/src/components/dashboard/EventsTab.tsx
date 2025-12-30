// client/src/components/dashboard/EventsTab.tsx (FINAL - PROPER ERROR HANDLING)

import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Filter } from 'lucide-react';
import EventCard from '../cards/EventCard';
import AlertModal from '../shared/Alertmodal';
import { Event } from '../../types/types';

interface TrustStatus {
  canCreateEvent: boolean;
  reason?: string;
  outstandingImpactReports?: number;
  overdueDays?: number;
}

interface EventsTabProps {
  events: Event[];
  clubId: string;
  getCampaignName: (id?: string) => string | undefined;
  onCreateEvent: () => void;
  onEditEvent: (event: Event) => void;
  onDeleteEvent: (eventId: string) => void;
  onViewEvent: (event: Event) => void;
  onPublishEvent?: (eventId: string) => Promise<void>;
  onUnpublishEvent?: (eventId: string) => Promise<void>;
  getPrizeDataForEvent?: (eventId: string) => { count: number; value: number };
}

const EventsTab: React.FC<EventsTabProps> = ({
  events,
  clubId,
  getCampaignName,
  onCreateEvent,
  onEditEvent,
  onDeleteEvent,
  onViewEvent,
  onPublishEvent,
  onUnpublishEvent,
  getPrizeDataForEvent,
}) => {
  const [showFilter, setShowFilter] = useState<'all' | 'draft' | 'published'>('all');
  const [trustStatus, setTrustStatus] = useState<TrustStatus | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorTitle, setErrorTitle] = useState('Error');
  const [errorMessage, setErrorMessage] = useState('');
  const [errorVariant, setErrorVariant] = useState<'error' | 'warning' | 'info' | 'success'>('warning');

  const isEventPublished = (event: Event): boolean => {
    return Boolean(event.is_published);
  };

  useEffect(() => {
    const checkTrust = async () => {
      try {
        // TODO: Replace with actual trust check
        const mockTrustStatus: TrustStatus = {
          canCreateEvent: true,
          reason: undefined,
          outstandingImpactReports: 0,
          overdueDays: 0,
        };
        setTrustStatus(mockTrustStatus);
      } catch (error) {
        console.error('Error checking trust status:', error);
      }
    };
    checkTrust();
  }, [clubId]);

  const handlePublish = async (eventId: string) => {
    // Check trust status before publishing
    if (!trustStatus?.canCreateEvent) {
      setErrorTitle('Publishing Restricted');
      setErrorMessage(
        trustStatus?.reason || 
        'Outstanding impact reports must be completed before publishing.'
      );
      setErrorVariant('warning');
      setShowErrorModal(true);
      return;
    }

    if (onPublishEvent) {
      try {
        await onPublishEvent(eventId);
        // Success - no modal needed
      } catch (error: any) {
        console.error('❌ Publish error caught:', error);
        console.log('Error details:', {
          message: error.message,
          requiresCampaignPublish: error.requiresCampaignPublish,
          requiresTrustFix: error.requiresTrustFix,
          campaignName: error.campaignName,
        });

        // ✅ Check for campaign publish error
        if (error.requiresCampaignPublish) {
          setErrorTitle('Campaign Not Published');
          setErrorMessage(
            error.message || 
            `This event is part of a campaign that must be published first.`
          );
          setErrorVariant('warning');
          setShowErrorModal(true);
        } 
        // Check for trust error
        else if (error.requiresTrustFix) {
          setErrorTitle('Publishing Restricted');
          setErrorMessage(error.message || 'Complete outstanding impact reports first.');
          setErrorVariant('warning');
          setShowErrorModal(true);
        }
        // Generic error
        else {
          setErrorTitle('Error');
          setErrorMessage(error.message || 'Failed to publish event. Please try again.');
          setErrorVariant('error');
          setShowErrorModal(true);
        }
      }
    }
  };

  const handleUnpublish = async (eventId: string) => {
    if (onUnpublishEvent) {
      try {
        await onUnpublishEvent(eventId);
      } catch (error: any) {
        console.error('Error unpublishing event:', error);
        setErrorTitle('Error');
        setErrorMessage('Failed to unpublish event. Please try again.');
        setErrorVariant('error');
        setShowErrorModal(true);
      }
    }
  };

  const filteredEvents = events.filter(event => {
    if (showFilter === 'draft') return !isEventPublished(event);
    if (showFilter === 'published') return isEventPublished(event);
    return true;
  });

  const draftCount = events.filter(e => !isEventPublished(e)).length;
  const publishedCount = events.filter(e => isEventPublished(e)).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Events</h2>
        <button
          onClick={onCreateEvent}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Event
        </button>
      </div>

      {trustStatus && !trustStatus.canCreateEvent && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <h3 className="text-red-800 font-semibold mb-2 flex items-center">
            <span className="mr-2">⚠️</span>
            Publishing Restricted
          </h3>
          <p className="text-red-700 text-sm mb-2">{trustStatus.reason}</p>
          {trustStatus.outstandingImpactReports && trustStatus.outstandingImpactReports > 0 && (
            <p className="text-red-600 text-sm">
              Outstanding impact reports: <strong>{trustStatus.outstandingImpactReports}</strong>
            </p>
          )}
          {trustStatus.overdueDays && trustStatus.overdueDays > 0 && (
            <p className="text-red-600 text-sm">
              Overdue by: <strong>{trustStatus.overdueDays} days</strong>
            </p>
          )}
          <a 
            href="/impact" 
            className="text-red-600 underline text-sm mt-2 inline-block hover:text-red-800"
          >
            Complete outstanding impact reports →
          </a>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-500" />
        <button
          onClick={() => setShowFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            showFilter === 'all'
              ? 'bg-blue-100 text-blue-700 border border-blue-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All ({events.length})
        </button>
        <button
          onClick={() => setShowFilter('draft')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            showFilter === 'draft'
              ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Drafts ({draftCount})
        </button>
        <button
          onClick={() => setShowFilter('published')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            showFilter === 'published'
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Published ({publishedCount})
        </button>
      </div>

      {filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => {
            const prizeData = getPrizeDataForEvent ? getPrizeDataForEvent(event.id) : { count: 0, value: 0 };
            
            return (
              <EventCard
                key={event.id}
                event={event}
                onEdit={onEditEvent}
                onDelete={onDeleteEvent}
                onView={onViewEvent}
                onPublish={handlePublish}
                onUnpublish={handleUnpublish}
                campaignName={getCampaignName(event.campaign_id)}
                prizeCount={prizeData.count}
                prizeValue={prizeData.value}
              />
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {showFilter === 'draft' && 'No draft events'}
            {showFilter === 'published' && 'No published events'}
            {showFilter === 'all' && 'No events yet'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {showFilter === 'all' 
              ? 'Create your first event to get started'
              : `Try switching to a different filter`
            }
          </p>
          {showFilter === 'all' && (
            <button
              onClick={onCreateEvent}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Create Event
            </button>
          )}
        </div>
      )}

      {/* Error modal */}
      <AlertModal
        isOpen={showErrorModal}
        title={errorTitle}
        message={errorMessage}
        variant={errorVariant}
        onClose={() => setShowErrorModal(false)}
        buttonText="Okay"
      />
    </div>
  );
};

export default EventsTab;

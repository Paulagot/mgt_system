// client/src/components/events/EventsTab.tsx (UPDATED)

import React from 'react';
import { Plus, Calendar } from 'lucide-react';
import EventCard from '../cards/EventCard';
import { Event } from '../../types/types';

interface EventsTabProps {
  events: Event[];
  getCampaignName: (id?: string) => string | undefined;
  onCreateEvent: () => void;
  onEditEvent: (event: Event) => void;
  onDeleteEvent: (eventId: string) => void;
  onViewEvent: (event: Event) => void;
  // NEW: Add function to get prize data
  getPrizeDataForEvent?: (eventId: string) => { count: number; value: number };
}

const EventsTab: React.FC<EventsTabProps> = ({
  events,
  getCampaignName,
  onCreateEvent,
  onEditEvent,
  onDeleteEvent,
  onViewEvent,
  getPrizeDataForEvent, // NEW
}) => {
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

      {events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => {
            // NEW: Get prize data for this event
            const prizeData = getPrizeDataForEvent ? getPrizeDataForEvent(event.id) : { count: 0, value: 0 };
            
            return (
              <EventCard
                key={event.id}
                event={event}
                onEdit={onEditEvent}
                onDelete={onDeleteEvent}
                onView={onViewEvent}
                campaignName={getCampaignName(event.campaign_id)}
                // NEW: Pass prize data to EventCard
                prizeCount={prizeData.count}
                prizeValue={prizeData.value}
              />
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No events yet</h3>
          <p className="mt-1 text-sm text-gray-500">Create your first event to get started</p>
          <button
            onClick={onCreateEvent}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Create Event
          </button>
        </div>
      )}
    </div>
  );
};

export default EventsTab;

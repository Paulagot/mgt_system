// client/src/services/eventsService.ts
// Events service extending BaseService

import BaseService from './baseServices';
import type { Event, CreateEventForm } from '../types/types';

class EventsService extends BaseService {
  /**
   * Get all events for a club
   */
  async getClubEvents(clubId: string): Promise<{ events: Event[] }> {
    return this.request<{ events: Event[] }>(`/clubs/${clubId}/events`);
  }

  /**
   * Get a single event by ID
   */
  async getEvent(eventId: string): Promise<{ event: Event }> {
    return this.request<{ event: Event }>(`/events/${eventId}`);
  }

  /**
   * Create a new event (automatically saved as draft)
   */
  async createEvent(clubId: string, eventData: CreateEventForm): Promise<{ event: Event; message: string }> {
    return this.request<{ event: Event; message: string }>(`/clubs/${clubId}/events`, {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  }

  /**
   * Update an existing event
   */
  async updateEvent(eventId: string, eventData: Partial<CreateEventForm>): Promise<{ event: Event; message: string }> {
    return this.request<{ event: Event; message: string }>(`/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(eventData),
    });
  }

  /**
   * Delete an event
   */
  async deleteEvent(eventId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/events/${eventId}`, {
      method: 'DELETE',
    });
  }

  /**
   * ✅ NEW: Publish an event (makes it public, requires trust check)
   */
  async publishEvent(eventId: string): Promise<{ message: string; event: Event }> {
    return this.request<{ message: string; event: Event }>(`/events/${eventId}/publish`, {
      method: 'PATCH',
    });
  }

  /**
   * Get events by campaign
   */
  async getCampaignEvents(campaignId: string): Promise<{ events: Event[] }> {
    return this.request<{ events: Event[] }>(`/campaigns/${campaignId}/events`);
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(clubId: string): Promise<{ events: Event[] }> {
    const response = await this.getClubEvents(clubId);
    const now = new Date();
    const upcomingEvents = response.events.filter(event => new Date(event.event_date) > now);
    return { events: upcomingEvents };
  }

  /**
   * Get past events
   */
  async getPastEvents(clubId: string): Promise<{ events: Event[] }> {
    const response = await this.getClubEvents(clubId);
    const now = new Date();
    const pastEvents = response.events.filter(event => new Date(event.event_date) <= now);
    return { events: pastEvents };
  }

  /**
   * Get public events (only published events)
   */
  async getPublicEvents(clubId: string): Promise<{ events: Event[] }> {
    return this.request<{ events: Event[] }>(`/clubs/${clubId}/events/public`);
  }

  /**
   * Update event status
   */
  async updateEventStatus(eventId: string, status: 'draft' | 'live' | 'ended' | 'cancelled'): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/events/${eventId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  /**
   * Recalculate event financials
   */
  async recalculateEventFinancials(eventId: string): Promise<{ message: string; financials: any }> {
    return this.request<{ message: string; financials: any }>(`/events/${eventId}/financials/recalculate`, {
      method: 'POST',
    });
  }

  /**
   * Get event financial breakdown
   */
  async getEventFinancials(eventId: string): Promise<any> {
    return this.request<any>(`/events/${eventId}/financials`);
  }

  /**
   * Validate event data before submission
   */
  validateEventData(data: CreateEventForm): string[] {
    const errors: string[] = [];

    if (!data.title?.trim()) {
      errors.push('Event title is required');
    }

    if (!data.type?.trim()) {
      errors.push('Event type is required');
    }

    if (!data.event_date) {
      errors.push('Event date is required');
    } else {
      const eventDate = new Date(data.event_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (eventDate < today) {
        errors.push('Event date cannot be in the past');
      }
    }

    if (!data.goal_amount || data.goal_amount <= 0) {
      errors.push('Goal amount must be greater than 0');
    }

    return errors;
  }

  /**
   * Calculate event progress percentage
   */
  calculateProgress(goalAmount: number, actualAmount: number): number {
    if (goalAmount === 0) return 0;
    return Math.min((actualAmount / goalAmount) * 100, 100);
  }

  /**
   * Get event status badge info
   */
  getEventStatusBadge(event: Event): { color: string; label: string } {
    const now = new Date();
    const eventDate = new Date(event.event_date);

 

    if (event.status === 'ended' || eventDate < now) {
      return { color: 'gray', label: 'Ended' };
    }

    if (event.status === 'live') {
      return { color: 'green', label: 'Live' };
    }

    if (event.status === 'draft') {
      return { color: 'yellow', label: 'Draft' };
    }

    return { color: 'blue', label: 'Scheduled' };
  }

  /**
   * Check if event can be edited
   */
  canEditEvent(event: Event): boolean {
    const eventDate = new Date(event.event_date);
    const now = new Date();
    
    // Can edit if event hasn't happened yet
    return eventDate > now ;
  }

  /**
   * Check if event can be deleted
   */
  canDeleteEvent(event: Event): boolean {
    // Can delete if no income or expenses recorded
    return (event.actual_amount || 0) === 0 && (event.total_expenses || 0) === 0;
  }

  /**
   * Format event for display
   */
  formatEventForDisplay(event: Event): any {
    return {
      ...event,
      formatted_date: this.formatDate(event.event_date),
      formatted_goal: this.formatCurrency(event.goal_amount),
      formatted_actual: this.formatCurrency(event.actual_amount || 0),
      formatted_expenses: this.formatCurrency(event.total_expenses || 0),
      formatted_profit: this.formatCurrency(event.net_profit || 0),
      progress: this.calculateProgress(event.goal_amount, event.actual_amount || 0),
      status_badge: this.getEventStatusBadge(event),
      can_edit: this.canEditEvent(event),
      can_delete: this.canDeleteEvent(event),
    };
  }
}

// Export singleton instance
const eventsService = new EventsService();
export default eventsService;
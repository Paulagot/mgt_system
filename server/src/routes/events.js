import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequired } from '../middleware/validation.js';
import EventService from '../services/EventService.js';
import ImpactService from '../services/ImpactService.js';
import CampaignService from '../services/CampaignService.js'; // ✅ NEW
import { 
  VALID_EVENT_TYPES, 
  VALID_EVENT_STATUSES,
  EVENT_STATUS 
} from '../utils/constants.js';

const router = express.Router();
const eventService = new EventService();
const impactService = new ImpactService();
const campaignService = new CampaignService(); // ✅ NEW
const getSocketManager = (req) => req.app.get('socketManager');

// Create a new event (as draft)
router.post('/api/events', 
  authenticateToken,
  validateRequired(['title', 'type', 'goal_amount', 'event_date']),
  async (req, res) => {
    try {
      const { 
        title, 
        type, 
        description, 
        venue, 
        max_participants, 
        goal_amount, 
        event_date, 
        campaign_id 
      } = req.body;

      if (!VALID_EVENT_TYPES.includes(type)) {
        return res.status(400).json({ 
          error: `Invalid event type. Must be one of: ${VALID_EVENT_TYPES.join(', ')}` 
        });
      }

      if (goal_amount <= 0) {
        return res.status(400).json({ error: 'Goal amount must be greater than 0' });
      }

      const eventDate = new Date(event_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (eventDate < today) {
        return res.status(400).json({ error: 'Event date cannot be in the past' });
      }

      const eventData = {
        title: title.trim(),
        type,
        description: description ? description.trim() : null,
        venue: venue ? venue.trim() : null,
        max_participants: max_participants ? parseInt(max_participants) : null,
        goal_amount: parseFloat(goal_amount),
        event_date,
        campaign_id: campaign_id || null
      };

      const event = await eventService.createEvent(req.club_id, eventData);

      const socketManager = getSocketManager(req);
      socketManager.emitEventCreated(req.club_id, event);

      res.status(201).json({
        message: 'Event created as draft successfully',
        event
      });

    } catch (error) {
      if (error.message === 'Campaign not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === 'Campaign does not belong to your club') {
        return res.status(403).json({ error: error.message });
      }
      
      console.error('Create event error:', error);
      res.status(500).json({ error: 'Failed to create event' });
    }
  }
);

// ✅ UPDATED: Publish an event with campaign AND trust checking
router.patch('/api/events/:eventId/publish', 
  authenticateToken,
  async (req, res) => {
    try {
      const { eventId } = req.params;
      const clubId = req.club_id;

      // 1. Get the event
      const event = await eventService.getEventById(eventId, clubId);
      
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // 2. ✅ NEW: If event belongs to a campaign, check if campaign is published
      if (event.campaign_id) {
        const campaign = await campaignService.getCampaignById(event.campaign_id, clubId);
        
        if (!campaign) {
          return res.status(404).json({ error: 'Campaign not found' });
        }

        // Check if campaign is published
        if (!campaign.is_published) {
          return res.status(403).json({ 
            error: 'Cannot publish event',
            reason: 'Campaign must be published first',
            message: `This event is part of "${campaign.name}" campaign. Please publish the campaign before publishing this event.`,
            campaignId: campaign.id,
            campaignName: campaign.name,
            requiresCampaignPublish: true
          });
        }
      }

      // 3. Check trust status
      const trustStatus = await impactService.checkTrustStatus(clubId);
      
      if (!trustStatus.canCreateEvent) {
        return res.status(403).json({ 
          error: 'Cannot publish event',
          reason: trustStatus.reason,
          message: trustStatus.reason,
          outstanding: trustStatus.outstandingImpactReports,
          overdueDays: trustStatus.overdueDays,
          requiresTrustFix: true
        });
      }

      // 4. Publish the event
      const publishedEvent = await eventService.publishEvent(eventId, clubId);

      const socketManager = getSocketManager(req);
      socketManager.emitEventUpdated(clubId, publishedEvent);

      res.json({
        message: 'Event published successfully',
        event: publishedEvent
      });

    } catch (error) {
      console.error('Publish event error:', error);
      res.status(500).json({ error: 'Failed to publish event' });
    }
  }
);

// Unpublish an event (make it draft again)
router.patch('/api/events/:eventId/unpublish', 
  authenticateToken,
  async (req, res) => {
    try {
      const { eventId } = req.params;
      const clubId = req.club_id;

      const event = await eventService.unpublishEvent(eventId, clubId);

      const socketManager = getSocketManager(req);
      socketManager.emitEventUpdated(clubId, event);

      res.json({
        message: 'Event unpublished successfully',
        event
      });

    } catch (error) {
      if (error.message === 'Event not found') {
        return res.status(404).json({ error: error.message });
      }
      
      console.error('Unpublish event error:', error);
      res.status(500).json({ error: 'Failed to unpublish event' });
    }
  }
);

// Get all events for a club
router.get('/api/clubs/:clubId/events',
  authenticateToken,
  async (req, res) => {
    try {
      const { clubId } = req.params;
      const { status } = req.query;

      if (clubId !== req.club_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      let events;
      if (status && VALID_EVENT_STATUSES.includes(status)) {
        events = await eventService.getEventsByStatus(clubId, status);
      } else {
        events = await eventService.getEventsByClub(clubId);
      }

      res.json({
        events,
        total: events.length
      });

    } catch (error) {
      console.error('Get events error:', error);
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  }
);

// Get published events for a club (for public pages)
router.get('/api/clubs/:clubId/events/published',
  async (req, res) => {
    try {
      const { clubId } = req.params;

      const events = await eventService.getPublishedEventsByClub(clubId);

      res.json({
        events,
        total: events.length
      });

    } catch (error) {
      console.error('Get published events error:', error);
      res.status(500).json({ error: 'Failed to fetch published events' });
    }
  }
);

// Get upcoming events for a club
router.get('/api/clubs/:clubId/events/upcoming',
  authenticateToken,
  async (req, res) => {
    try {
      const { clubId } = req.params;
      const { limit = 5 } = req.query;

      if (clubId !== req.club_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const events = await eventService.getUpcomingEvents(clubId, parseInt(limit));

      res.json({
        events,
        total: events.length
      });

    } catch (error) {
      console.error('Get upcoming events error:', error);
      res.status(500).json({ error: 'Failed to fetch upcoming events' });
    }
  }
);

// Get a specific event
router.get('/api/events/:eventId',
  authenticateToken,
  async (req, res) => {
    try {
      const { eventId } = req.params;

      const event = await eventService.getEventById(eventId, req.club_id);

      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      res.json({ event });

    } catch (error) {
      console.error('Get event error:', error);
      res.status(500).json({ error: 'Failed to fetch event' });
    }
  }
);

// Get event financial details
router.get('/api/events/:eventId/financials',
  authenticateToken,
  async (req, res) => {
    try {
      const { eventId } = req.params;

      const financials = await eventService.getEventFinancials(eventId, req.club_id);

      if (!financials) {
        return res.status(404).json({ error: 'Event not found' });
      }

      res.json(financials);

    } catch (error) {
      console.error('Get event financials error:', error);
      res.status(500).json({ error: 'Failed to fetch event financials' });
    }
  }
);

// Update an event
router.put('/api/events/:eventId',
  authenticateToken,
  async (req, res) => {
    try {
      const { eventId } = req.params;
      const updateData = req.body;

      if (updateData.type && !VALID_EVENT_TYPES.includes(updateData.type)) {
        return res.status(400).json({ 
          error: `Invalid event type. Must be one of: ${VALID_EVENT_TYPES.join(', ')}` 
        });
      }

      if (updateData.status && !VALID_EVENT_STATUSES.includes(updateData.status)) {
        return res.status(400).json({ 
          error: `Invalid status. Must be one of: ${VALID_EVENT_STATUSES.join(', ')}` 
        });
      }

      if (updateData.goal_amount !== undefined) {
        if (updateData.goal_amount <= 0) {
          return res.status(400).json({ error: 'Goal amount must be greater than 0' });
        }
        updateData.goal_amount = parseFloat(updateData.goal_amount);
      }

      if (updateData.actual_amount !== undefined) {
        if (updateData.actual_amount < 0) {
          return res.status(400).json({ error: 'Actual amount cannot be negative' });
        }
        updateData.actual_amount = parseFloat(updateData.actual_amount);
      }

      if (updateData.event_date) {
        const eventDate = new Date(updateData.event_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (eventDate < today) {
          return res.status(400).json({ error: 'Event date cannot be in the past' });
        }
      }

      if (updateData.title) updateData.title = updateData.title.trim();
      if (updateData.description) updateData.description = updateData.description.trim();
      if (updateData.venue) updateData.venue = updateData.venue.trim();

      if (updateData.max_participants) updateData.max_participants = parseInt(updateData.max_participants);

      if (updateData.campaign_id !== undefined) {
        if (updateData.campaign_id === '' || updateData.campaign_id === null) {
          updateData.campaign_id = null;
        }
      }

      console.log('📧 Route: Cleaned updateData before sending to service:', updateData);
      
      const event = await eventService.updateEvent(eventId, req.club_id, updateData);

      if (!event) {
        return res.status(404).json({ error: 'Event not found or no changes made' });
      }

      const socketManager = getSocketManager(req);
      socketManager.emitEventUpdated(req.club_id, event);

      res.json({
        message: 'Event updated successfully',
        event
      });

    } catch (error) {
      if (error.message === 'No valid fields to update') {
        return res.status(400).json({ error: error.message });
      }
      
      console.error('Update event error:', error);
      res.status(500).json({ error: 'Failed to update event' });
    }
  }
);

// Delete an event
router.delete('/api/events/:eventId',
  authenticateToken,
  async (req, res) => {
    try {
      const { eventId } = req.params;

      const deleted = await eventService.deleteEvent(eventId, req.club_id);

      if (!deleted) {
        return res.status(404).json({ error: 'Event not found' });
      }

      const socketManager = getSocketManager(req);
      socketManager.emitEventDeleted(req.club_id, eventId);

      res.json({ message: 'Event deleted successfully' });

    } catch (error) {
      if (error.message === 'Cannot delete event with associated financial records') {
        return res.status(400).json({ error: error.message });
      }
      
      console.error('Delete event error:', error);
      res.status(500).json({ error: 'Failed to delete event' });
    }
  }
);

export default router;
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequired } from '../middleware/validation.js';
import CampaignService from '../services/CampaignService.js';

const router = express.Router();
const campaignService = new CampaignService();
const getSocketManager = (req) => req.app.get('socketManager');

// Create a new campaign
router.post('/api/campaigns', 
  authenticateToken,
  validateRequired(['name', 'target_amount']), // Only require essential fields
  async (req, res) => {
    try {
      const { 
        name, 
        description, 
        target_amount,
        category,
        start_date,
        end_date,
        tags 
      } = req.body;

      // Validate target_amount is positive
      if (target_amount <= 0) {
        return res.status(400).json({ error: 'Target amount must be greater than 0' });
      }

      // Validate dates if provided
      if (start_date && end_date) {
        const startDate = new Date(start_date);
        const endDate = new Date(end_date);
        if (endDate <= startDate) {
          return res.status(400).json({ error: 'End date must be after start date' });
        }
      }

      // Validate category if provided (optional validation)
      const validCategories = [
        'building', 'equipment', 'program', 'emergency', 
        'community', 'education', 'other'
      ];
      if (category && !validCategories.includes(category)) {
        return res.status(400).json({ 
          error: `Invalid category. Must be one of: ${validCategories.join(', ')}` 
        });
      }

      const campaignData = {
        name: name.trim(),
        description: description ? description.trim() : null,
        target_amount: parseFloat(target_amount),
        category: category ? category.trim() : null,
        start_date: start_date || null,
        end_date: end_date || null,
        tags: tags || []
      };

      const campaign = await campaignService.createCampaign(req.club_id, campaignData);

      const socketManager = getSocketManager(req);
console.log('🔌 Socket manager:', socketManager ? 'Found' : 'Missing');
if (socketManager && typeof socketManager.emitCampaignCreated === 'function') {
  console.log('📢 Emitting campaign_created to club', req.club_id);
  socketManager.emitCampaignCreated(req.club_id, campaign);
} else {
  console.log('❌ Socket manager or emitCampaignCreated method not available');
}

      res.status(201).json({
        message: 'Campaign created successfully',
        campaign
      });

    } catch (error) {
      console.error('Create campaign error:', error);
      res.status(500).json({ error: 'Failed to create campaign' });
    }
  }
);

// Get all campaigns for a club
router.get('/api/clubs/:clubId/campaigns',
  authenticateToken,
  async (req, res) => {
    try {
      const { clubId } = req.params;
      const { category, status } = req.query;

      // Verify user belongs to this club
      if (clubId !== req.club_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      let campaigns = await campaignService.getCampaignsByClub(clubId);

      // Filter by category if provided
      if (category) {
        campaigns = campaigns.filter(campaign => 
          campaign.category === category
        );
      }

      // Filter by status if provided (active/ended based on dates)
      if (status) {
        const now = new Date();
        if (status === 'active') {
          campaigns = campaigns.filter(campaign => 
            !campaign.end_date || new Date(campaign.end_date) >= now
          );
        } else if (status === 'ended') {
          campaigns = campaigns.filter(campaign => 
            campaign.end_date && new Date(campaign.end_date) < now
          );
        }
      }

      res.json({
        campaigns,
        total: campaigns.length
      });

    } catch (error) {
      console.error('Get campaigns error:', error);
      res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
  }
);

// Get a specific campaign with stats
router.get('/api/campaigns/:campaignId',
  authenticateToken,
  async (req, res) => {
    try {
      const { campaignId } = req.params;

      const campaign = await campaignService.getCampaignStats(campaignId, req.club_id);

      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      res.json({ campaign });

    } catch (error) {
      console.error('Get campaign error:', error);
      res.status(500).json({ error: 'Failed to fetch campaign' });
    }
  }
);

// Update a campaign
router.put('/api/campaigns/:campaignId',
  authenticateToken,
  async (req, res) => {
    try {
      const { campaignId } = req.params;
      const updateData = req.body;

      // Validate target_amount if provided
      if (updateData.target_amount !== undefined) {
        if (updateData.target_amount <= 0) {
          return res.status(400).json({ error: 'Target amount must be greater than 0' });
        }
        updateData.target_amount = parseFloat(updateData.target_amount);
      }

      // Validate dates if both provided
      if (updateData.start_date && updateData.end_date) {
        const startDate = new Date(updateData.start_date);
        const endDate = new Date(updateData.end_date);
        if (endDate <= startDate) {
          return res.status(400).json({ error: 'End date must be after start date' });
        }
      }

      // Validate category if provided
      const validCategories = [
        'building', 'equipment', 'program', 'emergency', 
        'community', 'education', 'other'
      ];
      if (updateData.category && !validCategories.includes(updateData.category)) {
        return res.status(400).json({ 
          error: `Invalid category. Must be one of: ${validCategories.join(', ')}` 
        });
      }

      // Trim string fields
      if (updateData.name) updateData.name = updateData.name.trim();
      if (updateData.description) updateData.description = updateData.description.trim();
      if (updateData.category) updateData.category = updateData.category.trim();

      const campaign = await campaignService.updateCampaign(campaignId, req.club_id, updateData);

      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found or no changes made' });
      }

      const socketManager = getSocketManager(req);
      socketManager.emitCampaignUpdated(req.club_id, campaign);

      res.json({
        message: 'Campaign updated successfully',
        campaign
      });

    } catch (error) {
      if (error.message === 'No valid fields to update') {
        return res.status(400).json({ error: error.message });
      }
      
      console.error('Update campaign error:', error);
      res.status(500).json({ error: 'Failed to update campaign' });
    }
  }
);

// Delete a campaign
router.delete('/api/campaigns/:campaignId',
  authenticateToken,
  async (req, res) => {
    try {
      const { campaignId } = req.params;

      const deleted = await campaignService.deleteCampaign(campaignId, req.club_id);

      if (!deleted) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      const socketManager = getSocketManager(req);
      socketManager.emitCampaignDeleted(req.club_id, campaignId);

      res.json({ message: 'Campaign deleted successfully' });

    } catch (error) {
      if (error.message === 'Cannot delete campaign with associated events') {
        return res.status(400).json({ error: error.message });
      }
      
      console.error('Delete campaign error:', error);
      res.status(500).json({ error: 'Failed to delete campaign' });
    }
  }
);

// Get campaigns by category (additional endpoint for filtering)
router.get('/api/clubs/:clubId/campaigns/category/:category',
  authenticateToken,
  async (req, res) => {
    try {
      const { clubId, category } = req.params;

      // Verify user belongs to this club
      if (clubId !== req.club_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const campaigns = await campaignService.getCampaignsByClub(clubId);
      const filteredCampaigns = campaigns.filter(campaign => 
        campaign.category === category
      );

      res.json({
        campaigns: filteredCampaigns,
        total: filteredCampaigns.length,
        category
      });

    } catch (error) {
      console.error('Get campaigns by category error:', error);
      res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
  }
);

// GET /api/campaigns/:campaignId/events
router.get('/api/campaigns/:campaignId/events',
  authenticateToken,
  async (req, res) => {
    try {
      const { campaignId } = req.params;
      
      // You can reuse your existing EventService method
      const events = await eventService.getEventsByCampaign(campaignId, req.club_id);
      
      res.json({
        events,
        total: events.length
      });
    } catch (error) {
      console.error('Get campaign events error:', error);
      res.status(500).json({ error: 'Failed to fetch campaign events' });
    }
  }
);

export default router;
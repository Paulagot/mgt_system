import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequired } from '../middleware/validation.js';
import SupporterService from '../services/SupporterService.js';

const router = express.Router();
const supporterService = new SupporterService();
const getSocketManager = (req) => req.app.get('socketManager');

// ===== ENHANCED SUPPORTER CRUD =====

// Create a new supporter (enhanced with CRM fields)
router.post('/api/clubs/:clubId/supporters',
  authenticateToken,
  validateRequired(['name', 'type']),
  async (req, res) => {
    try {
      const { clubId } = req.params;
      
      if (clubId !== req.club_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Validate supporter type
      const validTypes = ['volunteer', 'donor', 'sponsor'];
      if (!validTypes.includes(req.body.type)) {
        return res.status(400).json({ error: 'Invalid supporter type. Must be volunteer, donor, or sponsor' });
      }

      // Validate relationship strength if provided
      const validRelationships = ['prospect', 'new', 'regular', 'major', 'lapsed', 'inactive'];
      if (req.body.relationship_strength && !validRelationships.includes(req.body.relationship_strength)) {
        return res.status(400).json({ error: 'Invalid relationship strength' });
      }

      // Validate lifecycle stage if provided
      const validLifecycles = ['prospect', 'first_time', 'repeat', 'major', 'lapsed', 'champion'];
      if (req.body.lifecycle_stage && !validLifecycles.includes(req.body.lifecycle_stage)) {
        return res.status(400).json({ error: 'Invalid lifecycle stage' });
      }

      // Validate email format if provided
      if (req.body.email && !/\S+@\S+\.\S+/.test(req.body.email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      const supporter = await supporterService.createSupporter(clubId, req.body);

      const socketManager = getSocketManager(req);
      if (socketManager && typeof socketManager.emitSupporterCreated === 'function') {
        socketManager.emitSupporterCreated(req.club_id, supporter);
      }

      res.status(201).json({
        message: 'Supporter created successfully',
        supporter
      });
    } catch (error) {
      console.error('Create supporter error:', error);
      res.status(500).json({ error: 'Failed to create supporter' });
    }
  }
);

// Get all supporters for a club (enhanced filtering)
router.get('/api/clubs/:clubId/supporters',
  authenticateToken,
  async (req, res) => {
    try {
      const { clubId } = req.params;
      const { type, search, relationship_strength, lifecycle_stage, priority_level, limit, offset } = req.query;
      
      if (clubId !== req.club_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const supporters = await supporterService.getSupportersByClub(clubId, {
        type, search, relationship_strength, lifecycle_stage, priority_level
      });

      // Apply pagination if requested
      let paginatedSupporters = supporters;
      if (limit) {
        const limitNum = parseInt(limit);
        const offsetNum = parseInt(offset) || 0;
        paginatedSupporters = supporters.slice(offsetNum, offsetNum + limitNum);
      }

      res.json({
        supporters: paginatedSupporters,
        total: supporters.length,
        filters_applied: { type, search, relationship_strength, lifecycle_stage, priority_level }
      });
    } catch (error) {
      console.error('Get supporters error:', error);
      res.status(500).json({ error: 'Failed to fetch supporters' });
    }
  }
);

// Get a specific supporter with full details
router.get('/api/supporters/:supporterId',
  authenticateToken,
  async (req, res) => {
    try {
      const { supporterId } = req.params;
      
      const supporter = await supporterService.getSupporterById(supporterId, req.club_id);
      
      if (!supporter) {
        return res.status(404).json({ error: 'Supporter not found' });
      }

      res.json({ supporter });
    } catch (error) {
      console.error('Get supporter error:', error);
      res.status(500).json({ error: 'Failed to fetch supporter' });
    }
  }
);

// Update a supporter (enhanced with CRM fields)
router.put('/api/supporters/:supporterId',
  authenticateToken,
  async (req, res) => {
    try {
      const { supporterId } = req.params;
      
      // Validate email format if being updated
      if (req.body.email && !/\S+@\S+\.\S+/.test(req.body.email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      // Validate enums if being updated
      const validTypes = ['volunteer', 'donor', 'sponsor'];
      if (req.body.type && !validTypes.includes(req.body.type)) {
        return res.status(400).json({ error: 'Invalid supporter type' });
      }

      const validRelationships = ['prospect', 'new', 'regular', 'major', 'lapsed', 'inactive'];
      if (req.body.relationship_strength && !validRelationships.includes(req.body.relationship_strength)) {
        return res.status(400).json({ error: 'Invalid relationship strength' });
      }

      const supporter = await supporterService.updateSupporter(supporterId, req.club_id, req.body);
      
      if (!supporter) {
        return res.status(404).json({ error: 'Supporter not found' });
      }

      const socketManager = getSocketManager(req);
      if (socketManager && typeof socketManager.emitSupporterUpdated === 'function') {
        socketManager.emitSupporterUpdated(req.club_id, supporter);
      }

      res.json({
        message: 'Supporter updated successfully',
        supporter
      });
    } catch (error) {
      console.error('Update supporter error:', error);
      if (error.message === 'No valid fields to update') {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to update supporter' });
    }
  }
);

// Delete a supporter
router.delete('/api/supporters/:supporterId',
  authenticateToken,
  async (req, res) => {
    try {
      const { supporterId } = req.params;
      
      const deleted = await supporterService.deleteSupporter(supporterId, req.club_id);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Supporter not found' });
      }

      const socketManager = getSocketManager(req);
      if (socketManager && typeof socketManager.emitSupporterDeleted === 'function') {
        socketManager.emitSupporterDeleted(req.club_id, supporterId);
      }

      res.json({ message: 'Supporter deleted successfully' });
    } catch (error) {
      console.error('Delete supporter error:', error);
      if (error.message === 'Cannot delete supporter with associated communications, prizes, or tasks') {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to delete supporter' });
    }
  }
);

// ===== DONOR-FOCUSED ANALYTICS & REPORTING =====

// Get comprehensive donor statistics
router.get('/api/clubs/:clubId/supporters/donor-stats',
  authenticateToken,
  async (req, res) => {
    try {
      const { clubId } = req.params;
      
      if (clubId !== req.club_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const stats = await supporterService.getDonorStats(clubId);
      res.json({
        donor_statistics: stats,
        generated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get donor stats error:', error);
      res.status(500).json({ error: 'Failed to fetch donor statistics' });
    }
  }
);

// Get top donors
router.get('/api/clubs/:clubId/supporters/top-donors',
  authenticateToken,
  async (req, res) => {
    try {
      const { clubId } = req.params;
      const { limit = 10 } = req.query;
      
      if (clubId !== req.club_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const topDonors = await supporterService.getTopDonors(clubId, parseInt(limit));
      res.json({
        top_donors: topDonors,
        limit: parseInt(limit)
      });
    } catch (error) {
      console.error('Get top donors error:', error);
      res.status(500).json({ error: 'Failed to fetch top donors' });
    }
  }
);

// Get lapsed donors (for retention campaigns)
router.get('/api/clubs/:clubId/supporters/lapsed-donors',
  authenticateToken,
  async (req, res) => {
    try {
      const { clubId } = req.params;
      const { months = 12 } = req.query;
      
      if (clubId !== req.club_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const lapsedDonors = await supporterService.getLapsedDonors(clubId, parseInt(months));
      res.json({
        lapsed_donors: lapsedDonors,
        threshold_months: parseInt(months),
        total_lapsed: lapsedDonors.length
      });
    } catch (error) {
      console.error('Get lapsed donors error:', error);
      res.status(500).json({ error: 'Failed to fetch lapsed donors' });
    }
  }
);

// Get donor retention rate
router.get('/api/clubs/:clubId/supporters/retention-rate',
  authenticateToken,
  async (req, res) => {
    try {
      const { clubId } = req.params;
      const { timeframe = 12 } = req.query;
      
      if (clubId !== req.club_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const retentionData = await supporterService.getDonorRetentionRate(clubId, parseInt(timeframe));
      res.json({
        retention_analysis: retentionData,
        analysis_date: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get retention rate error:', error);
      res.status(500).json({ error: 'Failed to calculate retention rate' });
    }
  }
);

// ===== COMMUNICATION LOGGING SYSTEM =====

// Log a communication with a supporter
router.post('/api/supporters/:supporterId/communications',
  authenticateToken,
  validateRequired(['type', 'direction', 'notes']),
  async (req, res) => {
    try {
      const { supporterId } = req.params;

      // Validate communication type
      const validTypes = ['call', 'email', 'meeting', 'letter', 'sms', 'social_media', 'event_interaction', 'other'];
      if (!validTypes.includes(req.body.type)) {
        return res.status(400).json({ error: 'Invalid communication type' });
      }

      // Validate direction
      const validDirections = ['inbound', 'outbound'];
      if (!validDirections.includes(req.body.direction)) {
        return res.status(400).json({ error: 'Invalid communication direction' });
      }

      // Validate outcome if provided
      const validOutcomes = ['positive', 'neutral', 'negative', 'no_response', 'callback_requested'];
      if (req.body.outcome && !validOutcomes.includes(req.body.outcome)) {
        return res.status(400).json({ error: 'Invalid communication outcome' });
      }

      const communicationData = {
        ...req.body,
        supporter_id: supporterId,
        created_by: req.user.id // From auth middleware
      };

      const communication = await supporterService.logCommunication(req.club_id, communicationData);

      const socketManager = getSocketManager(req);
      if (socketManager && typeof socketManager.emitCommunicationLogged === 'function') {
        socketManager.emitCommunicationLogged(req.club_id, communication);
      }

      res.status(201).json({
        message: 'Communication logged successfully',
        communication
      });
    } catch (error) {
      console.error('Log communication error:', error);
      res.status(500).json({ error: 'Failed to log communication' });
    }
  }
);

// Get communication history for a supporter
router.get('/api/supporters/:supporterId/communications',
  authenticateToken,
  async (req, res) => {
    try {
      const { supporterId } = req.params;
      const { limit = 50 } = req.query;

       console.log('🔍 Debug getCommunicationHistory:');
      console.log('supporterId:', supporterId);
      console.log('club_id:', req.club_id);
      console.log('limit:', parseInt(limit));
      console.log('limit type:', typeof parseInt(limit));

      const communications = await supporterService.getCommunicationHistory(
        supporterId, 
        req.club_id, 
        parseInt(limit)
      );

      res.json({
        communications,
        supporter_id: supporterId,
        total_retrieved: communications.length
      });
    } catch (error) {
      console.error('Get communication history error:', error);
      res.status(500).json({ error: 'Failed to fetch communication history' });
    }
  }
);

// Get follow-up tasks for the club
router.get('/api/clubs/:clubId/follow-up-tasks',
  authenticateToken,
  async (req, res) => {
    try {
      const { clubId } = req.params;
      const { overdue = false } = req.query;
      
      if (clubId !== req.club_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const isOverdue = overdue === 'true';
      const tasks = await supporterService.getFollowUpTasks(clubId, isOverdue);

      res.json({
        follow_up_tasks: tasks,
        is_overdue_filter: isOverdue,
        total_tasks: tasks.length
      });
    } catch (error) {
      console.error('Get follow-up tasks error:', error);
      res.status(500).json({ error: 'Failed to fetch follow-up tasks' });
    }
  }
);

// ===== ENHANCED SUPPORTER ANALYTICS & REPORTING =====

// Get comprehensive supporter statistics (enhanced)
router.get('/api/clubs/:clubId/supporters/stats',
  authenticateToken,
  async (req, res) => {
    try {
      const { clubId } = req.params;
      
      if (clubId !== req.club_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const stats = await supporterService.getSupporterStats(clubId);
      res.json({
        supporter_statistics: stats,
        generated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get supporter stats error:', error);
      res.status(500).json({ error: 'Failed to fetch supporter statistics' });
    }
  }
);

// Get supporters by type (enhanced)
router.get('/api/clubs/:clubId/supporters/type/:type',
  authenticateToken,
  async (req, res) => {
    try {
      const { clubId, type } = req.params;
      
      if (clubId !== req.club_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const validTypes = ['volunteer', 'donor', 'sponsor'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: 'Invalid supporter type' });
      }

      const supporters = await supporterService.getSupportersByClub(clubId, { type });
      res.json({
        supporters,
        type,
        total: supporters.length
      });
    } catch (error) {
      console.error('Get supporters by type error:', error);
      res.status(500).json({ error: 'Failed to fetch supporters by type' });
    }
  }
);

// Get supporter engagement details (enhanced)
router.get('/api/supporters/:supporterId/engagement',
  authenticateToken,
  async (req, res) => {
    try {
      const { supporterId } = req.params;
      
      const engagement = await supporterService.getSupporterEngagement(supporterId, req.club_id);
      res.json({
        engagement_report: engagement,
        generated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get supporter engagement error:', error);
      if (error.message === 'Supporter not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to fetch supporter engagement' });
    }
  }
);

// ===== SPECIALIZED SUPPORTER QUERIES =====

// Get available volunteers (enhanced)
router.get('/api/clubs/:clubId/supporters/available-volunteers',
  authenticateToken,
  async (req, res) => {
    try {
      const { clubId } = req.params;
      const { event_id } = req.query;
      
      if (clubId !== req.club_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const volunteers = await supporterService.getSupportersByClub(clubId, { 
        type: 'volunteer' 
      });

      // Filter by availability if event_id provided
      // TODO: Implement getAvailableVolunteers method or filter logic

      res.json({
        available_volunteers: volunteers,
        event_id: event_id || null,
        total: volunteers.length
      });
    } catch (error) {
      console.error('Get available volunteers error:', error);
      res.status(500).json({ error: 'Failed to fetch available volunteers' });
    }
  }
);

// Search supporters (enhanced)
router.get('/api/clubs/:clubId/supporters/search',
  authenticateToken,
  async (req, res) => {
    try {
      const { clubId } = req.params;
      const { q, type, relationship_strength, lifecycle_stage } = req.query;
      
      if (clubId !== req.club_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (!q || q.trim().length < 2) {
        return res.status(400).json({ error: 'Search query must be at least 2 characters' });
      }

      const supporters = await supporterService.getSupportersByClub(clubId, {
        search: q.trim(),
        type,
        relationship_strength,
        lifecycle_stage
      });

      res.json({
        search_results: supporters,
        query: q.trim(),
        filters: { type, relationship_strength, lifecycle_stage },
        total_results: supporters.length
      });
    } catch (error) {
      console.error('Search supporters error:', error);
      res.status(500).json({ error: 'Failed to search supporters' });
    }
  }
);

// ===== BULK OPERATIONS =====

// Bulk create supporters
router.post('/api/clubs/:clubId/supporters/bulk',
  authenticateToken,
  async (req, res) => {
    try {
      const { clubId } = req.params;
      const { supporters } = req.body;
      
      if (clubId !== req.club_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (!Array.isArray(supporters) || supporters.length === 0) {
        return res.status(400).json({ error: 'Supporters array is required' });
      }

      if (supporters.length > 100) {
        return res.status(400).json({ error: 'Maximum 100 supporters can be created at once' });
      }

      const result = await supporterService.bulkCreateSupporters(clubId, supporters);

      // Emit socket events for successful creations
      if (result.successful.length > 0) {
        const socketManager = getSocketManager(req);
        if (socketManager && typeof socketManager.emitSupporterCreated === 'function') {
          result.successful.forEach(supporter => {
            socketManager.emitSupporterCreated(req.club_id, supporter);
          });
        }
      }

      res.status(201).json({
        message: 'Bulk supporter creation completed',
        result
      });
    } catch (error) {
      console.error('Bulk create supporters error:', error);
      res.status(500).json({ error: 'Failed to bulk create supporters' });
    }
  }
);

// Export supporters (enhanced)
router.get('/api/clubs/:clubId/supporters/export',
  authenticateToken,
  async (req, res) => {
    try {
      const { clubId } = req.params;
      const { type, search, relationship_strength, lifecycle_stage, format = 'csv' } = req.query;
      
      if (clubId !== req.club_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const csvData = await supporterService.exportSupporters(clubId, {
        type, search, relationship_strength, lifecycle_stage
      });

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `supporters_${clubId}_${timestamp}.${format}`;

      res.json({
        export_data: csvData,
        filename,
        total_records: csvData.length,
        export_format: format,
        filters_applied: { type, search, relationship_strength, lifecycle_stage },
        generated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Export supporters error:', error);
      res.status(500).json({ error: 'Failed to export supporters' });
    }
  }
);

// ===== SUPPORTER SEGMENTATION ENDPOINTS =====

// Get supporters by relationship strength
router.get('/api/clubs/:clubId/supporters/relationship/:strength',
  authenticateToken,
  async (req, res) => {
    try {
      const { clubId, strength } = req.params;
      
      if (clubId !== req.club_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const validStrengths = ['prospect', 'new', 'regular', 'major', 'lapsed', 'inactive'];
      if (!validStrengths.includes(strength)) {
        return res.status(400).json({ error: 'Invalid relationship strength' });
      }

      const supporters = await supporterService.getSupportersByClub(clubId, { 
        relationship_strength: strength 
      });

      res.json({
        supporters,
        relationship_strength: strength,
        total: supporters.length
      });
    } catch (error) {
      console.error('Get supporters by relationship error:', error);
      res.status(500).json({ error: 'Failed to fetch supporters by relationship strength' });
    }
  }
);

// Get supporters by lifecycle stage
router.get('/api/clubs/:clubId/supporters/lifecycle/:stage',
  authenticateToken,
  async (req, res) => {
    try {
      const { clubId, stage } = req.params;
      
      if (clubId !== req.club_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const validStages = ['prospect', 'first_time', 'repeat', 'major', 'lapsed', 'champion'];
      if (!validStages.includes(stage)) {
        return res.status(400).json({ error: 'Invalid lifecycle stage' });
      }

      const supporters = await supporterService.getSupportersByClub(clubId, { 
        lifecycle_stage: stage 
      });

      res.json({
        supporters,
        lifecycle_stage: stage,
        total: supporters.length
      });
    } catch (error) {
      console.error('Get supporters by lifecycle error:', error);
      res.status(500).json({ error: 'Failed to fetch supporters by lifecycle stage' });
    }
  }
);

// Add these routes to your supporterRoutes.js if you want the advanced features:

// Update/Delete individual communications
router.put('/api/communications/:communicationId',
  authenticateToken,
  async (req, res) => {
    // Update communication logic
  }
);

router.delete('/api/communications/:communicationId',
  authenticateToken, 
  async (req, res) => {
    // Delete communication logic
  }
);

// Follow-up task management
router.post('/api/communications/:communicationId/complete-follow-up',
  authenticateToken,
  async (req, res) => {
    // Mark follow-up as completed
  }
);

// Communication analytics (if you want advanced reporting)
router.get('/api/clubs/:clubId/communications/summary',
  authenticateToken,
  async (req, res) => {
    // Communication summary analytics
  }
);

// Communication templates (if you want template system)
router.get('/api/clubs/:clubId/communication-templates',
  authenticateToken,
  async (req, res) => {
    // Get communication templates
  }
);

export default router;
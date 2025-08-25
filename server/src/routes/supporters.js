import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequired } from '../middleware/validation.js';
import SupporterService from '../services/SupporterService.js';

import db from '../config/database.js';
const DB_TABLE_PREFIX = process.env.DB_TABLE_PREFIX || 'fundraisely_';

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
    console.log('🔍 Auth Debug - req.user:', req.user);
    console.log('🔍 Auth Debug - req.club_id:', req.club_id);
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

      // Validate parameters
      if (!supporterId || !req.club_id) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }

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
      
      // Return empty array instead of error to prevent frontend crashes
      res.json({
        communications: [],
        supporter_id: req.params.supporterId,
        total_retrieved: 0,
        error_message: 'Communication history temporarily unavailable'
      });
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

router.put('/api/communications/:communicationId', authenticateToken, async (req, res) => {
  try {
    const { communicationId } = req.params;
    const { club_id } = req.user;
    const updateData = req.body;

    // Validate communication belongs to this club
    const [existingComm] = await db.execute(
      `SELECT id, club_id FROM ${DB_TABLE_PREFIX}communications WHERE id = ? AND club_id = ?`,
      [communicationId, club_id]
    );

    if (existingComm.length === 0) {
      return res.status(404).json({ error: 'Communication not found' });
    }

    // Build dynamic update query
    const allowedFields = ['type', 'direction', 'subject', 'notes', 'outcome', 'follow_up_required', 
                          'follow_up_date', 'follow_up_notes', 'communication_channel', 'duration_minutes', 'tags'];
    
    const updateFields = [];
    const updateValues = [];
    
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        updateValues.push(typeof updateData[field] === 'object' ? JSON.stringify(updateData[field]) : updateData[field]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updateFields.push('updated_at = NOW()');
    updateValues.push(communicationId, club_id);

    await db.execute(
      `UPDATE ${DB_TABLE_PREFIX}communications SET ${updateFields.join(', ')} WHERE id = ? AND club_id = ?`,
      updateValues
    );

    // Get updated communication with creator info
    const [updated] = await db.execute(`
      SELECT c.*, u.name as created_by_name 
      FROM ${DB_TABLE_PREFIX}communications c
      LEFT JOIN ${DB_TABLE_PREFIX}users u ON c.created_by = u.id
      WHERE c.id = ? AND c.club_id = ?
    `, [communicationId, club_id]);

    res.json({ 
      message: 'Communication updated successfully', 
      communication: updated[0] 
    });

  } catch (error) {
    console.error('Update communication error:', error);
    res.status(500).json({ error: 'Failed to update communication' });
  }
});

// Delete individual communication
router.delete('/api/communications/:communicationId', authenticateToken, async (req, res) => {
  try {
    const { communicationId } = req.params;
    const { club_id } = req.user;

    // Validate communication belongs to this club
    const [existingComm] = await db.execute(
      `SELECT id, supporter_id FROM ${DB_TABLE_PREFIX}communications WHERE id = ? AND club_id = ?`,
      [communicationId, club_id]
    );

    if (existingComm.length === 0) {
      return res.status(404).json({ error: 'Communication not found' });
    }

    // Delete the communication
    await db.execute(
      `DELETE FROM ${DB_TABLE_PREFIX}communications WHERE id = ? AND club_id = ?`,
      [communicationId, club_id]
    );

    res.json({ 
      message: 'Communication deleted successfully',
      communicationId: communicationId,
      supporterId: existingComm[0].supporter_id
    });

  } catch (error) {
    console.error('Delete communication error:', error);
    res.status(500).json({ error: 'Failed to delete communication' });
  }
});

// Complete follow-up task
router.post('/api/communications/:communicationId/complete-follow-up', authenticateToken, async (req, res) => {
  try {
    const { communicationId } = req.params;
    const { club_id, id: userId } = req.user;
    const { completion_notes } = req.body;

    // Validate communication belongs to this club
    const [existingComm] = await db.execute(
      `SELECT id, supporter_id FROM ${DB_TABLE_PREFIX}communications WHERE id = ? AND club_id = ?`,
      [communicationId, club_id]
    );

    if (existingComm.length === 0) {
      return res.status(404).json({ error: 'Communication not found' });
    }

    // Update follow-up status
    await db.execute(`
      UPDATE ${DB_TABLE_PREFIX}communications 
      SET follow_up_completed = true, 
          follow_up_completed_date = NOW(),
          follow_up_completed_by = ?,
          follow_up_completion_notes = ?,
          updated_at = NOW()
      WHERE id = ? AND club_id = ?
    `, [userId, completion_notes || null, communicationId, club_id]);

    // Get updated communication
    const [updated] = await db.execute(`
      SELECT c.*, u.name as created_by_name,
             uc.name as follow_up_completed_by_name
      FROM ${DB_TABLE_PREFIX}communications c
      LEFT JOIN ${DB_TABLE_PREFIX}users u ON c.created_by = u.id
      LEFT JOIN ${DB_TABLE_PREFIX}users uc ON c.follow_up_completed_by = uc.id
      WHERE c.id = ? AND c.club_id = ?
    `, [communicationId, club_id]);

    res.json({ 
      message: 'Follow-up marked as completed', 
      communication: updated[0] 
    });

  } catch (error) {
    console.error('Complete follow-up error:', error);
    res.status(500).json({ error: 'Failed to complete follow-up' });
  }
});

// Reschedule follow-up
router.post('/api/communications/:communicationId/reschedule-follow-up', authenticateToken, async (req, res) => {
  try {
    const { communicationId } = req.params;
    const { club_id } = req.user;
    const { follow_up_date, reschedule_reason } = req.body;

    if (!follow_up_date) {
      return res.status(400).json({ error: 'New follow-up date is required' });
    }

    // Validate date is in the future
    const newDate = new Date(follow_up_date);
    if (newDate < new Date()) {
      return res.status(400).json({ error: 'Follow-up date must be in the future' });
    }

    // Validate communication belongs to this club
    const [existingComm] = await db.execute(
      `SELECT id FROM ${DB_TABLE_PREFIX}communications WHERE id = ? AND club_id = ?`,
      [communicationId, club_id]
    );

    if (existingComm.length === 0) {
      return res.status(404).json({ error: 'Communication not found' });
    }

    // Update follow-up date
    await db.execute(`
      UPDATE ${DB_TABLE_PREFIX}communications 
      SET follow_up_date = ?,
          follow_up_reschedule_reason = ?,
          updated_at = NOW()
      WHERE id = ? AND club_id = ?
    `, [follow_up_date, reschedule_reason || null, communicationId, club_id]);

    // Get updated communication
    const [updated] = await db.execute(`
      SELECT c.*, u.name as created_by_name 
      FROM ${DB_TABLE_PREFIX}communications c
      LEFT JOIN ${DB_TABLE_PREFIX}users u ON c.created_by = u.id
      WHERE c.id = ? AND c.club_id = ?
    `, [communicationId, club_id]);

    res.json({ 
      message: 'Follow-up rescheduled successfully', 
      communication: updated[0] 
    });

  } catch (error) {
    console.error('Reschedule follow-up error:', error);
    res.status(500).json({ error: 'Failed to reschedule follow-up' });
  }
});

// Communication analytics summary
router.get('/api/clubs/:clubId/communications/summary', authenticateToken, async (req, res) => {
  try {
    const { clubId } = req.params;
    const { club_id } = req.user;
    const { date_from, date_to } = req.query;

    if (clubId !== club_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let dateFilter = '';
    let dateParams = [];
    
    if (date_from && date_to) {
      dateFilter = ' AND c.created_at BETWEEN ? AND ?';
      dateParams = [date_from, date_to];
    }

    // Get summary statistics
    const [summaryStats] = await db.execute(`
      SELECT 
        COUNT(*) as total_communications,
        COUNT(CASE WHEN DATE(c.created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as recent_communications,
        COUNT(CASE WHEN c.follow_up_required = true AND c.follow_up_completed = false THEN 1 END) as pending_follow_ups,
        COUNT(CASE WHEN c.follow_up_required = true AND c.follow_up_completed = false AND c.follow_up_date < CURDATE() THEN 1 END) as overdue_follow_ups
      FROM ${DB_TABLE_PREFIX}communications c
      WHERE c.club_id = ?${dateFilter}
    `, [club_id, ...dateParams]);

    // Get communication type breakdown
    const [typeBreakdown] = await db.execute(`
      SELECT c.type, COUNT(*) as count
      FROM ${DB_TABLE_PREFIX}communications c
      WHERE c.club_id = ?${dateFilter}
      GROUP BY c.type
      ORDER BY count DESC
    `, [club_id, ...dateParams]);

    // Get outcome breakdown
    const [outcomeBreakdown] = await db.execute(`
      SELECT c.outcome, COUNT(*) as count
      FROM ${DB_TABLE_PREFIX}communications c
      WHERE c.club_id = ? AND c.outcome IS NOT NULL${dateFilter}
      GROUP BY c.outcome
      ORDER BY count DESC
    `, [club_id, ...dateParams]);

    const communication_summary = {
      total_communications: summaryStats[0].total_communications,
      recent_communications: summaryStats[0].recent_communications,
      pending_follow_ups: summaryStats[0].pending_follow_ups,
      overdue_follow_ups: summaryStats[0].overdue_follow_ups,
      communication_breakdown: typeBreakdown,
      outcome_breakdown: outcomeBreakdown,
      avg_response_time: 0 // TODO: Implement if needed
    };

    res.json({ 
      communication_summary,
      date_range: { from: date_from, to: date_to },
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Communication summary error:', error);
    res.status(500).json({ error: 'Failed to get communication summary' });
  }
});

// Get communication templates
router.get('/clubs/:clubId/communication-templates', authenticateToken, async (req, res) => {
  try {
    const { clubId } = req.params;
    const { club_id } = req.user;
    const { type } = req.query;

    if (clubId !== club_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // For now, return default templates (you can implement a database table later)
    const defaultTemplates = [
      {
        id: 'donation-thank-you',
        name: 'Donation Thank You',
        type: 'email',
        subject_template: 'Thank you for your generous donation!',
        notes_template: 'Thank you so much for your generous donation of [amount]. Your support means the world to us and will help us achieve our fundraising goals. We truly appreciate your commitment to our cause.'
      },
      {
        id: 'event-invitation',
        name: 'Event Invitation',
        type: 'email',
        subject_template: 'You\'re invited to [event_name]',
        notes_template: 'We would love to invite you to our upcoming event: [event_name] on [date]. This will be a great opportunity to meet other supporters and learn more about our recent activities.'
      },
      {
        id: 'volunteer-follow-up',
        name: 'Volunteer Follow-up',
        type: 'call',
        subject_template: 'Follow-up on volunteer opportunity',
        notes_template: 'Following up on [supporter_name]\'s interest in volunteering. Discussed available opportunities and next steps for getting involved.'
      },
      {
        id: 'sponsor-proposal',
        name: 'Sponsorship Proposal',
        type: 'meeting',
        subject_template: 'Sponsorship opportunity discussion',
        notes_template: 'Presented sponsorship opportunities for our upcoming events. Discussed benefits and partnership levels available.'
      }
    ];

    let templates = defaultTemplates;
    if (type) {
      templates = templates.filter(t => t.type === type);
    }

    res.json({ templates });

  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Failed to get communication templates' });
  }
});

// Bulk communication operations
router.post('/api/communications/bulk', authenticateToken, async (req, res) => {
  try {
    const { club_id, id: userId } = req.user;
    const { communications } = req.body;

    if (!Array.isArray(communications) || communications.length === 0) {
      return res.status(400).json({ error: 'Communications array is required' });
    }

    const successful = [];
    const errors = [];

    for (let i = 0; i < communications.length; i++) {
      const { supporter_id, communication_data } = communications[i];
      
      try {
        // Validate supporter belongs to this club
        const [supporter] = await db.execute(
          `SELECT id FROM ${DB_TABLE_PREFIX}supporters WHERE id = ? AND club_id = ?`,
          [supporter_id, club_id]
        );

        if (supporter.length === 0) {
          errors.push({
            index: i,
            supporter_id,
            error: 'Supporter not found or access denied'
          });
          continue;
        }

        // Insert communication
        const communicationId = require('crypto').randomUUID();
        await db.execute(`
          INSERT INTO ${DB_TABLE_PREFIX}communications 
          (id, club_id, supporter_id, type, direction, subject, notes, outcome, 
           follow_up_required, follow_up_date, follow_up_notes, event_id, campaign_id,
           communication_channel, duration_minutes, attachment_urls, tags, created_by, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
          communicationId, club_id, supporter_id,
          communication_data.type, communication_data.direction,
          communication_data.subject || null, communication_data.notes,
          communication_data.outcome || null,
          communication_data.follow_up_required || false,
          communication_data.follow_up_date || null,
          communication_data.follow_up_notes || null,
          communication_data.event_id || null,
          communication_data.campaign_id || null,
          communication_data.communication_channel || null,
          communication_data.duration_minutes || null,
          communication_data.attachment_urls ? JSON.stringify(communication_data.attachment_urls) : null,
          communication_data.tags ? JSON.stringify(communication_data.tags) : null,
          userId
        ]);

        successful.push({ index: i, supporter_id, communication_id: communicationId });

      } catch (error) {
        errors.push({
          index: i,
          supporter_id,
          error: error.message
        });
      }
    }

    res.json({
      message: `Processed ${communications.length} communications`,
      result: {
        successful,
        errors,
        total_processed: communications.length
      }
    });

  } catch (error) {
    console.error('Bulk communications error:', error);
    res.status(500).json({ error: 'Failed to process bulk communications' });
  }
});

// Export communications
router.get('/api/clubs/:clubId/communications/export', authenticateToken, async (req, res) => {
  try {
    const { clubId } = req.params;
    const { club_id } = req.user;
    const { format = 'json', ...filters } = req.query;

    if (clubId !== club_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Build query with filters
    let whereConditions = ['c.club_id = ?'];
    let queryParams = [club_id];

    if (filters.type) {
      whereConditions.push('c.type = ?');
      queryParams.push(filters.type);
    }
    if (filters.direction) {
      whereConditions.push('c.direction = ?');
      queryParams.push(filters.direction);
    }
    if (filters.outcome) {
      whereConditions.push('c.outcome = ?');
      queryParams.push(filters.outcome);
    }
    if (filters.date_from) {
      whereConditions.push('c.created_at >= ?');
      queryParams.push(filters.date_from);
    }
    if (filters.date_to) {
      whereConditions.push('c.created_at <= ?');
      queryParams.push(filters.date_to);
    }

    const [communications] = await db.execute(`
      SELECT 
        c.*,
        s.name as supporter_name,
        s.email as supporter_email,
        s.type as supporter_type,
        u.name as created_by_name,
        e.title as event_title,
        camp.name as campaign_name
      FROM ${DB_TABLE_PREFIX}communications c
      LEFT JOIN ${DB_TABLE_PREFIX}supporters s ON c.supporter_id = s.id
      LEFT JOIN ${DB_TABLE_PREFIX}users u ON c.created_by = u.id
      LEFT JOIN ${DB_TABLE_PREFIX}events e ON c.event_id = e.id
      LEFT JOIN ${DB_TABLE_PREFIX}campaigns camp ON c.campaign_id = camp.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY c.created_at DESC
      ${filters.limit ? `LIMIT ${parseInt(filters.limit)}` : ''}
    `, queryParams);

    res.json({
      export_data: communications,
      filename: `communications_export_${new Date().toISOString().split('T')[0]}.${format}`,
      total_records: communications.length,
      filters_applied: filters
    });

  } catch (error) {
    console.error('Export communications error:', error);
    res.status(500).json({ error: 'Failed to export communications' });
  }
});

export default router;
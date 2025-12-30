// server/src/routes/impact.js
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequired } from '../middleware/validation.js';
import ImpactService from '../services/ImpactServices.js';

const router = express.Router();
const impactService = new ImpactService();

const MAX_IMPACT_AREAS = 3;

// Middleware to check if user has host or admin role
const requireHostOrAdmin = (req, res, next) => {
  if (req.user.role !== 'host' && req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Only host and admin users can manage impact updates' 
    });
  }
  next();
};

// Validation helpers
function validateImpactAreas(impact_area_ids) {
  if (impact_area_ids === undefined || impact_area_ids === null) {
    return { ok: false, error: 'impact_area_ids is required' };
  }

  if (!Array.isArray(impact_area_ids)) {
    return { ok: false, error: 'impact_area_ids must be an array' };
  }

  if (impact_area_ids.length === 0) {
    return { ok: false, error: 'At least one impact area is required' };
  }

  if (impact_area_ids.length > MAX_IMPACT_AREAS) {
    return { ok: false, error: `Select up to ${MAX_IMPACT_AREAS} impact areas` };
  }

  const invalid = impact_area_ids.find(
    (id) => typeof id !== 'string' || id.trim().length === 0
  );
  if (invalid !== undefined) {
    return { ok: false, error: 'impact_area_ids must be an array of non-empty strings' };
  }

  return { ok: true };
}

function validateMetrics(metrics) {
  if (!Array.isArray(metrics)) {
    return { ok: false, error: 'metrics must be an array' };
  }

  if (metrics.length === 0) {
    return { ok: false, error: 'At least one metric is required' };
  }

  for (const metric of metrics) {
    if (!metric.milestone || typeof metric.milestone !== 'string') {
      return { ok: false, error: 'Each metric must have a milestone description' };
    }
    if (metric.value === undefined || isNaN(parseFloat(metric.value))) {
      return { ok: false, error: 'Each metric must have a valid numeric value' };
    }
    if (parseFloat(metric.value) <= 0) {
      return { ok: false, error: 'Metric values must be greater than 0' };
    }
  }

  return { ok: true };
}

function validateProof(proof) {
  if (!proof || typeof proof !== 'object') {
    return { ok: false, error: 'proof is required and must be an object' };
  }

  // Check that it has the required structure
  if (!proof.receipts || !Array.isArray(proof.receipts)) {
    return { ok: false, error: 'proof.receipts must be an array' };
  }
  if (!proof.invoices || !Array.isArray(proof.invoices)) {
    return { ok: false, error: 'proof.invoices must be an array' };
  }
  if (!proof.quotes || !Array.isArray(proof.quotes)) {
    return { ok: false, error: 'proof.quotes must be an array' };
  }
  if (!proof.media || !Array.isArray(proof.media)) {
    return { ok: false, error: 'proof.media must be an array' };
  }

  // Media is required
  if (proof.media.length === 0) {
    return { ok: false, error: 'At least one photo or video is required in proof.media' };
  }

  // Validate media items
  for (const media of proof.media) {
    if (!media.url || typeof media.url !== 'string') {
      return { ok: false, error: 'Each media item must have a valid URL' };
    }
    if (media.type && media.type !== 'image' && media.type !== 'video') {
      return { ok: false, error: 'Media type must be either "image" or "video"' };
    }
  }

  return { ok: true };
}

// Create a new impact update
router.post(
  '/api/impact',
  authenticateToken,
  requireHostOrAdmin,
  validateRequired(['title', 'description', 'impact_date', 'impact_area_ids', 'metrics', 'proof']),
  async (req, res) => {
    try {
      const {
        event_id,
        campaign_id,
        impact_area_ids,
        title,
        description,
        impact_date,
        metrics,
        amount_spent,
        currency,
        location,
        proof,
      } = req.body;

      // Validate that either event_id or campaign_id is provided
      if (!event_id && !campaign_id) {
        return res.status(400).json({ error: 'Either event_id or campaign_id must be provided' });
      }

      // Validate impact areas
      const iaValidation = validateImpactAreas(impact_area_ids);
      if (!iaValidation.ok) {
        return res.status(400).json({ error: iaValidation.error });
      }

      // Validate metrics
      const metricsValidation = validateMetrics(metrics);
      if (!metricsValidation.ok) {
        return res.status(400).json({ error: metricsValidation.error });
      }

      // Validate proof
      const proofValidation = validateProof(proof);
      if (!proofValidation.ok) {
        return res.status(400).json({ error: proofValidation.error });
      }

      // Validate amount_spent if provided
      if (amount_spent !== undefined) {
        const parsed = parseFloat(amount_spent);
        if (isNaN(parsed) || parsed < 0) {
          return res.status(400).json({ error: 'amount_spent must be a positive number' });
        }
      }

      // Validate impact_date
      const impactDate = new Date(impact_date);
      if (isNaN(impactDate.getTime())) {
        return res.status(400).json({ error: 'Invalid impact_date format' });
      }

      // Validate location if provided
      if (location !== undefined && location !== null) {
        if (typeof location !== 'object') {
          return res.status(400).json({ error: 'location must be an object' });
        }
        if (location.lat === undefined || location.lng === undefined) {
          return res.status(400).json({ error: 'location must include lat and lng' });
        }
        if (isNaN(parseFloat(location.lat)) || isNaN(parseFloat(location.lng))) {
          return res.status(400).json({ error: 'location lat and lng must be valid numbers' });
        }
      }

      const impactData = {
        event_id,
        campaign_id: campaign_id || null,
        impact_area_ids,
        title: title.trim(),
        description: description.trim(),
        impact_date: impactDate.toISOString().slice(0, 19).replace('T', ' '),
        metrics,
        amount_spent: amount_spent ? parseFloat(amount_spent) : null,
        currency: currency || 'EUR',
        location: location || null,
        proof,
        status: 'draft', // Always start as draft
      };

      const impact = await impactService.createImpact(req.club_id, req.user.id, impactData);

      res.status(201).json({
        message: 'Impact update created successfully',
        impact,
      });
    } catch (error) {
      console.error('Create impact error:', error);
      res.status(500).json({ error: 'Failed to create impact update' });
    }
  }
);

// Get all impact updates for an event
router.get('/api/events/:eventId/impact', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { status } = req.query;

    const impacts = await impactService.getImpactByEvent(eventId, req.club_id, status || null);

    res.json({
      impacts,
      total: impacts.length,
    });
  } catch (error) {
    console.error('Get event impact error:', error);
    res.status(500).json({ error: 'Failed to fetch event impact updates' });
  }
});

// Get aggregated impact summary for an event
router.get('/api/events/:eventId/impact/summary', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;

    const summary = await impactService.getEventImpactSummary(eventId, req.club_id);

    res.json({ summary });
  } catch (error) {
    console.error('Get event impact summary error:', error);
    res.status(500).json({ error: 'Failed to fetch event impact summary' });
  }
});

// Get all impact updates for a campaign
router.get('/api/campaigns/:campaignId/impact', authenticateToken, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { status } = req.query;

    const impacts = await impactService.getImpactByCampaign(campaignId, req.club_id, status || null);

    res.json({
      impacts,
      total: impacts.length,
    });
  } catch (error) {
    console.error('Get campaign impact error:', error);
    res.status(500).json({ error: 'Failed to fetch campaign impact updates' });
  }
});

// Get aggregated impact summary for a campaign
router.get('/api/campaigns/:campaignId/impact/summary', authenticateToken, async (req, res) => {
  try {
    const { campaignId } = req.params;

    const summary = await impactService.getCampaignImpactSummary(campaignId, req.club_id);

    res.json({ summary });
  } catch (error) {
    console.error('Get campaign impact summary error:', error);
    res.status(500).json({ error: 'Failed to fetch campaign impact summary' });
  }
});

// Get all impact updates for a club
router.get('/api/clubs/:clubId/impact', authenticateToken, async (req, res) => {
  try {
    const { clubId } = req.params;

    // Verify user belongs to this club
    if (clubId !== req.club_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { status, event_id, campaign_id } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (event_id) filters.event_id = event_id;
    if (campaign_id) filters.campaign_id = campaign_id;

    const impacts = await impactService.getImpactByClub(clubId, filters);

    res.json({
      impacts,
      total: impacts.length,
    });
  } catch (error) {
    console.error('Get club impact error:', error);
    res.status(500).json({ error: 'Failed to fetch club impact updates' });
  }
});

// Get a specific impact update
router.get('/api/impact/:impactId', authenticateToken, async (req, res) => {
  try {
    const { impactId } = req.params;

    const impact = await impactService.getImpactById(impactId, req.club_id);

    if (!impact) {
      return res.status(404).json({ error: 'Impact update not found' });
    }

    res.json({ impact });
  } catch (error) {
    console.error('Get impact error:', error);
    res.status(500).json({ error: 'Failed to fetch impact update' });
  }
});

// Update an impact update (draft only)
router.put(
  '/api/impact/:impactId',
  authenticateToken,
  requireHostOrAdmin,
  async (req, res) => {
    try {
      const { impactId } = req.params;
      const updateData = { ...req.body };

      // Validate impact areas if provided
      if (updateData.impact_area_ids !== undefined) {
        const iaValidation = validateImpactAreas(updateData.impact_area_ids);
        if (!iaValidation.ok) {
          return res.status(400).json({ error: iaValidation.error });
        }
      }

      // Validate metrics if provided
      if (updateData.metrics !== undefined) {
        const metricsValidation = validateMetrics(updateData.metrics);
        if (!metricsValidation.ok) {
          return res.status(400).json({ error: metricsValidation.error });
        }
      }

      // Validate proof if provided
      if (updateData.proof !== undefined) {
        const proofValidation = validateProof(updateData.proof);
        if (!proofValidation.ok) {
          return res.status(400).json({ error: proofValidation.error });
        }
      }

      // Validate amount_spent if provided
      if (updateData.amount_spent !== undefined) {
        const parsed = parseFloat(updateData.amount_spent);
        if (isNaN(parsed) || parsed < 0) {
          return res.status(400).json({ error: 'amount_spent must be a positive number' });
        }
        updateData.amount_spent = parsed;
      }

      // Validate impact_date if provided
      if (updateData.impact_date !== undefined) {
        const impactDate = new Date(updateData.impact_date);
        if (isNaN(impactDate.getTime())) {
          return res.status(400).json({ error: 'Invalid impact_date format' });
        }
        updateData.impact_date = impactDate.toISOString().slice(0, 19).replace('T', ' ');
      }

      // Validate location if provided
      if (updateData.location !== undefined && updateData.location !== null) {
        if (typeof updateData.location !== 'object') {
          return res.status(400).json({ error: 'location must be an object' });
        }
        if (updateData.location.lat === undefined || updateData.location.lng === undefined) {
          return res.status(400).json({ error: 'location must include lat and lng' });
        }
        if (isNaN(parseFloat(updateData.location.lat)) || isNaN(parseFloat(updateData.location.lng))) {
          return res.status(400).json({ error: 'location lat and lng must be valid numbers' });
        }
      }

      // Trim string fields
      if (updateData.title) updateData.title = updateData.title.trim();
      if (updateData.description) updateData.description = updateData.description.trim();

      const impact = await impactService.updateImpact(
        impactId,
        req.club_id,
        req.user.id,
        updateData
      );

      if (!impact) {
        return res.status(404).json({ error: 'Impact update not found or no changes made' });
      }

      res.json({
        message: 'Impact update updated successfully',
        impact,
      });
    } catch (error) {
      if (error.message === 'Only draft impact updates can be edited') {
        return res.status(400).json({ error: error.message });
      }
      if (error.message === 'Only the creator can edit this impact update') {
        return res.status(403).json({ error: error.message });
      }
      if (error.message === 'No valid fields to update') {
        return res.status(400).json({ error: error.message });
      }

      console.error('Update impact error:', error);
      res.status(500).json({ error: 'Failed to update impact update' });
    }
  }
);

// Delete an impact update (draft only)
router.delete(
  '/api/impact/:impactId',
  authenticateToken,
  requireHostOrAdmin,
  async (req, res) => {
    try {
      const { impactId } = req.params;

      const deleted = await impactService.deleteImpact(impactId, req.club_id, req.user.id);

      if (!deleted) {
        return res.status(404).json({ error: 'Impact update not found' });
      }

      res.json({ message: 'Impact update deleted successfully' });
    } catch (error) {
      if (error.message === 'Only draft impact updates can be deleted') {
        return res.status(400).json({ error: error.message });
      }
      if (error.message === 'Only the creator can delete this impact update') {
        return res.status(403).json({ error: error.message });
      }

      console.error('Delete impact error:', error);
      res.status(500).json({ error: 'Failed to delete impact update' });
    }
  }
);

// Publish an impact update
router.patch(
  '/api/impact/:impactId/publish',
  authenticateToken,
  requireHostOrAdmin,
  async (req, res) => {
    try {
      const { impactId } = req.params;

      const impact = await impactService.publishImpact(impactId, req.club_id, req.user.id);

      if (!impact) {
        return res.status(404).json({ error: 'Impact update not found' });
      }

      res.json({
        message: 'Impact update published successfully',
        impact,
      });
    } catch (error) {
      if (
        error.message === 'Only draft impact updates can be published' ||
        error.message === 'Only the creator can publish this impact update' ||
        error.message.includes('proof')
      ) {
        return res.status(400).json({ error: error.message });
      }

      console.error('Publish impact error:', error);
      res.status(500).json({ error: 'Failed to publish impact update' });
    }
  }
);

// Check if impact update can be marked as final
router.get('/api/impact/:impactId/can-mark-final', authenticateToken, async (req, res) => {
  try {
    const { impactId } = req.params;

    const result = await impactService.canMarkAsFinal(impactId, req.club_id);

    res.json(result);
  } catch (error) {
    console.error('Check can mark final error:', error);
    res.status(500).json({ error: 'Failed to check if can mark as final' });
  }
});

// Mark impact update as final
router.patch(
  '/api/impact/:impactId/mark-final',
  authenticateToken,
  requireHostOrAdmin,
  async (req, res) => {
    try {
      const { impactId } = req.params;

      const impact = await impactService.markAsFinal(impactId, req.club_id, req.user.id);

      if (!impact) {
        return res.status(404).json({ error: 'Impact update not found' });
      }

      res.json({
        message: 'Impact update marked as final successfully',
        impact,
      });
    } catch (error) {
      if (
        error.message === 'Only the creator can mark this as final' ||
        error.message === 'Only published updates can be marked as final' ||
        error.message.includes('Requirements not met') ||
        error.message.includes('already has a final')
      ) {
        return res.status(400).json({ error: error.message });
      }

      console.error('Mark as final error:', error);
      res.status(500).json({ error: 'Failed to mark impact as final' });
    }
  }
);

// Validate if impact can be published
router.get('/api/impact/:impactId/validation', authenticateToken, async (req, res) => {
  try {
    const { impactId } = req.params;

    const impact = await impactService.getImpactById(impactId, req.club_id);

    if (!impact) {
      return res.status(404).json({ error: 'Impact update not found' });
    }

    const proofValidation = impactService.validateProof(impact.proof, impact.amount_spent);
    const canPublish = impactService.canPublishImpact(impact);

    res.json({
      canPublish: canPublish.allowed,
      reason: canPublish.reason,
      proofValidation,
    });
  } catch (error) {
    console.error('Validate impact error:', error);
    res.status(500).json({ error: 'Failed to validate impact update' });
  }
});

// Check trust status for club
router.get('/api/clubs/:clubId/impact/trust', authenticateToken, async (req, res) => {
  try {
    const { clubId } = req.params;

    // Verify user belongs to this club
    if (clubId !== req.club_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const trustStatus = await impactService.checkTrustStatus(clubId);
    const outstanding = await impactService.getOutstandingImpactReports(clubId);

    res.json({
      trustStatus,
      outstandingReports: outstanding,
    });
  } catch (error) {
    console.error('Check trust status error:', error);
    res.status(500).json({ error: 'Failed to check trust status' });
  }
});

export default router;
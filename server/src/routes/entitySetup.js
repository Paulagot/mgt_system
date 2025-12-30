// server/src/routes/entitySetup.js
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequired } from '../middleware/validation.js';
import EntitySetupService from '../services/EntitySetupService.js';

const router = express.Router();
const entityService = new EntitySetupService();

// Middleware to check if user has host or admin role
const requireHostOrAdmin = (req, res, next) => {
  if (req.user.role !== 'host' && req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Only host and admin users can manage entity setup' 
    });
  }
  next();
};

// ---- Entity Type Selection (Step 1) ----

/**
 * Set entity type for club
 * POST /api/clubs/:clubId/entity-type
 */
router.post(
  '/api/clubs/:clubId/entity-type',
  authenticateToken,
  requireHostOrAdmin,
  validateRequired(['entityType']),
  async (req, res) => {
    try {
      const { clubId } = req.params;
      const { entityType } = req.body;

      // Verify user belongs to this club
      if (clubId !== req.club_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Validate entity type
      const validTypes = ['club', 'charity', 'school', 'community_group', 'cause'];
      if (!validTypes.includes(entityType)) {
        return res.status(400).json({ 
          error: `Invalid entity type. Must be one of: ${validTypes.join(', ')}` 
        });
      }

      const result = await entityService.setEntityType(clubId, entityType);

      res.json({
        message: 'Entity type set successfully',
        ...result,
      });
    } catch (error) {
      console.error('Set entity type error:', error);
      res.status(500).json({ error: 'Failed to set entity type' });
    }
  }
);

/**
 * Get club onboarding status
 * GET /api/clubs/:clubId/onboarding-status
 */
router.get(
  '/api/clubs/:clubId/onboarding-status',
  authenticateToken,
  async (req, res) => {
    try {
      const { clubId } = req.params;

      // Verify user belongs to this club
      if (clubId !== req.club_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const status = await entityService.getClubOnboardingStatus(clubId);

      res.json({ status });
    } catch (error) {
      console.error('Get onboarding status error:', error);
      res.status(500).json({ error: 'Failed to fetch onboarding status' });
    }
  }
);

// ---- Entity Details (Phase 2) ----

/**
 * Create entity details
 * POST /api/clubs/:clubId/entity-details
 */
router.post(
  '/api/clubs/:clubId/entity-details',
  authenticateToken,
  requireHostOrAdmin,
  validateRequired(['legalName', 'country', 'addressLine1', 'city', 'postalCode']),
  async (req, res) => {
    try {
      const { clubId } = req.params;

      // Verify user belongs to this club
      if (clubId !== req.club_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const data = {
        legalName: req.body.legalName,
        tradingNames: req.body.tradingNames || [],
        description: req.body.description,
        foundedYear: req.body.foundedYear,
        
        addressLine1: req.body.addressLine1,
        addressLine2: req.body.addressLine2,
        city: req.body.city,
        countyState: req.body.countyState,
        postalCode: req.body.postalCode,
        country: req.body.country,
        
        legalStructure: req.body.legalStructure,
        
        // Ireland
        ieCroNumber: req.body.ieCroNumber,
        ieCharityChyNumber: req.body.ieCharityChyNumber,
        ieCharityRcn: req.body.ieCharityRcn,
        ieRevenueSportsBody: req.body.ieRevenueSportsBody,
        
        // UK
        ukCompanyNumber: req.body.ukCompanyNumber,
        ukCharityEnglandWales: req.body.ukCharityEnglandWales,
        ukCharityScotland: req.body.ukCharityScotland,
        ukCharityNi: req.body.ukCharityNi,
        ukCascRegistered: req.body.ukCascRegistered,
      };

      // Validate the data
      const validation = entityService.validateEntityData(data, data.country);
      if (!validation.valid) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          errors: validation.errors 
        });
      }

      // Check if entity details already exist
      const existing = await entityService.getEntityDetails(clubId);
      if (existing) {
        return res.status(400).json({ 
          error: 'Entity details already exist. Use PUT to update.' 
        });
      }

      const entityDetails = await entityService.createEntityDetails(
        clubId,
        req.user.id,
        data
      );

      res.status(201).json({
        message: 'Entity details created successfully',
        entityDetails,
      });
    } catch (error) {
      console.error('Create entity details error:', error);
      res.status(500).json({ error: 'Failed to create entity details' });
    }
  }
);

/**
 * Get entity details
 * GET /api/clubs/:clubId/entity-details
 */
router.get(
  '/api/clubs/:clubId/entity-details',
  authenticateToken,
  async (req, res) => {
    try {
      const { clubId } = req.params;

      // Verify user belongs to this club
      if (clubId !== req.club_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const entityDetails = await entityService.getEntityDetails(clubId);

      if (!entityDetails) {
        return res.status(404).json({ error: 'Entity details not found' });
      }

      // Calculate completeness
      const completeness = entityService.calculateCompleteness(entityDetails);

      res.json({
        entityDetails,
        completeness,
      });
    } catch (error) {
      console.error('Get entity details error:', error);
      res.status(500).json({ error: 'Failed to fetch entity details' });
    }
  }
);

/**
 * Update entity details
 * PUT /api/clubs/:clubId/entity-details
 */
router.put(
  '/api/clubs/:clubId/entity-details',
  authenticateToken,
  requireHostOrAdmin,
  async (req, res) => {
    try {
      const { clubId } = req.params;

      // Verify user belongs to this club
      if (clubId !== req.club_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const updateData = {
        legalName: req.body.legalName,
        tradingNames: req.body.tradingNames,
        description: req.body.description,
        foundedYear: req.body.foundedYear,
        
        addressLine1: req.body.addressLine1,
        addressLine2: req.body.addressLine2,
        city: req.body.city,
        countyState: req.body.countyState,
        postalCode: req.body.postalCode,
        country: req.body.country,
        
        legalStructure: req.body.legalStructure,
        
        // Ireland
        ieCroNumber: req.body.ieCroNumber,
        ieCharityChyNumber: req.body.ieCharityChyNumber,
        ieCharityRcn: req.body.ieCharityRcn,
        ieRevenueSportsBody: req.body.ieRevenueSportsBody,
        
        // UK
        ukCompanyNumber: req.body.ukCompanyNumber,
        ukCharityEnglandWales: req.body.ukCharityEnglandWales,
        ukCharityScotland: req.body.ukCharityScotland,
        ukCharityNi: req.body.ukCharityNi,
        ukCascRegistered: req.body.ukCascRegistered,
      };

      // Remove undefined fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      // Validate if we have required fields for update
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      // Validate the data
      const validation = entityService.validateEntityData(
        updateData, 
        updateData.country || 'IE'
      );
      
      // Only check validation if we have substantial updates
      const hasSubstantialUpdate = Boolean(
        updateData.legalName || 
        updateData.addressLine1 || 
        updateData.city || 
        updateData.postalCode
      );

      if (hasSubstantialUpdate && !validation.valid) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          errors: validation.errors 
        });
      }

      const entityDetails = await entityService.updateEntityDetails(
        clubId,
        req.user.id,
        updateData
      );

      res.json({
        message: 'Entity details updated successfully',
        entityDetails,
      });
    } catch (error) {
      if (error.message === 'Entity details not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('verified')) {
        return res.status(400).json({ error: error.message });
      }
      if (error.message === 'No valid fields to update') {
        return res.status(400).json({ error: error.message });
      }

      console.error('Update entity details error:', error);
      res.status(500).json({ error: 'Failed to update entity details' });
    }
  }
);

/**
 * Delete entity details
 * DELETE /api/clubs/:clubId/entity-details
 */
router.delete(
  '/api/clubs/:clubId/entity-details',
  authenticateToken,
  requireHostOrAdmin,
  async (req, res) => {
    try {
      const { clubId } = req.params;

      // Verify user belongs to this club
      if (clubId !== req.club_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const deleted = await entityService.deleteEntityDetails(clubId);

      if (!deleted) {
        return res.status(404).json({ error: 'Entity details not found' });
      }

      res.json({ message: 'Entity details deleted successfully' });
    } catch (error) {
      if (error.message.includes('verified')) {
        return res.status(400).json({ error: error.message });
      }

      console.error('Delete entity details error:', error);
      res.status(500).json({ error: 'Failed to delete entity details' });
    }
  }
);

/**
 * Validate registration number format
 * GET /api/entity-setup/validate-registration
 */
router.get(
  '/api/entity-setup/validate-registration',
  authenticateToken,
  async (req, res) => {
    try {
      const { type, value } = req.query;

      if (!type || !value) {
        return res.status(400).json({ 
          error: 'Both type and value query parameters are required' 
        });
      }

      const isValid = entityService.validateRegistrationNumber(type, value);

      res.json({
        valid: isValid,
        type,
        value,
      });
    } catch (error) {
      console.error('Validate registration error:', error);
      res.status(500).json({ error: 'Failed to validate registration number' });
    }
  }
);

// ---- Admin Verification Endpoints ----

/**
 * Verify entity (admin only)
 * POST /api/admin/clubs/:clubId/verify-entity
 */
router.post(
  '/api/admin/clubs/:clubId/verify-entity',
  authenticateToken,
  requireHostOrAdmin,
  async (req, res) => {
    try {
      const { clubId } = req.params;
      const { notes } = req.body;

      // TODO: Add proper admin role check when implemented
      // For now, only allow verification on own club for testing
      if (clubId !== req.club_id) {
        return res.status(403).json({ 
          error: 'Admin verification not yet implemented for other clubs' 
        });
      }

      const entityDetails = await entityService.verifyEntity(
        clubId,
        req.user.id,
        notes
      );

      res.json({
        message: 'Entity verified successfully',
        entityDetails,
      });
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('verified')) {
        return res.status(400).json({ error: error.message });
      }

      console.error('Verify entity error:', error);
      res.status(500).json({ error: 'Failed to verify entity' });
    }
  }
);

/**
 * Reject entity verification (admin only)
 * POST /api/admin/clubs/:clubId/reject-entity
 */
router.post(
  '/api/admin/clubs/:clubId/reject-entity',
  authenticateToken,
  requireHostOrAdmin,
  validateRequired(['notes']),
  async (req, res) => {
    try {
      const { clubId } = req.params;
      const { notes } = req.body;

      // TODO: Add proper admin role check when implemented
      if (clubId !== req.club_id) {
        return res.status(403).json({ 
          error: 'Admin rejection not yet implemented for other clubs' 
        });
      }

      const entityDetails = await entityService.rejectEntity(
        clubId,
        req.user.id,
        notes
      );

      res.json({
        message: 'Entity verification rejected',
        entityDetails,
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }

      console.error('Reject entity error:', error);
      res.status(500).json({ error: 'Failed to reject entity' });
    }
  }
);

/**
 * Get pending verifications (admin only)
 * GET /api/admin/entity-verifications/pending
 */
router.get(
  '/api/admin/entity-verifications/pending',
  authenticateToken,
  requireHostOrAdmin,
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      // TODO: Add proper admin role check when implemented
      // For now, return empty array
      const pending = [];

      res.json({
        pending,
        total: pending.length,
        limit,
        offset,
      });
    } catch (error) {
      console.error('Get pending verifications error:', error);
      res.status(500).json({ error: 'Failed to fetch pending verifications' });
    }
  }
);

export default router;
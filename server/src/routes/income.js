import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequired } from '../middleware/validation.js';
import FinancialService from '../services/FinancialService.js';

const router = express.Router();
const financialService = new FinancialService();
const getSocketManager = (req) => req.app.get('socketManager');

// ===== EVENT-SPECIFIC INCOME ROUTES =====

// Record income for a specific event
router.post('/api/events/:eventId/income',
  authenticateToken,
  validateRequired(['source', 'description', 'amount', 'date']),
  async (req, res) => {
    try {
      const { eventId } = req.params;
      const incomeData = { ...req.body, event_id: eventId };

      const income = await financialService.createIncome(req.club_id, incomeData);

      const socketManager = getSocketManager(req);
      socketManager.emitIncomeCreated(req.club_id, income);

      res.status(201).json(income);
    } catch (error) {
      console.error('Create event income error:', error);
      if (error.message === 'Event not found' || error.message === 'Access denied') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get all income for a specific event
router.get('/api/events/:eventId/income',
  authenticateToken,
  async (req, res) => {
    try {
      const { eventId } = req.params;
      
      const income = await financialService.getIncomeByEvent(eventId, req.club_id);
      res.json(income);
    } catch (error) {
      console.error('Get event income error:', error);
      if (error.message === 'Event not found' || error.message === 'Access denied') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ===== CLUB-LEVEL INCOME ROUTES =====

// Record global income (not tied to specific event)
router.post('/api/clubs/:clubId/income',
  authenticateToken,
  validateRequired(['source', 'description', 'amount', 'date']),
  async (req, res) => {
    try {
      const { clubId } = req.params;
      
      if (clubId !== req.club_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const incomeData = { ...req.body, event_id: null };
      
      const income = await financialService.createIncome(clubId, incomeData);

      const socketManager = getSocketManager(req);
      socketManager.emitIncomeCreated(req.club_id, income);

      res.status(201).json(income);
    } catch (error) {
      console.error('Create club income error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get all global income for a club (not tied to events)
router.get('/api/clubs/:clubId/income',
  authenticateToken,
  async (req, res) => {
    try {
      const { clubId } = req.params;
      
      if (clubId !== req.club_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const income = await financialService.getIncomeByClub(clubId);
      res.json(income);
    } catch (error) {
      console.error('Get club income error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ===== CAMPAIGN-LEVEL INCOME ROUTES =====

// Record income for a specific campaign
router.post('/api/campaigns/:campaignId/income',
  authenticateToken,
  validateRequired(['source', 'description', 'amount', 'date']),
  async (req, res) => {
    try {
      const { campaignId } = req.params;
      const incomeData = { ...req.body, campaign_id: campaignId };

      const income = await financialService.createIncome(req.club_id, incomeData);

      const socketManager = getSocketManager(req);
      socketManager.emitIncomeCreated(req.club_id, income);

      res.status(201).json(income);
    } catch (error) {
      console.error('Create campaign income error:', error);
      if (error.message === 'Campaign not found' || error.message === 'Access denied') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get all income for a specific campaign
router.get('/api/campaigns/:campaignId/income',
  authenticateToken,
  async (req, res) => {
    try {
      const { campaignId } = req.params;
      
      const income = await financialService.getIncomeByCampaign(campaignId, req.club_id);
      res.json(income);
    } catch (error) {
      console.error('Get campaign income error:', error);
      if (error.message === 'Campaign not found' || error.message === 'Access denied') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ===== INDIVIDUAL INCOME MANAGEMENT =====

// Update income record
router.put('/api/income/:incomeId',
  authenticateToken,
  async (req, res) => {
    try {
      const { incomeId } = req.params;
      const updateData = req.body;

      const income = await financialService.updateIncome(incomeId, req.club_id, updateData);
      
      if (!income) {
        return res.status(404).json({ error: 'Income record not found' });
      }

      const socketManager = getSocketManager(req);
      socketManager.emitIncomeCreated(req.club_id, income); // Note: Using emitIncomeCreated for updates too

      res.json(income);
    } catch (error) {
      console.error('Update income error:', error);
      if (error.message === 'No valid fields to update') {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete income record
router.delete('/api/income/:incomeId',
  authenticateToken,
  async (req, res) => {
    try {
      const { incomeId } = req.params;

      const deleted = await financialService.deleteIncome(incomeId, req.club_id);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Income record not found' });
      }

      const socketManager = getSocketManager(req);
      socketManager.emitIncomeCreated(req.club_id, { id: incomeId }); // Note: Using emitIncomeCreated for deletes too

      res.json({ message: 'Income record deleted successfully' });
    } catch (error) {
      console.error('Delete income error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
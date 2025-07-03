import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import FinancialService from '../services/FinancialService.js';

const router = express.Router();
const financialService = new FinancialService();
const getSocketManager = (req) => req.app.get('socketManager');

// ===== CLUB FINANCIAL DASHBOARD =====

// Get comprehensive financial summary for a club
router.get('/api/clubs/:clubId/financials',
  authenticateToken,
  async (req, res) => {
    try {
      const { clubId } = req.params;
      
      if (clubId !== req.club_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const summary = await financialService.getClubFinancialSummary(clubId);
      res.json(summary);
    } catch (error) {
      console.error('Get financial summary error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ===== EVENT FINANCIAL BREAKDOWN =====

// Get detailed financial breakdown for a specific event
router.get('/api/events/:eventId/financials',
  authenticateToken,
  async (req, res) => {
    try {
      const { eventId } = req.params;
      
      const breakdown = await financialService.getEventFinancialBreakdown(eventId, req.club_id);
      res.json(breakdown);
    } catch (error) {
      console.error('Get event financial breakdown error:', error);
      if (error.message === 'Event not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ===== FINANCIAL REPORTS =====

// Get expenses grouped by category for a specific time period
router.get('/api/clubs/:clubId/financials/expenses-by-category',
  authenticateToken,
  async (req, res) => {
    try {
      const { clubId } = req.params;
      const { start_date, end_date, event_id } = req.query;
      
      if (clubId !== req.club_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const expenses = await financialService.getExpensesByCategory(clubId, {
        start_date, end_date, event_id
      });
      
      res.json(expenses);
    } catch (error) {
      console.error('Get expenses by category error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get income grouped by source for a specific time period
router.get('/api/clubs/:clubId/financials/income-by-source',
  authenticateToken,
  async (req, res) => {
    try {
      const { clubId } = req.params;
      const { start_date, end_date, event_id } = req.query;
      
      if (clubId !== req.club_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const income = await financialService.getIncomeBySource(clubId, {
        start_date, end_date, event_id
      });
      
      res.json(income);
    } catch (error) {
      console.error('Get income by source error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get monthly financial trends
router.get('/api/clubs/:clubId/financials/monthly-trends',
  authenticateToken,
  async (req, res) => {
    try {
      const { clubId } = req.params;
      const { year = new Date().getFullYear() } = req.query;
      
      if (clubId !== req.club_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const trends = await financialService.getMonthlyTrends(clubId, year);
      res.json(trends);
    } catch (error) {
      console.error('Get monthly trends error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ===== FINANCIAL UTILITIES =====

// Manually update financials for an event (useful for data corrections)
router.post('/api/events/:eventId/financials/recalculate',
  authenticateToken,
  async (req, res) => {
    try {
      const { eventId } = req.params;
      
      const financials = await financialService.recalculateEventFinancials(eventId, req.club_id);
      
      const socketManager = getSocketManager(req);
      socketManager.emitEventFinancialsUpdated(req.club_id, eventId, financials);

      res.json({
        message: 'Event financials recalculated successfully',
        financials
      });
    } catch (error) {
      console.error('Recalculate event financials error:', error);
      if (error.message === 'Event not found' || error.message === 'Access denied') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get all pending expenses for approval workflow
router.get('/api/clubs/:clubId/financials/pending-expenses',
  authenticateToken,
  async (req, res) => {
    try {
      const { clubId } = req.params;
      
      if (clubId !== req.club_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const expenses = await financialService.getPendingExpenses(clubId);
      res.json(expenses);
    } catch (error) {
      console.error('Get pending expenses error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequired } from '../middleware/validation.js';
import FinancialService from '../services/FinancialService.js';

const router = express.Router();
const financialService = new FinancialService();
const getSocketManager = (req) => req.app.get('socketManager');

// ===== EVENT-SPECIFIC EXPENSE ROUTES =====

// Create expense for a specific event
router.post('/api/events/:eventId/expenses', 
  authenticateToken,
  validateRequired(['category', 'description', 'amount', 'date']),
  async (req, res) => {
    try {
      const { eventId } = req.params;
      const expenseData = { ...req.body, event_id: eventId };

      const expense = await financialService.createExpense(
        req.club_id,
        expenseData,
        req.user.id
      );

      const socketManager = getSocketManager(req);
      socketManager.emitExpenseCreated(req.club_id, expense);

      res.status(201).json(expense);
    } catch (error) {
      console.error('Create event expense error:', error);
      if (error.message === 'Event not found' || error.message === 'Access denied') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get all expenses for a specific event
router.get('/api/events/:eventId/expenses',
  authenticateToken,
  async (req, res) => {
    try {
      const { eventId } = req.params;
      
      const expenses = await financialService.getExpensesByEvent(eventId, req.club_id);
      res.json(expenses);
    } catch (error) {
      console.error('Get event expenses error:', error);
      if (error.message === 'Event not found' || error.message === 'Access denied') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ===== CLUB-LEVEL EXPENSE ROUTES =====

// Create global expense (not tied to specific event)
router.post('/api/clubs/:clubId/expenses',
  authenticateToken,
  validateRequired(['category', 'description', 'amount', 'date']),
  async (req, res) => {
    try {
      const { clubId } = req.params;
      
      if (clubId !== req.club_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const expenseData = { ...req.body, event_id: null };
      
      const expense = await financialService.createExpense(
        clubId,
        expenseData,
        req.user.id
      );

      const socketManager = getSocketManager(req);
      socketManager.emitExpenseCreated(req.club_id, expense);

      res.status(201).json(expense);
    } catch (error) {
      console.error('Create club expense error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get all global expenses for a club (not tied to events)
router.get('/api/clubs/:clubId/expenses',
  authenticateToken,
  async (req, res) => {
    try {
      const { clubId } = req.params;
      
      if (clubId !== req.club_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const expenses = await financialService.getExpensesByClub(clubId);
      res.json(expenses);
    } catch (error) {
      console.error('Get club expenses error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ===== INDIVIDUAL EXPENSE MANAGEMENT =====

// Update an expense
router.put('/api/expenses/:expenseId',
  authenticateToken,
  async (req, res) => {
    try {
      const { expenseId } = req.params;
      const updateData = req.body;

      const expense = await financialService.updateExpense(expenseId, req.club_id, updateData);
      
      if (!expense) {
        return res.status(404).json({ error: 'Expense not found' });
      }

      const socketManager = getSocketManager(req);
      socketManager.emitExpenseCreated(req.club_id, expense); // Note: Using emitExpenseCreated for updates too

      res.json(expense);
    } catch (error) {
      console.error('Update expense error:', error);
      if (error.message === 'No valid fields to update') {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete an expense
router.delete('/api/expenses/:expenseId',
  authenticateToken,
  async (req, res) => {
    try {
      const { expenseId } = req.params;

      const deleted = await financialService.deleteExpense(expenseId, req.club_id);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Expense not found' });
      }

      const socketManager = getSocketManager(req);
      socketManager.emitExpenseCreated(req.club_id, { id: expenseId }); // Note: Using emitExpenseCreated for deletes too

      res.json({ message: 'Expense deleted successfully' });
    } catch (error) {
      console.error('Delete expense error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
import database from '../config/database.js';
import { config } from '../config/environment.js';
import { v4 as uuidv4 } from 'uuid';

class FinancialService {
  constructor() {
    this.prefix = config.DB_TABLE_PREFIX;
  }

  // ===== EXPENSE METHODS =====

  async createExpense(clubId, expenseData, createdBy) {
    const { 
      event_id, 
      category, 
      description, 
      amount, 
      date, 
      vendor, 
      payment_method = 'card', 
      status = 'pending',
      receipt_url 
    } = expenseData;

    const expenseId = uuidv4();

    const [result] = await database.connection.execute(
      `INSERT INTO ${this.prefix}expenses 
       (id, club_id, event_id, category, description, amount, date, vendor, payment_method, status, receipt_url, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        expenseId, 
        clubId, 
        event_id || null, 
        category, 
        description, 
        amount, 
        date, 
        vendor || null, 
        payment_method, 
        status, 
        receipt_url || null, 
        createdBy
      ]
    );

    // If this is an event expense, update the event financials
    if (event_id) {
      await this.updateEventFinancials(event_id);
    }

    // Get the created expense
    const [rows] = await database.connection.execute(
      `SELECT * FROM ${this.prefix}expenses WHERE id = ?`,
      [expenseId]
    );

    return Array.isArray(rows) ? rows[0] : null;
  }

  async getExpensesByEvent(eventId, clubId) {
    // Verify event belongs to club first
    const [eventRows] = await database.connection.execute(
      `SELECT club_id FROM ${this.prefix}events WHERE id = ?`,
      [eventId]
    );

    if (!Array.isArray(eventRows) || eventRows.length === 0) {
      throw new Error('Event not found');
    }

    if (eventRows[0].club_id !== clubId) {
      throw new Error('Access denied');
    }

    const [rows] = await database.connection.execute(
      `SELECT e.*, u.name as created_by_name 
       FROM ${this.prefix}expenses e
       LEFT JOIN ${this.prefix}users u ON e.created_by = u.id
       WHERE e.event_id = ? 
       ORDER BY e.date DESC`,
      [eventId]
    );

    return rows || [];
  }

  async getExpensesByClub(clubId, eventId = null) {
    let query, params;

    if (eventId) {
      // Get expenses for specific event
      query = `SELECT e.*, u.name as created_by_name 
               FROM ${this.prefix}expenses e
               LEFT JOIN ${this.prefix}users u ON e.created_by = u.id
               WHERE e.club_id = ? AND e.event_id = ?
               ORDER BY e.date DESC`;
      params = [clubId, eventId];
    } else {
      // Get global expenses (not tied to events)
      query = `SELECT e.*, u.name as created_by_name 
               FROM ${this.prefix}expenses e
               LEFT JOIN ${this.prefix}users u ON e.created_by = u.id
               WHERE e.club_id = ? AND e.event_id IS NULL
               ORDER BY e.date DESC`;
      params = [clubId];
    }

    const [rows] = await database.connection.execute(query, params);
    return rows || [];
  }

  async updateExpense(expenseId, clubId, updateData) {
    const allowedFields = ['category', 'description', 'amount', 'date', 'vendor', 'payment_method', 'status', 'receipt_url'];
    const updateFields = Object.keys(updateData).filter(key =>
      allowedFields.includes(key) && updateData[key] !== undefined
    );

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    const setClause = updateFields.map(field => `${field} = ?`).join(', ');
    const values = updateFields.map(field => updateData[field]);
    values.push(expenseId, clubId);

    const [result] = await database.connection.execute(
      `UPDATE ${this.prefix}expenses SET ${setClause} WHERE id = ? AND club_id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return null;
    }

    // Get updated expense and check if we need to update event financials
    const [rows] = await database.connection.execute(
      `SELECT * FROM ${this.prefix}expenses WHERE id = ?`,
      [expenseId]
    );

    const expense = Array.isArray(rows) ? rows[0] : null;
    
    if (expense && expense.event_id) {
      await this.updateEventFinancials(expense.event_id);
    }

    return expense;
  }

  async deleteExpense(expenseId, clubId) {
    // Get expense to check if it has an event_id before deleting
    const [expenseRows] = await database.connection.execute(
      `SELECT event_id FROM ${this.prefix}expenses WHERE id = ? AND club_id = ?`,
      [expenseId, clubId]
    );

    if (!Array.isArray(expenseRows) || expenseRows.length === 0) {
      return false;
    }

    const eventId = expenseRows[0].event_id;

    const [result] = await database.connection.execute(
      `DELETE FROM ${this.prefix}expenses WHERE id = ? AND club_id = ?`,
      [expenseId, clubId]
    );

    // If this was an event expense, update the event financials
    if (result.affectedRows > 0 && eventId) {
      await this.updateEventFinancials(eventId);
    }

    return result.affectedRows > 0;
  }

  // ===== INCOME METHODS =====

  async createIncome(clubId, incomeData) {
    const { 
      event_id, 
      source, 
      description, 
      amount, 
      date, 
      payment_method = 'cash', 
      reference 
    } = incomeData;

    const incomeId = uuidv4();

    const [result] = await database.connection.execute(
      `INSERT INTO ${this.prefix}income 
       (id, club_id, event_id, source, description, amount, date, payment_method, reference) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        incomeId, 
        clubId, 
        event_id || null, 
        source, 
        description, 
        amount, 
        date, 
        payment_method, 
        reference || null
      ]
    );

    // If this is event income, update the event financials
    if (event_id) {
      await this.updateEventFinancials(event_id);
    }

    // Get the created income
    const [rows] = await database.connection.execute(
      `SELECT * FROM ${this.prefix}income WHERE id = ?`,
      [incomeId]
    );

    return Array.isArray(rows) ? rows[0] : null;
  }

  async getIncomeByEvent(eventId, clubId) {
    // Verify event belongs to club first
    const [eventRows] = await database.connection.execute(
      `SELECT club_id FROM ${this.prefix}events WHERE id = ?`,
      [eventId]
    );

    if (!Array.isArray(eventRows) || eventRows.length === 0) {
      throw new Error('Event not found');
    }

    if (eventRows[0].club_id !== clubId) {
      throw new Error('Access denied');
    }

    const [rows] = await database.connection.execute(
      `SELECT * FROM ${this.prefix}income 
       WHERE event_id = ? 
       ORDER BY date DESC`,
      [eventId]
    );

    return rows || [];
  }

  async getIncomeByClub(clubId, eventId = null) {
    let query, params;

    if (eventId) {
      // Get income for specific event
      query = `SELECT * FROM ${this.prefix}income 
               WHERE club_id = ? AND event_id = ?
               ORDER BY date DESC`;
      params = [clubId, eventId];
    } else {
      // Get global income (not tied to events)
      query = `SELECT * FROM ${this.prefix}income 
               WHERE club_id = ? AND event_id IS NULL
               ORDER BY date DESC`;
      params = [clubId];
    }

    const [rows] = await database.connection.execute(query, params);
    return rows || [];
  }

  // ===== FINANCIAL SUMMARY METHODS =====

  async getClubFinancialSummary(clubId) {
    // Get total income
    const [incomeRows] = await database.connection.execute(
      `SELECT COALESCE(SUM(amount), 0) as total_income FROM ${this.prefix}income WHERE club_id = ?`,
      [clubId]
    );
    const totalIncome = Array.isArray(incomeRows) ? incomeRows[0].total_income : 0;

    // Get total expenses
    const [expenseRows] = await database.connection.execute(
      `SELECT COALESCE(SUM(amount), 0) as total_expenses FROM ${this.prefix}expenses WHERE club_id = ?`,
      [clubId]
    );
    const totalExpenses = Array.isArray(expenseRows) ? expenseRows[0].total_expenses : 0;

    // Get pending expenses
    const [pendingRows] = await database.connection.execute(
      `SELECT COALESCE(SUM(amount), 0) as pending_expenses FROM ${this.prefix}expenses WHERE club_id = ? AND status = 'pending'`,
      [clubId]
    );
    const pendingExpenses = Array.isArray(pendingRows) ? pendingRows[0].pending_expenses : 0;

    // Get expense breakdown by category
    const [categoryRows] = await database.connection.execute(
      `SELECT category, COALESCE(SUM(amount), 0) as amount 
       FROM ${this.prefix}expenses 
       WHERE club_id = ? 
       GROUP BY category 
       ORDER BY amount DESC`,
      [clubId]
    );

    // Get income breakdown by payment method
    const [methodRows] = await database.connection.execute(
      `SELECT payment_method, COALESCE(SUM(amount), 0) as amount 
       FROM ${this.prefix}income 
       WHERE club_id = ? 
       GROUP BY payment_method 
       ORDER BY amount DESC`,
      [clubId]
    );

    // Get event financial performance
    const [eventRows] = await database.connection.execute(
      `SELECT 
         e.id,
         e.title,
         e.goal_amount,
         e.actual_amount,
         e.total_expenses,
         e.net_profit,
         e.event_date,
         e.status
       FROM ${this.prefix}events e
       WHERE e.club_id = ?
       ORDER BY e.event_date DESC`,
      [clubId]
    );

    return {
      total_income: parseFloat(totalIncome),
      total_expenses: parseFloat(totalExpenses),
      net_profit: parseFloat(totalIncome) - parseFloat(totalExpenses),
      pending_expenses: parseFloat(pendingExpenses),
      expenses_by_category: categoryRows || [],
      income_by_method: methodRows || [],
      event_performance: eventRows || []
    };
  }

  async getEventFinancialBreakdown(eventId, clubId) {
    // Verify event belongs to club
    const [eventRows] = await database.connection.execute(
      `SELECT * FROM ${this.prefix}events WHERE id = ? AND club_id = ?`,
      [eventId, clubId]
    );

    if (!Array.isArray(eventRows) || eventRows.length === 0) {
      throw new Error('Event not found');
    }

    const event = eventRows[0];

    // Get detailed income breakdown
    const [incomeRows] = await database.connection.execute(
      `SELECT source, payment_method, COALESCE(SUM(amount), 0) as amount, COUNT(*) as count
       FROM ${this.prefix}income 
       WHERE event_id = ?
       GROUP BY source, payment_method
       ORDER BY amount DESC`,
      [eventId]
    );

    // Get detailed expense breakdown
    const [expenseRows] = await database.connection.execute(
      `SELECT category, payment_method, COALESCE(SUM(amount), 0) as amount, COUNT(*) as count
       FROM ${this.prefix}expenses 
       WHERE event_id = ?
       GROUP BY category, payment_method
       ORDER BY amount DESC`,
      [eventId]
    );

    return {
      event: event,
      income_breakdown: incomeRows || [],
      expense_breakdown: expenseRows || [],
      summary: {
        goal_amount: parseFloat(event.goal_amount),
        actual_amount: parseFloat(event.actual_amount),
        total_expenses: parseFloat(event.total_expenses),
        net_profit: parseFloat(event.net_profit),
        goal_achievement: event.goal_amount > 0 ? (event.actual_amount / event.goal_amount * 100) : 0
      }
    };
  }

  async updateIncome(incomeId, clubId, updateData) {
    const allowedFields = ['source', 'description', 'amount', 'date', 'payment_method', 'reference'];
    const updateFields = Object.keys(updateData).filter(key =>
      allowedFields.includes(key) && updateData[key] !== undefined
    );

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    const setClause = updateFields.map(field => `${field} = ?`).join(', ');
    const values = updateFields.map(field => updateData[field]);
    values.push(incomeId, clubId);

    const [result] = await database.connection.execute(
      `UPDATE ${this.prefix}income SET ${setClause} WHERE id = ? AND club_id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return null;
    }

    // Get updated income record
    const [rows] = await database.connection.execute(
      `SELECT * FROM ${this.prefix}income WHERE id = ?`,
      [incomeId]
    );

    const income = Array.isArray(rows) ? rows[0] : null;
    
    // If this income has an event_id, update event financials
    if (income && income.event_id) {
      await this.updateEventFinancials(income.event_id);
    }

    return income;
  }

  async deleteIncome(incomeId, clubId) {
    // Get income to check if it has an event_id before deleting
    const [incomeRows] = await database.connection.execute(
      `SELECT event_id FROM ${this.prefix}income WHERE id = ? AND club_id = ?`,
      [incomeId, clubId]
    );

    if (!Array.isArray(incomeRows) || incomeRows.length === 0) {
      return false;
    }

    const eventId = incomeRows[0].event_id;

    const [result] = await database.connection.execute(
      `DELETE FROM ${this.prefix}income WHERE id = ? AND club_id = ?`,
      [incomeId, clubId]
    );

    // If this was event income, update the event financials
    if (result.affectedRows > 0 && eventId) {
      await this.updateEventFinancials(eventId);
    }

    return result.affectedRows > 0;
  }

  // ===== REPORTING METHODS =====

  async getExpensesByCategory(clubId, filters = {}) {
    const { start_date, end_date, event_id } = filters;
    
    let query = `
      SELECT 
        category,
        COUNT(*) as transaction_count,
        COALESCE(SUM(amount), 0) as total_amount,
        AVG(amount) as average_amount,
        MIN(amount) as min_amount,
        MAX(amount) as max_amount
      FROM ${this.prefix}expenses 
      WHERE club_id = ?
    `;
    
    const params = [clubId];

    if (event_id) {
      query += ' AND event_id = ?';
      params.push(event_id);
    }

    if (start_date) {
      query += ' AND date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND date <= ?';
      params.push(end_date);
    }

    query += ' GROUP BY category ORDER BY total_amount DESC';

    const [rows] = await database.connection.execute(query, params);
    return rows || [];
  }

  async getIncomeBySource(clubId, filters = {}) {
    const { start_date, end_date, event_id } = filters;
    
    let query = `
      SELECT 
        source,
        payment_method,
        COUNT(*) as transaction_count,
        COALESCE(SUM(amount), 0) as total_amount,
        AVG(amount) as average_amount
      FROM ${this.prefix}income 
      WHERE club_id = ?
    `;
    
    const params = [clubId];

    if (event_id) {
      query += ' AND event_id = ?';
      params.push(event_id);
    }

    if (start_date) {
      query += ' AND date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND date <= ?';
      params.push(end_date);
    }

    query += ' GROUP BY source, payment_method ORDER BY total_amount DESC';

    const [rows] = await database.connection.execute(query, params);
    return rows || [];
  }

  async getMonthlyTrends(clubId, year = new Date().getFullYear()) {
    // Get monthly income
    const [incomeRows] = await database.connection.execute(`
      SELECT 
        MONTH(date) as month,
        YEAR(date) as year,
        COALESCE(SUM(amount), 0) as total_income
      FROM ${this.prefix}income 
      WHERE club_id = ? AND YEAR(date) = ?
      GROUP BY YEAR(date), MONTH(date)
      ORDER BY YEAR(date), MONTH(date)
    `, [clubId, year]);

    // Get monthly expenses
    const [expenseRows] = await database.connection.execute(`
      SELECT 
        MONTH(date) as month,
        YEAR(date) as year,
        COALESCE(SUM(amount), 0) as total_expenses
      FROM ${this.prefix}expenses 
      WHERE club_id = ? AND YEAR(date) = ?
      GROUP BY YEAR(date), MONTH(date)
      ORDER BY YEAR(date), MONTH(date)
    `, [clubId, year]);

    // Combine and format data
    const months = [];
    for (let month = 1; month <= 12; month++) {
      const incomeData = incomeRows.find(row => row.month === month) || { total_income: 0 };
      const expenseData = expenseRows.find(row => row.month === month) || { total_expenses: 0 };
      
      months.push({
        month,
        year: parseInt(year),
        total_income: parseFloat(incomeData.total_income),
        total_expenses: parseFloat(expenseData.total_expenses),
        net_profit: parseFloat(incomeData.total_income) - parseFloat(expenseData.total_expenses)
      });
    }

    return months;
  }

  async getPendingExpenses(clubId) {
    const [rows] = await database.connection.execute(`
      SELECT 
        e.*,
        u.name as created_by_name,
        ev.title as event_title
      FROM ${this.prefix}expenses e
      LEFT JOIN ${this.prefix}users u ON e.created_by = u.id
      LEFT JOIN ${this.prefix}events ev ON e.event_id = ev.id
      WHERE e.club_id = ? AND e.status = 'pending'
      ORDER BY e.created_at DESC
    `, [clubId]);

    return rows || [];
  }

  async recalculateEventFinancials(eventId, clubId) {
    // Verify event belongs to club first
    const [eventRows] = await database.connection.execute(
      `SELECT club_id FROM ${this.prefix}events WHERE id = ?`,
      [eventId]
    );

    if (!Array.isArray(eventRows) || eventRows.length === 0) {
      throw new Error('Event not found');
    }

    if (eventRows[0].club_id !== clubId) {
      throw new Error('Access denied');
    }

    // Recalculate the financials
    return await this.updateEventFinancials(eventId);
  }

  // ===== HELPER METHODS =====

  async updateEventFinancials(eventId) {
    try {
      // Calculate total income for event
      const [incomeRows] = await database.connection.execute(
        `SELECT COALESCE(SUM(amount), 0) as total_income FROM ${this.prefix}income WHERE event_id = ?`,
        [eventId]
      );
      const totalIncome = Array.isArray(incomeRows) ? incomeRows[0].total_income : 0;

      // Calculate total expenses for event
      const [expenseRows] = await database.connection.execute(
        `SELECT COALESCE(SUM(amount), 0) as total_expenses FROM ${this.prefix}expenses WHERE event_id = ?`,
        [eventId]
      );
      const totalExpenses = Array.isArray(expenseRows) ? expenseRows[0].total_expenses : 0;

      // Update event totals
      await database.connection.execute(
        `UPDATE ${this.prefix}events 
         SET actual_amount = ?, total_expenses = ?, net_profit = ? 
         WHERE id = ?`,
        [totalIncome, totalExpenses, totalIncome - totalExpenses, eventId]
      );

      return {
        actual_amount: parseFloat(totalIncome),
        total_expenses: parseFloat(totalExpenses),
        net_profit: parseFloat(totalIncome) - parseFloat(totalExpenses)
      };
    } catch (error) {
      console.error('Error updating event financials:', error);
      throw error;
    }
  }
}

export default FinancialService;
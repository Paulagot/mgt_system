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
      campaign_id,
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

    // Validate: can't have both event_id and campaign_id
    if (event_id && campaign_id) {
      throw new Error('Expense cannot be assigned to both event and campaign');
    }

    const [result] = await database.connection.execute(
      `INSERT INTO ${this.prefix}expenses 
       (id, club_id, event_id, campaign_id, category, description, amount, date, vendor, payment_method, status, receipt_url, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        expenseId, 
        clubId, 
        event_id || null,
        campaign_id || null,
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

    // Update financial calculations based on hierarchy
    if (event_id) {
      await this.updateEventFinancials(event_id);
    } else if (campaign_id) {
      await this.updateCampaignFinancials(campaign_id);
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

  async getExpensesByCampaign(campaignId, clubId) {
    // Verify campaign belongs to club
    const [campaignRows] = await database.connection.execute(
      `SELECT club_id FROM ${this.prefix}campaigns WHERE id = ?`,
      [campaignId]
    );

    if (!Array.isArray(campaignRows) || campaignRows.length === 0) {
      throw new Error('Campaign not found');
    }

    if (campaignRows[0].club_id !== clubId) {
      throw new Error('Access denied');
    }

    // Get campaign-level expenses (not tied to specific events)
    const [rows] = await database.connection.execute(
      `SELECT e.*, u.name as created_by_name 
       FROM ${this.prefix}expenses e
       LEFT JOIN ${this.prefix}users u ON e.created_by = u.id
       WHERE e.campaign_id = ? AND e.event_id IS NULL
       ORDER BY e.date DESC`,
      [campaignId]
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
      // Get club-level expenses (not tied to events or campaigns)
      query = `SELECT e.*, u.name as created_by_name 
               FROM ${this.prefix}expenses e
               LEFT JOIN ${this.prefix}users u ON e.created_by = u.id
               WHERE e.club_id = ? AND e.event_id IS NULL AND e.campaign_id IS NULL
               ORDER BY e.date DESC`;
      params = [clubId];
    }

    const [rows] = await database.connection.execute(query, params);
    return rows || [];
  }

  async updateExpense(expenseId, clubId, updateData) {
    const allowedFields = ['category', 'description', 'amount', 'date', 'vendor', 'payment_method', 'status', 'receipt_url', 'campaign_id', 'event_id'];
    const updateFields = Object.keys(updateData).filter(key =>
      allowedFields.includes(key) && updateData[key] !== undefined
    );

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    // Validate: can't have both event_id and campaign_id
    if (updateData.event_id && updateData.campaign_id) {
      throw new Error('Expense cannot be assigned to both event and campaign');
    }

    // Get the old expense to know what to update
    const [oldExpenseRows] = await database.connection.execute(
      `SELECT event_id, campaign_id FROM ${this.prefix}expenses WHERE id = ? AND club_id = ?`,
      [expenseId, clubId]
    );

    if (!Array.isArray(oldExpenseRows) || oldExpenseRows.length === 0) {
      return null;
    }

    const oldExpense = oldExpenseRows[0];

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

    // Get updated expense
    const [rows] = await database.connection.execute(
      `SELECT * FROM ${this.prefix}expenses WHERE id = ?`,
      [expenseId]
    );

    const expense = Array.isArray(rows) ? rows[0] : null;
    
    // Update financials for old and new parent entities
    if (oldExpense.event_id) {
      await this.updateEventFinancials(oldExpense.event_id);
    } else if (oldExpense.campaign_id) {
      await this.updateCampaignFinancials(oldExpense.campaign_id);
    }

    if (expense) {
      if (expense.event_id && expense.event_id !== oldExpense.event_id) {
        await this.updateEventFinancials(expense.event_id);
      } else if (expense.campaign_id && expense.campaign_id !== oldExpense.campaign_id) {
        await this.updateCampaignFinancials(expense.campaign_id);
      }
    }

    return expense;
  }

  async deleteExpense(expenseId, clubId) {
    // Get expense to check parent entities before deleting
    const [expenseRows] = await database.connection.execute(
      `SELECT event_id, campaign_id FROM ${this.prefix}expenses WHERE id = ? AND club_id = ?`,
      [expenseId, clubId]
    );

    if (!Array.isArray(expenseRows) || expenseRows.length === 0) {
      return false;
    }

    const { event_id, campaign_id } = expenseRows[0];

    const [result] = await database.connection.execute(
      `DELETE FROM ${this.prefix}expenses WHERE id = ? AND club_id = ?`,
      [expenseId, clubId]
    );

    // Update parent entity financials
    if (result.affectedRows > 0) {
      if (event_id) {
        await this.updateEventFinancials(event_id);
      } else if (campaign_id) {
        await this.updateCampaignFinancials(campaign_id);
      }
    }

    return result.affectedRows > 0;
  }

  // ===== INCOME METHODS =====

  async createIncome(clubId, incomeData) {
    const { 
      event_id,
      campaign_id,
      source, 
      description, 
      amount, 
      date, 
      payment_method = 'cash', 
      reference,
      supporter_id
    } = incomeData;

    const incomeId = uuidv4();

    // Validate: can't have both event_id and campaign_id
    if (event_id && campaign_id) {
      throw new Error('Income cannot be assigned to both event and campaign');
    }

    const [result] = await database.connection.execute(
      `INSERT INTO ${this.prefix}income 
       (id, club_id, event_id, campaign_id, source, description, amount, date, payment_method, reference, supporter_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        incomeId, 
        clubId, 
        event_id || null,
        campaign_id || null,
        source, 
        description, 
        amount, 
        date, 
        payment_method, 
        reference || null,
        supporter_id || null
      ]
    );

    // Update financial calculations based on hierarchy
    if (event_id) {
      await this.updateEventFinancials(event_id);
    } else if (campaign_id) {
      await this.updateCampaignFinancials(campaign_id);
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
      `SELECT i.*, s.name as supporter_name 
       FROM ${this.prefix}income i
       LEFT JOIN ${this.prefix}supporters s ON i.supporter_id = s.id
       WHERE i.event_id = ? 
       ORDER BY i.date DESC`,
      [eventId]
    );

    return rows || [];
  }

  async getIncomeByCampaign(campaignId, clubId) {
    // Verify campaign belongs to club
    const [campaignRows] = await database.connection.execute(
      `SELECT club_id FROM ${this.prefix}campaigns WHERE id = ?`,
      [campaignId]
    );

    if (!Array.isArray(campaignRows) || campaignRows.length === 0) {
      throw new Error('Campaign not found');
    }

    if (campaignRows[0].club_id !== clubId) {
      throw new Error('Access denied');
    }

    // Get campaign-level income (not tied to specific events)
    const [rows] = await database.connection.execute(
      `SELECT i.*, s.name as supporter_name 
       FROM ${this.prefix}income i
       LEFT JOIN ${this.prefix}supporters s ON i.supporter_id = s.id
       WHERE i.campaign_id = ? AND i.event_id IS NULL
       ORDER BY i.date DESC`,
      [campaignId]
    );

    return rows || [];
  }

  async getIncomeByClub(clubId, eventId = null) {
    let query, params;

    if (eventId) {
      // Get income for specific event
      query = `SELECT i.*, s.name as supporter_name 
               FROM ${this.prefix}income i
               LEFT JOIN ${this.prefix}supporters s ON i.supporter_id = s.id
               WHERE i.club_id = ? AND i.event_id = ?
               ORDER BY i.date DESC`;
      params = [clubId, eventId];
    } else {
      // Get club-level income (not tied to events or campaigns)
      query = `SELECT i.*, s.name as supporter_name 
               FROM ${this.prefix}income i
               LEFT JOIN ${this.prefix}supporters s ON i.supporter_id = s.id
               WHERE i.club_id = ? AND i.event_id IS NULL AND i.campaign_id IS NULL
               ORDER BY i.date DESC`;
      params = [clubId];
    }

    const [rows] = await database.connection.execute(query, params);
    return rows || [];
  }

  async updateIncome(incomeId, clubId, updateData) {
    const allowedFields = ['source', 'description', 'amount', 'date', 'payment_method', 'reference', 'supporter_id', 'campaign_id', 'event_id'];
    const updateFields = Object.keys(updateData).filter(key =>
      allowedFields.includes(key) && updateData[key] !== undefined
    );

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    // Validate: can't have both event_id and campaign_id
    if (updateData.event_id && updateData.campaign_id) {
      throw new Error('Income cannot be assigned to both event and campaign');
    }

    // Get the old income to know what to update
    const [oldIncomeRows] = await database.connection.execute(
      `SELECT event_id, campaign_id FROM ${this.prefix}income WHERE id = ? AND club_id = ?`,
      [incomeId, clubId]
    );

    if (!Array.isArray(oldIncomeRows) || oldIncomeRows.length === 0) {
      return null;
    }

    const oldIncome = oldIncomeRows[0];

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
    
    // Update financials for old and new parent entities
    if (oldIncome.event_id) {
      await this.updateEventFinancials(oldIncome.event_id);
    } else if (oldIncome.campaign_id) {
      await this.updateCampaignFinancials(oldIncome.campaign_id);
    }

    if (income) {
      if (income.event_id && income.event_id !== oldIncome.event_id) {
        await this.updateEventFinancials(income.event_id);
      } else if (income.campaign_id && income.campaign_id !== oldIncome.campaign_id) {
        await this.updateCampaignFinancials(income.campaign_id);
      }
    }

    return income;
  }

  async deleteIncome(incomeId, clubId) {
    // Get income to check parent entities before deleting
    const [incomeRows] = await database.connection.execute(
      `SELECT event_id, campaign_id FROM ${this.prefix}income WHERE id = ? AND club_id = ?`,
      [incomeId, clubId]
    );

    if (!Array.isArray(incomeRows) || incomeRows.length === 0) {
      return false;
    }

    const { event_id, campaign_id } = incomeRows[0];

    const [result] = await database.connection.execute(
      `DELETE FROM ${this.prefix}income WHERE id = ? AND club_id = ?`,
      [incomeId, clubId]
    );

    // Update parent entity financials
    if (result.affectedRows > 0) {
      if (event_id) {
        await this.updateEventFinancials(event_id);
      } else if (campaign_id) {
        await this.updateCampaignFinancials(campaign_id);
      }
    }

    return result.affectedRows > 0;
  }

  // ===== FINANCIAL SUMMARY METHODS =====

  async getClubFinancialSummary(clubId) {
    // Get total income (all levels)
    const [incomeRows] = await database.connection.execute(
      `SELECT COALESCE(SUM(amount), 0) as total_income FROM ${this.prefix}income WHERE club_id = ?`,
      [clubId]
    );
    const totalIncome = Array.isArray(incomeRows) ? incomeRows[0].total_income : 0;

    // Get total expenses (all levels)
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

    // Get allocated funds breakdown
    const [allocatedRows] = await database.connection.execute(
      `SELECT COALESCE(SUM(amount), 0) as allocated_funds 
       FROM ${this.prefix}income 
       WHERE club_id = ? AND payment_method = 'allocated_funds'`,
      [clubId]
    );
    const totalAllocatedFunds = Array.isArray(allocatedRows) ? allocatedRows[0].allocated_funds : 0;

    // Get club-level only (not in campaigns or events)
    const [clubOnlyIncomeRows] = await database.connection.execute(
      `SELECT COALESCE(SUM(amount), 0) as club_income 
       FROM ${this.prefix}income 
       WHERE club_id = ? AND event_id IS NULL AND campaign_id IS NULL`,
      [clubId]
    );
    const clubOnlyIncome = Array.isArray(clubOnlyIncomeRows) ? clubOnlyIncomeRows[0].club_income : 0;

    const [clubOnlyExpenseRows] = await database.connection.execute(
      `SELECT COALESCE(SUM(amount), 0) as club_expenses 
       FROM ${this.prefix}expenses 
       WHERE club_id = ? AND event_id IS NULL AND campaign_id IS NULL`,
      [clubId]
    );
    const clubOnlyExpenses = Array.isArray(clubOnlyExpenseRows) ? clubOnlyExpenseRows[0].club_expenses : 0;

    // Get expense breakdown by category
    const [categoryRows] = await database.connection.execute(
      `SELECT category, COALESCE(SUM(amount), 0) as amount 
       FROM ${this.prefix}expenses 
       WHERE club_id = ? 
       GROUP BY category 
       ORDER BY amount DESC`,
      [clubId]
    );

    // Get income breakdown by source
    const [sourceRows] = await database.connection.execute(
      `SELECT source, COALESCE(SUM(amount), 0) as amount 
       FROM ${this.prefix}income 
       WHERE club_id = ? 
       GROUP BY source 
       ORDER BY amount DESC`,
      [clubId]
    );

    // Get campaign performance summary
    const [campaignRows] = await database.connection.execute(
      `SELECT 
         c.id,
         c.name,
         c.target_amount,
         c.actual_amount,
         c.total_expenses,
         c.net_profit,
         c.start_date,
         c.end_date
       FROM ${this.prefix}campaigns c
       WHERE c.club_id = ?
       ORDER BY c.start_date DESC`,
      [clubId]
    );

    // Get event performance summary
    const [eventRows] = await database.connection.execute(
      `SELECT 
         e.id,
         e.title,
         e.campaign_id,
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
      allocated_funds: parseFloat(totalAllocatedFunds),
      club_level: {
        income: parseFloat(clubOnlyIncome),
        expenses: parseFloat(clubOnlyExpenses),
        net: parseFloat(clubOnlyIncome) - parseFloat(clubOnlyExpenses)
      },
      expenses_by_category: categoryRows || [],
      income_by_source: sourceRows || [],
      campaign_performance: campaignRows || [],
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
      `SELECT category, payment_method, status, COALESCE(SUM(amount), 0) as amount, COUNT(*) as count
       FROM ${this.prefix}expenses 
       WHERE event_id = ?
       GROUP BY category, payment_method, status
       ORDER BY amount DESC`,
      [eventId]
    );

    // Get allocated funds for this event
    const [allocatedRows] = await database.connection.execute(
      `SELECT COALESCE(SUM(amount), 0) as allocated_amount
       FROM ${this.prefix}income 
       WHERE event_id = ? AND payment_method = 'allocated_funds'`,
      [eventId]
    );
    const allocatedFunds = Array.isArray(allocatedRows) ? parseFloat(allocatedRows[0].allocated_amount) : 0;

    return {
      event: event,
      income_breakdown: incomeRows || [],
      expense_breakdown: expenseRows || [],
      summary: {
        goal_amount: parseFloat(event.goal_amount),
        actual_amount: parseFloat(event.actual_amount),
        total_expenses: parseFloat(event.total_expenses),
        net_profit: parseFloat(event.net_profit),
        overhead_allocation: parseFloat(event.overhead_allocation || 0),
        allocated_funds: allocatedFunds,
        goal_achievement: event.goal_amount > 0 ? (event.actual_amount / event.goal_amount * 100) : 0
      }
    };
  }

  async getCampaignFinancialBreakdown(campaignId, clubId) {
    // Verify campaign belongs to club
    const [campaignRows] = await database.connection.execute(
      `SELECT * FROM ${this.prefix}campaigns WHERE id = ? AND club_id = ?`,
      [campaignId, clubId]
    );

    if (!Array.isArray(campaignRows) || campaignRows.length === 0) {
      throw new Error('Campaign not found');
    }

    const campaign = campaignRows[0];

    // Get campaign-level income (not event-specific)
    const [campaignIncomeRows] = await database.connection.execute(
      `SELECT source, payment_method, COALESCE(SUM(amount), 0) as amount, COUNT(*) as count
       FROM ${this.prefix}income 
       WHERE campaign_id = ? AND event_id IS NULL
       GROUP BY source, payment_method
       ORDER BY amount DESC`,
      [campaignId]
    );

    // Get campaign-level expenses (not event-specific)
    const [campaignExpenseRows] = await database.connection.execute(
      `SELECT category, payment_method, status, COALESCE(SUM(amount), 0) as amount, COUNT(*) as count
       FROM ${this.prefix}expenses 
       WHERE campaign_id = ? AND event_id IS NULL
       GROUP BY category, payment_method, status
       ORDER BY amount DESC`,
      [campaignId]
    );

    // Get all events in this campaign
    const [eventRows] = await database.connection.execute(
      `SELECT 
         id,
         title,
         goal_amount,
         actual_amount,
         total_expenses,
         net_profit,
         overhead_allocation,
         event_date,
         status
       FROM ${this.prefix}events 
       WHERE campaign_id = ?
       ORDER BY event_date DESC`,
      [campaignId]
    );

    // Calculate event rollup totals
    const eventTotals = (eventRows || []).reduce((acc, event) => ({
      income: acc.income + parseFloat(event.actual_amount || 0),
      expenses: acc.expenses + parseFloat(event.total_expenses || 0),
      net_profit: acc.net_profit + parseFloat(event.net_profit || 0)
    }), { income: 0, expenses: 0, net_profit: 0 });

    // Get allocated funds for this campaign
    const [allocatedRows] = await database.connection.execute(
      `SELECT COALESCE(SUM(amount), 0) as allocated_amount
       FROM ${this.prefix}income 
       WHERE campaign_id = ? AND payment_method = 'allocated_funds'`,
      [campaignId]
    );
    const allocatedFunds = Array.isArray(allocatedRows) ? parseFloat(allocatedRows[0].allocated_amount) : 0;

    return {
      campaign: campaign,
      campaign_level: {
        income: campaignIncomeRows || [],
        expenses: campaignExpenseRows || []
      },
      events: eventRows || [],
      summary: {
        target_amount: parseFloat(campaign.target_amount),
        actual_amount: parseFloat(campaign.actual_amount || 0),
        total_expenses: parseFloat(campaign.total_expenses || 0),
        net_profit: parseFloat(campaign.net_profit || 0),
        overhead_allocation: parseFloat(campaign.overhead_allocation || 0),
        allocated_funds: allocatedFunds,
        event_rollup: eventTotals,
        target_achievement: campaign.target_amount > 0 ? (campaign.actual_amount / campaign.target_amount * 100) : 0
      }
    };
  }

  // ===== REPORTING METHODS =====

  async getExpensesByCategory(clubId, filters = {}) {
    const { start_date, end_date, event_id, campaign_id } = filters;
    
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

    if (campaign_id) {
      query += ' AND campaign_id = ?';
      params.push(campaign_id);
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
    const { start_date, end_date, event_id, campaign_id } = filters;
    
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

    if (campaign_id) {
      query += ' AND campaign_id = ?';
      params.push(campaign_id);
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
        ev.title as event_title,
        c.name as campaign_name
      FROM ${this.prefix}expenses e
      LEFT JOIN ${this.prefix}users u ON e.created_by = u.id
      LEFT JOIN ${this.prefix}events ev ON e.event_id = ev.id
      LEFT JOIN ${this.prefix}campaigns c ON e.campaign_id = c.id
      WHERE e.club_id = ? AND e.status = 'pending'
      ORDER BY e.created_at DESC
    `, [clubId]);

    return rows || [];
  }

  // ===== ALLOCATION TRACKING =====

  async getAllocatedFundsSummary(clubId) {
    // Total allocated funds at club level
    const [clubAllocatedRows] = await database.connection.execute(
      `SELECT COALESCE(SUM(amount), 0) as total_allocated
       FROM ${this.prefix}income 
       WHERE club_id = ? AND payment_method = 'allocated_funds'`,
      [clubId]
    );
    const totalAllocated = parseFloat(clubAllocatedRows[0]?.total_allocated || 0);

    // Allocated to campaigns (campaign-level only, not events)
    const [campaignAllocatedRows] = await database.connection.execute(
      `SELECT 
         campaign_id,
         c.name as campaign_name,
         COALESCE(SUM(i.amount), 0) as allocated_amount
       FROM ${this.prefix}income i
       JOIN ${this.prefix}campaigns c ON i.campaign_id = c.id
       WHERE i.club_id = ? AND i.payment_method = 'allocated_funds' AND i.event_id IS NULL
       GROUP BY campaign_id, c.name`,
      [clubId]
    );

    // Allocated to events
    const [eventAllocatedRows] = await database.connection.execute(
      `SELECT 
         event_id,
         e.title as event_title,
         e.campaign_id,
         COALESCE(SUM(i.amount), 0) as allocated_amount
       FROM ${this.prefix}income i
       JOIN ${this.prefix}events e ON i.event_id = e.id
       WHERE i.club_id = ? AND i.payment_method = 'allocated_funds'
       GROUP BY event_id, e.title, e.campaign_id`,
      [clubId]
    );

    return {
      total_allocated: totalAllocated,
      campaign_allocations: campaignAllocatedRows || [],
      event_allocations: eventAllocatedRows || []
    };
  }

  async checkAllocationAvailability(clubId, requestedAmount) {
    // Get total club income (excluding allocated funds to avoid double counting)
    const [incomeRows] = await database.connection.execute(
      `SELECT COALESCE(SUM(amount), 0) as total_income
       FROM ${this.prefix}income 
       WHERE club_id = ? AND payment_method != 'allocated_funds'`,
      [clubId]
    );
    const totalIncome = parseFloat(incomeRows[0]?.total_income || 0);

    // Get total already allocated
    const [allocatedRows] = await database.connection.execute(
      `SELECT COALESCE(SUM(amount), 0) as total_allocated
       FROM ${this.prefix}income 
       WHERE club_id = ? AND payment_method = 'allocated_funds'`,
      [clubId]
    );
    const totalAllocated = parseFloat(allocatedRows[0]?.total_allocated || 0);

    const available = totalIncome - totalAllocated;
    const canAllocate = available >= requestedAmount;

    return {
      total_income: totalIncome,
      total_allocated: totalAllocated,
      available_for_allocation: available,
      requested_amount: requestedAmount,
      can_allocate: canAllocate,
      warning: !canAllocate ? `Requested amount (${requestedAmount}) exceeds available funds (${available})` : null
    };
  }

  // ===== RECALCULATION METHODS =====

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

  async recalculateCampaignFinancials(campaignId, clubId) {
    // Verify campaign belongs to club first
    const [campaignRows] = await database.connection.execute(
      `SELECT club_id FROM ${this.prefix}campaigns WHERE id = ?`,
      [campaignId]
    );

    if (!Array.isArray(campaignRows) || campaignRows.length === 0) {
      throw new Error('Campaign not found');
    }

    if (campaignRows[0].club_id !== clubId) {
      throw new Error('Access denied');
    }

    // Recalculate the financials
    return await this.updateCampaignFinancials(campaignId);
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

      // Get the event to check if it belongs to a campaign
      const [eventRows] = await database.connection.execute(
        `SELECT campaign_id FROM ${this.prefix}events WHERE id = ?`,
        [eventId]
      );

      const campaignId = eventRows[0]?.campaign_id;
      if (campaignId) {
        // Update the parent campaign financials
        await this.updateCampaignFinancials(campaignId);
      }

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
// Updated updateCampaignFinancials method for FinancialService.js
// Replace the existing method (lines 1062-1128) with this version

async updateCampaignFinancials(campaignId) {
  try {
    // Calculate campaign-level income (not from events)
    const [campaignIncomeRows] = await database.connection.execute(
      `SELECT COALESCE(SUM(amount), 0) as campaign_income 
       FROM ${this.prefix}income 
       WHERE campaign_id = ? AND event_id IS NULL`,
      [campaignId]
    );
    const campaignIncome = parseFloat(campaignIncomeRows[0]?.campaign_income || 0);

    // Calculate campaign-level expenses (not from events)
    const [campaignExpenseRows] = await database.connection.execute(
      `SELECT COALESCE(SUM(amount), 0) as campaign_expenses 
       FROM ${this.prefix}expenses 
       WHERE campaign_id = ? AND event_id IS NULL`,
      [campaignId]
    );
    const campaignExpenses = parseFloat(campaignExpenseRows[0]?.campaign_expenses || 0);

    // Get rollup from all events in this campaign
    const [eventRollupRows] = await database.connection.execute(
      `SELECT 
         COALESCE(SUM(actual_amount), 0) as events_income,
         COALESCE(SUM(total_expenses), 0) as events_expenses,
         COALESCE(SUM(net_profit), 0) as events_net
       FROM ${this.prefix}events 
       WHERE campaign_id = ?`,
      [campaignId]
    );

    const eventsIncome = parseFloat(eventRollupRows[0]?.events_income || 0);
    const eventsExpenses = parseFloat(eventRollupRows[0]?.events_expenses || 0);

    // Total = campaign-level + event rollup
    const totalIncome = campaignIncome + eventsIncome;
    const totalExpenses = campaignExpenses + eventsExpenses;
    const netProfit = totalIncome - totalExpenses;

    // Get target amount for progress calculation
    const [campaignRows] = await database.connection.execute(
      `SELECT target_amount FROM ${this.prefix}campaigns WHERE id = ?`,
      [campaignId]
    );
    const targetAmount = parseFloat(campaignRows[0]?.target_amount || 0);
    const progressPercentage = targetAmount > 0 ? (totalIncome / targetAmount * 100) : 0;

    // Update campaign totals - now updates BOTH old and new field names
    await database.connection.execute(
      `UPDATE ${this.prefix}campaigns 
       SET actual_amount = ?, 
           total_raised = ?,
           total_expenses = ?, 
           net_profit = ?,
           total_profit = ?,
           progress_percentage = ?
       WHERE id = ?`,
      [
        totalIncome,      // actual_amount (legacy)
        totalIncome,      // total_raised (new)
        totalExpenses,    // total_expenses
        netProfit,        // net_profit (legacy)
        netProfit,        // total_profit (new)
        progressPercentage, // progress_percentage
        campaignId
      ]
    );

    return {
      actual_amount: totalIncome,
      total_raised: totalIncome,
      total_expenses: totalExpenses,
      net_profit: netProfit,
      total_profit: netProfit,
      progress_percentage: progressPercentage,
      breakdown: {
        campaign_level: {
          income: campaignIncome,
          expenses: campaignExpenses
        },
        events_rollup: {
          income: eventsIncome,
          expenses: eventsExpenses
        }
      }
    };
  } catch (error) {
    console.error('Error updating campaign financials:', error);
    throw error;
  }
}
}

export default FinancialService;
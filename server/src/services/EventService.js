import database from '../config/database.js';
import config from '../config/environment.js';
import { v4 as uuidv4 } from 'uuid';

class EventService {
  constructor() {
    this.prefix = config.DB_TABLE_PREFIX;
  }

  async createEvent(clubId, eventData) {
    const { 
      title, 
      type, 
      description, 
      venue, 
      max_participants, 
      goal_amount, 
      event_date, 
      campaign_id 
    } = eventData;
    
    // If campaign_id provided, verify it belongs to this club
    if (campaign_id) {
      const [campaignRows] = await database.connection.execute(
        `SELECT club_id FROM ${this.prefix}campaigns WHERE id = ?`,
        [campaign_id]
      );
      
      if (!Array.isArray(campaignRows) || campaignRows.length === 0) {
        throw new Error('Campaign not found');
      }
      
      if (campaignRows[0].club_id !== clubId) {
        throw new Error('Campaign does not belong to your club');
      }
    }
    
    const eventId = uuidv4();
    
    const [result] = await database.connection.execute(
      `INSERT INTO ${this.prefix}events (
        id, club_id, campaign_id, title, type, description, venue, 
        max_participants, goal_amount, event_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        eventId, 
        clubId, 
        campaign_id || null, 
        title, 
        type, 
        description, 
        venue, 
        max_participants, 
        goal_amount, 
        event_date
      ]
    );

    // Get the created event
    const [rows] = await database.connection.execute(
      `SELECT * FROM ${this.prefix}events WHERE id = ?`,
      [eventId]
    );

    return Array.isArray(rows) ? rows[0] : null;
  }

  async getEventsByClub(clubId) {
    const [rows] = await database.connection.execute(
      `SELECT 
        e.*,
        c.name as campaign_name
      FROM ${this.prefix}events e
      LEFT JOIN ${this.prefix}campaigns c ON e.campaign_id = c.id
      WHERE e.club_id = ? 
      ORDER BY e.event_date DESC`,
      [clubId]
    );

    return rows || [];
  }

  async getEventById(eventId, clubId) {
    const [rows] = await database.connection.execute(
      `SELECT 
        e.*,
        c.name as campaign_name
      FROM ${this.prefix}events e
      LEFT JOIN ${this.prefix}campaigns c ON e.campaign_id = c.id
      WHERE e.id = ? AND e.club_id = ?`,
      [eventId, clubId]
    );

    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  }

  async updateEvent(eventId, clubId, updateData) {
  // Handle campaign_id validation and null conversion
  if (updateData.campaign_id !== undefined) {
    // Convert empty string to null
    if (updateData.campaign_id === '' || updateData.campaign_id === null) {
      updateData.campaign_id = null;
    } else {
      // If campaign_id provided, verify it belongs to this club
      const [campaignRows] = await database.connection.execute(
        `SELECT club_id FROM ${this.prefix}campaigns WHERE id = ?`,
        [updateData.campaign_id]
      );
      
      if (!Array.isArray(campaignRows) || campaignRows.length === 0) {
        throw new Error('Campaign not found');
      }
      
      if (campaignRows[0].club_id !== clubId) {
        throw new Error('Campaign does not belong to your club');
      }
    }
  }

  // Build dynamic update query
  const allowedFields = [
    'title', 
    'type', 
    'description', 
    'venue', 
    'max_participants', 
    'goal_amount', 
    'actual_amount', 
    'event_date', 
    'status', 
    'campaign_id'
  ];
  
  const updateFields = Object.keys(updateData).filter(key => 
    allowedFields.includes(key) && updateData[key] !== undefined
  );
  
  if (updateFields.length === 0) {
    throw new Error('No valid fields to update');
  }

  const setClause = updateFields.map(field => `${field} = ?`).join(', ');
  const values = updateFields.map(field => updateData[field]);
  values.push(eventId, clubId);

  console.log('🔧 EventService: Updating event with:', {
    eventId,
    clubId,
    updateFields,
    campaign_id: updateData.campaign_id,
    setClause
  });

  const [result] = await database.connection.execute(
    `UPDATE ${this.prefix}events SET ${setClause} WHERE id = ? AND club_id = ?`,
    values
  );

  if (result.affectedRows === 0) {
    throw new Error('Event not found or no changes made');
  }

  // Return updated event
  return await this.getEventById(eventId, clubId);
}

  async deleteEvent(eventId, clubId) {
    // Check if event has associated data first
    const [expenseRows] = await database.connection.execute(
      `SELECT COUNT(*) as expense_count FROM ${this.prefix}expenses WHERE event_id = ?`,
      [eventId]
    );

    const [incomeRows] = await database.connection.execute(
      `SELECT COUNT(*) as income_count FROM ${this.prefix}income WHERE event_id = ?`,
      [eventId]
    );

    const expenseCount = Array.isArray(expenseRows) ? expenseRows[0].expense_count : 0;
    const incomeCount = Array.isArray(incomeRows) ? incomeRows[0].income_count : 0;
    
    if (expenseCount > 0 || incomeCount > 0) {
      throw new Error('Cannot delete event with associated financial records');
    }

    const [result] = await database.connection.execute(
      `DELETE FROM ${this.prefix}events WHERE id = ? AND club_id = ?`,
      [eventId, clubId]
    );

    return result.affectedRows > 0;
  }

  async getEventFinancials(eventId, clubId) {
    // Verify event belongs to club
    const event = await this.getEventById(eventId, clubId);
    if (!event) {
      return null;
    }

    // Get income breakdown
    const [incomeRows] = await database.connection.execute(
      `SELECT 
        source,
        payment_method,
        SUM(amount) as total_amount,
        COUNT(*) as transaction_count
      FROM ${this.prefix}income 
      WHERE event_id = ? 
      GROUP BY source, payment_method
      ORDER BY total_amount DESC`,
      [eventId]
    );

    // Get expense breakdown
    const [expenseRows] = await database.connection.execute(
      `SELECT 
        category,
        payment_method,
        status,
        SUM(amount) as total_amount,
        COUNT(*) as transaction_count
      FROM ${this.prefix}expenses 
      WHERE event_id = ? 
      GROUP BY category, payment_method, status
      ORDER BY total_amount DESC`,
      [eventId]
    );

    // Get total income
    const [totalIncomeRows] = await database.connection.execute(
      `SELECT COALESCE(SUM(amount), 0) as total_income FROM ${this.prefix}income WHERE event_id = ?`,
      [eventId]
    );

    // Get total expenses
    const [totalExpenseRows] = await database.connection.execute(
      `SELECT COALESCE(SUM(amount), 0) as total_expenses FROM ${this.prefix}expenses WHERE event_id = ?`,
      [eventId]
    );

    const totalIncome = Array.isArray(totalIncomeRows) ? totalIncomeRows[0].total_income : 0;
    const totalExpenses = Array.isArray(totalExpenseRows) ? totalExpenseRows[0].total_expenses : 0;

    return {
      event,
      financial_summary: {
        total_income: totalIncome,
        total_expenses: totalExpenses,
        net_profit: totalIncome - totalExpenses,
        goal_amount: event.goal_amount,
        progress_percentage: event.goal_amount > 0 
          ? Math.round((totalIncome / event.goal_amount) * 100)
          : 0
      },
      income_breakdown: incomeRows || [],
      expense_breakdown: expenseRows || []
    };
  }

  // Helper function to update event financial totals
  // This will be called when expenses or income are added/updated
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
        `UPDATE ${this.prefix}events SET actual_amount = ?, total_expenses = ?, net_profit = ? WHERE id = ?`,
        [totalIncome, totalExpenses, totalIncome - totalExpenses, eventId]
      );

      return {
        total_income: totalIncome,
        total_expenses: totalExpenses,
        net_profit: totalIncome - totalExpenses
      };
    } catch (error) {
      console.error('Error updating event financials:', error);
      throw error;
    }
  }

  async getEventsByStatus(clubId, status) {
    const [rows] = await database.connection.execute(
      `SELECT 
        e.*,
        c.name as campaign_name
      FROM ${this.prefix}events e
      LEFT JOIN ${this.prefix}campaigns c ON e.campaign_id = c.id
      WHERE e.club_id = ? AND e.status = ?
      ORDER BY e.event_date DESC`,
      [clubId, status]
    );

    return rows || [];
  }

  async getUpcomingEvents(clubId, limit = 5) {
    const [rows] = await database.connection.execute(
      `SELECT 
        e.*,
        c.name as campaign_name
      FROM ${this.prefix}events e
      LEFT JOIN ${this.prefix}campaigns c ON e.campaign_id = c.id
      WHERE e.club_id = ? AND e.event_date >= CURDATE() AND e.status != 'ended'
      ORDER BY e.event_date ASC
      LIMIT ?`,
      [clubId, limit]
    );

    return rows || [];
  }
}

export default EventService;
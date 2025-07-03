import database from '../config/database.js';
import { config } from '../config/environment.js';
import { v4 as uuidv4 } from 'uuid';

class SupporterService {
  constructor() {
    this.prefix = config.DB_TABLE_PREFIX;
  }

  // ===== ENHANCED SUPPORTER CRUD METHODS =====

  async createSupporter(clubId, supporterData) {
    const { 
      // Core fields
      name, 
      type, 
      notes,
      
      // Contact information
      email,
      phone,
      address_line1,
      address_line2,
      city,
      state_province,
      postal_code,
      country,
      preferred_contact_method,
      
      // Relationship management
      relationship_strength,
      contact_source,
      referral_source,
      
      // Communication preferences
      email_subscribed,
      sms_subscribed,
      newsletter_subscribed,
      event_notifications,
      do_not_contact,
      
      // Lifecycle & Priority
      lifecycle_stage,
      priority_level,
      next_contact_date,
      
      // Flexible data
      tags,
      interests,
      skills,
      communication_preferences,
      
      // GDPR
      gdpr_consent,
      data_protection_notes
    } = supporterData;

    const supporterId = uuidv4();

    // Convert arrays to JSON strings for storage
    const tagsJson = tags && Array.isArray(tags) ? JSON.stringify(tags) : null;
    const interestsJson = interests && Array.isArray(interests) ? JSON.stringify(interests) : null;
    const skillsJson = skills && Array.isArray(skills) ? JSON.stringify(skills) : null;
    const commPrefsJson = communication_preferences && typeof communication_preferences === 'object' 
      ? JSON.stringify(communication_preferences) : null;

    const [result] = await database.connection.execute(
      `INSERT INTO ${this.prefix}supporters (
        id, club_id, name, type, notes,
        email, phone, address_line1, address_line2, city, state_province, postal_code, country,
        preferred_contact_method, relationship_strength, contact_source, referral_source,
        email_subscribed, sms_subscribed, newsletter_subscribed, event_notifications, do_not_contact,
        lifecycle_stage, priority_level, next_contact_date,
        tags, interests, skills, communication_preferences,
        gdpr_consent, data_protection_notes, last_contact_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        supporterId, clubId, name, type, notes || null,
        email || null, phone || null, address_line1 || null, address_line2 || null, 
        city || null, state_province || null, postal_code || null, country || 'UK',
        preferred_contact_method || 'email', relationship_strength || 'prospect', 
        contact_source || 'other', referral_source || null,
        email_subscribed !== undefined ? email_subscribed : true,
        sms_subscribed !== undefined ? sms_subscribed : false,
        newsletter_subscribed !== undefined ? newsletter_subscribed : true,
        event_notifications !== undefined ? event_notifications : true,
        do_not_contact !== undefined ? do_not_contact : false,
        lifecycle_stage || 'prospect', priority_level || 'medium', next_contact_date || null,
        tagsJson, interestsJson, skillsJson, commPrefsJson,
        gdpr_consent !== undefined ? gdpr_consent : false, data_protection_notes || null,
        new Date() // Set last_contact_date to now for new supporters
      ]
    );

    // Get the created supporter with parsed JSON
    return await this.getSupporterById(supporterId, clubId);
  }

  async getSupportersByClub(clubId, filters = {}) {
    const { type, search, relationship_strength, lifecycle_stage, priority_level } = filters;
    
    let query = `SELECT * FROM ${this.prefix}supporters WHERE club_id = ?`;
    const params = [clubId];

    // Apply filters
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    if (relationship_strength) {
      query += ' AND relationship_strength = ?';
      params.push(relationship_strength);
    }

    if (lifecycle_stage) {
      query += ' AND lifecycle_stage = ?';
      params.push(lifecycle_stage);
    }

    if (priority_level) {
      query += ' AND priority_level = ?';
      params.push(priority_level);
    }

    if (search) {
      query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR notes LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await database.connection.execute(query, params);
    
    // Parse JSON fields for each supporter
    return (rows || []).map(supporter => this.parseJsonFields(supporter));
  }

  async getSupporterById(supporterId, clubId) {
    const [rows] = await database.connection.execute(
      `SELECT * FROM ${this.prefix}supporters WHERE id = ? AND club_id = ?`,
      [supporterId, clubId]
    );

    const supporter = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    return supporter ? this.parseJsonFields(supporter) : null;
  }

  async updateSupporter(supporterId, clubId, updateData) {
    const allowedFields = [
      'name', 'type', 'notes', 'email', 'phone', 'address_line1', 'address_line2',
      'city', 'state_province', 'postal_code', 'country', 'preferred_contact_method',
      'relationship_strength', 'contact_source', 'referral_source',
      'email_subscribed', 'sms_subscribed', 'newsletter_subscribed', 'event_notifications',
      'do_not_contact', 'lifecycle_stage', 'priority_level', 'next_contact_date',
      'tags', 'interests', 'skills', 'communication_preferences',
      'gdpr_consent', 'data_protection_notes'
    ];
    
    const updateFields = Object.keys(updateData).filter(key => 
      allowedFields.includes(key) && updateData[key] !== undefined
    );
    
    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    // Process JSON fields
    const processedData = { ...updateData };
    if (processedData.tags && Array.isArray(processedData.tags)) {
      processedData.tags = JSON.stringify(processedData.tags);
    }
    if (processedData.interests && Array.isArray(processedData.interests)) {
      processedData.interests = JSON.stringify(processedData.interests);
    }
    if (processedData.skills && Array.isArray(processedData.skills)) {
      processedData.skills = JSON.stringify(processedData.skills);
    }
    if (processedData.communication_preferences && typeof processedData.communication_preferences === 'object') {
      processedData.communication_preferences = JSON.stringify(processedData.communication_preferences);
    }

    const setClause = updateFields.map(field => `${field} = ?`).join(', ');
    const values = updateFields.map(field => processedData[field] || null);
    values.push(supporterId, clubId);

    const [result] = await database.connection.execute(
      `UPDATE ${this.prefix}supporters SET ${setClause} WHERE id = ? AND club_id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return null;
    }

    return await this.getSupporterById(supporterId, clubId);
  }

  async deleteSupporter(supporterId, clubId) {
    // Check if supporter is referenced in communications, prizes, or tasks
    const [commRows] = await database.connection.execute(
      `SELECT COUNT(*) as comm_count FROM ${this.prefix}communications WHERE supporter_id = ?`,
      [supporterId]
    );

    const [prizeRows] = await database.connection.execute(
      `SELECT COUNT(*) as prize_count FROM ${this.prefix}prizes WHERE donated_by = ?`,
      [supporterId]
    );

    const [taskRows] = await database.connection.execute(
      `SELECT COUNT(*) as task_count FROM ${this.prefix}tasks WHERE assigned_to = ?`,
      [supporterId]
    );

    const commCount = Array.isArray(commRows) ? commRows[0].comm_count : 0;
    const prizeCount = Array.isArray(prizeRows) ? prizeRows[0].prize_count : 0;
    const taskCount = Array.isArray(taskRows) ? taskRows[0].task_count : 0;

    if (commCount > 0 || prizeCount > 0 || taskCount > 0) {
      throw new Error('Cannot delete supporter with associated communications, prizes, or tasks');
    }

    const [result] = await database.connection.execute(
      `DELETE FROM ${this.prefix}supporters WHERE id = ? AND club_id = ?`,
      [supporterId, clubId]
    );

    return result.affectedRows > 0;
  }

  // ===== DONOR-FOCUSED ANALYTICS =====

  async getDonorStats(clubId) {
    // Get donor counts by relationship strength
    const [relationshipRows] = await database.connection.execute(
      `SELECT relationship_strength, COUNT(*) as count 
       FROM ${this.prefix}supporters 
       WHERE club_id = ? AND type = 'donor'
       GROUP BY relationship_strength`,
      [clubId]
    );

    // Get donor counts by lifecycle stage
    const [lifecycleRows] = await database.connection.execute(
      `SELECT lifecycle_stage, COUNT(*) as count 
       FROM ${this.prefix}supporters 
       WHERE club_id = ? AND type = 'donor'
       GROUP BY lifecycle_stage`,
      [clubId]
    );

    // Get total donation metrics
    const [totalRows] = await database.connection.execute(
      `SELECT 
        COUNT(*) as total_donors,
        SUM(total_donated) as total_amount_raised,
        AVG(total_donated) as average_donor_value,
        MAX(total_donated) as largest_donor_amount,
        COUNT(CASE WHEN total_donated > 0 THEN 1 END) as active_donors,
        COUNT(CASE WHEN last_donation_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH) THEN 1 END) as recent_donors
       FROM ${this.prefix}supporters 
       WHERE club_id = ? AND type = 'donor'`,
      [clubId]
    );

    // Get recent donor activity (last 30 days)
    const [recentRows] = await database.connection.execute(
      `SELECT COUNT(*) as new_donors_this_month
       FROM ${this.prefix}supporters 
       WHERE club_id = ? AND type = 'donor'
       AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      [clubId]
    );

    const totals = Array.isArray(totalRows) && totalRows.length > 0 ? totalRows[0] : {};
    const recent = Array.isArray(recentRows) && recentRows.length > 0 ? recentRows[0] : {};

    return {
      // Overview metrics
      total_donors: totals.total_donors || 0,
      active_donors: totals.active_donors || 0,
      recent_donors: totals.recent_donors || 0,
      new_donors_this_month: recent.new_donors_this_month || 0,
      
      // Financial metrics
      total_amount_raised: parseFloat(totals.total_amount_raised || 0),
      average_donor_value: parseFloat(totals.average_donor_value || 0),
      largest_donor_amount: parseFloat(totals.largest_donor_amount || 0),
      
      // Segmentation
      relationship_breakdown: relationshipRows || [],
      lifecycle_breakdown: lifecycleRows || []
    };
  }

  async getTopDonors(clubId, limit = 10) {
    const [rows] = await database.connection.execute(
      `SELECT * FROM ${this.prefix}supporters 
       WHERE club_id = ? AND type = 'donor' AND total_donated > 0
       ORDER BY total_donated DESC 
       LIMIT ?`,
      [clubId, limit]
    );

    return (rows || []).map(supporter => this.parseJsonFields(supporter));
  }

  async getLapsedDonors(clubId, monthsThreshold = 12) {
    const [rows] = await database.connection.execute(
      `SELECT * FROM ${this.prefix}supporters 
       WHERE club_id = ? AND type = 'donor' 
       AND total_donated > 0
       AND (last_donation_date IS NULL OR last_donation_date < DATE_SUB(NOW(), INTERVAL ? MONTH))
       ORDER BY last_donation_date DESC`,
      [clubId, monthsThreshold]
    );

    return (rows || []).map(supporter => this.parseJsonFields(supporter));
  }

  async getDonorRetentionRate(clubId, timeframe = 12) {
    // Get donors who gave in the previous period
    const [previousPeriodRows] = await database.connection.execute(
      `SELECT COUNT(DISTINCT id) as previous_donors
       FROM ${this.prefix}supporters 
       WHERE club_id = ? AND type = 'donor'
       AND last_donation_date BETWEEN DATE_SUB(NOW(), INTERVAL ? MONTH) 
       AND DATE_SUB(NOW(), INTERVAL ? MONTH)`,
      [clubId, timeframe * 2, timeframe]
    );

    // Get donors who gave in both periods (retained)
    const [retainedRows] = await database.connection.execute(
      `SELECT COUNT(DISTINCT id) as retained_donors
       FROM ${this.prefix}supporters 
       WHERE club_id = ? AND type = 'donor'
       AND last_donation_date >= DATE_SUB(NOW(), INTERVAL ? MONTH)
       AND first_donation_date <= DATE_SUB(NOW(), INTERVAL ? MONTH)`,
      [clubId, timeframe, timeframe]
    );

    const previousDonors = previousPeriodRows[0]?.previous_donors || 0;
    const retainedDonors = retainedRows[0]?.retained_donors || 0;

    return {
      previous_period_donors: previousDonors,
      retained_donors: retainedDonors,
      retention_rate: previousDonors > 0 ? (retainedDonors / previousDonors * 100) : 0,
      timeframe_months: timeframe
    };
  }

  // ===== COMMUNICATION LOGGING SYSTEM =====

  async logCommunication(clubId, communicationData) {
    const {
      supporter_id,
      type,
      direction,
      subject,
      notes,
      outcome,
      follow_up_required,
      follow_up_date,
      follow_up_notes,
      event_id,
      campaign_id,
      communication_channel,
      duration_minutes,
      attachment_urls,
      tags,
      created_by
    } = communicationData;

    const commId = uuidv4();

    // Convert arrays to JSON
    const attachmentUrlsJson = attachment_urls && Array.isArray(attachment_urls) 
      ? JSON.stringify(attachment_urls) : null;
    const tagsJson = tags && Array.isArray(tags) ? JSON.stringify(tags) : null;

    const [result] = await database.connection.execute(
      `INSERT INTO ${this.prefix}communications (
        id, club_id, supporter_id, type, direction, subject, notes,
        outcome, follow_up_required, follow_up_date, follow_up_notes,
        event_id, campaign_id, communication_channel, duration_minutes,
        attachment_urls, tags, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        commId, clubId, supporter_id, type, direction, subject || null, notes,
        outcome || 'neutral', follow_up_required || false, follow_up_date || null, follow_up_notes || null,
        event_id || null, campaign_id || null, communication_channel || null, duration_minutes || null,
        attachmentUrlsJson, tagsJson, created_by
      ]
    );

    // Update supporter's last_contact_date
    await database.connection.execute(
      `UPDATE ${this.prefix}supporters SET last_contact_date = NOW() WHERE id = ? AND club_id = ?`,
      [supporter_id, clubId]
    );

    // Get the created communication
    const [rows] = await database.connection.execute(
      `SELECT * FROM ${this.prefix}communications WHERE id = ?`,
      [commId]
    );

    return Array.isArray(rows) && rows.length > 0 ? this.parseJsonFields(rows[0]) : null;
  }

async getCommunicationHistory(supporterId, clubId, limit = 50) {
  console.log('🔍 getCommunicationHistory called with:');
  console.log('  supporterId:', supporterId, typeof supporterId);
  console.log('  clubId:', clubId, typeof clubId);
  console.log('  limit:', limit, typeof limit);
  console.log('  prefix:', this.prefix);

  const sql = `SELECT c.*, u.name as created_by_name
               FROM ${this.prefix}communications c
               LEFT JOIN ${this.prefix}users u ON c.created_by = u.id
               WHERE c.supporter_id = ? AND c.club_id = ?
               ORDER BY c.created_at DESC
               LIMIT ?`;
  
  const params = [supporterId, clubId, limit];
  
  console.log('🔍 SQL Query:', sql);
  console.log('🔍 Parameters:', params);
  console.log('🔍 Parameter types:', params.map(p => typeof p));

  try {
    const [rows] = await database.connection.execute(sql, params);
    console.log('✅ Query successful, rows:', rows.length);
    return (rows || []).map(comm => this.parseJsonFields(comm));
  } catch (error) {
    console.error('❌ SQL execution error:', error);
    console.error('❌ Error details:', {
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    throw error;
  }
}

  async getFollowUpTasks(clubId, overdue = false) {
    let query = `
      SELECT c.*, s.name as supporter_name, s.type as supporter_type
      FROM ${this.prefix}communications c
      JOIN ${this.prefix}supporters s ON c.supporter_id = s.id
      WHERE c.club_id = ? AND c.follow_up_required = true
    `;

    const params = [clubId];

    if (overdue) {
      query += ' AND c.follow_up_date < CURDATE()';
    } else {
      query += ' AND c.follow_up_date >= CURDATE()';
    }

    query += ' ORDER BY c.follow_up_date ASC';

    const [rows] = await database.connection.execute(query, params);
    return (rows || []).map(task => this.parseJsonFields(task));
  }

  // ===== UTILITY METHODS =====

  parseJsonFields(supporter) {
    if (!supporter) return supporter;

    // Parse JSON fields back to arrays/objects
    try {
      if (supporter.tags && typeof supporter.tags === 'string') {
        supporter.tags = JSON.parse(supporter.tags);
      }
      if (supporter.interests && typeof supporter.interests === 'string') {
        supporter.interests = JSON.parse(supporter.interests);
      }
      if (supporter.skills && typeof supporter.skills === 'string') {
        supporter.skills = JSON.parse(supporter.skills);
      }
      if (supporter.communication_preferences && typeof supporter.communication_preferences === 'string') {
        supporter.communication_preferences = JSON.parse(supporter.communication_preferences);
      }
      if (supporter.attachment_urls && typeof supporter.attachment_urls === 'string') {
        supporter.attachment_urls = JSON.parse(supporter.attachment_urls);
      }
    } catch (e) {
      // If JSON parsing fails, keep as string or set to null
      console.warn('JSON parsing failed for supporter fields:', e.message);
    }

    // Ensure arrays exist even if null
    supporter.tags = supporter.tags || [];
    supporter.interests = supporter.interests || [];
    supporter.skills = supporter.skills || [];

    return supporter;
  }

  // ===== EXISTING METHODS (Updated for new schema) =====

  async getSupporterStats(clubId) {
    // Enhanced version of original method
    const donorStats = await this.getDonorStats(clubId);
    
    // Get volunteer and sponsor counts
    const [typeRows] = await database.connection.execute(
      `SELECT type, COUNT(*) as count 
       FROM ${this.prefix}supporters 
       WHERE club_id = ? 
       GROUP BY type`,
      [clubId]
    );

    const [totalRows] = await database.connection.execute(
      `SELECT COUNT(*) as total_supporters FROM ${this.prefix}supporters WHERE club_id = ?`,
      [clubId]
    );

    const totalSupporters = Array.isArray(totalRows) ? totalRows[0].total_supporters : 0;

    const typeBreakdown = { volunteer: 0, donor: 0, sponsor: 0 };
    if (Array.isArray(typeRows)) {
      typeRows.forEach(row => {
        typeBreakdown[row.type] = row.count;
      });
    }

    return {
      ...donorStats,
      total_supporters: totalSupporters,
      breakdown_by_type: typeBreakdown,
      type_details: typeRows || []
    };
  }

  // Keep existing methods but update for new schema
  async getSupporterEngagement(supporterId, clubId) {
    const supporter = await this.getSupporterById(supporterId, clubId);
    if (!supporter) {
      throw new Error('Supporter not found');
    }

    // Get communication history
    const communications = await this.getCommunicationHistory(supporterId, clubId, 10);

    // Get prizes donated (existing logic)
    const [prizeRows] = await database.connection.execute(
      `SELECT p.*, e.title as event_title, e.event_date 
       FROM ${this.prefix}prizes p
       LEFT JOIN ${this.prefix}events e ON p.event_id = e.id
       WHERE p.donated_by = ?
       ORDER BY p.created_at DESC`,
      [supporterId]
    );

    // Get tasks assigned (existing logic)
    const [taskRows] = await database.connection.execute(
      `SELECT t.*, e.title as event_title, e.event_date 
       FROM ${this.prefix}tasks t
       LEFT JOIN ${this.prefix}events e ON t.event_id = e.id
       WHERE t.assigned_to = ?
       ORDER BY t.due_date DESC`,
      [supporterId]
    );

    const totalPrizeValue = Array.isArray(prizeRows) 
      ? prizeRows.reduce((sum, prize) => sum + parseFloat(prize.value || 0), 0) 
      : 0;

    const completedTasks = Array.isArray(taskRows) 
      ? taskRows.filter(task => task.status === 'done').length 
      : 0;

    return {
      supporter,
      engagement: {
        // Financial engagement
        total_donated: supporter.total_donated || 0,
        donation_count: supporter.donation_count || 0,
        average_donation: supporter.average_donation || 0,
        
        // Prize donations
        total_prizes_donated: Array.isArray(prizeRows) ? prizeRows.length : 0,
        total_prize_value: totalPrizeValue,
        
        // Volunteer engagement
        total_tasks_assigned: Array.isArray(taskRows) ? taskRows.length : 0,
        completed_tasks: completedTasks,
        pending_tasks: taskRows.length - completedTasks,
        task_completion_rate: taskRows.length > 0 ? (completedTasks / taskRows.length * 100) : 0,
        volunteer_hours_total: supporter.volunteer_hours_total || 0,
        
        // Communication engagement
        total_communications: communications.length,
        last_contact_date: supporter.last_contact_date,
        relationship_strength: supporter.relationship_strength,
        lifecycle_stage: supporter.lifecycle_stage
      },
      recent_communications: communications,
      prizes_donated: prizeRows || [],
      tasks_assigned: taskRows || []
    };
  }

  // Keep other existing methods (bulkCreateSupporters, exportSupporters, etc.)
  // but update them to work with new schema...
  
  async bulkCreateSupporters(clubId, supportersData) {
    const results = [];
    const errors = [];

    for (let i = 0; i < supportersData.length; i++) {
      try {
        const supporter = await this.createSupporter(clubId, supportersData[i]);
        results.push(supporter);
      } catch (error) {
        errors.push({
          index: i,
          data: supportersData[i],
          error: error.message
        });
      }
    }

    return {
      successful: results,
      errors: errors,
      total_processed: supportersData.length,
      successful_count: results.length,
      error_count: errors.length
    };
  }

  async exportSupporters(clubId, filters = {}) {
    const supporters = await this.getSupportersByClub(clubId, filters);
    
    // Enhanced CSV export with new fields
    const csvData = supporters.map(supporter => ({
      name: supporter.name,
      type: supporter.type,
      email: supporter.email || '',
      phone: supporter.phone || '',
      relationship_strength: supporter.relationship_strength || '',
      lifecycle_stage: supporter.lifecycle_stage || '',
      total_donated: supporter.total_donated || 0,
      last_donation_date: supporter.last_donation_date || '',
      volunteer_hours: supporter.volunteer_hours_total || 0,
      notes: supporter.notes || '',
      created_at: supporter.created_at
    }));

    return csvData;
  }
}

export default SupporterService;
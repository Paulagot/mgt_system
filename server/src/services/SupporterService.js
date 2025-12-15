// server/services/SupporterService.js
import database from '../config/database.js';
import { config } from '../config/environment.js';
import { v4 as uuidv4 } from 'uuid';

class SupporterService {
  constructor() {
    this.prefix = config.DB_TABLE_PREFIX;
  }

  // ---------------------------------------------------------------------------
  // Helpers (simple + safe)
  // ---------------------------------------------------------------------------
  normalizeEmail(email) {
    const v = String(email || '').trim().toLowerCase();
    return v.length ? v : null;
  }

  normalizePhone(phone) {
    // digits only
    const digits = String(phone || '').replace(/\D/g, '');
    return digits.length ? digits : null;
  }

  // Match phone in DB by stripping common formatting characters.
  // This avoids MySQL 8 REGEXP_REPLACE dependency.
  // Not perfect, but good enough for "same number typed differently".
  phoneDigitsSql(expr = 'phone') {
    // remove spaces, dashes, parentheses, plus signs, dots
    return `
      REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(${expr}, ''), ' ', ''), '-', ''), '(', ''), ')', ''), '+', ''), '.', '')
    `;
  }

  async findDuplicateSupporter(clubId, supporterData) {
    // 1) Email dedupe (best)
    const emailNorm = this.normalizeEmail(supporterData.email);
    if (emailNorm) {
      const [rows] = await database.connection.execute(
        `SELECT id
         FROM ${this.prefix}supporters
         WHERE club_id = ?
           AND email IS NOT NULL
           AND LOWER(TRIM(email)) = ?
         LIMIT 1`,
        [clubId, emailNorm]
      );
      if (rows?.length) return rows[0].id;
    }

    // 2) Phone dedupe (digits-only)
    const phoneNorm = this.normalizePhone(supporterData.phone);
    if (phoneNorm) {
      const [rows] = await database.connection.execute(
        `SELECT id
         FROM ${this.prefix}supporters
         WHERE club_id = ?
           AND ${this.phoneDigitsSql('phone')} = ?
         LIMIT 1`,
        [clubId, phoneNorm]
      );
      if (rows?.length) return rows[0].id;
    }

    return null;
  }

  // ---------------------------------------------------------------------------
  // Supporter CRUD
  // ---------------------------------------------------------------------------
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
      data_protection_notes,
    } = supporterData;

    // ---- Duplicate guard (email OR phone) ----
    const dupId = await this.findDuplicateSupporter(clubId, supporterData);
    if (dupId) {
      const existing = await this.getSupporterById(dupId, clubId);
      return { supporter: existing, isDuplicate: true };
    }

    const supporterId = uuidv4();

    const tagsJson = tags && Array.isArray(tags) ? JSON.stringify(tags) : null;
    const interestsJson = interests && Array.isArray(interests) ? JSON.stringify(interests) : null;
    const skillsJson = skills && Array.isArray(skills) ? JSON.stringify(skills) : null;
    const commPrefsJson =
      communication_preferences && typeof communication_preferences === 'object'
        ? JSON.stringify(communication_preferences)
        : null;

    await database.execute(
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
        supporterId,
        clubId,
        name,
        type,
        notes || null,

        // Important: store email as given (but dedupe uses normalized)
        email || null,
        phone || null,
        address_line1 || null,
        address_line2 || null,
        city || null,
        state_province || null,
        postal_code || null,
        country || 'UK',

        preferred_contact_method || 'email',
        relationship_strength || 'prospect',
        contact_source || 'other',
        referral_source || null,

        email_subscribed !== undefined ? email_subscribed : true,
        sms_subscribed !== undefined ? sms_subscribed : false,
        newsletter_subscribed !== undefined ? newsletter_subscribed : true,
        event_notifications !== undefined ? event_notifications : true,
        do_not_contact !== undefined ? do_not_contact : false,

        lifecycle_stage || 'prospect',
        priority_level || 'medium',
        next_contact_date || null,

        tagsJson,
        interestsJson,
        skillsJson,
        commPrefsJson,

        gdpr_consent !== undefined ? gdpr_consent : false,
        data_protection_notes || null,

        new Date(), // last_contact_date
      ]
    );

    const created = await this.getSupporterById(supporterId, clubId);
    return { supporter: created, isDuplicate: false };
  }

  async getSupportersByClub(clubId, filters = {}) {
    let query = `SELECT * FROM ${this.prefix}supporters WHERE club_id = ?`;
    const params = [clubId];
    
    // Filter archived supporters by default (unless explicitly requested)
    // if (filters.includeArchived !== 'true') {
    //   query += ` AND (is_archived = FALSE OR is_archived IS NULL)`;
    // }
    
    // Apply other filters
    if (filters.type) {
      query += ` AND type = ?`;
      params.push(filters.type);
    }
    
    if (filters.search) {
      query += ` AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)`;
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (filters.relationship_strength) {
      query += ` AND relationship_strength = ?`;
      params.push(filters.relationship_strength);
    }
    
    if (filters.lifecycle_stage) {
      query += ` AND lifecycle_stage = ?`;
      params.push(filters.lifecycle_stage);
    }
    
    if (filters.priority_level) {
      query += ` AND priority_level = ?`;
      params.push(filters.priority_level);
    }
    
    query += ` ORDER BY created_at DESC`;
    
    // Use database.execute which returns the rows directly (not wrapped in array)
    const supporters = await database.execute(query, params);
    return supporters || [];
  }

  async getSupporterById(supporterId, clubId) {
    try {
      const [rows] = await database.connection.execute(
        `SELECT * FROM ${this.prefix}supporters WHERE id = ? AND club_id = ?`,
        [supporterId, clubId]
      );

      const supporter = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
      if (!supporter) return null;

      const contributions = await this.calculateSupporterTotalContributions(supporterId);

      const enhancedSupporter = this.parseJsonFields(supporter);
      enhancedSupporter.calculated_total_donated = contributions.total_contributions;
      enhancedSupporter.calculated_monetary_donations = contributions.monetary_donations;
      enhancedSupporter.calculated_prize_donations = contributions.prize_donations;
      enhancedSupporter.calculated_sponsorships = contributions.sponsorships;

      return enhancedSupporter;
    } catch (error) {
      console.error('Error getting supporter by ID:', error);
      throw error;
    }
  }

  async updateSupporter(supporterId, clubId, updateData) {
    const allowedFields = [
      'name',
      'type',
      'notes',
      'email',
      'phone',
      'address_line1',
      'address_line2',
      'city',
      'state_province',
      'postal_code',
      'country',
      'preferred_contact_method',
      'relationship_strength',
      'contact_source',
      'referral_source',
      'email_subscribed',
      'sms_subscribed',
      'newsletter_subscribed',
      'event_notifications',
      'do_not_contact',
      'lifecycle_stage',
      'priority_level',
      'next_contact_date',
      'tags',
      'interests',
      'skills',
      'communication_preferences',
      'gdpr_consent',
      'data_protection_notes',
    ];

    const updateFields = Object.keys(updateData).filter(
      (key) => allowedFields.includes(key) && updateData[key] !== undefined
    );

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    const processedData = { ...updateData };
    if (processedData.tags && Array.isArray(processedData.tags)) processedData.tags = JSON.stringify(processedData.tags);
    if (processedData.interests && Array.isArray(processedData.interests)) processedData.interests = JSON.stringify(processedData.interests);
    if (processedData.skills && Array.isArray(processedData.skills)) processedData.skills = JSON.stringify(processedData.skills);
    if (processedData.communication_preferences && typeof processedData.communication_preferences === 'object') {
      processedData.communication_preferences = JSON.stringify(processedData.communication_preferences);
    }

    const setClause = updateFields.map((field) => `${field} = ?`).join(', ');
    const values = updateFields.map((field) => processedData[field] ?? null);
    values.push(supporterId, clubId);

    const result = await database.execute(
      `UPDATE ${this.prefix}supporters SET ${setClause} WHERE id = ? AND club_id = ?`,
      values
    );

    if (result.affectedRows === 0) return null;
    return await this.getSupporterById(supporterId, clubId);
  }

  async deleteSupporter(supporterId, clubId) {
    const commRows = await database.execute(
      `SELECT COUNT(*) as comm_count FROM ${this.prefix}communications WHERE supporter_id = ?`,
      [supporterId]
    );

    const prizeRows = await database.execute(
      `SELECT COUNT(*) as prize_count FROM ${this.prefix}prizes WHERE donated_by = ?`,
      [supporterId]
    );

    const taskRows = await database.execute(
      `SELECT COUNT(*) as task_count FROM ${this.prefix}tasks WHERE assigned_to = ?`,
      [supporterId]
    );

    const commCount = Array.isArray(commRows) ? commRows[0].comm_count : 0;
    const prizeCount = Array.isArray(prizeRows) ? prizeRows[0].prize_count : 0;
    const taskCount = Array.isArray(taskRows) ? taskRows[0].task_count : 0;

    if (commCount > 0 || prizeCount > 0 || taskCount > 0) {
      throw new Error('Cannot delete supporter with associated communications, prizes, or tasks');
    }

    const result = await database.execute(
      `DELETE FROM ${this.prefix}supporters WHERE id = ? AND club_id = ?`,
      [supporterId, clubId]
    );

    return result.affectedRows > 0;
  }

  /**
   * Archive a supporter (soft delete for supporters with relationships)
   */
  async archiveSupporter(supporterId, clubId) {
    const result = await database.execute(
      `UPDATE ${this.prefix}supporters 
       SET is_archived = TRUE 
       WHERE id = ? AND club_id = ?`,
      [supporterId, clubId]
    );
    
    if (result.affectedRows === 0) {
      throw new Error('Supporter not found or access denied');
    }
    
    // Return updated supporter
    return this.getSupporterById(supporterId, clubId);
  }

  /**
   * Unarchive a supporter (restore from archived state)
   */
  async unarchiveSupporter(supporterId, clubId) {
    const result = await database.execute(
      `UPDATE ${this.prefix}supporters 
       SET is_archived = FALSE 
       WHERE id = ? AND club_id = ?`,
      [supporterId, clubId]
    );
    
    if (result.affectedRows === 0) {
      throw new Error('Supporter not found or access denied');
    }
    
    // Return updated supporter
    return this.getSupporterById(supporterId, clubId);
  }


/**
 * Check if a supporter has any related records
 * Currently only checking communications table
 */
async hasRelatedRecords(supporterId) {
  console.log('[hasRelatedRecords] Starting check for supporterId:', supporterId);
  console.log('[hasRelatedRecords] Table prefix:', this.prefix);
  console.log('[hasRelatedRecords] Full table name:', `${this.prefix}communications`);
  
  try {
    // Check communications
    const commRows = await database.execute(
      `SELECT COUNT(*) as count FROM ${this.prefix}communications WHERE supporter_id = ?`,
      [supporterId]
    );
    
    console.log('[hasRelatedRecords] Raw commRows result:', commRows);
    console.log('[hasRelatedRecords] Is commRows an array?', Array.isArray(commRows));
    console.log('[hasRelatedRecords] commRows length:', commRows?.length);
    console.log('[hasRelatedRecords] First row:', commRows?.[0]);
    
  const commCount = (Array.isArray(commRows) && commRows[0] && commRows[0][0]) 
  ? commRows[0][0].count 
  : 0;
    
    console.log('[hasRelatedRecords] Final commCount:', commCount);
    console.log('[hasRelatedRecords] Has records?', commCount > 0);
    
    return commCount > 0;
  } catch (error) {
    console.error('[hasRelatedRecords] Error checking records:', error);
    // If there's an error, be safe and assume there ARE records (prevent deletion)
    return true;
  }
}

  // ---------------------------------------------------------------------------
  // Analytics / Comms (unchanged from your version)
  // ---------------------------------------------------------------------------
  async getDonorStats(clubId) {
    const relationshipRows = await database.execute(
      `SELECT relationship_strength, COUNT(*) as count
       FROM ${this.prefix}supporters
       WHERE club_id = ? AND type = 'donor'
       GROUP BY relationship_strength`,
      [clubId]
    );

    const lifecycleRows = await database.execute(
      `SELECT lifecycle_stage, COUNT(*) as count
       FROM ${this.prefix}supporters
       WHERE club_id = ? AND type = 'donor'
       GROUP BY lifecycle_stage`,
      [clubId]
    );

    const totalRows = await database.execute(
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

    const recentRows = await database.execute(
      `SELECT COUNT(*) as new_donors_this_month
       FROM ${this.prefix}supporters
       WHERE club_id = ? AND type = 'donor'
       AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      [clubId]
    );

    const totals = Array.isArray(totalRows) && totalRows.length > 0 ? totalRows[0] : {};
    const recent = Array.isArray(recentRows) && recentRows.length > 0 ? recentRows[0] : {};

    return {
      total_donors: totals.total_donors || 0,
      active_donors: totals.active_donors || 0,
      recent_donors: totals.recent_donors || 0,
      new_donors_this_month: recent.new_donors_this_month || 0,

      total_amount_raised: parseFloat(totals.total_amount_raised || 0),
      average_donor_value: parseFloat(totals.average_donor_value || 0),
      largest_donor_amount: parseFloat(totals.largest_donor_amount || 0),

      relationship_breakdown: relationshipRows || [],
      lifecycle_breakdown: lifecycleRows || [],
    };
  }

  async getTopDonors(clubId, limit = 10) {
    const rows = await database.execute(
      `SELECT * FROM ${this.prefix}supporters
       WHERE club_id = ? AND type = 'donor' AND total_donated > 0
       ORDER BY total_donated DESC
       LIMIT ?`,
      [clubId, limit]
    );

    return (rows || []).map((supporter) => this.parseJsonFields(supporter));
  }

  async getLapsedDonors(clubId, monthsThreshold = 12) {
    const rows = await database.execute(
      `SELECT * FROM ${this.prefix}supporters
       WHERE club_id = ? AND type = 'donor'
       AND total_donated > 0
       AND (last_donation_date IS NULL OR last_donation_date < DATE_SUB(NOW(), INTERVAL ? MONTH))
       ORDER BY last_donation_date DESC`,
      [clubId, monthsThreshold]
    );

    return (rows || []).map((supporter) => this.parseJsonFields(supporter));
  }

  async getDonorRetentionRate(clubId, timeframe = 12) {
    const previousPeriodRows = await database.execute(
      `SELECT COUNT(DISTINCT id) as previous_donors
       FROM ${this.prefix}supporters
       WHERE club_id = ? AND type = 'donor'
       AND last_donation_date BETWEEN DATE_SUB(NOW(), INTERVAL ? MONTH)
       AND DATE_SUB(NOW(), INTERVAL ? MONTH)`,
      [clubId, timeframe * 2, timeframe]
    );

    const retainedRows = await database.execute(
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
      retention_rate: previousDonors > 0 ? (retainedDonors / previousDonors) * 100 : 0,
      timeframe_months: timeframe,
    };
  }

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
      created_by,
    } = communicationData;

    const commId = uuidv4();

    const attachmentUrlsJson = attachment_urls && Array.isArray(attachment_urls) ? JSON.stringify(attachment_urls) : null;
    const tagsJson = tags && Array.isArray(tags) ? JSON.stringify(tags) : null;

    await database.execute(
      `INSERT INTO ${this.prefix}communications (
        id, club_id, supporter_id, type, direction, subject, notes,
        outcome, follow_up_required, follow_up_date, follow_up_notes,
        event_id, campaign_id, communication_channel, duration_minutes,
        attachment_urls, tags, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        commId,
        clubId,
        supporter_id,
        type,
        direction,
        subject || null,
        notes,
        outcome || 'neutral',
        follow_up_required || false,
        follow_up_date || null,
        follow_up_notes || null,
        event_id || null,
        campaign_id || null,
        communication_channel || null,
        duration_minutes || null,
        attachmentUrlsJson,
        tagsJson,
        created_by,
      ]
    );

    await database.execute(
      `UPDATE ${this.prefix}supporters SET last_contact_date = NOW() WHERE id = ? AND club_id = ?`,
      [supporter_id, clubId]
    );

    const rows = await database.execute(`SELECT * FROM ${this.prefix}communications WHERE id = ?`, [commId]);
    return Array.isArray(rows) && rows.length > 0 ? this.parseJsonFields(rows[0]) : null;
  }

  async getCommunicationHistory(supporterId, clubId, limit = 50) {
    const supporterIdStr = String(supporterId || '');
    const clubIdStr = String(clubId || '');
    const limitNum = parseInt(limit, 10) || 50;

    if (!supporterIdStr || !clubIdStr) return [];

    const sql = `SELECT c.*, u.name as created_by_name
                 FROM ${this.prefix}communications c
                 LEFT JOIN ${this.prefix}users u ON c.created_by = u.id
                 WHERE c.supporter_id = ? AND c.club_id = ?
                 ORDER BY c.created_at DESC
                 LIMIT ?`;

    const params = [supporterIdStr, clubIdStr, String(limitNum)];

    try {
      const [rows] = await database.connection.execute(sql, params);
      return (rows || []).map((comm) => this.parseJsonFields(comm));
    } catch (error) {
      console.error('getCommunicationHistory SQL error:', error);
      return [];
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

    if (overdue) query += ' AND c.follow_up_date < CURDATE()';
    else query += ' AND c.follow_up_date >= CURDATE()';

    query += ' ORDER BY c.follow_up_date ASC';

    const rows = await database.execute(query, params);
    return (rows || []).map((task) => this.parseJsonFields(task));
  }

  parseJsonFields(supporter) {
    if (!supporter) return supporter;

    try {
      if (supporter.tags && typeof supporter.tags === 'string') supporter.tags = JSON.parse(supporter.tags);
      if (supporter.interests && typeof supporter.interests === 'string') supporter.interests = JSON.parse(supporter.interests);
      if (supporter.skills && typeof supporter.skills === 'string') supporter.skills = JSON.parse(supporter.skills);
      if (supporter.communication_preferences && typeof supporter.communication_preferences === 'string') {
        supporter.communication_preferences = JSON.parse(supporter.communication_preferences);
      }
      if (supporter.attachment_urls && typeof supporter.attachment_urls === 'string') supporter.attachment_urls = JSON.parse(supporter.attachment_urls);
    } catch (e) {
      console.warn('JSON parsing failed:', e.message);
    }

    supporter.tags = supporter.tags || [];
    supporter.interests = supporter.interests || [];
    supporter.skills = supporter.skills || [];

    return supporter;
  }

  async getSupporterStats(clubId) {
    const donorStats = await this.getDonorStats(clubId);

    const typeRows = await database.execute(
      `SELECT type, COUNT(*) as count
       FROM ${this.prefix}supporters
       WHERE club_id = ?
       GROUP BY type`,
      [clubId]
    );

    const totalRows = await database.execute(
      `SELECT COUNT(*) as total_supporters FROM ${this.prefix}supporters WHERE club_id = ?`,
      [clubId]
    );

    const totalSupporters = Array.isArray(totalRows) ? totalRows[0].total_supporters : 0;

    const typeBreakdown = { volunteer: 0, donor: 0, sponsor: 0 };
    if (Array.isArray(typeRows)) {
      typeRows.forEach((row) => {
        typeBreakdown[row.type] = row.count;
      });
    }

    return {
      ...donorStats,
      total_supporters: totalSupporters,
      breakdown_by_type: typeBreakdown,
      type_details: typeRows || [],
    };
  }

  async calculateSupporterTotalContributions(supporterId) {
    try {
      const [prizeRows] = await database.connection.execute(
        `SELECT COALESCE(SUM(value), 0) as prize_total
         FROM ${this.prefix}prizes
         WHERE donated_by = ? AND confirmed = true`,
        [supporterId]
      );

      let donationTotal = 0;
      let sponsorshipTotal = 0;

      try {
        const [donationRows] = await database.connection.execute(
          `SELECT COALESCE(SUM(amount), 0) as donation_total
           FROM ${this.prefix}income
           WHERE supporter_id = ? AND payment_method IN ('donation', 'cash', 'card', 'transfer')`,
          [supporterId]
        );

        const [sponsorshipRows] = await database.connection.execute(
          `SELECT COALESCE(SUM(amount), 0) as sponsorship_total
           FROM ${this.prefix}income
           WHERE supporter_id = ? AND payment_method = 'sponsorship'`,
          [supporterId]
        );

        donationTotal = parseFloat(donationRows[0]?.donation_total || 0);
        sponsorshipTotal = parseFloat(sponsorshipRows[0]?.sponsorship_total || 0);
      } catch (incomeError) {
        const [supporterRows] = await database.connection.execute(
          `SELECT COALESCE(total_donated, 0) as stored_donations
           FROM ${this.prefix}supporters
           WHERE id = ?`,
          [supporterId]
        );

        donationTotal = parseFloat(supporterRows[0]?.stored_donations || 0);
        sponsorshipTotal = 0;
      }

      const prizeTotal = parseFloat(prizeRows[0]?.prize_total || 0);

      return {
        monetary_donations: donationTotal,
        prize_donations: prizeTotal,
        sponsorships: sponsorshipTotal,
        total_contributions: prizeTotal + donationTotal + sponsorshipTotal,
      };
    } catch (error) {
      console.error('Error calculating supporter contributions:', error);
      return { monetary_donations: 0, prize_donations: 0, sponsorships: 0, total_contributions: 0 };
    }
  }

  async bulkCreateSupporters(clubId, supportersData) {
    const successful = [];
    const errors = [];
    const duplicates = [];

    for (let i = 0; i < supportersData.length; i++) {
      try {
        const result = await this.createSupporter(clubId, supportersData[i]);
        if (result.isDuplicate) duplicates.push(result.supporter);
        else successful.push(result.supporter);
      } catch (error) {
        errors.push({ index: i, data: supportersData[i], error: error.message });
      }
    }

    return {
      successful,
      duplicates,
      errors,
      total_processed: supportersData.length,
      successful_count: successful.length,
      duplicate_count: duplicates.length,
      error_count: errors.length,
    };
  }

  async exportSupporters(clubId, filters = {}) {
    const supporters = await this.getSupportersByClub(clubId, filters);

    return supporters.map((supporter) => ({
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
      created_at: supporter.created_at,
    }));
  }
}

export default SupporterService;

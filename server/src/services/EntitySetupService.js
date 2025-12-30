// server/src/services/EntitySetupService.js
import database from '../config/database.js';
import config from '../config/environment.js';
import { v4 as uuidv4 } from 'uuid';

class EntitySetupService {
  constructor() {
    this.prefix = config.DB_TABLE_PREFIX;
  }

  // ---- Helpers ----
  _safeJsonParse(value, fallback = null) {
    if (!value) return fallback;
    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch (e) {
      return fallback;
    }
  }

  _safeJsonParseArray(value, fallback = []) {
    if (!value) return fallback;
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      return Array.isArray(parsed) ? parsed : fallback;
    } catch (e) {
      return fallback;
    }
  }

  _hydrateEntityRow(row) {
    if (!row) return row;

    // Parse JSON fields
    row.trading_names = this._safeJsonParseArray(row.trading_names, []);

    // Convert boolean fields
    row.ie_revenue_sports_body = Boolean(row.ie_revenue_sports_body);
    row.uk_casc_registered = Boolean(row.uk_casc_registered);
    row.is_registered_charity = Boolean(row.is_registered_charity);
    row.is_registered_company = Boolean(row.is_registered_company);
    row.registration_verified = Boolean(row.registration_verified);

    return row;
  }

  // ---- Entity Type Management ----
  
  /**
   * Set entity type for a club (first step of onboarding)
   */
  async setEntityType(clubId, entityType) {
    const [result] = await database.connection.execute(
      `UPDATE ${this.prefix}clubs 
       SET entity_type = ?, 
           onboarding_status = 'entity_setup'
       WHERE id = ?`,
      [entityType, clubId]
    );

    if (result.affectedRows === 0) {
      throw new Error('Club not found');
    }

    return { success: true, entityType };
  }

  /**
   * Get club's current entity type and onboarding status
   */
  async getClubOnboardingStatus(clubId) {
    const [rows] = await database.connection.execute(
      `SELECT id, entity_type, onboarding_status, onboarding_completed_at
       FROM ${this.prefix}clubs 
       WHERE id = ?`,
      [clubId]
    );

    if (rows.length === 0) {
      throw new Error('Club not found');
    }

    return rows[0];
  }

  // ---- Entity Details CRUD ----

  /**
   * Create entity details (Phase 2 submission)
   */
  async createEntityDetails(clubId, userId, data) {
    const id = uuidv4();

    // Normalize trading names
    const tradingNames = Array.isArray(data.tradingNames) 
      ? data.tradingNames.filter(name => name && name.trim())
      : [];

    const insertData = {
      id,
      club_id: clubId,
      legal_name: data.legalName.trim(),
      trading_names: JSON.stringify(tradingNames),
      description: data.description?.trim() || null,
      founded_year: data.foundedYear || null,
      
      // Address
      address_line1: data.addressLine1?.trim() || null,
      address_line2: data.addressLine2?.trim() || null,
      city: data.city?.trim() || null,
      county_state: data.countyState?.trim() || null,
      postal_code: data.postalCode?.trim() || null,
      country: data.country,
      
      // Legal structure
      legal_structure: data.legalStructure || 'unincorporated_association',
      
      // Ireland registrations
      ie_cro_number: data.ieCroNumber?.trim() || null,
      ie_charity_chy: data.ieCharityChyNumber?.trim() || null,
      ie_charity_rcn: data.ieCharityRcn?.trim() || null,
      ie_revenue_sports_body: data.ieRevenueSportsBody ? 1 : 0,
      
      // UK registrations
      uk_company_number: data.ukCompanyNumber?.trim() || null,
      uk_charity_england_wales: data.ukCharityEnglandWales?.trim() || null,
      uk_charity_scotland: data.ukCharityScotland?.trim() || null,
      uk_charity_ni: data.ukCharityNi?.trim() || null,
      uk_casc_registered: data.ukCascRegistered ? 1 : 0,
      
      // Derived flags
      is_registered_charity: this._isRegisteredCharity(data) ? 1 : 0,
      is_registered_company: this._isRegisteredCompany(data) ? 1 : 0,
    };

    await database.connection.execute(
      `INSERT INTO ${this.prefix}entity_details (
        id, club_id, legal_name, trading_names, description, founded_year,
        address_line1, address_line2, city, county_state, postal_code, country,
        legal_structure, ie_cro_number, ie_charity_chy, ie_charity_rcn, ie_revenue_sports_body,
        uk_company_number, uk_charity_england_wales, uk_charity_scotland, uk_charity_ni, uk_casc_registered,
        is_registered_charity, is_registered_company
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        insertData.id,
        insertData.club_id,
        insertData.legal_name,
        insertData.trading_names,
        insertData.description,
        insertData.founded_year,
        insertData.address_line1,
        insertData.address_line2,
        insertData.city,
        insertData.county_state,
        insertData.postal_code,
        insertData.country,
        insertData.legal_structure,
        insertData.ie_cro_number,
        insertData.ie_charity_chy,
        insertData.ie_charity_rcn,
        insertData.ie_revenue_sports_body,
        insertData.uk_company_number,
        insertData.uk_charity_england_wales,
        insertData.uk_charity_scotland,
        insertData.uk_charity_ni,
        insertData.uk_casc_registered,
        insertData.is_registered_charity,
        insertData.is_registered_company
      ]
    );

    // Update club onboarding status
    await database.connection.execute(
      `UPDATE ${this.prefix}clubs 
       SET onboarding_status = 'pending_verification'
       WHERE id = ?`,
      [clubId]
    );

    return this.getEntityDetails(clubId);
  }

  /**
   * Update entity details (only if not yet verified)
   */
  async updateEntityDetails(clubId, userId, data) {
    // Check if already verified
    const current = await this.getEntityDetails(clubId);
    
    if (!current) {
      throw new Error('Entity details not found');
    }

    if (current.registration_verified) {
      throw new Error('Cannot update verified entity details. Contact support for changes.');
    }

    const updateFields = {};

    if (data.legalName !== undefined) {
      updateFields.legal_name = data.legalName.trim();
    }

    if (data.tradingNames !== undefined) {
      const tradingNames = Array.isArray(data.tradingNames) 
        ? data.tradingNames.filter(name => name && name.trim())
        : [];
      updateFields.trading_names = JSON.stringify(tradingNames);
    }

    if (data.description !== undefined) {
      updateFields.description = data.description?.trim() || null;
    }

    if (data.foundedYear !== undefined) {
      updateFields.founded_year = data.foundedYear || null;
    }

    // Address updates
    if (data.addressLine1 !== undefined) updateFields.address_line1 = data.addressLine1?.trim() || null;
    if (data.addressLine2 !== undefined) updateFields.address_line2 = data.addressLine2?.trim() || null;
    if (data.city !== undefined) updateFields.city = data.city?.trim() || null;
    if (data.countyState !== undefined) updateFields.county_state = data.countyState?.trim() || null;
    if (data.postalCode !== undefined) updateFields.postal_code = data.postalCode?.trim() || null;
    if (data.country !== undefined) updateFields.country = data.country;

    // Legal structure
    if (data.legalStructure !== undefined) {
      updateFields.legal_structure = data.legalStructure;
    }

    // Ireland registrations
    if (data.ieCroNumber !== undefined) updateFields.ie_cro_number = data.ieCroNumber?.trim() || null;
    if (data.ieCharityChyNumber !== undefined) updateFields.ie_charity_chy = data.ieCharityChyNumber?.trim() || null;
    if (data.ieCharityRcn !== undefined) updateFields.ie_charity_rcn = data.ieCharityRcn?.trim() || null;
    if (data.ieRevenueSportsBody !== undefined) updateFields.ie_revenue_sports_body = data.ieRevenueSportsBody ? 1 : 0;

    // UK registrations
    if (data.ukCompanyNumber !== undefined) updateFields.uk_company_number = data.ukCompanyNumber?.trim() || null;
    if (data.ukCharityEnglandWales !== undefined) updateFields.uk_charity_england_wales = data.ukCharityEnglandWales?.trim() || null;
    if (data.ukCharityScotland !== undefined) updateFields.uk_charity_scotland = data.ukCharityScotland?.trim() || null;
    if (data.ukCharityNi !== undefined) updateFields.uk_charity_ni = data.ukCharityNi?.trim() || null;
    if (data.ukCascRegistered !== undefined) updateFields.uk_casc_registered = data.ukCascRegistered ? 1 : 0;

    // Recalculate derived flags if registration data changed
    const mergedData = { ...current, ...data };
    updateFields.is_registered_charity = this._isRegisteredCharity(mergedData) ? 1 : 0;
    updateFields.is_registered_company = this._isRegisteredCompany(mergedData) ? 1 : 0;

    if (Object.keys(updateFields).length === 0) {
      throw new Error('No valid fields to update');
    }

    // Add updated timestamp
    updateFields.updated_at = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Build SET clause dynamically
    const fieldNames = Object.keys(updateFields);
    const setClause = fieldNames.map(field => `${field} = ?`).join(', ');
    const values = fieldNames.map(field => updateFields[field]);
    
    // Add WHERE clause parameters
    values.push(clubId);

    await database.connection.execute(
      `UPDATE ${this.prefix}entity_details SET ${setClause} WHERE club_id = ?`,
      values
    );

    // Update club onboarding status to pending_verification
    await database.connection.execute(
      `UPDATE ${this.prefix}clubs 
       SET onboarding_status = 'pending_verification'
       WHERE id = ?`,
      [clubId]
    );

    return this.getEntityDetails(clubId);
  }

  /**
   * Get entity details for a club
   */
  async getEntityDetails(clubId) {
    const [rows] = await database.connection.execute(
      `SELECT * FROM ${this.prefix}entity_details WHERE club_id = ?`,
      [clubId]
    );

    if (rows.length === 0) {
      return null;
    }

    return this._hydrateEntityRow(rows[0]);
  }

  /**
   * Delete entity details (only if not verified)
   */
  async deleteEntityDetails(clubId) {
    const current = await this.getEntityDetails(clubId);
    
    if (!current) {
      return false;
    }

    if (current.registration_verified) {
      throw new Error('Cannot delete verified entity details');
    }

    const [result] = await database.connection.execute(
      `DELETE FROM ${this.prefix}entity_details WHERE club_id = ?`,
      [clubId]
    );

    // Reset club onboarding status
    await database.connection.execute(
      `UPDATE ${this.prefix}clubs 
       SET onboarding_status = 'entity_setup'
       WHERE id = ?`,
      [clubId]
    );

    return result.affectedRows > 0;
  }

  // ---- Validation Helpers ----

  /**
   * Validate registration number formats
   */
  validateRegistrationNumber(type, value) {
    if (!value) return true; // Optional fields

    const validators = {
      // Ireland
      ieCroNumber: /^[A-Z]?\d{5,6}$/,
      ieCharityChyNumber: /^CHY\d{4,5}$/i,
      ieCharityRcn: /^20\d{6}$/,
      
      // UK
      ukCompanyNumber: /^([A-Z]{2}\d{6}|\d{8})$/,
      ukCharityEnglandWales: /^\d{6,7}$/,
      ukCharityScotland: /^SC\d{6}$/i,
      ukCharityNi: /^NIC\d{6}$/i,
    };

    const validator = validators[type];
    return validator ? validator.test(value) : true;
  }

  /**
   * Check if entity has charity registration
   */
  _isRegisteredCharity(data) {
    return Boolean(
      data.ieCharityChyNumber ||
      data.ieCharityRcn ||
      data.ukCharityEnglandWales ||
      data.ukCharityScotland ||
      data.ukCharityNi
    );
  }

  /**
   * Check if entity has company registration
   */
  _isRegisteredCompany(data) {
    return Boolean(
      data.ieCroNumber ||
      data.ukCompanyNumber
    );
  }

  /**
   * Validate entity setup data
   */
  validateEntityData(data, country) {
    const errors = [];

    // Required fields
    if (!data.legalName?.trim()) {
      errors.push('Legal name is required');
    }

    if (!data.country) {
      errors.push('Country is required');
    }

    if (data.country && data.country !== 'IE' && data.country !== 'GB') {
      errors.push('Country must be either IE (Ireland) or GB (United Kingdom)');
    }

    // Address validation (required for verification)
    if (!data.addressLine1?.trim()) {
      errors.push('Address line 1 is required');
    }

    if (!data.city?.trim()) {
      errors.push('City is required');
    }

    if (!data.postalCode?.trim()) {
      errors.push('Postal code is required');
    }

    // Founded year validation
    if (data.foundedYear) {
      const year = parseInt(data.foundedYear);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1800 || year > currentYear) {
        errors.push(`Founded year must be between 1800 and ${currentYear}`);
      }
    }

    // Registration number format validation
    if (data.ieCroNumber && !this.validateRegistrationNumber('ieCroNumber', data.ieCroNumber)) {
      errors.push('Invalid CRO number format (expected: 123456 or A12345)');
    }

    if (data.ieCharityChyNumber && !this.validateRegistrationNumber('ieCharityChyNumber', data.ieCharityChyNumber)) {
      errors.push('Invalid CHY number format (expected: CHY12345)');
    }

    if (data.ieCharityRcn && !this.validateRegistrationNumber('ieCharityRcn', data.ieCharityRcn)) {
      errors.push('Invalid RCN format (expected: 20123456)');
    }

    if (data.ukCompanyNumber && !this.validateRegistrationNumber('ukCompanyNumber', data.ukCompanyNumber)) {
      errors.push('Invalid Companies House number format (expected: 12345678 or AB123456)');
    }

    if (data.ukCharityEnglandWales && !this.validateRegistrationNumber('ukCharityEnglandWales', data.ukCharityEnglandWales)) {
      errors.push('Invalid Charity Commission number format (expected: 1234567)');
    }

    if (data.ukCharityScotland && !this.validateRegistrationNumber('ukCharityScotland', data.ukCharityScotland)) {
      errors.push('Invalid OSCR number format (expected: SC012345)');
    }

    if (data.ukCharityNi && !this.validateRegistrationNumber('ukCharityNi', data.ukCharityNi)) {
      errors.push('Invalid CCNI number format (expected: NIC101234)');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Calculate completeness score for entity setup
   */
  calculateCompleteness(entityDetails) {
    if (!entityDetails) return 0;

    let score = 0;
    const weights = {
      basicInfo: 30,      // Legal name, description, founded year
      address: 20,        // Full address
      legalStructure: 10, // Legal structure selected
      registration: 40,   // Has any registration number
    };

    // Basic info (30%)
    let basicScore = 0;
    if (entityDetails.legal_name) basicScore += 15;
    if (entityDetails.description) basicScore += 10;
    if (entityDetails.founded_year) basicScore += 5;
    score += basicScore;

    // Address (20%)
    let addressScore = 0;
    if (entityDetails.address_line1) addressScore += 8;
    if (entityDetails.city) addressScore += 6;
    if (entityDetails.postal_code) addressScore += 6;
    score += addressScore;

    // Legal structure (10%)
    if (entityDetails.legal_structure && entityDetails.legal_structure !== 'other') {
      score += 10;
    }

    // Registration (40%)
    const hasRegistration = Boolean(
      entityDetails.ie_cro_number ||
      entityDetails.ie_charity_chy ||
      entityDetails.ie_charity_rcn ||
      entityDetails.uk_company_number ||
      entityDetails.uk_charity_england_wales ||
      entityDetails.uk_charity_scotland ||
      entityDetails.uk_charity_ni
    );

    if (hasRegistration) {
      score += 40;
    }

    return Math.round(score);
  }

  // ---- Verification (Admin only) ----

  /**
   * Verify entity details (admin function)
   */
  async verifyEntity(clubId, verifiedBy, notes = null) {
    const entityDetails = await this.getEntityDetails(clubId);

    if (!entityDetails) {
      throw new Error('Entity details not found');
    }

    if (entityDetails.registration_verified) {
      throw new Error('Entity already verified');
    }

    // Update entity details
    await database.connection.execute(
      `UPDATE ${this.prefix}entity_details 
       SET registration_verified = 1,
           verified_at = NOW(),
           verified_by = ?,
           verification_notes = ?
       WHERE club_id = ?`,
      [verifiedBy, notes, clubId]
    );

    // Update club status to verified
    await database.connection.execute(
      `UPDATE ${this.prefix}clubs 
       SET onboarding_status = 'verified',
           onboarding_completed_at = NOW()
       WHERE id = ?`,
      [clubId]
    );

    return this.getEntityDetails(clubId);
  }

  /**
   * Reject entity verification (admin function)
   */
  async rejectEntity(clubId, verifiedBy, notes) {
    const entityDetails = await this.getEntityDetails(clubId);

    if (!entityDetails) {
      throw new Error('Entity details not found');
    }

    // Add verification notes but don't verify
    await database.connection.execute(
      `UPDATE ${this.prefix}entity_details 
       SET verification_notes = ?,
           updated_at = NOW()
       WHERE club_id = ?`,
      [notes, clubId]
    );

    // Keep status as pending_verification
    return this.getEntityDetails(clubId);
  }

  /**
   * Get all clubs pending verification (admin function)
   */
  async getPendingVerifications(limit = 50, offset = 0) {
    const [rows] = await database.connection.execute(
      `SELECT 
        c.id,
        c.name,
        c.email,
        c.entity_type,
        c.onboarding_status,
        c.created_at,
        ed.*
       FROM ${this.prefix}clubs c
       LEFT JOIN ${this.prefix}entity_details ed ON c.id = ed.club_id
       WHERE c.onboarding_status = 'pending_verification'
       ORDER BY ed.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    return rows.map(row => this._hydrateEntityRow(row));
  }
}

export default EntitySetupService;
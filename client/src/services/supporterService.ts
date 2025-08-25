// /client/src/services/SupporterService.ts
// Dedicated service for supporter and donor CRM functionality

import BaseService from './baseServices';

export interface CreateSupporterData {
  // Core fields
  name: string;
  type: 'volunteer' | 'donor' | 'sponsor';
  notes?: string;
  
  // Contact information
  email?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  preferred_contact_method?: 'email' | 'phone' | 'post' | 'sms';
  
  // Relationship management
  relationship_strength?: 'prospect' | 'new' | 'regular' | 'major' | 'lapsed' | 'inactive';
  contact_source?: 'website' | 'event' | 'referral' | 'social_media' | 'cold_outreach' | 'walk_in' | 'other';
  referral_source?: string;
  
  // Communication preferences
  email_subscribed?: boolean;
  sms_subscribed?: boolean;
  newsletter_subscribed?: boolean;
  event_notifications?: boolean;
  do_not_contact?: boolean;
  
  // Lifecycle & Priority
  lifecycle_stage?: 'prospect' | 'first_time' | 'repeat' | 'major' | 'lapsed' | 'champion';
  priority_level?: 'low' | 'medium' | 'high' | 'urgent';
  next_contact_date?: string;
  
  // Flexible data
  tags?: string[];
  interests?: string[];
  skills?: string[];
  communication_preferences?: Record<string, any>;
  
  // GDPR
  gdpr_consent?: boolean;
  data_protection_notes?: string;
}

export interface SupporterFilters {
  type?: 'volunteer' | 'donor' | 'sponsor';
  search?: string;
  relationship_strength?: 'prospect' | 'new' | 'regular' | 'major' | 'lapsed' | 'inactive';
  lifecycle_stage?: 'prospect' | 'first_time' | 'repeat' | 'major' | 'lapsed' | 'champion';
  priority_level?: 'low' | 'medium' | 'high' | 'urgent';
  limit?: number;
  offset?: number;
}

export interface DonorStats {
  // Overview metrics
  total_donors: number;
  active_donors: number;
  recent_donors: number;
  new_donors_this_month: number;
  
  // Financial metrics
  total_amount_raised: number;
  average_donor_value: number;
  largest_donor_amount: number;
  
  // Segmentation
  relationship_breakdown: Array<{ relationship_strength: string; count: number }>;
  lifecycle_breakdown: Array<{ lifecycle_stage: string; count: number }>;
}

export interface RetentionAnalysis {
  previous_period_donors: number;
  retained_donors: number;
  retention_rate: number;
  timeframe_months: number;
}

class SupporterService extends BaseService {
  // ===== SUPPORTER CRUD OPERATIONS =====

  /**
   * Create a new supporter with full CRM data
   */
  async createSupporter(clubId: string, supporterData: CreateSupporterData) {
    return this.request<{ message: string; supporter: any }>(`/clubs/${clubId}/supporters`, {
      method: 'POST',
      body: JSON.stringify(supporterData),
    });
  }

  /**
   * Get all supporters for a club with advanced filtering
   */
  async getSupporters(clubId: string, filters?: SupporterFilters) {
    const params = filters ? `?${this.buildQueryString(filters)}` : '';
    return this.request<{ 
      supporters: any[]; 
      total: number; 
      filters_applied: SupporterFilters;
    }>(`/clubs/${clubId}/supporters${params}`);
  }

  /**
   * Get supporters by club - alias for getSupporters for backward compatibility
   */
  async getSupportersByClub(clubId: string, filters?: SupporterFilters) {
    return this.getSupporters(clubId, filters);
  }

  /**
   * Get a specific supporter with full details
   */
  async getSupporterDetails(supporterId: string) {
    return this.request<{ supporter: any }>(`/supporters/${supporterId}`);
  }

  /**
   * Update a supporter with new CRM data
   */
  async updateSupporter(supporterId: string, updates: Partial<CreateSupporterData>) {
    return this.request<{ message: string; supporter: any }>(`/supporters/${supporterId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete a supporter (with relationship checks)
   */
  async deleteSupporter(supporterId: string) {
    return this.request<{ message: string }>(`/supporters/${supporterId}`, {
      method: 'DELETE',
    });
  }

  // ===== DONOR ANALYTICS =====

  /**
   * Get comprehensive donor statistics and segmentation
   */
  async getDonorStats(clubId: string) {
    return this.request<{ 
      donor_statistics: DonorStats; 
      generated_at: string;
    }>(`/clubs/${clubId}/supporters/donor-stats`);
  }

  /**
   * Get top donors by total contribution
   */
  async getTopDonors(clubId: string, limit: number = 10) {
    return this.request<{ 
      top_donors: any[]; 
      limit: number;
    }>(`/clubs/${clubId}/supporters/top-donors?limit=${limit}`);
  }

  /**
   * Get lapsed donors for retention campaigns
   */
  async getLapsedDonors(clubId: string, months: number = 12) {
    return this.request<{ 
      lapsed_donors: any[]; 
      threshold_months: number; 
      total_lapsed: number;
    }>(`/clubs/${clubId}/supporters/lapsed-donors?months=${months}`);
  }

  /**
   * Calculate donor retention rate over time
   */
  async getDonorRetentionRate(clubId: string, timeframe: number = 12) {
    return this.request<{ 
      retention_analysis: RetentionAnalysis; 
      analysis_date: string;
    }>(`/clubs/${clubId}/supporters/retention-rate?timeframe=${timeframe}`);
  }

  // ===== SUPPORTER SEGMENTATION =====

  /**
   * Get supporters by type (volunteer, donor, sponsor)
   */
  async getSupportersByType(clubId: string, type: 'volunteer' | 'donor' | 'sponsor') {
    return this.request<{ 
      supporters: any[]; 
      type: string; 
      total: number;
    }>(`/clubs/${clubId}/supporters/type/${type}`);
  }

  /**
   * Get supporters by relationship strength
   */
  async getSupportersByRelationship(clubId: string, strength: 'prospect' | 'new' | 'regular' | 'major' | 'lapsed' | 'inactive') {
    return this.request<{ 
      supporters: any[]; 
      relationship_strength: string; 
      total: number;
    }>(`/clubs/${clubId}/supporters/relationship/${strength}`);
  }

  /**
   * Get supporters by lifecycle stage
   */
  async getSupportersByLifecycle(clubId: string, stage: 'prospect' | 'first_time' | 'repeat' | 'major' | 'lapsed' | 'champion') {
    return this.request<{ 
      supporters: any[]; 
      lifecycle_stage: string; 
      total: number;
    }>(`/clubs/${clubId}/supporters/lifecycle/${stage}`);
  }

  /**
   * Search supporters with advanced filters
   */
  async searchSupporters(clubId: string, query: string, filters?: Omit<SupporterFilters, 'search'>) {
    const params = this.buildQueryString({ q: query, ...filters });
    
    return this.request<{ 
      search_results: any[]; 
      query: string; 
      filters: any; 
      total_results: number;
    }>(`/clubs/${clubId}/supporters/search?${params}`);
  }

  // ===== SPECIALIZED SUPPORTER QUERIES =====

  /**
   * Get available volunteers for events
   */
  async getAvailableVolunteers(clubId: string, eventId?: string) {
    const params = eventId ? `?event_id=${eventId}` : '';
    return this.request<{ 
      available_volunteers: any[]; 
      event_id: string | null; 
      total: number;
    }>(`/clubs/${clubId}/supporters/available-volunteers${params}`);
  }

  /**
   * Get supporter engagement details and metrics
   */
  async getSupporterEngagement(supporterId: string) {
    return this.request<{ 
      engagement_report: any; 
      generated_at: string;
    }>(`/supporters/${supporterId}/engagement`);
  }

  /**
   * Get comprehensive supporter statistics
   */
  async getSupporterStats(clubId: string) {
    return this.request<{ 
      supporter_statistics: any; 
      generated_at: string;
    }>(`/clubs/${clubId}/supporters/stats`);
  }

  // ===== BULK OPERATIONS =====

  /**
   * Bulk create supporters (max 100 at once)
   */
  async bulkCreateSupporters(clubId: string, supporters: CreateSupporterData[]) {
    if (supporters.length > 100) {
      throw new Error('Maximum 100 supporters can be created at once');
    }
    
    return this.request<{ 
      message: string; 
      result: {
        successful: any[];
        errors: any[];
        total_processed: number;
        successful_count: number;
        error_count: number;
      };
    }>(`/clubs/${clubId}/supporters/bulk`, {
      method: 'POST',
      body: JSON.stringify({ supporters }),
    });
  }

  /**
   * Export supporters with filtering options
   */
  async exportSupporters(clubId: string, filters?: SupporterFilters & { format?: 'csv' }) {
    const params = filters ? `?${this.buildQueryString(filters)}` : '';
    return this.request<{ 
      export_data: any[]; 
      filename: string; 
      total_records: number; 
      export_format: string; 
      filters_applied: any; 
      generated_at: string;
    }>(`/clubs/${clubId}/supporters/export${params}`);
  }

  // ===== FOLLOW-UP TASK MANAGEMENT =====

  /**
   * Get follow-up tasks for the club
   */
  async getFollowUpTasks(clubId: string, overdue: boolean = false) {
    return this.request<{ 
      follow_up_tasks: any[]; 
      is_overdue_filter: boolean; 
      total_tasks: number;
    }>(`/clubs/${clubId}/follow-up-tasks?overdue=${overdue}`);
  }

  // ===== HELPER METHODS =====

  /**
   * Validate supporter data before submission
   */
  validateSupporterData(data: CreateSupporterData): string[] {
    const errors: string[] = [];

    if (!data.name?.trim()) {
      errors.push('Supporter name is required');
    }

    if (!data.type) {
      errors.push('Supporter type is required');
    }

    if (data.email && !this.isValidEmail(data.email)) {
      errors.push('Invalid email format');
    }

    if (data.phone && !this.isValidPhone(data.phone)) {
      errors.push('Invalid phone number format');
    }

    return errors;
  }

  /**
   * Format supporter data for display
   */
  formatSupporterForDisplay(supporter: any) {
    return {
      ...supporter,
      full_address: this.formatAddress(supporter),
      formatted_phone: this.formatPhoneNumber(supporter.phone),
      display_name: supporter.name,
      relationship_badge: this.getRelationshipBadge(supporter.relationship_strength),
      lifecycle_badge: this.getLifecycleBadge(supporter.lifecycle_stage),
    };
  }

  private formatAddress(supporter: any): string {
    const parts = [
      supporter.address_line1,
      supporter.address_line2,
      supporter.city,
      supporter.state_province,
      supporter.postal_code,
      supporter.country
    ].filter(Boolean);
    
    return parts.join(', ');
  }

  private formatPhoneNumber(phone?: string): string {
    if (!phone) return '';
    
    // Basic phone formatting - you can enhance this based on your needs
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('44')) {
      return `+44 ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
    }
    return phone;
  }

  private getRelationshipBadge(strength?: string) {
    const badges = {
      prospect: { color: 'gray', label: 'Prospect' },
      new: { color: 'blue', label: 'New' },
      regular: { color: 'green', label: 'Regular' },
      major: { color: 'purple', label: 'Major Donor' },
      lapsed: { color: 'yellow', label: 'Lapsed' },
      inactive: { color: 'red', label: 'Inactive' }
    };
    return badges[strength as keyof typeof badges] || badges.prospect;
  }

  private getLifecycleBadge(stage?: string) {
    const badges = {
      prospect: { color: 'gray', label: 'Prospect' },
      first_time: { color: 'blue', label: 'First Time' },
      repeat: { color: 'green', label: 'Repeat' },
      major: { color: 'purple', label: 'Major' },
      lapsed: { color: 'yellow', label: 'Lapsed' },
      champion: { color: 'gold', label: 'Champion' }
    };
    return badges[stage as keyof typeof badges] || badges.prospect;
  }
}

// Export instance, not class
const supporterService = new SupporterService();
export default supporterService;
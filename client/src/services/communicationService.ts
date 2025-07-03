// /client/src/services/CommunicationService.ts
// Dedicated service for communication logging and interaction tracking

import BaseService from './baseServices';

export interface CreateCommunicationData {
  // Required fields
  type: 'call' | 'email' | 'meeting' | 'letter' | 'sms' | 'social_media' | 'event_interaction' | 'other';
  direction: 'inbound' | 'outbound';
  notes: string;
  
  // Optional details
  subject?: string;
  outcome?: 'positive' | 'neutral' | 'negative' | 'no_response' | 'callback_requested';
  
  // Follow-up management
  follow_up_required?: boolean;
  follow_up_date?: string;
  follow_up_notes?: string;
  
  // Context linking
  event_id?: string;
  campaign_id?: string;
  communication_channel?: string; // "phone", "email", "zoom", "in_person"
  
  // Additional metadata
  duration_minutes?: number;
  attachment_urls?: string[];
  tags?: string[];
}

export interface CommunicationFilters {
  type?: string;
  direction?: 'inbound' | 'outbound';
  outcome?: string;
  follow_up_required?: boolean;
  date_from?: string;
  date_to?: string;
  limit?: number;
}

export interface CommunicationSummary {
  total_communications: number;
  recent_communications: number;
  pending_follow_ups: number;
  communication_breakdown: Array<{ type: string; count: number }>;
  outcome_breakdown: Array<{ outcome: string; count: number }>;
  avg_response_time: number;
}

class CommunicationService extends BaseService {
  // ===== COMMUNICATION LOGGING =====

  /**
   * Log a new communication with a supporter
   */
  async logCommunication(supporterId: string, communicationData: CreateCommunicationData) {
    return this.request<{ 
      message: string; 
      communication: any;
    }>(`/supporters/${supporterId}/communications`, {
      method: 'POST',
      body: JSON.stringify(communicationData),
    });
  }

  /**
   * Get communication history for a supporter
   */
  async getCommunicationHistory(supporterId: string, limit: number = 50) {
    return this.request<{ 
      communications: any[]; 
      supporter_id: string; 
      total_retrieved: number;
    }>(`/supporters/${supporterId}/communications?limit=${limit}`);
  }

  /**
   * Update an existing communication record
   */
  async updateCommunication(communicationId: string, updates: Partial<CreateCommunicationData>) {
    return this.request<{ 
      message: string; 
      communication: any;
    }>(`/communications/${communicationId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete a communication record
   */
  async deleteCommunication(communicationId: string) {
    return this.request<{ message: string }>(`/communications/${communicationId}`, {
      method: 'DELETE',
    });
  }

  // ===== FOLLOW-UP TASK MANAGEMENT =====

  /**
   * Get all follow-up tasks for a club
   */
  async getFollowUpTasks(clubId: string, overdue: boolean = false) {
    return this.request<{ 
      follow_up_tasks: any[]; 
      is_overdue_filter: boolean; 
      total_tasks: number;
    }>(`/clubs/${clubId}/follow-up-tasks?overdue=${overdue}`);
  }

  /**
   * Mark a follow-up task as completed
   */
  async completeFollowUpTask(communicationId: string, completionNotes?: string) {
    return this.request<{ 
      message: string; 
      communication: any;
    }>(`/communications/${communicationId}/complete-follow-up`, {
      method: 'POST',
      body: JSON.stringify({ completion_notes: completionNotes }),
    });
  }

  /**
   * Reschedule a follow-up task
   */
  async rescheduleFollowUp(communicationId: string, newDate: string, reason?: string) {
    return this.request<{ 
      message: string; 
      communication: any;
    }>(`/communications/${communicationId}/reschedule-follow-up`, {
      method: 'POST',
      body: JSON.stringify({ 
        follow_up_date: newDate, 
        reschedule_reason: reason 
      }),
    });
  }

  // ===== COMMUNICATION ANALYTICS =====

  /**
   * Get communication summary and analytics for a club
   */
  async getCommunicationSummary(clubId: string, dateRange?: { from: string; to: string }) {
    const params = dateRange 
      ? `?date_from=${dateRange.from}&date_to=${dateRange.to}` 
      : '';
    
    return this.request<{ 
      communication_summary: CommunicationSummary; 
      date_range: any; 
      generated_at: string;
    }>(`/clubs/${clubId}/communications/summary${params}`);
  }

  /**
   * Get communication statistics by type
   */
  async getCommunicationStatsByType(clubId: string, timeframe: 'week' | 'month' | 'quarter' | 'year' = 'month') {
    return this.request<{ 
      statistics: Array<{ type: string; count: number; avg_duration: number }>; 
      timeframe: string;
    }>(`/clubs/${clubId}/communications/stats-by-type?timeframe=${timeframe}`);
  }

  /**
   * Get communication outcome analysis
   */
  async getCommunicationOutcomes(clubId: string, supporterType?: 'volunteer' | 'donor' | 'sponsor') {
    const params = supporterType ? `?supporter_type=${supporterType}` : '';
    return this.request<{ 
      outcome_analysis: Array<{ outcome: string; count: number; percentage: number }>; 
      supporter_type: string | null;
    }>(`/clubs/${clubId}/communications/outcomes${params}`);
  }

  // ===== COMMUNICATION TEMPLATES =====

  /**
   * Get communication templates for quick logging
   */
  async getCommunicationTemplates(clubId: string, type?: string) {
    const params = type ? `?type=${type}` : '';
    return this.request<{ 
      templates: Array<{ 
        id: string; 
        name: string; 
        type: string; 
        subject_template: string; 
        notes_template: string; 
      }>; 
    }>(`/clubs/${clubId}/communication-templates${params}`);
  }

  /**
   * Create a new communication template
   */
  async createCommunicationTemplate(clubId: string, templateData: {
    name: string;
    type: string;
    subject_template: string;
    notes_template: string;
    tags?: string[];
  }) {
    return this.request<{ 
      message: string; 
      template: any;
    }>(`/clubs/${clubId}/communication-templates`, {
      method: 'POST',
      body: JSON.stringify(templateData),
    });
  }

  // ===== BULK COMMUNICATION OPERATIONS =====

  /**
   * Log communications for multiple supporters (bulk)
   */
  async bulkLogCommunications(communications: Array<{
    supporter_id: string;
    communication_data: CreateCommunicationData;
  }>) {
    return this.request<{ 
      message: string; 
      result: {
        successful: any[];
        errors: any[];
        total_processed: number;
      };
    }>('/communications/bulk', {
      method: 'POST',
      body: JSON.stringify({ communications }),
    });
  }

  /**
   * Export communication history
   */
  async exportCommunications(clubId: string, filters?: CommunicationFilters & { format?: 'csv' }) {
    const params = filters ? `?${new URLSearchParams(filters as any).toString()}` : '';
    return this.request<{ 
      export_data: any[]; 
      filename: string; 
      total_records: number; 
      filters_applied: any;
    }>(`/clubs/${clubId}/communications/export${params}`);
  }

  // ===== HELPER METHODS =====

  /**
   * Validate communication data before submission
   */
  validateCommunicationData(data: CreateCommunicationData): string[] {
    const errors: string[] = [];

    if (!data.type) {
      errors.push('Communication type is required');
    }

    if (!data.direction) {
      errors.push('Communication direction is required');
    }

    if (!data.notes?.trim()) {
      errors.push('Communication notes are required');
    }

    if (data.follow_up_required && !data.follow_up_date) {
      errors.push('Follow-up date is required when follow-up is marked as required');
    }

    if (data.follow_up_date) {
      const followUpDate = new Date(data.follow_up_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (followUpDate < today) {
        errors.push('Follow-up date cannot be in the past');
      }
    }

    if (data.duration_minutes && data.duration_minutes < 0) {
      errors.push('Duration cannot be negative');
    }

    return errors;
  }

  /**
   * Format communication for display
   */
  formatCommunicationForDisplay(communication: any) {
    return {
      ...communication,
      formatted_date: this.formatDate(communication.created_at),
      formatted_duration: this.formatDuration(communication.duration_minutes),
      type_label: this.getCommunicationTypeLabel(communication.type),
      outcome_badge: this.getOutcomeBadge(communication.outcome),
      is_overdue: this.isFollowUpOverdue(communication.follow_up_date),
    };
  }

  /**
   * Get communication statistics for a supporter
   */
  async getSupporterCommunicationStats(supporterId: string) {
    const history = await this.getCommunicationHistory(supporterId, 100);
    
    const communications = history.communications || [];
    
    const stats = {
      total_communications: communications.length,
      last_contact: communications[0]?.created_at || null,
      communication_types: this.groupBy(communications, 'type'),
      outcomes: this.groupBy(communications, 'outcome'),
      pending_follow_ups: communications.filter((c: any) => 
        c.follow_up_required && !c.follow_up_completed
      ).length,
      avg_response_time: this.calculateAverageResponseTime(communications),
    };

    return stats;
  }

  // ===== PRIVATE HELPER METHODS =====

  protected formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  protected formatDuration(minutes?: number): string {
    if (!minutes) return '';
    
    if (minutes < 60) {
      return `${minutes}m`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    return remainingMinutes > 0 
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  }

  protected getCommunicationTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      call: 'Phone Call',
      email: 'Email',
      meeting: 'Meeting',
      letter: 'Letter',
      sms: 'SMS',
      social_media: 'Social Media',
      event_interaction: 'Event Interaction',
      other: 'Other'
    };
    
    return labels[type] || type;
  }

  protected getOutcomeBadge(outcome?: string) {
    const badges = {
      positive: { color: 'green', label: 'Positive' },
      neutral: { color: 'gray', label: 'Neutral' },
      negative: { color: 'red', label: 'Negative' },
      no_response: { color: 'yellow', label: 'No Response' },
      callback_requested: { color: 'blue', label: 'Callback Requested' }
    };
    
    return badges[outcome as keyof typeof badges] || badges.neutral;
  }

  protected isFollowUpOverdue(followUpDate?: string): boolean {
    if (!followUpDate) return false;
    return new Date(followUpDate) < new Date();
  }

  protected groupBy(array: any[], key: string): Record<string, number> {
    return array.reduce((acc, item) => {
      const group = item[key] || 'unknown';
      acc[group] = (acc[group] || 0) + 1;
      return acc;
    }, {});
  }

  protected calculateAverageResponseTime(communications: any[]): number {
    // Simple calculation - you can enhance this based on your needs
    const responseTimes = communications
      .filter((c: any) => c.direction === 'outbound')
      .map((c: any) => {
        // Calculate time between communications
        // This is a simplified version
        return 1; // placeholder
      });
    
    return responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;
  }
}

export default new CommunicationService();
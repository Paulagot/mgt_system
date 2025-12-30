// client/src/services/ImpactService.ts
import BaseService from './baseServices';
import type { ImpactAreaId } from '../types/impactAreas';

// Impact Types
export interface ImpactMetric {
  id: string;
  type: 'people_helped' | 'items_delivered' | 'services_provided' | 'volunteer_hours' | 'meals_served' | 'supplies_purchased' | 'funds_distributed' | 'custom';
  milestone: string;
  value: number;
  unit?: string;
}

export interface ImpactQuote {
  id: string;
  text: string;
  attribution?: string;
  role?: string;
  date?: Date | string;
}

export interface ImpactMedia {
  id: string;
  type: 'image' | 'video';
  url: string;
  caption?: string;
  takenAt?: Date | string;
}

export interface ImpactLocation {
  lat: number;
  lng: number;
  address?: string;
  placeName?: string;
}

export interface ImpactProof {
  receipts: string[];
  invoices: string[];
  quotes: ImpactQuote[];
  media: ImpactMedia[];
}

export interface ImpactUpdate {
  id: string;
  event_id: string;
  campaign_id?: string;
  club_id: string;
  impact_area_ids: ImpactAreaId[];
  title: string;
  description: string;
  impact_date: string | Date;
  metrics: ImpactMetric[];
  amount_spent?: number;
  currency?: string;
  location?: ImpactLocation;
  proof: ImpactProof;
  status: 'draft' | 'published' | 'verified' | 'flagged';
  verification_notes?: string;
  is_final: boolean;
  created_by: string;
  created_at: string | Date;
  updated_at: string | Date;
  published_at?: string | Date;
}

export interface ImpactSummary {
  entityType: 'campaign' | 'event';
  entityId: string;
  totalUpdates: number;
  totalAmountSpent: number;
  aggregatedMetrics: Record<string, number>;
  impactAreaIds: ImpactAreaId[];
  locations: ImpactLocation[];
  latestUpdate?: string | Date;
  proofCompleteness: number;
}

export interface ProofValidation {
  hasReceipts: boolean;
  hasQuotes: boolean;
  hasMedia: boolean;
  score: number;
  missingElements: string[];
}

export interface PublishValidation {
  canPublish: boolean;
  reason?: string;
  proofValidation: ProofValidation;
}

export interface TrustStatus {
  canCreateCampaign: boolean;
  canCreateEvent: boolean;
  outstandingImpactReports: number;
  overdueDays: number;
  reason?: string;
}

export interface OutstandingReport {
  id: string;
  title: string;
  event_date: string | Date;
  campaign_id?: string;
}

export interface CreateImpactData {
  event_id?: string;
  campaign_id?: string;
  impact_area_ids: ImpactAreaId[];
  title: string;
  description: string;
  impact_date: string | Date;
  metrics: ImpactMetric[];
  amount_spent?: number;
  currency?: string;
  location?: ImpactLocation;
  proof: ImpactProof;
}

export interface UpdateImpactData {
  title?: string;
  description?: string;
  impact_date?: string | Date;
  metrics?: ImpactMetric[];
  amount_spent?: number;
  currency?: string;
  location?: ImpactLocation;
  proof?: ImpactProof;
  impact_area_ids?: ImpactAreaId[];
}

class ImpactService extends BaseService {
  /**
   * Create a new impact update (starts as draft)
   */
  async createImpact(data: CreateImpactData): Promise<{ message: string; impact: ImpactUpdate }> {
    return this.request('/impact', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Get all impact updates for an event
   */
  async getEventImpact(eventId: string, status?: 'draft' | 'published' | 'verified' | 'flagged'): Promise<{ impacts: ImpactUpdate[]; total: number }> {
    const query = status ? `?status=${status}` : '';
    return this.request(`/events/${eventId}/impact${query}`, {
      method: 'GET',
    });
  }

  /**
   * Get aggregated impact summary for an event
   */
  async getEventImpactSummary(eventId: string): Promise<{ summary: ImpactSummary }> {
    return this.request(`/events/${eventId}/impact/summary`, {
      method: 'GET',
    });
  }

  /**
   * Get all impact updates for a campaign
   */
  async getCampaignImpact(campaignId: string, status?: 'draft' | 'published' | 'verified' | 'flagged'): Promise<{ impacts: ImpactUpdate[]; total: number }> {
    const query = status ? `?status=${status}` : '';
    return this.request(`/campaigns/${campaignId}/impact${query}`, {
      method: 'GET',
    });
  }

  /**
   * Get aggregated impact summary for a campaign
   */
  async getCampaignImpactSummary(campaignId: string): Promise<{ summary: ImpactSummary }> {
    return this.request(`/campaigns/${campaignId}/impact/summary`, {
      method: 'GET',
    });
  }

  /**
   * Get all impact updates for a club
   */
  async getClubImpact(
    clubId: string,
    filters?: {
      status?: 'draft' | 'published' | 'verified' | 'flagged';
      event_id?: string;
      campaign_id?: string;
    }
  ): Promise<{ impacts: ImpactUpdate[]; total: number }> {
    const queryString = filters ? this.buildQueryString(filters) : '';
    const query = queryString ? `?${queryString}` : '';
    return this.request(`/clubs/${clubId}/impact${query}`, {
      method: 'GET',
    });
  }

  /**
   * Get a specific impact update by ID
   */
  async getImpactById(impactId: string): Promise<{ impact: ImpactUpdate }> {
    return this.request(`/impact/${impactId}`, {
      method: 'GET',
    });
  }

  /**
   * Update an impact update (draft only)
   */
  async updateImpact(impactId: string, data: UpdateImpactData): Promise<{ message: string; impact: ImpactUpdate }> {
    return this.request(`/impact/${impactId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete an impact update (draft only)
   */
  async deleteImpact(impactId: string): Promise<{ message: string }> {
    return this.request(`/impact/${impactId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Publish a draft impact update
   */
  async publishImpact(impactId: string): Promise<{ message: string; impact: ImpactUpdate }> {
    return this.request(`/impact/${impactId}/publish`, {
      method: 'PATCH',
    });
  }

  /**
   * Check if impact update can be published
   */
  async validateImpact(impactId: string): Promise<PublishValidation> {
    return this.request(`/impact/${impactId}/validation`, {
      method: 'GET',
    });
  }

  /**
   * Check trust status for a club
   */
  async getClubTrustStatus(clubId: string): Promise<{ trustStatus: TrustStatus; outstandingReports: OutstandingReport[] }> {
    return this.request(`/clubs/${clubId}/impact/trust`, {
      method: 'GET',
    });
  }

  /**
   * Helper: Create empty proof structure
   */
  createEmptyProof(): ImpactProof {
    return {
      receipts: [],
      invoices: [],
      quotes: [],
      media: [],
    };
  }

  /**
   * Helper: Create empty metric
   */
  createEmptyMetric(): ImpactMetric {
    return {
      id: crypto.randomUUID(),
      type: 'custom',
      milestone: '',
      value: 0,
    };
  }

  /**
   * Helper: Create empty quote
   */
  createEmptyQuote(): ImpactQuote {
    return {
      id: crypto.randomUUID(),
      text: '',
    };
  }

  /**
   * Helper: Create empty media
   */
  createEmptyMedia(type: 'image' | 'video' = 'image'): ImpactMedia {
    return {
      id: crypto.randomUUID(),
      type,
      url: '',
    };
  }

  /**
   * Helper: Validate impact data before submission
   */
  validateImpactData(data: CreateImpactData | UpdateImpactData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // For create, check required fields
    if ('event_id' in data) {
      const createData = data as CreateImpactData;
      
      if (!createData.title?.trim()) {
        errors.push('Title is required');
      }
      if (!createData.description?.trim()) {
        errors.push('Description is required');
      }
      if (!createData.impact_date) {
        errors.push('Impact date is required');
      }
      if (!createData.impact_area_ids || createData.impact_area_ids.length === 0) {
        errors.push('At least one impact area is required');
      }
      if (createData.impact_area_ids && createData.impact_area_ids.length > 3) {
        errors.push('Maximum 3 impact areas allowed');
      }
      if (!createData.metrics || createData.metrics.length === 0) {
        errors.push('At least one metric is required');
      }
      if (!createData.proof?.media || createData.proof.media.length === 0) {
        errors.push('At least one photo or video is required');
      }
    }

    // Validate metrics if present
    if ('metrics' in data && data.metrics) {
      data.metrics.forEach((metric, index) => {
        if (!metric.milestone?.trim()) {
          errors.push(`Metric ${index + 1}: Milestone description is required`);
        }
        if (!metric.value || metric.value <= 0) {
          errors.push(`Metric ${index + 1}: Value must be greater than 0`);
        }
      });
    }

    // Validate amount_spent
    if ('amount_spent' in data && data.amount_spent !== undefined && data.amount_spent !== null) {
      if (data.amount_spent < 0) {
        errors.push('Amount spent cannot be negative');
      }
    }

    // Validate location if present
    if ('location' in data && data.location) {
      if (typeof data.location.lat !== 'number' || typeof data.location.lng !== 'number') {
        errors.push('Location must have valid latitude and longitude');
      }
    }

    // Validate proof if present
    if ('proof' in data && data.proof) {
      if (data.proof.media && data.proof.media.length > 0) {
        data.proof.media.forEach((media, index) => {
          if (!media.url?.trim()) {
            errors.push(`Media ${index + 1}: URL is required`);
          }
        });
      }

      if (data.proof.quotes) {
        data.proof.quotes.forEach((quote, index) => {
          if (!quote.text?.trim()) {
            errors.push(`Quote ${index + 1}: Text is required`);
          }
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Helper: Format impact summary for display
   */
  formatImpactSummary(summary: ImpactSummary): {
    totalUpdates: string;
    totalSpent: string;
    completeness: string;
    metricsDisplay: Array<{ label: string; value: string }>;
  } {
    return {
      totalUpdates: summary.totalUpdates.toString(),
      totalSpent: this.formatCurrency(summary.totalAmountSpent, 'EUR'),
      completeness: `${summary.proofCompleteness}%`,
      metricsDisplay: Object.entries(summary.aggregatedMetrics).map(([label, value]) => ({
        label,
        value: value.toLocaleString(),
      })),
    };
  }

  /**
   * Check if impact update can be marked as final
   */
  async canMarkAsFinal(impactId: string): Promise<{ allowed: boolean; reason?: string; validation?: any }> {
    return this.request(`/impact/${impactId}/can-mark-final`, {
      method: 'GET',
    });
  }

  /**
   * Mark an impact update as final
   */
  async markAsFinal(impactId: string): Promise<{ message: string; impact: ImpactUpdate }> {
    return this.request(`/impact/${impactId}/mark-final`, {
      method: 'PATCH',
    });
  }

  /**
   * Calculate aggregate score for display
   */
  static calculateAggregateScore(impacts: ImpactUpdate[]) {
    // Filter to only published/verified impacts
    const validImpacts = impacts.filter(i => i.status === 'published' || i.status === 'verified');

    let totalMedia = 0;
    let totalMetrics = 0;
    let totalQuotes = 0;
    let hasReceipts = false;
    let hasInvoices = false;

    validImpacts.forEach(update => {
      totalMedia += update.proof.media.length;
      totalQuotes += update.proof.quotes.length;
      totalMetrics += update.metrics.filter(m => m.value > 0).length;
      
      if (update.proof.receipts.length > 0) hasReceipts = true;
      if (update.proof.invoices.length > 0) hasInvoices = true;
    });

    // Calculate points
    const mediaCounted = Math.min(totalMedia, 4);
    const mediaPoints = mediaCounted * 15;

    const metricsCounted = Math.min(totalMetrics, 4);
    const metricsPoints = metricsCounted * 20;

    let financialPoints = 0;
    if (hasReceipts) financialPoints += 40;
    if (hasInvoices) financialPoints += 40;

    const testimonialsCounted = Math.min(totalQuotes, 5);
    const testimonialPoints = testimonialsCounted * 10;

    const totalScore = mediaPoints + metricsPoints + financialPoints + testimonialPoints;

    return {
      score: totalScore,
      breakdown: {
        mediaPoints,
        metricsPoints,
        financialPoints,
        testimonialPoints,
      },
    };
  }

  /**
   * Helper: Check if user can create impact (not blocked by trust system)
   */
  async canCreateImpact(clubId: string): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const { trustStatus } = await this.getClubTrustStatus(clubId);
      return {
        allowed: trustStatus.canCreateEvent && trustStatus.canCreateCampaign,
        reason: trustStatus.reason,
      };
    } catch (error) {
      console.error('Error checking impact creation permission:', error);
      return { allowed: true }; // Fail open
    }
  }
}

// Export both the class (for static methods) and the instance (for regular methods)
export { ImpactService as ImpactServiceClass };
export default new ImpactService();
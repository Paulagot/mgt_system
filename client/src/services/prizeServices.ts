// client/src/services/prizeService.ts 
import BaseService from './baseServices';
import { 
  Prize, 
  CreatePrizeData, 
  PrizeResponse, 
  PrizesResponse,
  PrizeStats,
  BulkCreateResponse
} from '../types/types';

class PrizeService extends BaseService {

  // Create new prize
  async createPrize(eventId: string, data: CreatePrizeData): Promise<PrizeResponse> {
    return this.request<PrizeResponse>(`/events/${eventId}/prizes`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Get all prizes for an event
  async getPrizes(eventId: string): Promise<PrizesResponse> {
    return this.request<PrizesResponse>(`/events/${eventId}/prizes`);
  }

  // Get specific prize
  async getPrize(eventId: string, prizeId: string): Promise<PrizeResponse> {
    return this.request<PrizeResponse>(`/events/${eventId}/prizes/${prizeId}`);
  }

  // Update prize
  async updatePrize(
    eventId: string, 
    prizeId: string,
    data: Partial<CreatePrizeData>
  ): Promise<PrizeResponse> {
    return this.request<PrizeResponse>(`/events/${eventId}/prizes/${prizeId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // Delete prize
  async deletePrize(eventId: string, prizeId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/events/${eventId}/prizes/${prizeId}`, {
      method: 'DELETE'
    });
  }

  // Confirm prize donation
  async confirmPrize(prizeId: string): Promise<PrizeResponse> {
    return this.request<PrizeResponse>(`/prizes/${prizeId}/confirm`, {
      method: 'POST'
    });
  }

  // Get prizes donated by a supporter
  async getPrizesByDonor(supporterId: string): Promise<PrizesResponse> {
    return this.request<PrizesResponse>(`/supporters/${supporterId}/prizes`);
  }

  // Get prize statistics for an event
  async getPrizeStats(eventId: string): Promise<PrizeStats> {
    return this.request<PrizeStats>(`/events/${eventId}/prizes/stats`);
  }

  // Get prizes by confirmation status
  async getPrizesByStatus(eventId: string, status: 'confirmed' | 'unconfirmed'): Promise<PrizesResponse> {
    return this.request<PrizesResponse>(`/events/${eventId}/prizes/status/${status}`);
  }

  // Get club-wide prize statistics
  async getClubPrizeStats(clubId: string): Promise<{ total_prize_value: number; total_prizes: number }> {
    return this.request<{ total_prize_value: number; total_prizes: number }>(`/clubs/${clubId}/prizes/stats`);
  }

  // Bulk create prizes
  async bulkCreatePrizes(eventId: string, prizes: CreatePrizeData[]): Promise<BulkCreateResponse<Prize>> {
    return this.request<BulkCreateResponse<Prize>>(`/events/${eventId}/prizes/bulk`, {
      method: 'POST',
      body: JSON.stringify({ prizes })
    });
  }

  // Helper method to validate prize data
validatePrizeData(data: CreatePrizeData): string[] {
  const errors: string[] = [];

  if (!data.name?.trim()) {
    errors.push('Prize name is required');
  }

  // FIXED: Allow undefined/null values (will default to 0 in backend)
  if (data.value !== undefined && data.value !== null && data.value < 0) {
    errors.push('Prize value must be positive');
  }

  return errors;
}

  // Helper method to format prize for display
  formatPrizeForDisplay(prize: Prize) {
    return {
      ...prize,
      value_display: this.formatCurrency(prize.value),
      status_display: prize.confirmed ? 'Confirmed' : 'Pending',
      status_color: prize.confirmed ? 'text-green-600' : 'text-yellow-600',
      status_bg: prize.confirmed ? 'bg-green-100' : 'bg-yellow-100',
      donor_display: prize.donor_name || 'Anonymous',
      created_date: this.formatDate(prize.created_at),
      can_be_confirmed: !prize.confirmed
    };
  }

  // Helper method to calculate total prize value
  calculateTotalValue(prizes: Prize[]): number {
    return prizes.reduce((total, prize) => {
      // Convert to number to handle both string and number values from database
      const value = parseFloat(String(prize.value)) || 0;
      return total + value;
    }, 0);
  }

  // Helper method to sort prizes
  sortPrizes(prizes: Prize[], sortBy: 'name' | 'value' | 'donor' | 'status' | 'date' = 'value'): Prize[] {
    return prizes.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'value':
          // Convert to numbers to handle string values from database
          const valueA = parseFloat(String(a.value)) || 0;
          const valueB = parseFloat(String(b.value)) || 0;
          return valueB - valueA; // Descending order
        case 'donor':
          const donorA = a.donor_name || 'zzz'; // Put anonymous at end
          const donorB = b.donor_name || 'zzz';
          return donorA.localeCompare(donorB);
        case 'status':
          if (a.confirmed === b.confirmed) return 0;
          return a.confirmed ? -1 : 1; // Confirmed first
        case 'date':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); // Most recent first
      }
    });
  }

  // Helper method to filter prizes
  filterPrizes(prizes: Prize[], filters: {
    confirmed?: boolean;
    donated_by?: string;
    min_value?: number;
    max_value?: number;
    search?: string;
  }): Prize[] {
    return prizes.filter(prize => {
      if (filters.confirmed !== undefined && prize.confirmed !== filters.confirmed) {
        return false;
      }

      if (filters.donated_by && prize.donated_by !== filters.donated_by) {
        return false;
      }

      if (filters.min_value !== undefined && prize.value < filters.min_value) {
        return false;
      }

      if (filters.max_value !== undefined && prize.value > filters.max_value) {
        return false;
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          prize.name.toLowerCase().includes(searchLower) ||
          (prize.donor_name && prize.donor_name.toLowerCase().includes(searchLower)) ||
          (prize.event_title && prize.event_title.toLowerCase().includes(searchLower))
        );
      }

      return true;
    });
  }
}

// Create and export service instance
const prizeService = new PrizeService();
export default prizeService;
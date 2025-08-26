// client/src/services/apiService.ts
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://mgtsystem-production.up.railway.app/api' 
  : 'http://localhost:3001/api';

class ApiService {
  private getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: this.getAuthHeaders(),
      ...options,
    };

    console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
    console.log('🔑 Headers:', config.headers);
    if (options.body) {
      console.log('📦 Body:', options.body);
    }

    try {
      const response = await fetch(url, config);
      
      console.log(`📡 Response Status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ API Error Response:', errorData);
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ API Response Data:', data);
      return data;
    } catch (error) {
      console.error(`💥 API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // 🔐 AUTHENTICATION ENDPOINTS
  async registerClub(clubData: {
    name: string;
    email: string;
    password: string;
  }) {
    return this.request<{
      message: string;
      token: string;
      user: {
        id: string;
        club_id: string;
        name: string;
        email: string;
        role: string;
      };
      club: {
        id: string;
        name: string;
        email: string;
      };
    }>('/clubs/register', {
      method: 'POST',
      body: JSON.stringify(clubData),
    });
  }

  async loginClub(credentials: { email: string; password: string }) {
    return this.request<{
      message: string;
      token: string;
      user: {
        id: string;
        club_id: string;
        name: string;
        email: string;
        role: string;
      };
      club: {
        id: string;
        name: string;
        email: string;
      };
    }>('/clubs/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async getCurrentUser() {
    return this.request<{
      user: any;
      club: any;
    }>('/clubs/me');
  }

  // 🎯 CAMPAIGN ENDPOINTS
  async createCampaign(campaignData: {
    name: string;
    description?: string;
    target_amount: number;
  }) {
    // FIXED: Match backend response format (returns { message, campaign })
    return this.request<{ message: string; campaign: any }>('/campaigns', {
      method: 'POST',
      body: JSON.stringify(campaignData),
    });
  }

  async getClubCampaigns(clubId: string) {
    // FIXED: Match backend response format
    return this.request<{ campaigns: any[]; total: number }>(`/clubs/${clubId}/campaigns`);
  }

  async getCampaignDetails(campaignId: string) {
    return this.request<{ campaign: any }>(`/campaigns/${campaignId}`);
  }

  async updateCampaign(campaignId: string, updates: any) {
    return this.request<{ message: string; campaign: any }>(`/campaigns/${campaignId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteCampaign(campaignId: string) {
    return this.request<{ message: string }>(`/campaigns/${campaignId}`, {
      method: 'DELETE',
    });
  }

  // 📅 EVENT ENDPOINTS - FIXED TO MATCH BACKEND
  async createEvent(eventData: {
    title: string;
    type: string;
    goal_amount: number;
    event_date: string;
    campaign_id?: string;
    venue?: string;
    max_participants?: number;
    description?: string;
  }) {
    // FIXED: Backend returns { message: string, event: any }, not { data: any }
    return this.request<{ message: string; event: any }>('/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  }

  async getClubEvents(clubId: string) {
    // FIXED: Backend returns { events: any[], total: number }
    return this.request<{ events: any[]; total: number }>(`/clubs/${clubId}/events`);
  }

  async getUpcomingEvents(clubId: string) {
    // FIXED: Backend returns { events: any[], total: number }
    return this.request<{ events: any[]; total: number }>(`/clubs/${clubId}/events/upcoming`);
  }

  async getEventDetails(eventId: string) {
    // FIXED: Backend returns { event: any }
    return this.request<{ event: any }>(`/events/${eventId}`);
  }

  async getEventFinancials(eventId: string) {
    // FIXED: Backend returns financial data directly (no wrapper)
    return this.request<any>(`/events/${eventId}/financials`);
  }

  async updateEvent(eventId: string, updates: any) {
    // FIXED: Backend returns { message: string, event: any }
    return this.request<{ message: string; event: any }>(`/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteEvent(eventId: string) {
    return this.request<{ message: string }>(`/events/${eventId}`, {
      method: 'DELETE',
    });
  }

  // 💰 EXPENSE ENDPOINTS
  async addEventExpense(eventId: string, expenseData: {
    category: string;
    description: string;
    amount: number;
    date: string;
    vendor?: string;
    payment_method?: string;
  }) {
    return this.request<{ message: string; expense: any }>(`/events/${eventId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(expenseData),
    });
  }

  async getEventExpenses(eventId: string) {
    return this.request<{ expenses: any[]; total: number }>(`/events/${eventId}/expenses`);
  }

  async addClubExpense(clubId: string, expenseData: any) {
    return this.request<{ message: string; expense: any }>(`/clubs/${clubId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(expenseData),
    });
  }

  async getClubExpenses(clubId: string) {
    return this.request<{ expenses: any[]; total: number }>(`/clubs/${clubId}/expenses`);
  }

  // 💸 INCOME ENDPOINTS
  async addEventIncome(eventId: string, incomeData: {
    source: string;
    description: string;
    amount: number;
    date: string;
    payment_method?: string;
    reference?: string;
  }) {
    return this.request<{ message: string; income: any }>(`/events/${eventId}/income`, {
      method: 'POST',
      body: JSON.stringify(incomeData),
    });
  }

  async getEventIncome(eventId: string) {
    return this.request<{ income: any[]; total: number }>(`/events/${eventId}/income`);
  }

  // 📊 FINANCIAL ENDPOINTS
  async getClubFinancials(clubId: string) {
    return this.request<any>(`/clubs/${clubId}/financials`);
  }

  // 👥 SUPPORTER ENDPOINTS
  async addSupporter(clubId: string, supporterData: {
    name: string;
    type: 'volunteer' | 'donor' | 'sponsor';
    contact_info: any;
    notes?: string;
  }) {
    return this.request<{ message: string; supporter: any }>(`/clubs/${clubId}/supporters`, {
      method: 'POST',
      body: JSON.stringify(supporterData),
    });
  }

  async getClubSupporters(clubId: string, filters?: {
    type?: string;
    limit?: number;
    offset?: number;
  }) {
    const queryParams = filters ? `?${new URLSearchParams(filters as any).toString()}` : '';
    return this.request<{ supporters: any[]; total: number }>(`/clubs/${clubId}/supporters${queryParams}`);
  }

  async getSupporterDetails(supporterId: string) {
    return this.request<{ supporter: any }>(`/supporters/${supporterId}`);
  }

  async updateSupporter(supporterId: string, updates: any) {
    return this.request<{ message: string; supporter: any }>(`/supporters/${supporterId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteSupporter(supporterId: string) {
    return this.request<{ message: string }>(`/supporters/${supporterId}`, {
      method: 'DELETE',
    });
  }

  async getSupporterEngagement(supporterId: string) {
    return this.request<any>(`/supporters/${supporterId}/engagement`);
  }

   // 📊 Get campaign with full statistics (should use getCampaignStats backend method)
  async getCampaignStats(campaignId: string) {
    return this.request<{ campaign: any }>(`/campaigns/${campaignId}/stats`);
  }

  // 📅 Get all events belonging to a specific campaign
  async getCampaignEvents(campaignId: string) {
    return this.request<{ events: any[]; total: number }>(`/campaigns/${campaignId}/events`);
  }

  // 📈 Get campaign progress over time (monthly breakdown)
  async getCampaignProgress(campaignId: string, timeframe?: 'month' | 'quarter' | 'year') {
    const params = timeframe ? `?timeframe=${timeframe}` : '';
    return this.request<{
      progress: Array<{
        period: string;
        total_raised: number;
        events_count: number;
        expenses: number;
        net_profit: number;
      }>;
    }>(`/campaigns/${campaignId}/progress${params}`);
  }

  // 🏆 Get top performing campaigns for club
  async getTopCampaigns(clubId: string, limit: number = 5) {
    return this.request<{ campaigns: any[] }>(`/clubs/${clubId}/campaigns/top?limit=${limit}`);
  }

  // 💰 Get campaign financial breakdown
  async getCampaignFinancials(campaignId: string) {
    return this.request<{
      total_income: number;
      total_expenses: number;
      net_profit: number;
      expense_breakdown: Array<{ category: string; amount: number }>;
      income_sources: Array<{ source: string; amount: number }>;
      monthly_trend: Array<{ month: string; income: number; expenses: number }>;
    }>(`/campaigns/${campaignId}/financials`);
  }

  // 🎯 Get campaign performance metrics
  async getCampaignMetrics(campaignId: string) {
    return this.request<{
      days_active: number;
      average_event_size: number;
      success_rate: number;
      engagement_score: number;
      projected_completion_date: string;
    }>(`/campaigns/${campaignId}/metrics`);
  }

  // 📋 Get campaign activity timeline
  async getCampaignActivity(campaignId: string, limit?: number) {
    const params = limit ? `?limit=${limit}` : '';
    return this.request<{
      activities: Array<{
        type: 'event_created' | 'income_added' | 'expense_added' | 'milestone_reached';
        description: string;
        amount?: number;
        date: string;
        event_id?: string;
      }>;
    }>(`/campaigns/${campaignId}/activity${params}`);
  }

}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;
// /client/src/services/FinancialService.ts
// Dedicated service for financial management - income, expenses, and reporting

import BaseService from './baseServices';
import type {
  Expense,
  Income,
  CreateExpenseForm,
  CreateIncomeForm,
  FinancialSummary,
  Campaign,
  Event
} from '../types/types';

// ===== EXTENDED INTERFACES (not in main types file) =====

export interface ExpenseFilters {
  start_date?: string;
  end_date?: string;
  event_id?: string;
  campaign_id?: string;
  category?: string;
  status?: 'pending' | 'approved' | 'paid';
}

export interface IncomeFilters {
  start_date?: string;
  end_date?: string;
  event_id?: string;
  campaign_id?: string;
  source?: string;
  payment_method?: string;
}

export interface ClubFinancialSummary {
  total_income: number;
  total_expenses: number;
  net_profit: number;
  pending_expenses: number;
  allocated_funds: number;
  club_level: {
    income: number;
    expenses: number;
    net: number;
  };
  expenses_by_category: Array<{ category: string; amount: number }>;
  income_by_source: Array<{ source: string; amount: number }>;
  campaign_performance: Campaign[];
  event_performance: Event[];
}

export interface EventFinancialBreakdown {
  event: Event;
  income_breakdown: Array<{
    source: string;
    payment_method: string;
    amount: number;
    count: number;
  }>;
  expense_breakdown: Array<{
    category: string;
    payment_method: string;
    status: string;
    amount: number;
    count: number;
  }>;
  summary: {
    goal_amount: number;
    actual_amount: number;
    total_expenses: number;
    net_profit: number;
    overhead_allocation: number;
    allocated_funds: number;
    goal_achievement: number;
  };
}

export interface CampaignFinancialBreakdown {
  campaign: Campaign;
  campaign_level: {
    income: Income[];
    expenses: Expense[];
  };
  events: Event[];
  summary: {
    target_amount: number;
    actual_amount: number;
    total_expenses: number;
    net_profit: number;
    overhead_allocation: number;
    allocated_funds: number;
    event_rollup: {
      income: number;
      expenses: number;
      net_profit: number;
    };
    target_achievement: number;
  };
}

export interface MonthlyTrend {
  month: number;
  year: number;
  total_income: number;
  total_expenses: number;
  net_profit: number;
}

export interface AllocationCheck {
  total_income: number;
  total_allocated: number;
  available_for_allocation: number;
  requested_amount: number;
  can_allocate: boolean;
  warning: string | null;
}

class FinancialService extends BaseService {
  // ===== EXPENSE OPERATIONS =====

  /**
   * Create an expense for an event
   */
  async createEventExpense(eventId: string, expenseData: CreateExpenseForm) {
    return this.request<any>(`/events/${eventId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(expenseData),
    });
  }

  /**
   * Create an expense for a campaign
   */
  async createCampaignExpense(campaignId: string, expenseData: CreateExpenseForm) {
    return this.request<any>(`/campaigns/${campaignId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(expenseData),
    });
  }

  /**
   * Create a club-level expense
   */
  async createClubExpense(clubId: string, expenseData: CreateExpenseForm) {
    return this.request<any>(`/clubs/${clubId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(expenseData),
    });
  }

  /**
   * Get all expenses for an event
   */
  async getEventExpenses(eventId: string) {
    return this.request<any[]>(`/events/${eventId}/expenses`);
  }

  /**
   * Get all expenses for a campaign
   */
  async getCampaignExpenses(campaignId: string) {
    return this.request<any[]>(`/campaigns/${campaignId}/expenses`);
  }

  /**
   * Get club-level expenses (not tied to events or campaigns)
   */
  async getClubExpenses(clubId: string) {
    return this.request<any[]>(`/clubs/${clubId}/expenses`);
  }

  /**
   * Update an expense
   */
  async updateExpense(expenseId: string, updates: Partial<CreateExpenseForm>) {
    return this.request<any>(`/expenses/${expenseId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete an expense
   */
  async deleteExpense(expenseId: string) {
    return this.request<{ message: string }>(`/expenses/${expenseId}`, {
      method: 'DELETE',
    });
  }

  // ===== INCOME OPERATIONS =====

  /**
   * Create income for an event
   */
  async createEventIncome(eventId: string, incomeData: CreateIncomeForm) {
    return this.request<any>(`/events/${eventId}/income`, {
      method: 'POST',
      body: JSON.stringify(incomeData),
    });
  }

  /**
   * Create income for a campaign
   */
  async createCampaignIncome(campaignId: string, incomeData: CreateIncomeForm) {
    return this.request<any>(`/campaigns/${campaignId}/income`, {
      method: 'POST',
      body: JSON.stringify(incomeData),
    });
  }

  /**
   * Create club-level income
   */
  async createClubIncome(clubId: string, incomeData: CreateIncomeForm) {
    return this.request<any>(`/clubs/${clubId}/income`, {
      method: 'POST',
      body: JSON.stringify(incomeData),
    });
  }

  /**
   * Get all income for an event
   */
  async getEventIncome(eventId: string) {
    return this.request<any[]>(`/events/${eventId}/income`);
  }

  /**
   * Get all income for a campaign
   */
  async getCampaignIncome(campaignId: string) {
    return this.request<any[]>(`/campaigns/${campaignId}/income`);
  }

  /**
   * Get club-level income (not tied to events or campaigns)
   */
  async getClubIncome(clubId: string) {
    return this.request<any[]>(`/clubs/${clubId}/income`);
  }

  /**
   * Update an income record
   */
  async updateIncome(incomeId: string, updates: Partial<CreateIncomeForm>) {
    return this.request<any>(`/income/${incomeId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete an income record
   */
  async deleteIncome(incomeId: string) {
    return this.request<{ message: string }>(`/income/${incomeId}`, {
      method: 'DELETE',
    });
  }

  // ===== FINANCIAL SUMMARIES & BREAKDOWNS =====

  /**
   * Get comprehensive financial summary for a club
   */
  async getClubFinancialSummary(clubId: string) {
    return this.request<ClubFinancialSummary>(`/clubs/${clubId}/financials`);
  }

  /**
   * Get detailed financial breakdown for an event
   */
  async getEventFinancialBreakdown(eventId: string) {
    return this.request<EventFinancialBreakdown>(`/events/${eventId}/financials`);
  }

  /**
   * Get detailed financial breakdown for a campaign
   */
  async getCampaignFinancialBreakdown(campaignId: string) {
    return this.request<CampaignFinancialBreakdown>(`/campaigns/${campaignId}/financials`);
  }

  // ===== FINANCIAL REPORTS =====

  /**
   * Get expenses grouped by category
   */
  async getExpensesByCategory(clubId: string, filters?: ExpenseFilters) {
    const params = filters ? `?${this.buildQueryString(filters)}` : '';
    return this.request<any[]>(`/clubs/${clubId}/financials/expenses-by-category${params}`);
  }

  /**
   * Get income grouped by source
   */
  async getIncomeBySource(clubId: string, filters?: IncomeFilters) {
    const params = filters ? `?${this.buildQueryString(filters)}` : '';
    return this.request<any[]>(`/clubs/${clubId}/financials/income-by-source${params}`);
  }

  /**
   * Get monthly financial trends
   */
  async getMonthlyTrends(clubId: string, year?: number) {
    const params = year ? `?year=${year}` : '';
    return this.request<MonthlyTrend[]>(`/clubs/${clubId}/financials/monthly-trends${params}`);
  }

  /**
   * Get all pending expenses for approval
   */
  async getPendingExpenses(clubId: string) {
    return this.request<any[]>(`/clubs/${clubId}/financials/pending-expenses`);
  }

  // ===== RECALCULATION & UTILITIES =====

  /**
   * Manually recalculate event financials
   */
  async recalculateEventFinancials(eventId: string) {
    return this.request<{ message: string; financials: any }>(
      `/events/${eventId}/financials/recalculate`,
      { method: 'POST' }
    );
  }

  /**
   * Manually recalculate campaign financials
   */
  async recalculateCampaignFinancials(campaignId: string) {
    return this.request<{ message: string; financials: any }>(
      `/campaigns/${campaignId}/financials/recalculate`,
      { method: 'POST' }
    );
  }

  // ===== ALLOCATION TRACKING =====

  /**
   * Get summary of allocated funds
   */
  async getAllocatedFundsSummary(clubId: string) {
    return this.request<{
      total_allocated: number;
      campaign_allocations: any[];
      event_allocations: any[];
    }>(`/clubs/${clubId}/financials/allocated-funds`);
  }

  /**
   * Check if allocation is available (soft validation)
   */
  async checkAllocationAvailability(clubId: string, requestedAmount: number) {
    return this.request<AllocationCheck>(
      `/clubs/${clubId}/financials/check-allocation?amount=${requestedAmount}`
    );
  }

  /**
   * Create an allocated funds income entry
   */
  async allocateFundsToEvent(eventId: string, amount: number, description: string) {
    return this.createEventIncome(eventId, {
      source: 'Allocated Funds',
      description,
      amount,
      date: new Date().toISOString().split('T')[0],
      payment_method: 'allocated-funds',
    });
  }

  /**
   * Create an allocated funds income entry for campaign
   */
  async allocateFundsToCampaign(campaignId: string, amount: number, description: string) {
    return this.createCampaignIncome(campaignId, {
      source: 'Allocated Funds',
      description,
      amount,
      date: new Date().toISOString().split('T')[0],
      payment_method: 'allocated-funds',
    });
  }

  // ===== HELPER METHODS =====

  /**
   * Validate expense data before submission
   */
  validateExpenseData(data: CreateExpenseForm): string[] {
    const errors: string[] = [];

    if (!data.category?.trim()) {
      errors.push('Category is required');
    }

    if (!data.description?.trim()) {
      errors.push('Description is required');
    }

    if (!data.amount || data.amount <= 0) {
      errors.push('Amount must be greater than 0');
    }

    if (!data.date) {
      errors.push('Date is required');
    }

    if (data.event_id && data.campaign_id) {
      errors.push('Expense cannot be assigned to both event and campaign');
    }

    return errors;
  }

  /**
   * Validate income data before submission
   */
  validateIncomeData(data: CreateIncomeForm): string[] {
    const errors: string[] = [];

    if (!data.source?.trim()) {
      errors.push('Source is required');
    }

    if (!data.description?.trim()) {
      errors.push('Description is required');
    }

    if (!data.amount || data.amount <= 0) {
      errors.push('Amount must be greater than 0');
    }

    if (!data.date) {
      errors.push('Date is required');
    }

    if (data.event_id && data.campaign_id) {
      errors.push('Income cannot be assigned to both event and campaign');
    }

    return errors;
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount: number, currency: string = 'EUR'): string {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }

  /**
   * Calculate profit margin percentage
   */
  calculateProfitMargin(income: number, expenses: number): number {
    if (income === 0) return 0;
    return ((income - expenses) / income) * 100;
  }

  /**
   * Get financial status based on goal achievement
   */
  getFinancialStatus(actual: number, goal: number): {
    status: 'excellent' | 'good' | 'on-track' | 'behind' | 'poor';
    percentage: number;
    color: string;
  } {
    const percentage = goal > 0 ? (actual / goal) * 100 : 0;

    if (percentage >= 100) {
      return { status: 'excellent', percentage, color: 'green' };
    } else if (percentage >= 75) {
      return { status: 'good', percentage, color: 'blue' };
    } else if (percentage >= 50) {
      return { status: 'on-track', percentage, color: 'yellow' };
    } else if (percentage >= 25) {
      return { status: 'behind', percentage, color: 'orange' };
    } else {
      return { status: 'poor', percentage, color: 'red' };
    }
  }

  /**
   * Format financial summary for display
   */
  formatFinancialSummary(data: {
    total_income: number;
    total_expenses: number;
    net_profit: number;
  }) {
    return {
      total_income: this.formatCurrency(data.total_income),
      total_expenses: this.formatCurrency(data.total_expenses),
      net_profit: this.formatCurrency(data.net_profit),
      profit_margin: `${this.calculateProfitMargin(
        data.total_income,
        data.total_expenses
      ).toFixed(1)}%`,
      is_profitable: data.net_profit > 0,
    };
  }

  /**
   * Get expense status badge
   */
  getExpenseStatusBadge(status: string) {
    const badges = {
      pending: { color: 'yellow', label: 'Pending' },
      approved: { color: 'blue', label: 'Approved' },
      paid: { color: 'green', label: 'Paid' },
    };
    return badges[status as keyof typeof badges] || badges.pending;
  }

  /**
   * Get payment method icon/label
   */
  getPaymentMethodLabel(method: string) {
    const labels: Record<string, string> = {
      cash: '💵 Cash',
      card: '💳 Card',
      transfer: '🏦 Bank Transfer',
      cheque: '📝 Cheque',
      sponsorship: '🤝 Sponsorship',
      donation: '🎁 Donation',
      ticket_sales: '🎟️ Ticket Sales',
      allocated_funds: '📊 Allocated Funds',
      other: '📋 Other',
    };
    return labels[method] || method;
  }

  /**
   * Export expenses to CSV format
   */
  exportExpensesToCSV(expenses: any[]): string {
    const headers = ['Date', 'Category', 'Description', 'Amount', 'Vendor', 'Payment Method', 'Status'];
    const rows = expenses.map(exp => [
      exp.date,
      exp.category,
      exp.description,
      exp.amount,
      exp.vendor || '',
      exp.payment_method,
      exp.status,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  }

  /**
   * Export income to CSV format
   */
  exportIncomeToCSV(income: any[]): string {
    const headers = ['Date', 'Source', 'Description', 'Amount', 'Payment Method', 'Reference'];
    const rows = income.map(inc => [
      inc.date,
      inc.source,
      inc.description,
      inc.amount,
      inc.payment_method,
      inc.reference || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  }

  /**
   * Download CSV file
   */
  downloadCSV(csvContent: string, filename: string) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Export instance, not class
const financialService = new FinancialService();
export default financialService;
// Core TypeScript interfaces for FundRaisely Club - UPDATED with CRM

export interface Club {
  id: string;
  name: string;
  email: string;
  password_hash?: string;
  created_at: Date;
}

export interface Campaign {
  id: string;
  club_id: string;
  name: string;
  description: string;
  target_amount: number;
   status?: 'draft' | 'active' | 'completed' | 'paused';
  created_at: Date;
   category?: string;           // 'building' | 'equipment' | 'program' | 'emergency' | 'community' | 'education' | 'other'
  start_date?: string | Date; // Optional start date
  end_date?: string | Date;   // Optional end date  
  tags?: string[]; // Flexible tags for campaigns
    total_events?: number;       // Count of events in this campaign
  total_raised?: number;       // Sum of actual_amount from campaign events
  total_profit?: number;       // Sum of net_profit from campaign events
  progress_percentage?: number; // Calculated (total_raised / target_amount) * 100
  total_participants?: number; // Total participants across all events in this campaign
  total_supporters?: number;   // Total unique supporters across all events in this campaign
  total_expenses?: number;     // Total expenses across all events in this campaign
  total_prizes?: number;       // Total prizes awarded across all events in this campaign
  total_tasks?: number;        // Total tasks created for this campaign
  total_income?: number;       // Total income across all events in this campaign
  total_donations?: number;    // Total donations received across all events in this campaign
  total_sponsors?: number;     // Total sponsors across all events in this campaign
}

export interface Event {
  id: string;
  club_id: string;
  campaign_id?: string;
  title: string;
  type: string; // Now custom/flexible
  description?: string;
  venue?: string;
  max_participants?: number;
  goal_amount: number;
  actual_amount: number;
  total_expenses: number;
  net_profit: number;
  event_date: Date;
  status: 'draft' | 'live' | 'ended';
  created_at: Date;
}

// ENHANCED SUPPORTER INTERFACE - Updated to match backend CRM schema
export interface Supporter {
  // Core identification
  id: string;
  club_id: string;
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
  
  // Financial tracking (auto-calculated by backend)
  total_donated?: number;
  first_donation_date?: string | Date;
  last_donation_date?: string | Date;
  donation_count?: number;
  average_donation?: number;
  largest_donation?: number;
  
  // Volunteer tracking
  volunteer_hours_total?: number;
  volunteer_hours_this_year?: number;
  last_volunteer_date?: string | Date;
  
  // Communication preferences
  email_subscribed?: boolean;
  sms_subscribed?: boolean;
  newsletter_subscribed?: boolean;
  event_notifications?: boolean;
  do_not_contact?: boolean;
  unsubscribe_reason?: string;
  
  // Flexible data (JSON fields)
  tags?: string[];
  interests?: string[];
  skills?: string[];
  communication_preferences?: Record<string, any>;
  
  // GDPR compliance
  gdpr_consent?: boolean;
  gdpr_consent_date?: string | Date;
  data_protection_notes?: string;
  
  // Lifecycle management
  lifecycle_stage?: 'prospect' | 'first_time' | 'repeat' | 'major' | 'lapsed' | 'champion';
  next_contact_date?: string | Date;
  priority_level?: 'low' | 'medium' | 'high' | 'urgent';
  last_contact_date?: string | Date;
  last_updated?: string | Date;
  created_at: Date;
}

// FORM-SPECIFIC SUPPORTER DATA (for forms)
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

// SUPPORTER ANALYTICS & FILTERING
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

export interface SupporterEngagement {
  supporter: Supporter;
  engagement: {
    // Financial engagement
    total_donated: number;
    donation_count: number;
    average_donation: number;
    
    // Prize donations
    total_prizes_donated: number;
    total_prize_value: number;
    
    // Volunteer engagement
    total_tasks_assigned: number;
    completed_tasks: number;
    pending_tasks: number;
    task_completion_rate: number;
    volunteer_hours_total: number;
    
    // Communication engagement
    total_communications: number;
    last_contact_date?: string | Date;
    relationship_strength: string;
    lifecycle_stage: string;
  };
  recent_communications: Communication[];
  prizes_donated: Prize[];
  tasks_assigned: Task[];
}

// COMMUNICATION SYSTEM
export interface Communication {
  id: string;
  club_id: string;
  supporter_id: string;
  
  // Communication details
  type: 'call' | 'email' | 'meeting' | 'letter' | 'sms' | 'social_media' | 'event_interaction' | 'other';
  direction: 'inbound' | 'outbound';
  subject?: string;
  notes: string;
  outcome?: 'positive' | 'neutral' | 'negative' | 'no_response' | 'callback_requested';
  
  // Follow-up management
  follow_up_required?: boolean;
  follow_up_date?: string | Date;
  follow_up_notes?: string;
  follow_up_completed?: boolean;
  
  // Context linking
  event_id?: string;
  campaign_id?: string;
  communication_channel?: string;
  
  // Additional metadata
  duration_minutes?: number;
  attachment_urls?: string[];
  tags?: string[];
  
  // Audit trail
  created_by: string;
  created_by_name?: string;
  created_at: Date;
  updated_at?: Date;
}

export interface CreateCommunicationData {
  type: 'call' | 'email' | 'meeting' | 'letter' | 'sms' | 'social_media' | 'event_interaction' | 'other';
  direction: 'inbound' | 'outbound';
  notes: string;
  subject?: string;
  outcome?: 'positive' | 'neutral' | 'negative' | 'no_response' | 'callback_requested';
  follow_up_required?: boolean;
  follow_up_date?: string;
  follow_up_notes?: string;
  event_id?: string;
  campaign_id?: string;
  communication_channel?: string;
  duration_minutes?: number;
  attachment_urls?: string[];
  tags?: string[];
}

// EXISTING INTERFACES (keeping for compatibility)
export interface Prize {
  id: string;
  event_id: string;
  name: string;
  value: number;
  donated_by: string;
  confirmed: boolean;
}

export interface Task {
  id: string;
  event_id: string;
  title: string;
  assigned_to: string;
  due_date: Date;
  status: 'todo' | 'in_progress' | 'done';
}

export interface User {
  id: string;
  club_id: string;
  name: string;
  email: string;
  role: 'host' | 'admin' | 'treasurer' | 'communications' | 'volunteer';
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Form types
export interface RegisterClubForm {
  name: string;
  email: string;
  password: string;
}

export interface CreateCampaignForm {
  name: string;
  description: string;
  target_amount: number;
  category?: string;
  start_date?: string;
  end_date?: string;
  tags?: string[]; // Will be converted from comma-separated string in form
}

export interface CreateEventForm {
  title: string;
  type: string; // Now flexible
  description?: string;
  venue?: string;
  max_participants?: number;
  goal_amount: number;
  event_date: string;
  campaign_id?: string;
}

export interface CreateExpenseForm {
  category: string;
  description: string;
  amount: number;
  date: string;
  vendor?: string;
  payment_method: 'cash' | 'card' | 'transfer' | 'cheque' | 'other';
  receipt_url?: string;
  event_id?: string; // Optional for global expenses
}

export interface CreateIncomeForm {
  source: string;
  description: string;
  amount: number;
  date: string;
  payment_method: 'cash' | 'card' | 'transfer' | 'sponsorship' | 'donation' | 'ticket_sales' | 'other';
  reference?: string;
  event_id?: string;
}

// Event summary for post-event reporting
export interface EventSummary {
  event: Event;
  total_income: number;
  total_expenses: number;
  participant_count: number;
  prizes_awarded: Prize[];
  top_contributors: Supporter[];
  net_profit: number;
  expense_breakdown: Record<string, number>;
  income_breakdown: Record<string, number>;
}

export interface CreatePrizeForm {
  name: string;
  value: number;
  donated_by: string;
}

export interface CreateTaskForm {
  title: string;
  assigned_to: string;
  due_date: string;
}

// Socket.IO event types - UPDATED with supporter events
export interface SocketEvents {
  event_created: Event;
  task_assigned: Task & { assignee_name: string };
  event_updated: Event;
  supporter_joined: Supporter;
  supporter_created: Supporter;  // NEW
  supporter_updated: Supporter;  // NEW
  supporter_deleted: { id: string; name: string }; // NEW
  communication_logged: Communication; // NEW
  milestone_due: {
    event_id: string;
    milestone: string;
    message: string;
  };
}

// State management types - UPDATED
export interface AppState {
  user: User | null;
  club: Club | null;
  campaigns: Campaign[];
  events: Event[];
  supporters: Supporter[]; // Now uses enhanced Supporter interface
  isLoading: boolean;
  error: string | null;
}

// Dashboard metrics - UPDATED with supporter metrics
export interface DashboardMetrics {
  total_raised: number;
  active_campaigns: number;
  upcoming_events: number;
  total_supporters: number;
  // Enhanced supporter metrics
  supporter_breakdown: {
    volunteers: number;
    donors: number;
    sponsors: number;
  };
  top_donors: Supporter[];
  recent_supporters: Supporter[];
  pending_follow_ups: number;
}

// Financial interfaces (existing)
export interface Expense {
  id: string;
  club_id: string;
  event_id?: string; // null for global expenses
  category: string;
  description: string;
  amount: number;
  date: Date;
  receipt_url?: string;
  vendor?: string;
  payment_method: 'cash' | 'card' | 'transfer' | 'cheque' | 'other';
  status: 'pending' | 'approved' | 'paid';
  created_by: string;
  created_at: Date;
}

export interface Income {
  id: string;
  club_id: string;
  event_id?: string;
  source: string;
  description: string;
  amount: number;
  date: Date;
  payment_method: 'cash' | 'card' | 'transfer' | 'sponsorship' | 'donation' | 'ticket_sales' | 'other';
  reference?: string;
  created_at: Date;
}

export interface FinancialSummary {
  total_income: number;
  total_expenses: number;
  net_profit: number;
  pending_expenses: number;
  income_by_method: Record<string, number>;
  expenses_by_category: Record<string, number>;
  monthly_trends: Array<{
    month: string;
    income: number;
    expenses: number;
    profit: number;
  }>;
}

// UTILITY TYPES FOR CRM
export type RelationshipStrength = 'prospect' | 'new' | 'regular' | 'major' | 'lapsed' | 'inactive';
export type LifecycleStage = 'prospect' | 'first_time' | 'repeat' | 'major' | 'lapsed' | 'champion';
export type ContactSource = 'website' | 'event' | 'referral' | 'social_media' | 'cold_outreach' | 'walk_in' | 'other';
export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent';
export type PreferredContactMethod = 'email' | 'phone' | 'post' | 'sms';
export type SupporterType = 'volunteer' | 'donor' | 'sponsor';
export type CommunicationType = 'call' | 'email' | 'meeting' | 'letter' | 'sms' | 'social_media' | 'event_interaction' | 'other';
export type CommunicationOutcome = 'positive' | 'neutral' | 'negative' | 'no_response' | 'callback_requested';
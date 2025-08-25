// Core TypeScript interfaces for FundRaisely Club - Clean Version

// ===== BASIC ENTITIES =====

export interface Club {
  id: string;
  name: string;
  email: string;
  password_hash?: string;
  created_at: string;
}

export interface Campaign {
  id: string;
  club_id: string;
  name: string;
  description?: string;
  target_amount: number;
  status?: 'draft' | 'active' | 'completed' | 'paused';
  category?: string;
  start_date?: string;
  end_date?: string;
  tags?: string[];
  total_events?: number;
  total_raised?: number;
  total_profit?: number;
  progress_percentage?: number;
  total_participants?: number;
  total_supporters?: number;
  total_expenses?: number;
  total_prizes?: number;
  total_tasks?: number;
  total_income?: number;
  total_donations?: number;
  total_sponsors?: number;
  created_at: string;
}

export interface Event {
  id: string;
  club_id: string;
  campaign_id?: string;
  title: string;
  type: string;
  description?: string;
  venue?: string;
  max_participants?: number;
  goal_amount: number;
  actual_amount?: number;
  total_expenses?: number;
  net_profit?: number;
  event_date: string;
  status: 'draft' | 'live' | 'ended';
  created_at: string;
  campaign_name?: string;
}

// ===== SUPPORTER & CRM SYSTEM =====

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
  first_donation_date?: string;
  last_donation_date?: string;
  donation_count?: number;
  average_donation?: number;
  largest_donation?: number;
  
  // Volunteer tracking
  volunteer_hours_total?: number;
  volunteer_hours_this_year?: number;
  last_volunteer_date?: string;
  
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
  gdpr_consent_date?: string;
  data_protection_notes?: string;
  
  // Lifecycle management
  lifecycle_stage?: 'prospect' | 'first_time' | 'repeat' | 'major' | 'lapsed' | 'champion';
  next_contact_date?: string;
  priority_level?: 'low' | 'medium' | 'high' | 'urgent';
  last_contact_date?: string;
  last_updated?: string;
  created_at: string;
}

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

// ===== COMMUNICATION SYSTEM =====

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
  follow_up_date?: string;
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
  created_by?: string;
  created_by_name?: string;
  supporter_name?: string;
  supporter_email?: string;
  created_at: string;
  updated_at?: string;
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

// ===== USER MANAGEMENT =====

export type UserRole = 'host' | 'admin' | 'treasurer' | 'communications' | 'volunteer';

export interface User {
  id: string;
  club_id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  role: UserRole;
}

export interface UserPermissions {
  user_id: string;
  role: UserRole;
  permissions: string[];
}

export interface UserStats {
  total_users: number;
  by_role: {
    role: UserRole;
    count: number;
  }[];
}

// ===== PRIZE MANAGEMENT =====

export interface Prize {
  id: string;
  event_id: string;
  name: string;
  value: number;
  donated_by?: string;
  confirmed: boolean;
  created_at: string;
  donor_name?: string;
  donor_email?: string;
  event_title?: string;
  club_id?: string;
}

export interface CreatePrizeData {
  name: string;
  value?: number;
  donated_by?: string;
}

export interface PrizeStats {
  total_prizes: number;
  total_value: number;
  confirmed_prizes: number;
  donated_prizes: number;
  average_value: number;
}

// ===== TASK MANAGEMENT =====

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Task {
  id: string;
  event_id: string;
  title: string;
  assigned_to?: string;
  due_date?: string;
  status: TaskStatus;
  created_at: string;
  assigned_supporter_name?: string;
  assigned_user_name?: string;
  assigned_name?: string;
  assigned_email?: string;
  assigned_type?: 'supporter' | 'user' | 'unassigned';
  event_title?: string;
  club_id?: string;
  campaign_name?: string;
  days_overdue?: number;
  days_until_due?: number;
}

export interface CreateTaskData {
  title: string;
  assigned_to?: string;
  due_date?: string;
  status?: TaskStatus;
}

export interface TaskStats {
  total_tasks: number;
  todo_tasks: number;
  in_progress_tasks: number;
  completed_tasks: number;
  assigned_tasks: number;
  overdue_tasks: number;
}

// ===== FINANCIAL INTERFACES =====

export interface Expense {
  id: string;
  club_id: string;
  event_id?: string;
  category: string;
  description: string;
  amount: number;
  date: string; // Keep as string for API consistency
  receipt_url?: string;
  vendor?: string;
  payment_method: 'cash' | 'card' | 'transfer' | 'cheque' | 'other';
  status: 'pending' | 'approved' | 'paid';
  created_by: string;
  created_at: string; // Keep as string for API consistency
}

export interface Income {
  id: string;
  club_id: string;
  event_id?: string;
  source: string;
  description: string;
  amount: number;
  date: string;
  payment_method: 'cash' | 'card' | 'transfer' | 'sponsorship' | 'donation' | 'ticket_sales' | 'other';
  reference?: string;
  created_at: string;
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

// ===== FORM INTERFACES =====

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
  tags?: string[];
}

export interface CreateEventForm {
  title: string;
  type: string;
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
  event_id?: string;
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

// ===== ANALYTICS & STATS =====

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
  total_donors: number;
  active_donors: number;
  recent_donors: number;
  new_donors_this_month: number;
  total_amount_raised: number;
  average_donor_value: number;
  largest_donor_amount: number;
  relationship_breakdown: Array<{ relationship_strength: string; count: number }>;
  lifecycle_breakdown: Array<{ lifecycle_stage: string; count: number }>;
}

export interface SupporterEngagement {
  supporter: Supporter;
  engagement: {
    total_donated: number;
    donation_count: number;
    average_donation: number;
    total_prizes_donated: number;
    total_prize_value: number;
    total_tasks_assigned: number;
    completed_tasks: number;
    pending_tasks: number;
    task_completion_rate: number;
    volunteer_hours_total: number;
    total_communications: number;
    last_contact_date?: string;
    relationship_strength: string;
    lifecycle_stage: string;
  };
  recent_communications: Communication[];
  prizes_donated: Prize[];
  tasks_assigned: Task[];
}

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

export interface DashboardMetrics {
   total_raised: number;
  active_campaigns: number;
  upcoming_events: number;
  totalEvents: number;
  totalCampaigns: number;
  totalExpenses: number;
  totalIncome: number;
  netProfit: number;
  totalSupporters: number;
  totalDonors: number;
  totalVolunteers: number;
  totalSponsors: number;
  avgDonation: number;
  donorRetentionRate: number;
  totalUsers: number;
  totalPrizes: number;
  totalPrizeValue: number;
  totalTasks: number;
  overdueTasks: number;
  completedTasks: number;
  supporter_breakdown: {
    volunteers: number;
    donors: number;
    sponsors: number;
  };
  top_donors: Supporter[];
  recent_supporters: Supporter[];
  pending_follow_ups: number;
}

// ===== API RESPONSE TYPES =====

export interface ApiResponse<T> {
  message?: string;
  data?: T;
  error?: string;
}

export interface UserResponse extends ApiResponse<User> {
  user: User;
}

export interface UsersResponse extends ApiResponse<User[]> {
  users: User[];
}

export interface PrizeResponse extends ApiResponse<Prize> {
  prize: Prize;
}

export interface PrizesResponse extends ApiResponse<Prize[]> {
  prizes: Prize[];
}

export interface TaskResponse extends ApiResponse<Task> {
  task: Task;
}

export interface TasksResponse extends ApiResponse<Task[]> {
  tasks: Task[];
}

export interface BulkCreateResponse<T> {
  message: string;
  items: T[];
}

// ===== FILTER TYPES =====

export interface UserFilters {
  role?: UserRole;
  search?: string;
}

export interface PrizeFilters {
  confirmed?: boolean;
  donated_by?: string;
  min_value?: number;
  max_value?: number;
}

export interface TaskFilters {
  status?: TaskStatus;
  assigned_to?: string;
  overdue?: boolean;
  upcoming_days?: number;
}

// ===== FORM STATE TYPES =====

export interface UserFormState {
  name: string;
  email: string;
  role: UserRole;
  isSubmitting: boolean;
  errors: Record<string, string>;
}

export interface PrizeFormState {
  name: string;
  value: number;
  donated_by: string;
  isSubmitting: boolean;
  errors: Record<string, string>;
}

export interface TaskFormState {
  title: string;
  assigned_to: string;
  due_date: string;
  status: TaskStatus;
  isSubmitting: boolean;
  errors: Record<string, string>;
}

export interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit';
  item?: any;
}

// ===== NAVIGATION & PERMISSIONS =====

export interface NavItem {
  path: string;
  label: string;
  icon?: string;
  roles?: UserRole[];
  children?: NavItem[];
}

export interface PermissionConfig {
  [key: string]: UserRole[];
}

export const PERMISSIONS: PermissionConfig = {
  manage_users: ['host', 'admin'],
  manage_campaigns: ['host', 'admin', 'communications'],
  manage_events: ['host', 'admin', 'communications'],
  manage_finances: ['host', 'admin', 'treasurer'],
  manage_supporters: ['host', 'admin', 'communications'],
  manage_prizes: ['host', 'admin', 'treasurer'],
  manage_tasks: ['host', 'admin', 'communications'],
  view_analytics: ['host', 'admin', 'treasurer', 'communications']
};

// ===== SOCKET EVENT TYPES =====

export interface SocketEvents {
  // Campaign events
  campaign_created: { campaign: Campaign };
  campaign_updated: { campaign: Campaign };
  
  // Event events
  event_created: { event: Event };
  event_updated: { event: Event };
  
  // Supporter events
  supporter_created: { supporter: Supporter };
  supporter_updated: { supporter: Supporter };
  supporter_deleted: { supporterId: string };
  
  // Communication events
  communication_logged: { communication: Communication };
  
  // User events
  user_created: { user: User };
  user_updated: { user: User };
  user_deleted: { userId: string };
  user_role_updated: { user: User };
  
  // Prize events
  prize_created: { prize: Prize };
  prize_updated: { prize: Prize };
  prize_deleted: { prizeId: string };
  prize_confirmed: { prize: Prize };
  
  // Task events
  task_created: { task: Task };
  task_updated: { task: Task };
  task_deleted: { taskId: string };
  task_status_updated: { task: Task };
  
  // Milestone events
  milestone_due: {
    event_id: string;
    milestone: string;
    message: string;
  };
}

// ===== COMPONENT PROPS TYPES =====

export interface UserCardProps {
  user: User;
  onEdit: (user: User) => void;
  onDelete: (userId: string) => void;
  onRoleChange: (userId: string, role: UserRole) => void;
  currentUserRole: UserRole;
}

export interface PrizeCardProps {
  prize: Prize;
  onEdit: (prize: Prize) => void;
  onDelete: (prizeId: string) => void;
  onConfirm: (prizeId: string) => void;
  canManage: boolean;
}

export interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  canManage: boolean;
  showEvent?: boolean;
}

// ===== SERVICE & ERROR TYPES =====

export interface ServiceMethods {
  create: (data: any) => Promise<any>;
  getAll: (filters?: any) => Promise<any>;
  getById: (id: string) => Promise<any>;
  update: (id: string, data: any) => Promise<any>;
  delete: (id: string) => Promise<any>;
}

export interface ServiceError {
  message: string;
  status?: number;
  code?: string;
}

export interface LoadingStates {
  loading: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  error: string | null;
}

// ===== VALIDATION TYPES =====

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export interface ValidationRules {
  [fieldName: string]: ValidationRule;
}

// ===== STATE MANAGEMENT TYPES =====

export interface AppState {
  user: User | null;
  club: Club | null;
  campaigns: Campaign[];
  events: Event[];
  supporters: Supporter[];
  isLoading: boolean;
  error: string | null;
}

// ===== UTILITY TYPE ALIASES =====

export type RelationshipStrength = 'prospect' | 'new' | 'regular' | 'major' | 'lapsed' | 'inactive';
export type LifecycleStage = 'prospect' | 'first_time' | 'repeat' | 'major' | 'lapsed' | 'champion';
export type ContactSource = 'website' | 'event' | 'referral' | 'social_media' | 'cold_outreach' | 'walk_in' | 'other';
export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent';
export type PreferredContactMethod = 'email' | 'phone' | 'post' | 'sms';
export type SupporterType = 'volunteer' | 'donor' | 'sponsor';
export type CommunicationType = 'call' | 'email' | 'meeting' | 'letter' | 'sms' | 'social_media' | 'event_interaction' | 'other';
export type CommunicationOutcome = 'positive' | 'neutral' | 'negative' | 'no_response' | 'callback_requested';

// ===== COMMUNICATION SERVICE SPECIFIC TYPES =====

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

// Add helper utility functions at the end of your types file:
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString();
};

export const formatCurrency = (amount: number): string => {
  return `£${amount.toLocaleString()}`;
};

export const safeFormatCurrency = (amount: number | undefined): string => {
  return amount !== undefined ? formatCurrency(amount) : '£0';
};

export const getProfitStyle = (profit: number | undefined): string => {
  if (profit === undefined) return 'text-gray-500';
  if (profit > 0) return 'text-green-600';
  if (profit < 0) return 'text-red-600';
  return 'text-gray-500';
};


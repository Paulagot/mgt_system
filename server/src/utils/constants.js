// User roles
export const USER_ROLES = {
  HOST: 'host',
  ADMIN: 'admin', 
  TREASURER: 'treasurer',
  COMMUNICATIONS: 'communications',
  VOLUNTEER: 'volunteer'
};

// Event types
export const EVENT_TYPES = {
  QUIZ: 'quiz',
  BINGO: 'bingo',
  RAFFLE: 'raffle',
  AUCTION: 'auction',
  DINNER: 'dinner',
  CONCERT: 'concert',
  SPORTS: 'sports',
  OTHER: 'other'
};

// Event status
export const EVENT_STATUS = {
  DRAFT: 'draft',
  LIVE: 'live', 
  ENDED: 'ended'
};

// Supporter types
export const SUPPORTER_TYPES = {
  VOLUNTEER: 'volunteer',
  DONOR: 'donor',
  SPONSOR: 'sponsor'
};

// Payment methods for expenses
export const EXPENSE_PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
  TRANSFER: 'transfer',
  CHEQUE: 'cheque',
  INSTANT: 'instant',
  OTHER: 'other'
};

// Payment methods for income
export const INCOME_PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
  TRANSFER: 'transfer',
  INSTANT: 'instant',
  OTHER: 'other'
};

// Expense status
export const EXPENSE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  PAID: 'paid'
};

// Task status
export const TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  DONE: 'done'
};

// Common expense categories
export const EXPENSE_CATEGORIES = {
  VENUE: 'venue',
  FOOD_BEVERAGE: 'food_beverage',
  EQUIPMENT: 'equipment',
  MARKETING: 'marketing',
  PRIZES: 'prizes',
  TRANSPORT: 'transport',
  ADMIN: 'admin',
  OTHER: 'other'
};

// Common income sources
export const INCOME_SOURCES = {
  TICKET_SALES: 'ticket_sales',
  SPONSORSHIP: 'sponsorship',
  DONATIONS: 'donations',
  MERCHANDISE: 'merchandise',
  RAFFLE: 'raffle',
  AUCTION: 'auction',
  OTHER: 'other'
};

// Validation arrays for easy checking
export const VALID_USER_ROLES = Object.values(USER_ROLES);
export const VALID_EVENT_TYPES = Object.values(EVENT_TYPES);
export const VALID_EVENT_STATUSES = Object.values(EVENT_STATUS);
export const VALID_SUPPORTER_TYPES = Object.values(SUPPORTER_TYPES);
export const VALID_EXPENSE_PAYMENT_METHODS = Object.values(EXPENSE_PAYMENT_METHODS);
export const VALID_INCOME_PAYMENT_METHODS = Object.values(INCOME_PAYMENT_METHODS);
export const VALID_EXPENSE_STATUSES = Object.values(EXPENSE_STATUS);
export const VALID_TASK_STATUSES = Object.values(TASK_STATUS);

// Currency formatting helper
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

// Date formatting helper
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};
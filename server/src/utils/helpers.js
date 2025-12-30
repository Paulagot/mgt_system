// ===== DATE & TIME HELPERS =====

export const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatDateTime = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const isDateInPast = (date) => {
  return new Date(date) < new Date();
};

export const isDateInFuture = (date) => {
  return new Date(date) > new Date();
};

export const daysBetween = (date1, date2) => {
  const diffTime = Math.abs(new Date(date2) - new Date(date1));
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// ===== CURRENCY HELPERS =====

export const formatCurrency = (amount, currency = 'USD') => {
  if (amount === null || amount === undefined) return '$0.00';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(parseFloat(amount));
};

export const parseCurrency = (currencyString) => {
  if (!currencyString) return 0;
  return parseFloat(currencyString.replace(/[^0-9.-]/g, ''));
};

export const calculatePercentage = (value, total) => {
  if (!total || total === 0) return 0;
  return Math.round((value / total) * 100);
};

// ===== VALIDATION HELPERS =====

export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhoneNumber = (phone) => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

export const sanitizeString = (str) => {
  if (!str) return '';
  return str.trim().replace(/[<>]/g, '');
};

export const isValidAmount = (amount) => {
  const num = parseFloat(amount);
  return !isNaN(num) && num >= 0;
};

// ===== TEXT HELPERS =====

export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

export const capitalizeFirst = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const slugify = (text) => {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');
};

// ===== ARRAY HELPERS =====

export const groupBy = (array, key) => {
  return array.reduce((groups, item) => {
    const group = item[key];
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {});
};

export const sortBy = (array, key, direction = 'asc') => {
  return [...array].sort((a, b) => {
    if (direction === 'asc') {
      return a[key] > b[key] ? 1 : -1;
    } else {
      return a[key] < b[key] ? 1 : -1;
    }
  });
};

export const sumBy = (array, key) => {
  return array.reduce((sum, item) => sum + parseFloat(item[key] || 0), 0);
};

// ===== EVENT STATUS HELPERS =====

export const getEventStatus = (event) => {
  const eventDate = new Date(event.event_date);
  const now = new Date();
  
  if (event.status === 'ended') return 'ended';
  if (event.status === 'live') return 'live';
  if (eventDate < now) return 'overdue';
  if (event.status === 'draft') return 'draft';
  
  return 'scheduled';
};

export const getEventStatusColor = (status) => {
  const colors = {
    draft: '#gray',
    scheduled: '#blue',
    live: '#green',
    ended: '#purple',
    overdue: '#red'
  };
  return colors[status] || '#gray';
};

export const getComputedEventStatus = (event) => {
  if (!event || !event.event_date) {
    return 'upcoming';
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0); // Start of today
  
  const eventDate = new Date(event.event_date);
  eventDate.setHours(0, 0, 0, 0); // Start of event day

  // Manual 'live' override takes priority
  // (Admin manually set this event as live)
  if (event.status === 'live') {
    return 'live';
  }

  // Date-based automatic status
  if (eventDate < now) {
    return 'ended';
  }

  if (eventDate.getTime() === now.getTime()) {
    return 'today';
  }

  // Future event
  return 'upcoming';
};

// ===== FINANCIAL HELPERS =====

export const calculateProfitMargin = (income, expenses) => {
  if (!income || income === 0) return 0;
  return ((income - expenses) / income) * 100;
};

export const getFinancialStatus = (actual, goal) => {
  const percentage = calculatePercentage(actual, goal);
  
  if (percentage >= 100) return 'achieved';
  if (percentage >= 75) return 'on-track';
  if (percentage >= 50) return 'moderate';
  if (percentage >= 25) return 'behind';
  return 'poor';
};

export const formatFinancialSummary = (data) => {
  return {
    total_income: formatCurrency(data.total_income),
    total_expenses: formatCurrency(data.total_expenses),
    net_profit: formatCurrency(data.net_profit),
    profit_margin: `${calculateProfitMargin(data.total_income, data.total_expenses).toFixed(1)}%`
  };
};

// ===== SUPPORTER HELPERS =====

export const getSupporterTypeIcon = (type) => {
  const icons = {
    volunteer: '👤',
    donor: '🎁',
    sponsor: '🏢'
  };
  return icons[type] || '👤';
};

export const getSupporterTypeColor = (type) => {
  const colors = {
    volunteer: '#blue',
    donor: '#green', 
    sponsor: '#purple'
  };
  return colors[type] || '#gray';
};

// ===== ERROR HELPERS =====

export const createErrorResponse = (message, code = 'UNKNOWN_ERROR', details = null) => {
  return {
    error: {
      message,
      code,
      details,
      timestamp: new Date().toISOString()
    }
  };
};

export const createSuccessResponse = (data, message = 'Success') => {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  };
};

// ===== LOGGING HELPERS =====

export const logInfo = (message, data = null) => {
  console.log(`ℹ️  ${new Date().toISOString()} - ${message}`, data ? data : '');
};

export const logError = (message, error = null) => {
  console.error(`❌ ${new Date().toISOString()} - ${message}`, error ? error : '');
};

export const logSuccess = (message, data = null) => {
  console.log(`✅ ${new Date().toISOString()} - ${message}`, data ? data : '');
};
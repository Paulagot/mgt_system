// client/src/components/financial/ClubExpenseManager.tsx
// Manages ALL expenses for the entire club (club-level, campaign-level, and event-level)

import { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Edit3, AlertCircle,
  CheckCircle, Clock, TrendingDown, PieChart, Filter,
  Building2, Target, CalendarDays
} from 'lucide-react';
import { Expense, CreateExpenseForm, Campaign, Event } from '../../types/types';
import financialService from '../../services/financialServices';
import ExpenseFormModal from './ExpenseFormModal';

interface ClubExpenseManagerProps {
  clubId: string;
  campaigns: Campaign[];
  events: Event[];
  onDataChange?: () => void; // Callback to refresh parent data
}

export default function ClubExpenseManager({
  clubId,
  campaigns,
  events,
  onDataChange
}: ClubExpenseManagerProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  
  // Filters
  const [filterLevel, setFilterLevel] = useState<'all' | 'club' | 'campaign' | 'event'>('all');
  const [filterCampaign, setFilterCampaign] = useState<string>('');
  const [filterEvent, setFilterEvent] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const expenseCategories = [
    'Venue', 'Prizes', 'Marketing', 'Supplies', 'Food & Drink', 
    'Equipment', 'Transport', 'Insurance', 'Staff', 'Other'
  ];

  // Load all expenses on mount
  useEffect(() => {
    loadAllExpenses();
  }, [clubId]);

  const loadAllExpenses = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load club-level expenses
      const clubExpenses = await financialService.getClubExpenses(clubId);

      // Load campaign expenses for each campaign
      const campaignExpensesPromises = campaigns.map(c => 
        financialService.getCampaignExpenses(c.id).catch(() => [])
      );
      const campaignExpensesArrays = await Promise.all(campaignExpensesPromises);
      const campaignExpenses = campaignExpensesArrays.flat();

      // Load event expenses for each event
      const eventExpensesPromises = events.map(e => 
        financialService.getEventExpenses(e.id).catch(() => [])
      );
      const eventExpensesArrays = await Promise.all(eventExpensesPromises);
      const eventExpenses = eventExpensesArrays.flat();

      // Combine all expenses
      const allExpenses = [...clubExpenses, ...campaignExpenses, ...eventExpenses];
      
      // Normalize amounts to ensure they're numbers
      const normalizedExpenses = allExpenses.map(exp => ({
        ...exp,
        amount: Number(exp.amount) || 0
      }));
      
      // Sort by date (newest first)
      normalizedExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setExpenses(normalizedExpenses);
    } catch (err: any) {
      console.error('Failed to load expenses:', err);
      setError(err.message || 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  // Modal handlers
  const handleCreateExpense = async (data: CreateExpenseForm & { status?: string }) => {
    try {
      setLoading(true);
      
      // Determine which create method based on assignment
      if (data.event_id) {
        await financialService.createEventExpense(data.event_id, data);
      } else if (data.campaign_id) {
        await financialService.createCampaignExpense(data.campaign_id, data);
      } else {
        await financialService.createClubExpense(clubId, data);
      }
      
      await loadAllExpenses();
      setShowExpenseModal(false);
      
      // Trigger parent refresh to update campaign/event cards
      if (onDataChange) {
        onDataChange();
      }
    } catch (err: any) {
      console.error('Failed to create expense:', err);
      throw err; // Let modal handle error display
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateExpense = async (data: CreateExpenseForm & { status?: string }) => {
    if (!editingExpense) return;
    
    try {
      setLoading(true);
      
      const updateData: any = {
        ...data,
        event_id: data.event_id || null,
        campaign_id: data.campaign_id || null
      };
      
      await financialService.updateExpense(editingExpense.id, updateData);
      await loadAllExpenses();
      setShowExpenseModal(false);
      setEditingExpense(null);
      
      // Trigger parent refresh to update campaign/event cards
      if (onDataChange) {
        onDataChange();
      }
    } catch (err: any) {
      console.error('Failed to update expense:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setShowExpenseModal(true);
  };

  const handleDelete = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      setLoading(true);
      await financialService.deleteExpense(expenseId);
      await loadAllExpenses();
      
      // Trigger parent refresh to update campaign/event cards
      if (onDataChange) {
        onDataChange();
      }
    } catch (err: any) {
      console.error('Failed to delete expense:', err);
      setError(err.message || 'Failed to delete expense');
    } finally {
      setLoading(false);
    }
  };

  // Filter expenses based on selected filters
  const filteredExpenses = expenses.filter(expense => {
    // Level filter
    if (filterLevel === 'club' && (expense.event_id || expense.campaign_id)) return false;
    if (filterLevel === 'campaign' && !expense.campaign_id) return false;
    if (filterLevel === 'event' && !expense.event_id) return false;
    
    // Campaign filter
    if (filterCampaign && expense.campaign_id !== filterCampaign) return false;
    
    // Event filter
    if (filterEvent && expense.event_id !== filterEvent) return false;
    
    // Status filter
    if (filterStatus && expense.status !== filterStatus) return false;
    
    // Category filter
    if (filterCategory && expense.category !== filterCategory) return false;
    
    // Date range filter
    if (filterDateFrom) {
      const expenseDate = new Date(expense.date);
      const fromDate = new Date(filterDateFrom);
      if (expenseDate < fromDate) return false;
    }
    
    if (filterDateTo) {
      const expenseDate = new Date(expense.date);
      const toDate = new Date(filterDateTo);
      toDate.setHours(23, 59, 59, 999); // Include entire end date
      if (expenseDate > toDate) return false;
    }
    
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedExpenses = filteredExpenses.slice(startIndex, startIndex + itemsPerPage);

  // Calculate totals with safe number conversion
  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
  const approvedExpenses = filteredExpenses
    .filter(exp => exp.status === 'approved' || exp.status === 'paid')
    .reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
  const pendingExpenses = filteredExpenses
    .filter(exp => exp.status === 'pending')
    .reduce((sum, exp) => sum + Number(exp.amount || 0), 0);

  // Calculate category totals
  const categoryTotals = filteredExpenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount || 0);
    return acc;
  }, {} as Record<string, number>);

  // Helper functions
  const getExpenseLevel = (expense: Expense): string => {
    if (expense.event_id) return 'Event';
    if (expense.campaign_id) return 'Campaign';
    return 'Club';
  };

  const getLevelColor = (expense: Expense): string => {
    if (expense.event_id) return 'bg-purple-100 text-purple-800';
    if (expense.campaign_id) return 'bg-blue-100 text-blue-800';
    return 'bg-red-100 text-red-800';
  };

  const getLevelIcon = (expense: Expense) => {
    if (expense.event_id) return <CalendarDays className="h-3 w-3" />;
    if (expense.campaign_id) return <Target className="h-3 w-3" />;
    return <Building2 className="h-3 w-3" />;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-3 w-3" />;
      case 'approved':
        return <CheckCircle className="h-3 w-3" />;
      case 'pending':
        return <Clock className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const formatDateString = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IE', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const clearFilters = () => {
    setFilterLevel('all');
    setFilterCampaign('');
    setFilterEvent('');
    setFilterStatus('');
    setFilterCategory('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setCurrentPage(1);
  };

  if (loading && expenses.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Expense Management</h2>
          <p className="mt-1 text-sm text-gray-600">
            Track and manage all expenses for your club, campaigns, and events
          </p>
        </div>
        <button
          onClick={() => {
            setEditingExpense(null);
            setShowExpenseModal(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Expense
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </h3>
          {(filterLevel !== 'all' || filterCampaign || filterEvent || filterStatus || filterCategory || filterDateFrom || filterDateTo) && (
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear All Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Level Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Level
            </label>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="all">All Levels</option>
              <option value="club">Club Level</option>
              <option value="campaign">Campaign</option>
              <option value="event">Event</option>
            </select>
          </div>

          {/* Campaign Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campaign
            </label>
            <select
              value={filterCampaign}
              onChange={(e) => setFilterCampaign(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="">All Campaigns</option>
              {campaigns.map(campaign => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
          </div>

          {/* Event Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event
            </label>
            <select
              value={filterEvent}
              onChange={(e) => setFilterEvent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="">All Events</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {expenseCategories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date From
            </label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date To
            </label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-2 rounded-lg bg-red-100">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-lg font-bold text-red-600">
                {financialService.formatCurrency(isNaN(totalExpenses) ? 0 : totalExpenses, 'GBP')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-2 rounded-lg bg-green-100">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-lg font-bold text-green-600">
                {financialService.formatCurrency(isNaN(approvedExpenses) ? 0 : approvedExpenses, 'GBP')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-2 rounded-lg bg-yellow-100">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-lg font-bold text-yellow-600">
                {financialService.formatCurrency(isNaN(pendingExpenses) ? 0 : pendingExpenses, 'GBP')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-2 rounded-lg bg-blue-100">
              <PieChart className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Showing</p>
              <p className="text-lg font-bold text-blue-600">{filteredExpenses.length} / {expenses.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Expense History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    {expenses.length === 0 
                      ? "No expenses yet. Click 'Add Expense' to get started."
                      : "No expenses match your filters."}
                  </td>
                </tr>
              ) : (
                paginatedExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelColor(expense)}`}>
                        {getLevelIcon(expense)}
                        <span className="ml-1">{getExpenseLevel(expense)}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{expense.description}</div>
                        {expense.vendor && <div className="text-sm text-gray-500">{expense.vendor}</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {financialService.formatCurrency(expense.amount, 'GBP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateString(expense.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(expense.status)}`}>
                        {getStatusIcon(expense.status)}
                        <span className="ml-1 capitalize">{expense.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button onClick={() => handleEdit(expense)} disabled={loading} className="text-blue-600 hover:text-blue-900">
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(expense.id)} disabled={loading} className="text-red-600 hover:text-red-900">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredExpenses.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700">Rows per page:</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
              
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                First
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Category Breakdown */}
      {Object.keys(categoryTotals).length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Category Breakdown</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(categoryTotals).map(([category, amount]) => (
                <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">{category}</span>
                  <span className="text-sm font-bold text-gray-900">
                    {financialService.formatCurrency(amount, 'GBP')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Expense Form Modal */}
      <ExpenseFormModal
        isOpen={showExpenseModal}
        onClose={() => {
          setShowExpenseModal(false);
          setEditingExpense(null);
        }}
        onSubmit={editingExpense ? handleUpdateExpense : handleCreateExpense}
        editMode={!!editingExpense}
        existingExpense={editingExpense || undefined}
        campaigns={campaigns}
        events={events}
      />
    </div>
  );
}
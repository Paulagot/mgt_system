// client/src/components/financial/EventExpenseManager.tsx
// client/src/components/financial/EventExpenseManager.tsx
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Receipt, 
  DollarSign, 
  Calendar, 
  CreditCard, 
  Trash2, 
  Edit3, 
  Upload,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingDown,
  PieChart
} from 'lucide-react';
import { Expense, CreateExpenseForm } from '../../types/types';
import financialService from '../../services/financialServices';

// Local form interface that handles string dates for form inputs
interface ExpenseFormData {
  category: string;
  description: string;
  amount: number;
  date: string;
  vendor?: string;
  payment_method: 'cash' | 'card' | 'transfer' | 'cheque' | 'other';
  receipt_url?: string;
  event_id?: string;
  status?: 'pending' | 'approved' | 'paid';
}

interface EventExpenseManagerProps {
  eventId: string;
  eventTitle: string;
}

export default function EventExpenseManager({
  eventId,
  eventTitle
}: EventExpenseManagerProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<string | null>(null);
  const [formData, setFormData] = useState<ExpenseFormData>({
    category: '',
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    vendor: '',
    payment_method: 'card',
    receipt_url: '',
    event_id: eventId,
    status: 'pending'
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const expenseCategories = [
    'Venue', 'Prizes', 'Marketing', 'Supplies', 'Food & Drink', 
    'Equipment', 'Transport', 'Insurance', 'Staff', 'Other'
  ];

  // Load expenses on mount
  useEffect(() => {
    loadExpenses();
  }, [eventId]);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await financialService.getEventExpenses(eventId);
      setExpenses(data);
    } catch (err: any) {
      console.error('Failed to load expenses:', err);
      setError(err.message || 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    let processedValue: any = value;
    
    if (name === 'amount') {
      processedValue = value ? parseFloat(value) : 0;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
    
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    // Use the FinancialService validation
    const expenseData: CreateExpenseForm = {
      category: formData.category,
      description: formData.description,
      amount: formData.amount,
      date: formData.date,
      vendor: formData.vendor,
      payment_method: formData.payment_method,
      receipt_url: formData.receipt_url,
      event_id: eventId
    };

    const validationErrors = financialService.validateExpenseData(expenseData);
    
    if (validationErrors.length > 0) {
      const errorObj: Record<string, string> = {};
      validationErrors.forEach(error => {
        // Parse error message to extract field name
        if (error.includes('Category')) errorObj.category = error;
        else if (error.includes('Description')) errorObj.description = error;
        else if (error.includes('Amount')) errorObj.amount = error;
        else if (error.includes('Date')) errorObj.date = error;
      });
      setFormErrors(errorObj);
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      if (editingExpense) {
        // Update existing expense
        const updateData: Partial<CreateExpenseForm> = {
          category: formData.category,
          description: formData.description,
          amount: formData.amount,
          date: formData.date,
          vendor: formData.vendor,
          payment_method: formData.payment_method,
          receipt_url: formData.receipt_url
        };
        
        await financialService.updateExpense(editingExpense, updateData);
      } else {
        // Create new expense
        const expenseData: CreateExpenseForm = {
          category: formData.category,
          description: formData.description,
          amount: formData.amount,
          date: formData.date,
          vendor: formData.vendor,
          payment_method: formData.payment_method,
          receipt_url: formData.receipt_url,
          event_id: eventId
        };
        
        await financialService.createEventExpense(eventId, expenseData);
      }
      
      // Reload expenses
      await loadExpenses();
      resetForm();
    } catch (err: any) {
      console.error('Failed to save expense:', err);
      setError(err.message || 'Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      category: '',
      description: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      vendor: '',
      payment_method: 'card',
      receipt_url: '',
      event_id: eventId,
      status: 'pending'
    });
    setShowAddForm(false);
    setEditingExpense(null);
    setFormErrors({});
  };

  const handleEdit = (expense: Expense) => {
    setFormData({
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      date: expense.date,
      vendor: expense.vendor || '',
      payment_method: expense.payment_method,
      receipt_url: expense.receipt_url || '',
      event_id: eventId,
      status: expense.status
    });
    setEditingExpense(expense.id);
    setShowAddForm(true);
  };

  const handleDelete = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      setLoading(true);
      await financialService.deleteExpense(expenseId);
      await loadExpenses();
    } catch (err: any) {
      console.error('Failed to delete expense:', err);
      setError(err.message || 'Failed to delete expense');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'approved':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    const badge = financialService.getExpenseStatusBadge(status);
    const colorMap: Record<string, string> = {
      yellow: 'bg-yellow-100 text-yellow-800',
      blue: 'bg-blue-100 text-blue-800',
      green: 'bg-green-100 text-green-800'
    };
    return colorMap[badge.color] || 'bg-gray-100 text-gray-800';
  };

  const formatDateString = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  // Calculate totals
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const paidExpenses = expenses.filter(e => e.status === 'paid').reduce((sum, expense) => sum + expense.amount, 0);
  const pendingExpenses = expenses.filter(e => e.status === 'pending').reduce((sum, expense) => sum + expense.amount, 0);

  const categoryTotals = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

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
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Event Expenses</h2>
          <p className="text-sm text-gray-600">{eventTitle}</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          disabled={loading}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center disabled:opacity-50"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Expense
        </button>
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
                {financialService.formatCurrency(totalExpenses, 'GBP')}
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
              <p className="text-sm font-medium text-gray-600">Paid</p>
              <p className="text-lg font-bold text-green-600">
                {financialService.formatCurrency(paidExpenses, 'GBP')}
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
                {financialService.formatCurrency(pendingExpenses, 'GBP')}
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
              <p className="text-sm font-medium text-gray-600">Categories</p>
              <p className="text-lg font-bold text-blue-600">{Object.keys(categoryTotals).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Expense Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingExpense ? 'Edit Expense' : 'Add New Expense'}
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    formErrors.category ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select category...</option>
                  {expenseCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                {formErrors.category && <p className="mt-1 text-sm text-red-600">{formErrors.category}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 ${
                      formErrors.amount ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>
                {formErrors.amount && <p className="mt-1 text-sm text-red-600">{formErrors.amount}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 ${
                  formErrors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Brief description of the expense..."
              />
              {formErrors.description && <p className="mt-1 text-sm text-red-600">{formErrors.description}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 ${
                      formErrors.date ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                </div>
                {formErrors.date && <p className="mt-1 text-sm text-red-600">{formErrors.date}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  name="payment_method"
                  value={formData.payment_method}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="card">Card</option>
                  <option value="cash">Cash</option>
                  <option value="transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vendor/Supplier
              </label>
              <input
                type="text"
                name="vendor"
                value={formData.vendor}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Who was this paid to?"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={resetForm}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : editingExpense ? 'Update Expense' : 'Add Expense'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expenses List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Expense History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No expenses yet. Click "Add Expense" to get started.
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{expense.description}</div>
                        {expense.vendor && (
                          <div className="text-sm text-gray-500">{expense.vendor}</div>
                        )}
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
                        <button
                          onClick={() => handleEdit(expense)}
                          disabled={loading}
                          className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          disabled={loading}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        >
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
    </div>
  );
}
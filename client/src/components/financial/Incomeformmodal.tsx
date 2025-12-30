// client/src/components/financial/IncomeFormModal.tsx
// Reusable modal form for creating/editing income

import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, Building2, Target, CalendarDays, AlertCircle } from 'lucide-react';
import { Income, CreateIncomeForm, Campaign, Event } from '../../types/types';
import financialService from '../../services/financialServices';

interface IncomeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateIncomeForm) => Promise<void>;
  editMode?: boolean;
  existingIncome?: Income;
  campaigns: Campaign[];
  events: Event[];
  // Optional pre-filled values for quick actions
  defaultEventId?: string;
  defaultCampaignId?: string;
  defaultClubWide?: boolean;
}

export default function IncomeFormModal({
  isOpen,
  onClose,
  onSubmit,
  editMode = false,
  existingIncome,
  campaigns,
  events,
  defaultEventId,
  defaultCampaignId,
  defaultClubWide = false
}: IncomeFormModalProps) {
  const [formData, setFormData] = useState<CreateIncomeForm>({
    source: '',
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    reference: '',
    event_id: defaultEventId || undefined,
    campaign_id: defaultCampaignId || undefined
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const incomeSources = [
    'Ticket Sales',
    'Sponsorship',
    'Donation',
    'Membership Fees',
    'Merchandise',
    'Fundraising Event',
    'Grant',
    'Allocated Funds',
    'Other'
  ];

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (editMode && existingIncome) {
        // Edit mode - populate with existing data
        const dateOnly = existingIncome.date.split('T')[0];
        setFormData({
          source: existingIncome.source,
          description: existingIncome.description,
          amount: Number(existingIncome.amount),
          date: dateOnly,
          payment_method: existingIncome.payment_method || 'cash',
          reference: existingIncome.reference || '',
          event_id: existingIncome.event_id || undefined,
          campaign_id: existingIncome.campaign_id || undefined
        });
      } else {
        // Create mode - use defaults
        setFormData({
          source: '',
          description: '',
          amount: 0,
          date: new Date().toISOString().split('T')[0],
          payment_method: 'cash',
          reference: '',
          event_id: defaultEventId || undefined,
          campaign_id: defaultCampaignId || undefined
        });
      }
      setFormErrors({});
    }
  }, [isOpen, editMode, existingIncome, defaultEventId, defaultCampaignId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    let processedValue: any = value;
    
    if (name === 'amount') {
      processedValue = value ? parseFloat(value) : 0;
    }
    
    if (name === 'date' && value) {
      processedValue = value.split('T')[0];
    }
    
    // If user selects an event, clear campaign selection
    if (name === 'event_id' && value) {
      setFormData(prev => ({ ...prev, campaign_id: undefined, [name]: value || undefined }));
      return;
    }
    
    // If user selects a campaign, clear event selection
    if (name === 'campaign_id' && value) {
      setFormData(prev => ({ ...prev, event_id: undefined, [name]: value || undefined }));
      return;
    }
    
    setFormData(prev => ({ ...prev, [name]: processedValue }));
    
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const incomeData: CreateIncomeForm = {
      source: formData.source,
      description: formData.description,
      amount: formData.amount,
      date: formData.date,
      payment_method: formData.payment_method,
      reference: formData.reference,
      event_id: formData.event_id,
      campaign_id: formData.campaign_id
    };

    const validationErrors = financialService.validateIncomeData(incomeData);
    
    if (validationErrors.length > 0) {
      const errorObj: Record<string, string> = {};
      validationErrors.forEach(error => {
        if (error.includes('Source')) errorObj.source = error;
        else if (error.includes('Description')) errorObj.description = error;
        else if (error.includes('Amount')) errorObj.amount = error;
        else if (error.includes('Date')) errorObj.date = error;
        else if (error.includes('both')) errorObj.general = error;
      });
      setFormErrors(errorObj);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setFormErrors({ general: err.message || 'Failed to save income record' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {editMode ? 'Edit Income' : 'Record New Income'}
            </h2>
            {editMode && existingIncome && (
              <p className="text-sm text-gray-500 mt-1">ID: {existingIncome.id}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isSubmitting}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* General Error Message */}
          {formErrors.general && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <p className="text-sm text-red-800">{formErrors.general}</p>
              </div>
            </div>
          )}

          {/* Level Selection */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign To *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, event_id: undefined, campaign_id: undefined }))}
                className={`p-3 border-2 rounded-lg flex items-center justify-center transition-colors ${
                  !formData.event_id && !formData.campaign_id
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Building2 className="h-5 w-5 mr-2" />
                Club-wide
              </button>
              
              <select
                name="campaign_id"
                value={formData.campaign_id || ''}
                onChange={handleInputChange}
                className={`px-3 py-2 border-2 rounded-lg transition-colors ${
                  formData.campaign_id
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-300'
                }`}
              >
                <option value="">Select Campaign...</option>
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              
              <select
                name="event_id"
                value={formData.event_id || ''}
                onChange={handleInputChange}
                className={`px-3 py-2 border-2 rounded-lg transition-colors ${
                  formData.event_id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300'
                }`}
              >
                <option value="">Select Event...</option>
                {events.map(e => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </select>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Choose where this income belongs: club-wide, a specific campaign, or a specific event
            </p>
          </div>

          {/* Source and Amount */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Income Source *</label>
              <select
                name="source"
                value={formData.source}
                onChange={handleInputChange}
                required
                className={`w-full px-3 py-2 border rounded-md ${formErrors.source ? 'border-red-300' : 'border-gray-300'}`}
              >
                <option value="">Select source...</option>
                {incomeSources.map(source => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
              {formErrors.source && <p className="mt-1 text-sm text-red-600">{formErrors.source}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  required
                  className={`w-full pl-10 pr-3 py-2 border rounded-md ${formErrors.amount ? 'border-red-300' : 'border-gray-300'}`}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
              {formErrors.amount && <p className="mt-1 text-sm text-red-600">{formErrors.amount}</p>}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              className={`w-full px-3 py-2 border rounded-md ${formErrors.description ? 'border-red-300' : 'border-gray-300'}`}
              placeholder="Brief description of the income..."
            />
            {formErrors.description && <p className="mt-1 text-sm text-red-600">{formErrors.description}</p>}
          </div>

          {/* Date, Payment Method, Reference */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                  className={`w-full pl-10 pr-3 py-2 border rounded-md ${formErrors.date ? 'border-red-300' : 'border-gray-300'}`}
                />
              </div>
              {formErrors.date && <p className="mt-1 text-sm text-red-600">{formErrors.date}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select
                name="payment_method"
                value={formData.payment_method}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="sponsorship">Sponsorship</option>
                <option value="donation">Donation</option>
                <option value="ticket_sales">Ticket Sales</option>
                <option value="allocated_funds">Allocated Funds</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
              <input
                type="text"
                name="reference"
                value={formData.reference}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Receipt/Invoice #"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center"
            >
              {isSubmitting && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              )}
              {isSubmitting ? 'Saving...' : editMode ? 'Update Income' : 'Record Income'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
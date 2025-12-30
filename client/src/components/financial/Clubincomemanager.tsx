// client/src/components/financial/ClubIncomeManager.tsx
// Manages ALL income for the entire club (club-level, campaign-level, and event-level)

import React, { useState, useEffect } from 'react';
import { 
  Plus, DollarSign, Calendar, Trash2, Edit3, AlertCircle,
  TrendingUp, PieChart, Filter, Download,
  Building2, Target, CalendarDays
} from 'lucide-react';
import { Income, CreateIncomeForm, Campaign, Event } from '../../types/types';
import financialService from '../../services/financialServices';
import IncomeFormModal from './Incomeformmodal';

interface ClubIncomeManagerProps {
  clubId: string;
  campaigns: Campaign[];
  events: Event[];
  onDataChange?: () => void; // Callback to refresh parent data
}

export default function ClubIncomeManager({
  clubId,
  campaigns,
  events,
  onDataChange
}: ClubIncomeManagerProps) {
  const [income, setIncome] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  
  // Filters
  const [filterLevel, setFilterLevel] = useState<'all' | 'club' | 'campaign' | 'event'>('all');
  const [filterCampaign, setFilterCampaign] = useState<string>('');
  const [filterEvent, setFilterEvent] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [filterSource, setFilterSource] = useState<string>('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

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

  const paymentMethods = [
    'cash', 'card', 'transfer', 'cheque', 'sponsorship', 
    'donation', 'ticket_sales', 'allocated_funds', 'other'
  ];

  // Load all income on mount
  useEffect(() => {
    loadAllIncome();
  }, [clubId]);

  const loadAllIncome = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load club-level income
      const clubIncome = await financialService.getClubIncome(clubId);

      // Load campaign income for each campaign
      const campaignIncomePromises = campaigns.map(c => 
        financialService.getCampaignIncome(c.id).catch(() => [])
      );
      const campaignIncomeArrays = await Promise.all(campaignIncomePromises);
      const campaignIncome = campaignIncomeArrays.flat();

      // Load event income for each event
      const eventIncomePromises = events.map(e => 
        financialService.getEventIncome(e.id).catch(() => [])
      );
      const eventIncomeArrays = await Promise.all(eventIncomePromises);
      const eventIncome = eventIncomeArrays.flat();

      // Combine all income
      const allIncome = [...clubIncome, ...campaignIncome, ...eventIncome];
      
      // Normalize amounts to ensure they're numbers
      const normalizedIncome = allIncome.map(inc => ({
        ...inc,
        amount: Number(inc.amount) || 0
      }));
      
      // Sort by date (newest first)
      normalizedIncome.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setIncome(normalizedIncome);
    } catch (err: any) {
      console.error('Failed to load income:', err);
      setError(err.message || 'Failed to load income');
    } finally {
      setLoading(false);
    }
  };

  // Modal handlers
  const handleCreateIncome = async (data: CreateIncomeForm) => {
    try {
      setLoading(true);
      
      // Determine which create method based on assignment
      if (data.event_id) {
        await financialService.createEventIncome(data.event_id, data);
      } else if (data.campaign_id) {
        await financialService.createCampaignIncome(data.campaign_id, data);
      } else {
        await financialService.createClubIncome(clubId, data);
      }
      
      await loadAllIncome();
      setShowIncomeModal(false);
      
      // Trigger parent refresh to update campaign/event cards
      if (onDataChange) {
        onDataChange();
      }
    } catch (err: any) {
      console.error('Failed to create income:', err);
      throw err; // Let modal handle error display
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateIncome = async (data: CreateIncomeForm) => {
    if (!editingIncome) return;
    
    try {
      setLoading(true);
      
      const updateData: any = {
        ...data,
        event_id: data.event_id || null,
        campaign_id: data.campaign_id || null
      };
      
      await financialService.updateIncome(editingIncome.id, updateData);
      await loadAllIncome();
      setShowIncomeModal(false);
      setEditingIncome(null);
      
      // Trigger parent refresh to update campaign/event cards
      if (onDataChange) {
        onDataChange();
      }
    } catch (err: any) {
      console.error('Failed to update income:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (incomeRecord: Income) => {
    setEditingIncome(incomeRecord);
    setShowIncomeModal(true);
  };

  const handleDelete = async (incomeId: string) => {
    if (!confirm('Are you sure you want to delete this income record?')) return;

    try {
      setLoading(true);
      await financialService.deleteIncome(incomeId);
      await loadAllIncome();
      
      // Trigger parent refresh to update campaign/event cards
      if (onDataChange) {
        onDataChange();
      }
    } catch (err: any) {
      console.error('Failed to delete income:', err);
      setError(err.message || 'Failed to delete income');
    } finally {
      setLoading(false);
    }
  };

  // Filter income based on selected filters
  const filteredIncome = income.filter(inc => {
    // Level filter
    if (filterLevel === 'club' && (inc.event_id || inc.campaign_id)) return false;
    if (filterLevel === 'campaign' && !inc.campaign_id) return false;
    if (filterLevel === 'event' && !inc.event_id) return false;
    
    // Campaign filter
    if (filterCampaign && inc.campaign_id !== filterCampaign) return false;
    
    // Event filter
    if (filterEvent && inc.event_id !== filterEvent) return false;
    
    // Source filter
    if (filterSource && inc.source !== filterSource) return false;

    // Payment method filter
    if (filterPaymentMethod && inc.payment_method !== filterPaymentMethod) return false;
    
    // Date range filter
    if (filterDateFrom) {
      const incomeDate = new Date(inc.date);
      const fromDate = new Date(filterDateFrom);
      if (incomeDate < fromDate) return false;
    }
    
    if (filterDateTo) {
      const incomeDate = new Date(inc.date);
      const toDate = new Date(filterDateTo);
      toDate.setHours(23, 59, 59, 999); // Include entire end date
      if (incomeDate > toDate) return false;
    }
    
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredIncome.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedIncome = filteredIncome.slice(startIndex, startIndex + itemsPerPage);

  // Calculate totals
  const totalIncome = filteredIncome.reduce((sum, inc) => sum + Number(inc.amount || 0), 0);

  // Calculate source breakdown
  const sourceTotals = filteredIncome.reduce((acc, inc) => {
    acc[inc.source] = (acc[inc.source] || 0) + Number(inc.amount || 0);
    return acc;
  }, {} as Record<string, number>);

  // Helper functions
  const getIncomeLevel = (inc: Income): string => {
    if (inc.event_id) return 'Event';
    if (inc.campaign_id) return 'Campaign';
    return 'Club';
  };

  const getLevelColor = (inc: Income): string => {
    if (inc.event_id) return 'bg-purple-100 text-purple-800';
    if (inc.campaign_id) return 'bg-blue-100 text-blue-800';
    return 'bg-green-100 text-green-800';
  };

  const getLevelIcon = (inc: Income) => {
    if (inc.event_id) return <CalendarDays className="h-3 w-3" />;
    if (inc.campaign_id) return <Target className="h-3 w-3" />;
    return <Building2 className="h-3 w-3" />;
  };

  const formatDateString = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IE', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const handleExportCSV = () => {
    const csvContent = financialService.exportIncomeToCSV(filteredIncome);
    financialService.downloadCSV(csvContent, `club-income-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const clearFilters = () => {
    setFilterLevel('all');
    setFilterCampaign('');
    setFilterEvent('');
    setFilterSource('');
    setFilterPaymentMethod('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setCurrentPage(1);
  };

  if (loading && income.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading income records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Income Management</h2>
          <p className="mt-1 text-sm text-gray-600">
            Track and manage all income for your club, campaigns, and events
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportCSV}
            disabled={filteredIncome.length === 0}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
          <button
            onClick={() => {
              setEditingIncome(null);
              setShowIncomeModal(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Record Income
          </button>
        </div>
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
          {(filterLevel !== 'all' || filterCampaign || filterEvent || filterSource || filterPaymentMethod || filterDateFrom || filterDateTo) && (
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">All Events</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>
          </div>

          {/* Source Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Source
            </label>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">All Sources</option>
              {incomeSources.map(source => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method
            </label>
            <select
              value={filterPaymentMethod}
              onChange={(e) => setFilterPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">All Methods</option>
              {paymentMethods.map(method => (
                <option key={method} value={method}>
                  {financialService.getPaymentMethodLabel(method)}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-2 rounded-lg bg-green-100">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Income</p>
              <p className="text-lg font-bold text-green-600">
                {financialService.formatCurrency(isNaN(totalIncome) ? 0 : totalIncome, 'GBP')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-2 rounded-lg bg-purple-100">
              <DollarSign className="h-5 w-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Records</p>
              <p className="text-lg font-bold text-purple-600">{filteredIncome.length}</p>
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
              <p className="text-lg font-bold text-blue-600">{filteredIncome.length} / {income.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Income Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Income History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedIncome.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    {income.length === 0 
                      ? "No income records yet. Click 'Record Income' to get started."
                      : "No income matches your filters."}
                  </td>
                </tr>
              ) : (
                paginatedIncome.map((incomeRecord) => (
                  <tr key={incomeRecord.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelColor(incomeRecord)}`}>
                        {getLevelIcon(incomeRecord)}
                        <span className="ml-1">{getIncomeLevel(incomeRecord)}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{incomeRecord.description}</div>
                        {incomeRecord.reference && <div className="text-sm text-gray-500">Ref: {incomeRecord.reference}</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {incomeRecord.source}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      {financialService.formatCurrency(incomeRecord.amount, 'GBP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateString(incomeRecord.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {financialService.getPaymentMethodLabel(incomeRecord.payment_method || 'other')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button onClick={() => handleEdit(incomeRecord)} disabled={loading} className="text-blue-600 hover:text-blue-900">
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(incomeRecord.id)} disabled={loading} className="text-red-600 hover:text-red-900">
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
        {filteredIncome.length > 0 && (
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

      {/* Source Breakdown */}
      {Object.keys(sourceTotals).length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Income by Source</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(sourceTotals).map(([source, amount]) => (
                <div key={source} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">{source}</span>
                  <span className="text-sm font-bold text-green-600">
                    {financialService.formatCurrency(amount, 'GBP')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Income Form Modal */}
      <IncomeFormModal
        isOpen={showIncomeModal}
        onClose={() => {
          setShowIncomeModal(false);
          setEditingIncome(null);
        }}
        onSubmit={editingIncome ? handleUpdateIncome : handleCreateIncome}
        editMode={!!editingIncome}
        existingIncome={editingIncome || undefined}
        campaigns={campaigns}
        events={events}
      />
    </div>
  );
}
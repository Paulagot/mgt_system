import React from 'react';
import { 
  Calendar, 
  Users, 
  Target, 
  DollarSign, 
  TrendingDown, 
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  BarChart3
} from 'lucide-react';

import MetricCard from '../cards/MetricCard';
import { Event, Campaign, Supporter, DashboardMetrics } from '../../types/types';

interface OverviewTabProps {
  metrics: DashboardMetrics;
  financialData: {
    monthly_expenses: number;
    net_profit: number;
    pending_expenses: number;
    monthly_income: number;
  };
  upcomingEvents: Event[];
  campaigns: Campaign[];
  getCampaignName: (id?: string) => string | undefined;
  onEditEvent: (event: Event) => void;
  onDeleteEvent: (id: string) => void;
  onViewEvent: (event: Event) => void;
  onEditCampaign: (campaign: Campaign) => void;
  onDeleteCampaign: (id: string) => void;
  onViewCampaign: (campaign: Campaign) => void;
  onNavigateToTab?: (tab: string) => void; // NEW: Navigate to different tabs
}

const OverviewTab: React.FC<OverviewTabProps> = ({
  metrics,
  financialData,
  upcomingEvents,
  campaigns,
  getCampaignName,
  onEditEvent,
  onDeleteEvent,
  onViewEvent,
  onEditCampaign,
  onDeleteCampaign,
  onViewCampaign,
  onNavigateToTab,
}) => {
  // Configuration: How many items to show
  const NUM_EVENTS = 3;
  const NUM_CAMPAIGNS = 3;
  const NUM_SUPPORTERS = 5;
  
  // Get next N upcoming events (already sorted by date from parent)
  const nextEvents = upcomingEvents.slice(0, NUM_EVENTS);
  
  // Get top N campaigns (active campaigns with best progress)
  const now = new Date();
  const topCampaigns = campaigns
    .filter(c => !c.end_date || new Date(c.end_date) >= now) // Only active campaigns
    .sort((a, b) => (b.progress_percentage || 0) - (a.progress_percentage || 0)) // Best performers first
    .slice(0, NUM_CAMPAIGNS);

  const formatCurrency = (amount: number) => `£${amount.toLocaleString()}`;
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short'
    });
  };

  // Calculate days until event
  const getDaysUntil = (dateStr: string) => {
    const eventDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `${diffDays} days`;
    if (diffDays < 14) return '1 week';
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks`;
    return `${Math.floor(diffDays / 30)} months`;
  };

  // Mock tasks data (replace with real data later)
  const mockTasks = {
    total: metrics.totalTasks || 0,
    overdue: metrics.overdueTasks || 0,
    completed: metrics.completedTasks || 0,
    pending: (metrics.totalTasks || 0) - (metrics.completedTasks || 0) - (metrics.overdueTasks || 0)
  };

  return (
    <div className="space-y-6">
      {/* Financial KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          icon={DollarSign}
          title="Total Raised"
          value={formatCurrency(metrics.total_raised)}
          subtitle="This year"
          color="green"
        />
        <MetricCard
          icon={TrendingDown}
          title="Total Expenses"
          value={formatCurrency(financialData.monthly_expenses)}
          subtitle="This year"
          color="red"
        />
        <MetricCard
          icon={TrendingUp}
          title="Net Profit"
          value={formatCurrency(financialData.net_profit)}
          subtitle="This year"
          color="blue"
        />
        <MetricCard
          icon={Target}
          title="Active Campaigns"
          value={metrics.active_campaigns}
          subtitle="In progress"
          color="purple"
        />
        <MetricCard
          icon={Calendar}
          title="Upcoming Events"
          value={metrics.upcoming_events}
          subtitle="Next 30 days"
          color="orange"
        />
      </div>

      {/* Main Grid - 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Upcoming Events List */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              Next {NUM_EVENTS} Events
            </h3>
            <button 
              onClick={() => onNavigateToTab?.('events')}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
            >
              View All <ArrowRight className="h-3 w-3 ml-1" />
            </button>
          </div>
          <div className="p-4 space-y-3">
            {nextEvents.length > 0 ? (
              nextEvents.map((event) => {
                const daysUntil = getDaysUntil(event.event_date);
                return (
                  <div 
                    key={event.id}
                    className="flex items-start p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => onViewEvent(event)}
                  >
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex flex-col items-center justify-center">
                        <span className="text-xs font-bold text-blue-600">
                          {formatDate(event.event_date).split(' ')[0]}
                        </span>
                        <span className="text-xs text-blue-600">
                          {formatDate(event.event_date).split(' ')[1]}
                        </span>
                      </div>
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-500 capitalize">{event.type}</p>
                        <span className="text-xs text-orange-600 font-medium">• {daysUntil}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-xs text-gray-600">
                          Goal: {formatCurrency(event.goal_amount)}
                        </span>
                        <span className="text-xs font-medium text-green-600">
                          {formatCurrency(event.actual_amount || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Calendar className="mx-auto h-10 w-10 mb-2" />
                <p className="text-xs">No upcoming events</p>
              </div>
            )}
          </div>
        </div>

        {/* Middle Column - Campaign Progress */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              Top {NUM_CAMPAIGNS} Active Campaigns
            </h3>
            <button 
              onClick={() => onNavigateToTab?.('campaigns')}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
            >
              View All <ArrowRight className="h-3 w-3 ml-1" />
            </button>
          </div>
          <div className="p-4 space-y-3">
            {topCampaigns.length > 0 ? (
              topCampaigns.map((campaign, index) => {
                const progress = campaign.progress_percentage || 0;
                const isCompleted = progress >= 100;
                const isNearComplete = progress >= 75 && progress < 100;
                
                return (
                  <div 
                    key={campaign.id}
                    className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => onViewCampaign(campaign)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <span className="flex-shrink-0 w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </span>
                        <p className="text-sm font-medium text-gray-900 truncate flex-1">
                          {campaign.name}
                        </p>
                      </div>
                      <span className={`text-xs font-semibold ml-2 ${
                        isCompleted ? 'text-green-600' : 
                        isNearComplete ? 'text-blue-600' : 'text-gray-600'
                      }`}>
                        {Math.round(progress)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          isCompleted ? 'bg-green-500' : 
                          isNearComplete ? 'bg-blue-500' : 
                          progress >= 50 ? 'bg-yellow-500' : 'bg-orange-500'
                        }`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 font-medium">
                        {formatCurrency(campaign.total_raised || 0)}
                      </span>
                      <span className="text-gray-400">
                        of {formatCurrency(campaign.target_amount)}
                      </span>
                    </div>
                    {campaign.end_date && (
                      <div className="mt-1 text-xs text-gray-500">
                        Ends: {formatDate(campaign.end_date)}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Target className="mx-auto h-10 w-10 mb-2" />
                <p className="text-xs">No active campaigns</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Tasks & Top Supporters */}
        <div className="space-y-6">
          
          {/* Tasks Summary */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">My Tasks</h3>
              <button 
                onClick={() => onNavigateToTab?.('tasks')}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
              >
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                  <span className="text-sm text-gray-700">Overdue</span>
                </div>
                <span className="text-lg font-bold text-red-600">{mockTasks.overdue}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-yellow-500 mr-2" />
                  <span className="text-sm text-gray-700">Pending</span>
                </div>
                <span className="text-lg font-bold text-yellow-600">{mockTasks.pending}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-sm text-gray-700">Completed</span>
                </div>
                <span className="text-lg font-bold text-green-600">{mockTasks.completed}</span>
              </div>
            </div>
          </div>

          {/* Top Supporters */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Top {NUM_SUPPORTERS} Supporters
              </h3>
              <button 
                onClick={() => onNavigateToTab?.('supporters')}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
              >
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              {metrics.top_donors.length > 0 ? (
                metrics.top_donors.slice(0, NUM_SUPPORTERS).map((donor, index) => (
                  <div key={donor.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex items-center flex-1 min-w-0">
                      <div className="flex-shrink-0 w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-semibold text-blue-600">{index + 1}</span>
                      </div>
                      <div className="ml-2 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{donor.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{donor.type}</p>
                      </div>
                    </div>
                    {donor.total_donated && (
                      <span className="text-xs font-semibold text-green-600 ml-2">
                        {formatCurrency(donor.total_donated)}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <Users className="mx-auto h-8 w-8 mb-2" />
                  <p className="text-xs">No supporters yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row - Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Supporters</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalSupporters || 0}</p>
            </div>
            <Users className="h-8 w-8 text-gray-400" />
          </div>
          <div className="mt-2 flex gap-2 text-xs">
            <span className="text-gray-600">{metrics.totalDonors || 0} Donors</span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-600">{metrics.totalVolunteers || 0} Volunteers</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Follow-ups</p>
              <p className="text-2xl font-bold text-orange-600">{metrics.pending_follow_ups || 0}</p>
            </div>
            <Clock className="h-8 w-8 text-orange-400" />
          </div>
          <p className="mt-2 text-xs text-gray-500">Contacts requiring attention</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Donation</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(metrics.avgDonation || 0)}
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-green-400" />
          </div>
          <p className="mt-2 text-xs text-gray-500">Per donor average</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Expenses</p>
              <p className="text-2xl font-bold text-yellow-600">
                {formatCurrency(financialData.pending_expenses || 0)}
              </p>
            </div>
            <AlertCircle className="h-8 w-8 text-yellow-400" />
          </div>
          <p className="mt-2 text-xs text-gray-500">Awaiting approval</p>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;

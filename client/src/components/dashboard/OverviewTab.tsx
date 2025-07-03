import React from 'react';
import { 
  Calendar, 
  Users, 
  Target, 
  DollarSign, 
  TrendingDown, 
  TrendingUp 
} from 'lucide-react';

import EventCard from '../cards/EventCard';
import CampaignCard from '../cards/CampaignCard';
import MetricCard from './MetricCard';
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
}) => {
  return (
    <div className="space-y-8">
      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <MetricCard
          icon={DollarSign}
          title="Total Raised"
          value={`£${metrics.total_raised.toLocaleString()}`}
          subtitle="This year"
          color="green"
        />
        <MetricCard
           icon={TrendingDown}
          title="Total Expenses"
          value={`£${financialData.monthly_expenses.toLocaleString()}`}
          subtitle="This year"
          color="red"
        />
        <MetricCard
           icon={TrendingUp}
          title="Net Profit"
          value={`£${financialData.net_profit.toLocaleString()}`}
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

      {/* Upcoming Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Upcoming Events</h2>
            </div>
            <div className="p-6 space-y-4">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onEdit={onEditEvent}
                    onDelete={onDeleteEvent}
                    onView={onViewEvent}
                    campaignName={getCampaignName(event.campaign_id)}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                  <p className="text-sm">No upcoming events</p>
                  <p className="text-xs">Create your first event to get started</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top Supporters */}
        <div>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Top Supporters</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {metrics.top_donors.length > 0 ? (
                  metrics.top_donors.map((donor, index) => (
                    <div key={donor.id} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                          </div>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{donor.name}</p>
                          <p className="text-sm text-gray-500 capitalize">{donor.type}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                    <p className="text-sm">No supporters yet</p>
                    <p className="text-xs">Add supporters to see them here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Campaigns Preview */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Active Campaigns</h2>
        </div>
        <div className="p-6">
          {campaigns.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {campaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  onEdit={onEditCampaign}
                  onDelete={onDeleteCampaign}
                  onView={onViewCampaign}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Target className="mx-auto h-12 w-12 text-gray-300 mb-2" />
              <p className="text-sm">No campaigns yet</p>
              <p className="text-xs">Create your first campaign to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;

import React from 'react';
import { Plus, Target } from 'lucide-react';

interface DashboardHeaderProps {
  clubName?: string;
  userName?: string;
  onNewEvent: () => void;
  onNewCampaign: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  clubName,
  userName,
  onNewEvent,
  onNewCampaign,
}) => (
  <div className="bg-white shadow-sm border-b border-gray-200">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center py-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{clubName || 'FundRaisely Club'}</h1>
          <p className="text-gray-600">Welcome back, {userName || 'friend'}!</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onNewEvent}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Event
          </button>
          <button
            onClick={onNewCampaign}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center"
          >
            <Target className="h-4 w-4 mr-2" />
            New Campaign
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default DashboardHeader;

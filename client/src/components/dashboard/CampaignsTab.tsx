import React from 'react';
import { Campaign } from '../../types/types';
import { Plus, Target } from 'lucide-react';
import CampaignCard from '../cards/CampaignCard';

interface CampaignsTabProps {
  campaigns: Campaign[];
  onCreateCampaign: () => void;
  onEditCampaign: (campaign: Campaign) => void;
  onDeleteCampaign: (campaignId: string) => void;
  onViewCampaign: (campaign: Campaign) => void;
}

const CampaignsTab: React.FC<CampaignsTabProps> = ({
  campaigns,
  onCreateCampaign,
  onEditCampaign,
  onDeleteCampaign,
  onViewCampaign,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Campaigns</h2>
        <button
          onClick={onCreateCampaign}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Campaign
        </button>
      </div>

      {campaigns.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        <div className="text-center py-12">
          <Target className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No campaigns yet</h3>
          <p className="mt-1 text-sm text-gray-500">Create your first campaign to get started</p>
          <button
            onClick={onCreateCampaign}
            className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
          >
            Create Campaign
          </button>
        </div>
      )}
    </div>
  );
};

export default CampaignsTab;

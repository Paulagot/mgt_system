// client/src/components/campaigns/CampaignsTab.tsx (COMPLETE WITH UNPUBLISH)

import React, { useState, useEffect } from 'react';
import { Campaign } from '../../types/types';
import { Plus, Target, Filter } from 'lucide-react';
import CampaignCard from '../cards/CampaignCard';
import AlertModal from '../shared/Alertmodal';

interface TrustStatus {
  canCreateEvent: boolean;
  reason?: string;
  outstandingImpactReports?: number;
  overdueDays?: number;
}

interface CampaignsTabProps {
  campaigns: Campaign[];
  clubId: string;
  onCreateCampaign: () => void;
  onEditCampaign: (campaign: Campaign) => void;
  onDeleteCampaign: (campaignId: string) => void;
  onViewCampaign: (campaign: Campaign) => void;
  onPublishCampaign?: (campaignId: string) => Promise<void>;
  onUnpublishCampaign?: (campaignId: string) => Promise<void>; // NEW
}

const CampaignsTab: React.FC<CampaignsTabProps> = ({
  campaigns,
  clubId,
  onCreateCampaign,
  onEditCampaign,
  onDeleteCampaign,
  onViewCampaign,
  onPublishCampaign,
  onUnpublishCampaign, // NEW
}) => {
  const [showFilter, setShowFilter] = useState<'all' | 'draft' | 'published'>('all');
  const [trustStatus, setTrustStatus] = useState<TrustStatus | null>(null);
  const [showTrustWarning, setShowTrustWarning] = useState(false);
  const [trustWarningMessage, setTrustWarningMessage] = useState('');

  // ✅ Helper function for is_published check
  const isCampaignPublished = (campaign: Campaign): boolean => {
    return Boolean(campaign.is_published);
  };

  useEffect(() => {
    const checkTrust = async () => {
      try {
        const mockTrustStatus: TrustStatus = {
          canCreateEvent: true,
          reason: undefined,
          outstandingImpactReports: 0,
          overdueDays: 0,
        };
        setTrustStatus(mockTrustStatus);
      } catch (error) {
        console.error('Error checking trust status:', error);
      }
    };
    checkTrust();
  }, [clubId]);

  const handlePublish = async (campaignId: string) => {
    if (!trustStatus?.canCreateEvent) {
      setTrustWarningMessage(
        trustStatus?.reason || 
        'Outstanding impact reports must be completed before publishing.'
      );
      setShowTrustWarning(true);
      return;
    }

    if (onPublishCampaign) {
      try {
        await onPublishCampaign(campaignId);
      } catch (error) {
        console.error('Error publishing campaign:', error);
        setTrustWarningMessage('Failed to publish campaign. Please try again.');
        setShowTrustWarning(true);
      }
    }
  };

  // ✅ NEW: Unpublish handler
  const handleUnpublish = async (campaignId: string) => {
    if (onUnpublishCampaign) {
      try {
        await onUnpublishCampaign(campaignId);
      } catch (error) {
        console.error('Error unpublishing campaign:', error);
        setTrustWarningMessage('Failed to unpublish campaign. Please try again.');
        setShowTrustWarning(true);
      }
    }
  };

  // ✅ Filter using helper function
  const filteredCampaigns = campaigns.filter(campaign => {
    if (showFilter === 'draft') return !isCampaignPublished(campaign);
    if (showFilter === 'published') return isCampaignPublished(campaign);
    return true;
  });

  // ✅ Count using helper function
  const draftCount = campaigns.filter(c => !isCampaignPublished(c)).length;
  const publishedCount = campaigns.filter(c => isCampaignPublished(c)).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Campaigns</h2>
        <button onClick={onCreateCampaign} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center">
          <Plus className="h-4 w-4 mr-2" />New Campaign
        </button>
      </div>

      {trustStatus && !trustStatus.canCreateEvent && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <h3 className="text-red-800 font-semibold mb-2 flex items-center">
            <span className="mr-2">⚠️</span>Publishing Restricted
          </h3>
          <p className="text-red-700 text-sm mb-2">{trustStatus.reason}</p>
          {trustStatus.outstandingImpactReports && trustStatus.outstandingImpactReports > 0 && (
            <p className="text-red-600 text-sm">
              Outstanding impact reports: <strong>{trustStatus.outstandingImpactReports}</strong>
            </p>
          )}
          {trustStatus.overdueDays && trustStatus.overdueDays > 0 && (
            <p className="text-red-600 text-sm">
              Overdue by: <strong>{trustStatus.overdueDays} days</strong>
            </p>
          )}
          <a href="/impact" className="text-red-600 underline text-sm mt-2 inline-block hover:text-red-800">
            Complete outstanding impact reports →
          </a>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-500" />
        <button onClick={() => setShowFilter('all')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            showFilter === 'all' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}>All ({campaigns.length})</button>
        <button onClick={() => setShowFilter('draft')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            showFilter === 'draft' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}>Drafts ({draftCount})</button>
        <button onClick={() => setShowFilter('published')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            showFilter === 'published' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}>Published ({publishedCount})</button>
      </div>

      {filteredCampaigns.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onEdit={onEditCampaign}
              onDelete={onDeleteCampaign}
              onView={onViewCampaign}
              onPublish={handlePublish}
              onUnpublish={handleUnpublish} // ✅ Pass unpublish handler
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Target className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {showFilter === 'draft' && 'No draft campaigns'}
            {showFilter === 'published' && 'No published campaigns'}
            {showFilter === 'all' && 'No campaigns yet'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {showFilter === 'all' ? 'Create your first campaign to get started' : 'Try switching to a different filter'}
          </p>
          {showFilter === 'all' && (
            <button onClick={onCreateCampaign} className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg">
              Create Campaign
            </button>
          )}
        </div>
      )}

      <AlertModal
        isOpen={showTrustWarning}
        title="Cannot Publish Campaign"
        message={trustWarningMessage}
        variant="warning"
        onClose={() => setShowTrustWarning(false)}
        buttonText="Okay"
      />
    </div>
  );
};

export default CampaignsTab;

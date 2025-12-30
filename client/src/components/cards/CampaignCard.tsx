// client/src/components/cards/CampaignCard.tsx (UPDATED WITH PUBLISH)
import React from 'react';
import { 
  Target, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Tag,
  CheckCircle,
  Clock,
  AlertCircle,
  BarChart3,
  FileText // For draft badge
} from 'lucide-react';
import { Campaign } from '../../types/types';

interface CampaignCardProps {
  campaign: Campaign;
  onEdit: (campaign: Campaign) => void;
  onDelete: (campaignId: string) => void;
  onView: (campaign: Campaign) => void;
  onPublish?: (campaignId: string) => void; // NEW: Publish handler
  className?: string;
}

const CampaignCard: React.FC<CampaignCardProps> = ({ 
  campaign, 
  onEdit, 
  onDelete, 
  onView,
  onPublish, // NEW
  className = ""
}) => {
  // Format currency
  const formatCurrency = (amount: number) => `£${amount.toLocaleString()}`;

  // Format date
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
  };

  // NEW: Check if campaign is published
  const isPublished = campaign.is_published !== false; // Default to true for backward compatibility

  // Determine campaign status based on dates
  const getCampaignStatus = () => {
    const now = new Date();
    const startDate = campaign.start_date ? new Date(campaign.start_date) : null;
    const endDate = campaign.end_date ? new Date(campaign.end_date) : null;

    if (endDate && endDate < now) {
      return { status: 'ended', label: 'Ended', color: 'gray' };
    }
    if (startDate && startDate > now) {
      return { status: 'upcoming', label: 'Upcoming', color: 'blue' };
    }
    return { status: 'active', label: 'Active', color: 'green' };
  };

  // Category styling
  const getCategoryStyle = (category: string) => {
    const categoryColors: Record<string, string> = {
      building: 'bg-orange-100 text-orange-800 border-orange-200',
      equipment: 'bg-purple-100 text-purple-800 border-purple-200',
      program: 'bg-blue-100 text-blue-800 border-blue-200',
      emergency: 'bg-red-100 text-red-800 border-red-200',
      community: 'bg-green-100 text-green-800 border-green-200',
      education: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      other: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return categoryColors[category] || categoryColors.other;
  };

  // Progress styling and messaging
  const getProgressInfo = () => {
    const progress = campaign.progress_percentage || 0;
    if (progress >= 100) {
      return { 
        color: 'bg-green-500', 
        message: 'Goal achieved!', 
        icon: CheckCircle, 
        textColor: 'text-green-600' 
      };
    }
    if (progress >= 75) {
      return { 
        color: 'bg-blue-500', 
        message: 'Nearly there!', 
        icon: TrendingUp, 
        textColor: 'text-blue-600' 
      };
    }
    if (progress >= 25) {
      return { 
        color: 'bg-yellow-500', 
        message: 'Making progress', 
        icon: BarChart3, 
        textColor: 'text-yellow-600' 
      };
    }
    return { 
      color: 'bg-gray-300', 
      message: 'Just getting started', 
      icon: Clock, 
      textColor: 'text-gray-600' 
    };
  };

  // Time remaining calculation
  const getTimeRemaining = () => {
    if (!campaign.end_date) return null;
    
    const now = new Date();
    const endDate = new Date(campaign.end_date);
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return null;
    if (diffDays === 0) return 'Ends today';
    if (diffDays === 1) return '1 day left';
    if (diffDays <= 30) return `${diffDays} days left`;
    
    const diffMonths = Math.ceil(diffDays / 30);
    return `${diffMonths} month${diffMonths > 1 ? 's' : ''} left`;
  };

  const campaignStatus = getCampaignStatus();
  const progressInfo = getProgressInfo();
  const timeRemaining = getTimeRemaining();
  const StatusIcon = progressInfo.icon;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 ${className}`}>
      {/* Header with title and actions */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {campaign.name}
            </h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {campaign.category && (
                <span className={`text-xs font-medium px-2 py-1 rounded-full border ${getCategoryStyle(campaign.category)}`}>
                  {campaign.category.charAt(0).toUpperCase() + campaign.category.slice(1)}
                </span>
              )}
              <span className={`text-xs font-medium px-2 py-1 rounded-full border ${
                campaignStatus.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' :
                campaignStatus.status === 'upcoming' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                'bg-gray-100 text-gray-800 border-gray-200'
              }`}>
                {campaignStatus.label}
              </span>
              
              {/* NEW: Draft/Published Badge */}
              {!isPublished && (
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200 flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Draft
                </span>
              )}
              {isPublished && (
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-800 border border-green-200 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Published
                </span>
              )}
              
              {timeRemaining && (
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                  {timeRemaining}
                </span>
              )}
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => onView(campaign)}
              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
              title="View Campaign Details"
            >
              <Eye className="w-4 h-4" />
            </button>
            
            {/* NEW: Show Publish button only for drafts */}
            {!isPublished && onPublish && (
              <button
                onClick={() => onPublish(campaign.id)}
                className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                title="Publish Campaign"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
            )}
            
            <button
              onClick={() => onEdit(campaign)}
              className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded transition-colors"
              title="Edit Campaign"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(campaign.id)}
              className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
              title="Delete Campaign"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Description */}
        {campaign.description && (
          <p className="text-sm text-gray-600 line-clamp-2 mt-2">
            {campaign.description}
          </p>
        )}
      </div>

      {/* Campaign details */}
      <div className="p-4 space-y-3">
        {/* Timeline */}
        {(campaign.start_date || campaign.end_date) && (
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
            <span>
              {campaign.start_date && formatDate(campaign.start_date)}
              {campaign.start_date && campaign.end_date && ' → '}
              {campaign.end_date && formatDate(campaign.end_date)}
              {!campaign.start_date && campaign.end_date && `Target: ${formatDate(campaign.end_date)}`}
            </span>
          </div>
        )}

        {/* Event count */}
        {(campaign.total_events || 0) > 0 && (
          <div className="flex items-center text-sm text-gray-600">
            <BarChart3 className="w-4 h-4 mr-2 text-gray-400" />
            <span>
              {campaign.total_events} event{campaign.total_events !== 1 ? 's' : ''} planned
            </span>
          </div>
        )}

        {/* Financial summary */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Target:</span>
            <span className="font-medium">{formatCurrency(campaign.target_amount)}</span>
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Raised:</span>
            <span className="font-medium text-green-600">
              {formatCurrency(campaign.total_raised || 0)}
            </span>
          </div>
          
          {(campaign.total_profit || 0) !== 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Net Profit:</span>
              <span className={`font-medium ${
                (campaign.total_profit || 0) > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(campaign.total_profit || 0)}
              </span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-600">
            <span>Progress</span>
            <span>{Math.round(campaign.progress_percentage || 0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${progressInfo.color}`}
              style={{ width: `${Math.min(campaign.progress_percentage || 0, 100)}%` }}
            ></div>
          </div>
          <div className={`flex items-center text-xs mt-1 ${progressInfo.textColor}`}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {progressInfo.message}
          </div>
        </div>

        {campaign.tags && Array.isArray(campaign.tags) && campaign.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <Tag className="w-3 h-3 text-gray-400 mt-0.5 mr-1" />
            {campaign.tags.slice(0, 3).map((tag: string, index: number) => (
              <span
                key={index}
                className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
            {campaign.tags.length > 3 && (
              <span className="text-xs text-gray-500">
                +{campaign.tags.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Status indicators */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
          <span>
            Created {formatDate(campaign.created_at)}
          </span>
          <div className="flex items-center gap-2">
            {(campaign.progress_percentage || 0) >= 100 && (
              <div className="flex items-center text-green-600">
                <CheckCircle className="w-3 h-3 mr-1" />
                Completed
              </div>
            )}
            {campaignStatus.status === 'active' && (campaign.progress_percentage || 0) < 25 && (
              <div className="flex items-center text-yellow-600">
                <AlertCircle className="w-3 h-3 mr-1" />
                Needs attention
              </div>
            )}
            {(campaign.total_profit || 0) > 0 && (
              <div className="flex items-center text-green-600">
                <TrendingUp className="w-3 h-3 mr-1" />
                Profitable
              </div>
            )}
            {(campaign.total_profit || 0) < 0 && (
              <div className="flex items-center text-red-600">
                <TrendingDown className="w-3 h-3 mr-1" />
                Loss
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignCard;
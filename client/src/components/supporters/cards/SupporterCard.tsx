// client/src/components/supporters/cards/SupporterCard.tsx
import React from 'react';
import { 
  User,
  Building2,
  Mail, 
  Phone, 
  MapPin,
  Calendar,
  DollarSign, 

  MessageCircle,
  Clock,
  Edit,
  Eye,
  Trash2,
  Star,
  Heart,
  Award,
  AlertCircle,
  CheckCircle,
  Target,

} from 'lucide-react';
import { Supporter } from '../../../types/types'; // Import the full interface

interface SupporterCardProps {
  supporter: Supporter; // Use the full Supporter interface from types
  onEdit: (supporter: Supporter) => void;
  onDelete: (supporter: Supporter) => void;
  onView: (supporter: Supporter) => void;
  onQuickCall?: (supporter: Supporter) => void;
  onQuickEmail?: (supporter: Supporter) => void;
  className?: string;
  
}

const SupporterCard: React.FC<SupporterCardProps> = ({ 
  supporter, 
  onEdit, 
  onDelete, 
  onView,
  onQuickCall,
  onQuickEmail,
  className = ""
}) => {
  // Format currency
  const formatCurrency = (amount: number) => `£${amount.toLocaleString()}`;

  // Format date - handle both string and Date types
  const formatDate = (date: string | Date) => {
    const now = new Date();
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    const diffTime = now.getTime() - targetDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
    return `${Math.ceil(diffDays / 365)} years ago`;
  };

  // Get relationship strength styling
  const getRelationshipStyle = () => {
    const styles = {
      prospect: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300', icon: Target },
      new: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', icon: Star },
      regular: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', icon: CheckCircle },
      major: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300', icon: Award },
      lapsed: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', icon: Clock },
      inactive: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', icon: AlertCircle }
    };
    return styles[supporter.relationship_strength || 'prospect'];
  };

  // Get supporter type styling
const getTypeStyle = () => {
  const styles = {
    volunteer: { bg: 'bg-blue-50', text: 'text-blue-700', icon: Heart },
    donor: { bg: 'bg-green-50', text: 'text-green-700', icon: DollarSign },
    sponsor: { bg: 'bg-purple-50', text: 'text-purple-700', icon: Building2 }
  };

  // Fallback for unexpected types
  return styles[supporter.type] || { bg: 'bg-gray-50', text: 'text-gray-700', icon: User };
};


  // Calculate engagement score (simple algorithm)
  const getEngagementScore = () => {
    let score = 0;
    if (supporter.total_donated && supporter.total_donated > 0) score += 30;
    if (supporter.donation_count && supporter.donation_count > 1) score += 20;
    if (supporter.volunteer_hours_total && supporter.volunteer_hours_total > 0) score += 25;
    if (supporter.last_contact_date) {
      const contactDate = typeof supporter.last_contact_date === 'string' 
        ? new Date(supporter.last_contact_date) 
        : supporter.last_contact_date;
      const daysSinceContact = Math.ceil((new Date().getTime() - contactDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceContact < 30) score += 25;
      else if (daysSinceContact < 90) score += 15;
    }
    return Math.min(score, 100);
  };

  // Check if follow-up is due
  const isFollowUpDue = () => {
    if (!supporter.next_contact_date) return false;
    const nextDate = typeof supporter.next_contact_date === 'string' 
      ? new Date(supporter.next_contact_date) 
      : supporter.next_contact_date;
    return nextDate <= new Date();
  };

  const relationshipStyle = getRelationshipStyle();
  const typeStyle = getTypeStyle();
  const RelationshipIcon = relationshipStyle.icon;
  const TypeIcon = typeStyle.icon;
  const engagementScore = getEngagementScore();

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-200 ${className}`}>
      {/* Header Section */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            {/* Avatar/Logo */}
            <div className="flex-shrink-0">
              {/* Use company_logo_url if available, fallback to type-based avatar */}
              <div className={`w-12 h-12 rounded-lg ${typeStyle.bg} flex items-center justify-center`}>
                <User className={`w-6 h-6 ${typeStyle.text}`} />
              </div>
            </div>
            
            {/* Name and Company */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {supporter.name}
              </h3>
              {/* Contact Info */}
              <div className="mt-1 space-y-1">
                {supporter.email && (
                  <div className="flex items-center text-sm text-gray-500 truncate">
                    <Mail className="w-3 h-3 mr-1 flex-shrink-0" />
                    {supporter.email}
                  </div>
                )}
                {supporter.phone && (
                  <div className="flex items-center text-sm text-gray-500">
                    <Phone className="w-3 h-3 mr-1 flex-shrink-0" />
                    {supporter.phone}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1 ml-2">
            {supporter.phone && onQuickCall && (
              <button
                onClick={() => onQuickCall(supporter)}
                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                title="Quick Call"
              >
                <Phone className="w-4 h-4" />
              </button>
            )}
            {supporter.email && onQuickEmail && (
              <button
                onClick={() => onQuickEmail(supporter)}
                className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                title="Quick Email"
              >
                <Mail className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onView(supporter)}
              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
              title="View Details"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => onEdit(supporter)}
              className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded transition-colors"
              title="Edit Supporter"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(supporter)}
              className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
              title="Delete Supporter"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Supporter Type */}
          <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${typeStyle.bg} ${typeStyle.text} border`}>
            <TypeIcon className="w-3 h-3 mr-1" />
           {supporter.type
  ? supporter.type.charAt(0).toUpperCase() + supporter.type.slice(1)
  : 'Unknown'}
          </div>
          
          {/* Relationship Strength */}
          <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${relationshipStyle.bg} ${relationshipStyle.text} border ${relationshipStyle.border}`}>
            <RelationshipIcon className="w-3 h-3 mr-1" />
            {supporter.relationship_strength?.replace('_', ' ').split(' ').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
          </div>

          {/* Follow-up Alert */}
          {isFollowUpDue() && (
            <div className="flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-300">
              <Clock className="w-3 h-3 mr-1" />
              Follow-up Due
            </div>
          )}

          {/* Tags */}
          {supporter.tags && supporter.tags.slice(0, 2).map((tag, index) => (
            <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
              {tag}
            </span>
          ))}
          {supporter.tags && supporter.tags.length > 2 && (
            <span className="text-xs text-gray-500">+{supporter.tags.length - 2} more</span>
          )}
        </div>
      </div>

      {/* Metrics Section */}
      <div className="p-4 space-y-3">
        {/* Financial Summary (for donors) */}
        {supporter.type === 'donor' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-700">
                {formatCurrency(supporter.total_donated || 0)}
              </div>
              <div className="text-xs text-green-600">Total Donated</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-700">
                {supporter.donation_count || 0}
              </div>
              <div className="text-xs text-blue-600">Donations</div>
            </div>
          </div>
        )}

        {/* Volunteer Summary (for volunteers) */}
        {supporter.type === 'volunteer' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-700">
                {supporter.volunteer_hours_total || 0}h
              </div>
              <div className="text-xs text-blue-600">Hours Volunteered</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-lg font-bold text-purple-700">
                {engagementScore}%
              </div>
              <div className="text-xs text-purple-600">Engagement</div>
            </div>
          </div>
        )}

        {/* Sponsor Summary (for sponsors) */}
        {supporter.type === 'sponsor' && (
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-lg font-bold text-purple-700">
              {supporter.total_donated ? formatCurrency(supporter.total_donated) : 'Active'}
            </div>
            <div className="text-xs text-purple-600">Sponsorship Value</div>
          </div>
        )}

        {/* Communication Summary */}
        <div className="flex justify-between text-sm text-gray-600 pt-2 border-t border-gray-100">
          <div className="flex items-center">
            <MessageCircle className="w-4 h-4 mr-1" />
            <span>
              Last contact: {supporter.last_contact_date ? formatDate(supporter.last_contact_date) : 'Never'}
            </span>
          </div>
          {supporter.next_contact_date && (
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              <span>Next: {formatDate(supporter.next_contact_date)}</span>
            </div>
          )}
        </div>

        {/* Location (if available) */}
        {(supporter.city || supporter.country) && (
          <div className="flex items-center text-sm text-gray-500">
            <MapPin className="w-4 h-4 mr-1" />
            <span>{[supporter.city, supporter.country].filter(Boolean).join(', ')}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupporterCard;
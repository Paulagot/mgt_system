// client/src/components/cards/EventCard.tsx (UPDATED WITH PUBLISH)
import React from 'react';
import { 
  Calendar, 
  MapPin, 
  Users, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Edit,
  Trash2,
  Eye,
  Target,
  Gift,
  CheckCircle, // For publish button
  FileText // For draft badge
} from 'lucide-react';
import { Event } from '../../types/types';

interface EventCardProps {
  event: Event;
  onEdit: (event: Event) => void;
  onDelete: (eventId: string) => void;
  onView: (event: Event) => void;
  onPublish?: (eventId: string) => void; // NEW: Publish handler
  campaignName?: string;
  className?: string;
  prizeCount?: number;
  prizeValue?: number;
}

const EventCard: React.FC<EventCardProps> = ({ 
  event, 
  onEdit, 
  onDelete, 
  onView,
  onPublish, // NEW
  campaignName,
  className = "",
  prizeCount = 0,
  prizeValue = 0
}) => {
  // Calculate progress percentage with safe defaults
  const progressPercentage = event.goal_amount > 0 
    ? Math.min(((event.actual_amount || 0) / event.goal_amount) * 100, 100) 
    : 0;

  // Format currency
  const formatCurrency = (amount: number | undefined) => `£${(amount || 0).toLocaleString()}`;

  // Format date string properly
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', { 
      weekday: 'short',
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
  };

  // Determine if event is upcoming, live, or past
  const now = new Date();
  const eventDate = new Date(event.event_date);
  const isUpcoming = eventDate > now;
  const isToday = eventDate.toDateString() === now.toDateString();

  // NEW: Check if event is published
  const isPublished = event.is_published !== false; // Default to true for backward compatibility

  // Status badge styling
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'live':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'ended':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  // Profit/loss styling with safe defaults
  const getProfitStyle = (profit: number | undefined) => {
    const profitValue = profit || 0;
    if (profitValue > 0) return 'text-green-600';
    if (profitValue < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 ${className}`}>
      {/* Header with title and actions */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {event.title}
            </h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-sm text-gray-600 capitalize bg-gray-50 px-2 py-1 rounded">
                {event.type}
              </span>
              <span className={`text-xs font-medium px-2 py-1 rounded-full border ${getStatusStyle(event.status)}`}>
                {event.status}
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
              
              {isToday && (
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                  Today
                </span>
              )}
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => onView(event)}
              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
              title="View Details"
            >
              <Eye className="w-4 h-4" />
            </button>
            
            {/* NEW: Show Publish button only for drafts */}
            {!isPublished && onPublish && (
              <button
                onClick={() => onPublish(event.id)}
                className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                title="Publish Event"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
            )}
            
            <button
              onClick={() => onEdit(event)}
              className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded transition-colors"
              title="Edit Event"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(event.id)}
              className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
              title="Delete Event"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Description */}
        {event.description && (
          <p className="text-sm text-gray-600 line-clamp-2 mt-2">
            {event.description}
          </p>
        )}
      </div>

      {/* Event details */}
      <div className="p-4 space-y-3">
        {/* Date and venue */}
        <div className="grid grid-cols-1 gap-2">
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
            <span className={isUpcoming ? 'font-medium' : ''}>
              {formatDate(event.event_date)}
            </span>
          </div>
          
          {event.venue && (
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="w-4 h-4 mr-2 text-gray-400" />
              <span className="truncate">{event.venue}</span>
            </div>
          )}
          
          {event.max_participants && (
            <div className="flex items-center text-sm text-gray-600">
              <Users className="w-4 h-4 mr-2 text-gray-400" />
              <span>Max {event.max_participants} participants</span>
            </div>
          )}
          
          {campaignName && (
            <div className="flex items-center text-sm text-gray-600">
              <Target className="w-4 h-4 mr-2 text-gray-400" />
              <span className="truncate">{campaignName}</span>
            </div>
          )}

          {prizeCount > 0 && (
            <div className="flex items-center text-sm text-gray-600">
              <Gift className="w-4 h-4 mr-2 text-gray-400" />
              <span>
                {prizeCount} prize{prizeCount !== 1 ? 's' : ''} 
                {prizeValue > 0 && ` (${formatCurrency(prizeValue)})`}
              </span>
            </div>
          )}
        </div>

        {/* Financial summary */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Goal:</span>
            <span className="font-medium">{formatCurrency(event.goal_amount)}</span>
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Raised:</span>
            <span className="font-medium text-green-600">
              {formatCurrency(event.actual_amount)}
            </span>
          </div>
          
          {(event.total_expenses || 0) > 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Expenses:</span>
              <span className="font-medium text-red-600">
                {formatCurrency(event.total_expenses)}
              </span>
            </div>
          )}
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Net Profit:</span>
            <span className={`font-medium ${getProfitStyle(event.net_profit)}`}>
              {formatCurrency(event.net_profit)}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-600">
            <span>Progress</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                progressPercentage >= 100 ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          {progressPercentage >= 100 && (
            <div className="flex items-center text-xs text-green-600 mt-1">
              <TrendingUp className="w-3 h-3 mr-1" />
              Goal achieved!
            </div>
          )}
        </div>

        {/* Status indicators */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
          <span>
            Created {formatDate(event.created_at)}
          </span>
          <div className="flex items-center gap-2">
            {(event.net_profit || 0) > 0 && (
              <div className="flex items-center text-green-600">
                <TrendingUp className="w-3 h-3 mr-1" />
                Profitable
              </div>
            )}
            {(event.net_profit || 0) < 0 && (
              <div className="flex items-center text-red-600">
                <TrendingDown className="w-3 h-3 mr-1" />
                Loss
              </div>
            )}
            {isUpcoming && (
              <span className="text-blue-600 font-medium">Upcoming</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventCard;
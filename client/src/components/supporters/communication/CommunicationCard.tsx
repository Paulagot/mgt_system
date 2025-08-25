// File: /client/src/components/supporters/communication/CommunicationCard.tsx
import React, { useState } from 'react';
import { 
  MessageCircle, 
  Phone, 
  Mail, 
  Users, 
  FileText, 
  Smartphone,
  Share2,
  Calendar,
  Edit2,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  MoreVertical
} from 'lucide-react';

interface CommunicationCardProps {
  communication: any;
  supporter: any;
  onEdit: (communicationId: string) => void;
  onDelete: (communicationId: string) => void;
  onCompleteFollowUp: (communicationId: string, notes?: string) => void;
  onRescheduleFollowUp: (communicationId: string, newDate: string, reason?: string) => void;
  formatRelativeDate: (date: string | Date) => string;
}

const CommunicationCard: React.FC<CommunicationCardProps> = ({
  communication,
  supporter,
  onEdit,
  onDelete,
  onCompleteFollowUp,
  onRescheduleFollowUp,
  formatRelativeDate
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showFollowUpActions, setShowFollowUpActions] = useState(false);

  const getTypeIcon = (type: string) => {
    const icons = {
      call: Phone,
      email: Mail,
      meeting: Users,
      letter: FileText,
      sms: Smartphone,
      social_media: Share2,
      event_interaction: Calendar,
      other: MessageCircle
    };
    return icons[type as keyof typeof icons] || MessageCircle;
  };

  const getOutcomeStyle = (outcome?: string) => {
    const styles = {
      positive: 'bg-green-100 text-green-800',
      neutral: 'bg-gray-100 text-gray-800',
      negative: 'bg-red-100 text-red-800',
      no_response: 'bg-yellow-100 text-yellow-800',
      callback_requested: 'bg-blue-100 text-blue-800'
    };
    return styles[outcome as keyof typeof styles] || styles.neutral;
  };

  const isFollowUpOverdue = () => {
    if (!communication.follow_up_required || communication.follow_up_completed || !communication.follow_up_date) {
      return false;
    }
    return new Date(communication.follow_up_date) < new Date();
  };

  const TypeIcon = getTypeIcon(communication.type);

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow relative">
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center space-x-2">
          <TypeIcon className="w-4 h-4 text-gray-400" />
          <span className="font-medium text-gray-900 capitalize">
            {communication.type.replace('_', ' ')}
          </span>
          <span className="text-sm text-gray-500">
            {communication.direction === 'inbound' ? 'from' : 'to'} {supporter.name}
          </span>
          {communication.created_by_name && (
            <span className="text-xs text-gray-400">
              by {communication.created_by_name}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            {formatRelativeDate(communication.created_at)}
          </span>
          
          {/* Actions Menu */}
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            
            {showActions && (
              <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]">
                <button
                  onClick={() => {
                    onEdit(communication.id);
                    setShowActions(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                >
                  <Edit2 className="w-3 h-3 mr-2" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    onDelete(communication.id);
                    setShowActions(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
                >
                  <Trash2 className="w-3 h-3 mr-2" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Subject */}
      {communication.subject && (
        <p className="font-medium text-gray-800 mb-1">{communication.subject}</p>
      )}
      
      {/* Notes */}
      <p className="text-sm text-gray-600 mb-2">{communication.notes}</p>
      
      {/* Duration */}
      {communication.duration_minutes && (
        <p className="text-xs text-gray-500 mb-2">
          Duration: {communication.duration_minutes} minutes
        </p>
      )}
      
      {/* Bottom row with outcome and follow-up */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* Outcome */}
          {communication.outcome && (
            <span className={`text-xs px-2 py-1 rounded-full ${getOutcomeStyle(communication.outcome)}`}>
              {communication.outcome.replace('_', ' ')}
            </span>
          )}
          
          {/* Tags */}
          {communication.tags && communication.tags.length > 0 && (
            <div className="flex items-center space-x-1">
              {communication.tags.slice(0, 2).map((tag: string, index: number) => (
                <span key={index} className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                  {tag}
                </span>
              ))}
              {communication.tags.length > 2 && (
                <span className="text-xs text-gray-500">
                  +{communication.tags.length - 2} more
                </span>
              )}
            </div>
          )}
        </div>
        
        {/* Follow-up section */}
        {communication.follow_up_required && (
          <div className="flex items-center space-x-2">
            {communication.follow_up_completed ? (
              <div className="flex items-center text-green-600">
                <CheckCircle className="w-4 h-4 mr-1" />
                <span className="text-xs">Follow-up completed</span>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowFollowUpActions(!showFollowUpActions)}
                  className={`flex items-center text-xs px-2 py-1 rounded ${
                    isFollowUpOverdue() 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-orange-100 text-orange-800'
                  }`}
                >
                  {isFollowUpOverdue() ? (
                    <AlertCircle className="w-3 h-3 mr-1" />
                  ) : (
                    <Clock className="w-3 h-3 mr-1" />
                  )}
                  Follow-up {isFollowUpOverdue() ? 'overdue' : 'due'} {formatRelativeDate(communication.follow_up_date)}
                </button>
                
                {showFollowUpActions && (
                  <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[150px]">
                    <button
                      onClick={() => {
                        onCompleteFollowUp(communication.id);
                        setShowFollowUpActions(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-green-600 hover:bg-green-50 flex items-center"
                    >
                      <CheckCircle className="w-3 h-3 mr-2" />
                      Mark Complete
                    </button>
                    <button
                      onClick={() => {
                        const newDate = prompt('Enter new follow-up date (YYYY-MM-DD):');
                        const reason = prompt('Reason for rescheduling (optional):');
                        if (newDate) {
                          onRescheduleFollowUp(communication.id, newDate, reason || undefined);
                        }
                        setShowFollowUpActions(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center"
                    >
                      <Calendar className="w-3 h-3 mr-2" />
                      Reschedule
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Follow-up notes */}
      {communication.follow_up_notes && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-600">
            <strong>Follow-up notes:</strong> {communication.follow_up_notes}
          </p>
        </div>
      )}

      {/* Click outside to close menus */}
      {(showActions || showFollowUpActions) && (
        <div 
          className="fixed inset-0 z-5" 
          onClick={() => {
            setShowActions(false);
            setShowFollowUpActions(false);
          }}
        />
      )}
    </div>
  );
};

export default CommunicationCard;
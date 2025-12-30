// client/src/components/impact/ImpactCard.tsx
import React from 'react';
import { 
  Edit, 
  Trash2, 
  CheckCircle,
  MapPin,
  DollarSign,
  Image as ImageIcon,
  FileText,
  MessageSquare,
  Calendar,
  TrendingUp,
  Award
} from 'lucide-react';
import { ImpactUpdate } from '../../services/impactService';
import { IMPACT_AREA_MAP } from '../../types/impactAreas';

interface ImpactCardProps {
  impact: ImpactUpdate;
  eventName?: string;
  campaignName?: string;
  onEdit?: (impact: ImpactUpdate) => void;
  onDelete?: (impactId: string) => void;
  onPublish?: (impactId: string) => void;
  onMarkFinal?: (impactId: string) => void;
  showActions?: boolean;
  className?: string;
}

const ImpactCard: React.FC<ImpactCardProps> = ({ 
  impact, 
  eventName,
  campaignName,
  onEdit, 
  onDelete, 
  onPublish,
  onMarkFinal,
  showActions = true,
  className = ""
}) => {
  // Format currency
  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    const symbols: Record<string, string> = { EUR: '€', GBP: '£', USD: '$' };
    return `${symbols[currency] || currency} ${amount.toLocaleString()}`;
  };

  // Format date
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
  };

  // Get status badge
  const getStatusBadge = () => {
    if (impact.is_final) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
          FINAL
        </span>
      );
    }
    
    const statusStyles: Record<string, string> = {
      draft: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      published: 'bg-green-100 text-green-800 border-green-200',
      verified: 'bg-blue-100 text-blue-800 border-blue-200',
      flagged: 'bg-red-100 text-red-800 border-red-200',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusStyles[impact.status]}`}>
        {impact.status.charAt(0).toUpperCase() + impact.status.slice(1)}
      </span>
    );
  };

  // Count proof items
  const proofCounts = {
    media: impact.proof.media.length,
    receipts: impact.proof.receipts.length,
    invoices: impact.proof.invoices.length,
    testimonials: impact.proof.quotes.length,
  };

  const totalFinancialDocs = proofCounts.receipts + proofCounts.invoices;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {impact.title}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
              <Calendar size={14} />
              <span>{formatDate(impact.impact_date)}</span>
            </div>
          </div>
          
          {/* Status Badge & Actions */}
          <div className="flex items-center gap-2 ml-2">
            {getStatusBadge()}
            
            {showActions && !impact.is_final && (
              <div className="flex gap-1">
                {impact.status === 'draft' && (
                  <>
                    {onEdit && (
                      <button
                        onClick={() => onEdit(impact)}
                        className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {onPublish && (
                      <button
                        onClick={() => onPublish(impact.id)}
                        className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                        title="Publish"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(impact.id)}
                        className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
                {impact.status === 'published' && onMarkFinal && (
                  <button
                    onClick={() => onMarkFinal(impact.id)}
                    className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                    title="Mark as Final"
                  >
                    Mark as Final
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Event/Campaign Context */}
        {(eventName || campaignName) && (
          <div className="flex flex-wrap gap-2 text-xs text-gray-600 mt-2">
            {eventName && (
              <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded">
                <TrendingUp size={12} />
                Event: {eventName}
              </span>
            )}
            {campaignName && (
              <span className="flex items-center gap-1 px-2 py-1 bg-purple-50 rounded">
                <Award size={12} />
                Campaign: {campaignName}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Description */}
        <p className="text-sm text-gray-700 line-clamp-3">
          {impact.description}
        </p>

        {/* Impact Areas */}
        <div className="flex flex-wrap gap-2">
          {impact.impact_area_ids.map((areaId) => {
            const area = IMPACT_AREA_MAP[areaId];
            return area ? (
              <span
                key={areaId}
                className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200"
              >
                {area.label}
              </span>
            ) : null;
          })}
        </div>

        {/* Metrics */}
        {impact.metrics.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center text-xs font-medium text-gray-700 mb-1">
              <TrendingUp size={14} className="mr-1" />
              Impact Achieved
            </div>
            <div className="grid grid-cols-2 gap-2">
              {impact.metrics.slice(0, 4).map((metric) => (
                <div key={metric.id} className="bg-green-50 rounded p-2 border border-green-100">
                  <div className="text-lg font-bold text-green-700">
                    {metric.value.toLocaleString()}
                  </div>
                  <div className="text-xs text-green-600">
                    {metric.milestone}
                  </div>
                </div>
              ))}
            </div>
            {impact.metrics.length > 4 && (
              <div className="text-xs text-gray-500 text-center">
                +{impact.metrics.length - 4} more metrics
              </div>
            )}
          </div>
        )}

        {/* Financial & Location Info */}
        <div className="flex flex-wrap gap-3 text-sm text-gray-600 pt-2 border-t border-gray-100">
          {impact.amount_spent && (
            <div className="flex items-center gap-1">
              <DollarSign size={14} className="text-gray-400" />
              <span className="font-medium">
                {formatCurrency(impact.amount_spent, impact.currency)}
              </span>
              <span className="text-gray-500">spent</span>
            </div>
          )}
          {impact.location && (
            <div className="flex items-center gap-1">
              <MapPin size={14} className="text-gray-400" />
              <span>
                {impact.location.placeName || `${impact.location.lat.toFixed(4)}, ${impact.location.lng.toFixed(4)}`}
              </span>
            </div>
          )}
        </div>

        {/* Proof Indicators */}
        <div className="flex flex-wrap gap-3 text-xs text-gray-600 pt-2 border-t border-gray-100">
          {proofCounts.media > 0 && (
            <div className="flex items-center gap-1">
              <ImageIcon size={12} className="text-green-600" />
              <span className="text-green-600 font-medium">
                {proofCounts.media} photo{proofCounts.media !== 1 ? 's' : ''}/video{proofCounts.media !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          {totalFinancialDocs > 0 && (
            <div className="flex items-center gap-1">
              <FileText size={12} className="text-blue-600" />
              <span className="text-blue-600 font-medium">
                {proofCounts.receipts > 0 && `${proofCounts.receipts} receipt${proofCounts.receipts !== 1 ? 's' : ''}`}
                {proofCounts.receipts > 0 && proofCounts.invoices > 0 && ' • '}
                {proofCounts.invoices > 0 && `${proofCounts.invoices} invoice${proofCounts.invoices !== 1 ? 's' : ''}`}
              </span>
            </div>
          )}
          {proofCounts.testimonials > 0 && (
            <div className="flex items-center gap-1">
              <MessageSquare size={12} className="text-purple-600" />
              <span className="text-purple-600 font-medium">
                {proofCounts.testimonials} testimonial{proofCounts.testimonials !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
          <span>
            Created {formatDate(impact.created_at)}
          </span>
          {impact.is_final && (
            <div className="flex items-center text-purple-600 font-medium">
              <CheckCircle className="w-3 h-3 mr-1" />
              Complete
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImpactCard;
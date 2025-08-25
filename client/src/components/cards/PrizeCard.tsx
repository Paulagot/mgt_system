// client/src/components/cards/PrizeCard.tsx
import React from 'react';
import { Edit, Trash2, Check, Gift, User, DollarSign } from 'lucide-react';
import { Prize } from '../../types/types';

interface PrizeCardProps {
  prize: Prize;
  onEdit: (prize: Prize) => void;
  onDelete: (prizeId: string) => void;
  onConfirm: (prizeId: string) => void;
  canManage: boolean;
}

const PrizeCard: React.FC<PrizeCardProps> = ({
  prize,
  onEdit,
  onDelete,
  onConfirm,
  canManage
}) => {
  const formatCurrency = (amount: number) => `£${amount.toLocaleString()}`;
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {prize.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                prize.confirmed 
                  ? 'bg-green-100 text-green-800 border border-green-200' 
                  : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
              }`}>
                {prize.confirmed ? (
                  <>
                    <Check className="w-3 h-3 mr-1" />
                    Confirmed
                  </>
                ) : (
                  <>
                    <Gift className="w-3 h-3 mr-1" />
                    Pending
                  </>
                )}
              </span>
            </div>
          </div>
          
          {/* Action buttons */}
          {canManage && (
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={() => onEdit(prize)}
                className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded transition-colors"
                title="Edit Prize"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(prize.id)}
                className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                title="Delete Prize"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Prize Details */}
      <div className="p-4 space-y-3">
        {/* Value */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500 flex items-center">
            <DollarSign className="w-4 h-4 mr-1" />
            Value:
          </span>
          <span className="font-medium text-gray-900">
            {formatCurrency(prize.value)}
          </span>
        </div>

        {/* Donor */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500 flex items-center">
            <User className="w-4 h-4 mr-1" />
            Donated by:
          </span>
          <span className="font-medium text-gray-900 truncate ml-2">
            {prize.donor_name || 'Anonymous'}
          </span>
        </div>

        {/* Added date */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500">Added:</span>
          <span className="text-gray-700">{formatDate(prize.created_at)}</span>
        </div>

        {/* Confirm button */}
        {canManage && !prize.confirmed && (
          <div className="pt-3 border-t border-gray-100">
            <button
              onClick={() => onConfirm(prize.id)}
              className="w-full bg-green-100 hover:bg-green-200 text-green-700 px-3 py-2 rounded text-sm font-medium transition-colors"
            >
              <Check className="w-4 h-4 mr-1 inline" />
              Confirm Prize
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrizeCard;
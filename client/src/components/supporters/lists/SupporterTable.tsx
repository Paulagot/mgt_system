// client/src/components/supporters/lists/SupporterTable.tsx
import React, { useState } from 'react';
import { Eye, Edit, Trash2, Phone, Mail, ChevronUp, ChevronDown } from 'lucide-react';
import { Supporter } from '../../../types/types';

interface SupporterTableProps {
  supporters: Supporter[];
  onEdit: (supporter: Supporter) => void;
  onDelete: (supporter: Supporter) => void;
  onView: (supporter: Supporter) => void;
  onQuickCall?: (supporter: Supporter) => void;
  onQuickEmail?: (supporter: Supporter) => void;
}

type SortField = 'name' | 'type' | 'email' | 'relationship_strength' | 'total_donated';
type SortOrder = 'asc' | 'desc';

const SupporterTable: React.FC<SupporterTableProps> = ({
  supporters,
  onEdit,
  onDelete,
  onView,
  onQuickCall,
  onQuickEmail,
}) => {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedSupporters = [...supporters].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];

    // Handle null/undefined values
    if (aVal === null || aVal === undefined) aVal = '';
    if (bVal === null || bVal === undefined) bVal = '';

    // Convert to lowercase for string comparison
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'donor':
        return 'bg-green-100 text-green-800';
      case 'volunteer':
        return 'bg-blue-100 text-blue-800';
      case 'sponsor':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

const formatCurrency = (amount?: number) => {
  if (!amount) return '€0.00';
  // Convert to number in case it's a string from the database
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return '€0.00';
  return `€${numAmount.toFixed(2)}`;
}

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th
                onClick={() => handleSort('name')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center gap-2">
                  Name
                  <SortIcon field="name" />
                </div>
              </th>
              <th
                onClick={() => handleSort('type')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center gap-2">
                  Type
                  <SortIcon field="type" />
                </div>
              </th>
              <th
                onClick={() => handleSort('email')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center gap-2">
                  Email
                  <SortIcon field="email" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Phone
              </th>
              <th
                onClick={() => handleSort('relationship_strength')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center gap-2">
                  Relationship
                  <SortIcon field="relationship_strength" />
                </div>
              </th>
              <th
                onClick={() => handleSort('total_donated')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center gap-2">
                  Total Donated
                  <SortIcon field="total_donated" />
                </div>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedSupporters.length > 0 ? (
              sortedSupporters.map((supporter) => (
                <tr
                  key={supporter.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => onView(supporter)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{supporter.name}</div>
                        {supporter.is_archived && (
                          <div className="text-xs text-gray-500">Archived</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeColor(
                        supporter.type
                      )}`}
                    >
                      {supporter.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-900">{supporter.email || '-'}</span>
                      {supporter.email && onQuickEmail && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onQuickEmail(supporter);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          title="Send email"
                        >
                          <Mail className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-900">{supporter.phone || '-'}</span>
                      {supporter.phone && onQuickCall && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onQuickCall(supporter);
                          }}
                          className="text-green-600 hover:text-green-800"
                          title="Call"
                        >
                          <Phone className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 capitalize">
                      {supporter.relationship_strength || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      {supporter.type === 'donor' ? formatCurrency(supporter.total_donated) : '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onView(supporter);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(supporter);
                        }}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(supporter);
                        }}
                        className="text-red-600 hover:text-red-900"
                        title={supporter.is_archived ? 'Restore' : 'Delete'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  No supporters found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SupporterTable;
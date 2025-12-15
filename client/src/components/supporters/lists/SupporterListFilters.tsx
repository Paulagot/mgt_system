// client/src/components/supporters/lists/SupporterListFilters.tsx
import React, { useState } from 'react';
import { Search, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';

interface SupporterListFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  typeFilter: string | null;
  onTypeFilterChange: (type: string | null) => void;
  advancedFilters: {
    relationship: string | null;
    lifecycle: string | null;
    priority: string | null;
  };
  onAdvancedFiltersChange: (filters: any) => void;
  onClearFilters: () => void;
  typeCounts: {
    all: number;
    donor: number;
    volunteer: number;
    sponsor: number;
  };
  hasActiveFilters: boolean;
}

const SupporterListFilters: React.FC<SupporterListFiltersProps> = ({
  searchTerm,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  advancedFilters,
  onAdvancedFiltersChange,
  onClearFilters,
  typeCounts,
  hasActiveFilters,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleTypeClick = (type: string | null) => {
    onTypeFilterChange(typeFilter === type ? null : type);
  };

  const handleAdvancedFilterChange = (key: string, value: string) => {
    onAdvancedFiltersChange({
      ...advancedFilters,
      [key]: value === '' ? null : value,
    });
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name, email, or phone..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Type Filter Buttons */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Filter by type</label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleTypeClick(null)}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              typeFilter === null
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            All ({typeCounts.all})
          </button>
          <button
            onClick={() => handleTypeClick('donor')}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              typeFilter === 'donor'
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Donors ({typeCounts.donor})
          </button>
          <button
            onClick={() => handleTypeClick('volunteer')}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              typeFilter === 'volunteer'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Volunteers ({typeCounts.volunteer})
          </button>
          <button
            onClick={() => handleTypeClick('sponsor')}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              typeFilter === 'sponsor'
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Sponsors ({typeCounts.sponsor})
          </button>
        </div>
      </div>

      {/* Advanced Filters Toggle */}
      <div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          <Filter className="h-4 w-4" />
          Advanced Filters
          {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showAdvanced && (
          <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Relationship Strength */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relationship Strength
                </label>
                <select
                  value={advancedFilters.relationship || ''}
                  onChange={(e) => handleAdvancedFilterChange('relationship', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Relationships</option>
                  <option value="prospect">Prospect</option>
                  <option value="new">New</option>
                  <option value="regular">Regular</option>
                  <option value="major">Major</option>
                  <option value="lapsed">Lapsed</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Lifecycle Stage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lifecycle Stage
                </label>
                <select
                  value={advancedFilters.lifecycle || ''}
                  onChange={(e) => handleAdvancedFilterChange('lifecycle', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Stages</option>
                  <option value="prospect">Prospect</option>
                  <option value="first_time">First Time</option>
                  <option value="repeat">Repeat</option>
                  <option value="major">Major</option>
                  <option value="lapsed">Lapsed</option>
                  <option value="champion">Champion</option>
                </select>
              </div>

              {/* Priority Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority Level
                </label>
                <select
                  value={advancedFilters.priority || ''}
                  onChange={(e) => handleAdvancedFilterChange('priority', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Priorities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <div className="flex justify-end">
                <button
                  onClick={onClearFilters}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-gray-600">Active filters:</span>
          {typeFilter && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              Type: {typeFilter}
              <button
                onClick={() => onTypeFilterChange(null)}
                className="hover:bg-blue-200 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {advancedFilters.relationship && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
              Relationship: {advancedFilters.relationship}
              <button
                onClick={() => handleAdvancedFilterChange('relationship', '')}
                className="hover:bg-purple-200 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {advancedFilters.lifecycle && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
              Lifecycle: {advancedFilters.lifecycle}
              <button
                onClick={() => handleAdvancedFilterChange('lifecycle', '')}
                className="hover:bg-green-200 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {advancedFilters.priority && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
              Priority: {advancedFilters.priority}
              <button
                onClick={() => handleAdvancedFilterChange('priority', '')}
                className="hover:bg-orange-200 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default SupporterListFilters;
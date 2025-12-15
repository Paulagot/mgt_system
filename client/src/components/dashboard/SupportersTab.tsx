// client/src/components/supporters/SupportersTab.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Users, Archive, ArchiveRestore, Grid, List } from 'lucide-react';
import SupporterListFilters from '../supporters/lists/SupporterListFilters';
import SupporterGrid from '../supporters/lists/SupporterGrid';
import SupporterTable from '../supporters/lists/SupporterTable';
import { Supporter } from '../../types/types';

interface SupportersTabProps {
  supporters: Supporter[];
  onCreateSupporter: () => void;
  onEditSupporter: (supporter: Supporter) => void;
  onDeleteSupporter: (supporter: Supporter) => void;
  onViewSupporter: (supporter: Supporter) => void;
  onQuickCall: (supporter: Supporter) => void;
  onQuickEmail: (supporter: Supporter) => void;
  showArchived?: boolean;
  onToggleArchived?: () => void;
}

const SupportersTab: React.FC<SupportersTabProps> = ({
  supporters,
  onCreateSupporter,
  onEditSupporter,
  onDeleteSupporter,
  onViewSupporter,
  onQuickCall,
  onQuickEmail,
  showArchived = false,
  onToggleArchived,
}) => {
  // View mode state - load from localStorage
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    const saved = localStorage.getItem('supportersViewMode');
    return (saved === 'table' || saved === 'grid') ? saved : 'grid';
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [advancedFilters, setAdvancedFilters] = useState({
    relationship: null as string | null,
    lifecycle: null as string | null,
    priority: null as string | null,
  });

  // Save view mode preference
  useEffect(() => {
    localStorage.setItem('supportersViewMode', viewMode);
  }, [viewMode]);

  // Handle nested array structure (defensive programming)
  let safeSupporters: Supporter[] = [];
  
  if (Array.isArray(supporters)) {
    if (supporters.length > 0 && Array.isArray(supporters[0])) {
      safeSupporters = supporters[0];
    } else {
      safeSupporters = supporters;
    }
  } else {
    safeSupporters = [];
  }

  // Convert MySQL 1/0 to boolean for is_archived
  safeSupporters = safeSupporters.map(s => ({
    ...s,
    is_archived: !!(s.is_archived as any)
  }));

  // Apply all filters
  const filteredSupporters = useMemo(() => {
    return safeSupporters
      // Archive filter
      .filter(s => showArchived ? s.is_archived === true : s.is_archived !== true)
      // Search filter
      .filter(s => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
          s.name?.toLowerCase().includes(term) ||
          s.email?.toLowerCase().includes(term) ||
          s.phone?.includes(term)
        );
      })
      // Type filter
      .filter(s => !typeFilter || s.type === typeFilter)
      // Advanced filters
      .filter(s => !advancedFilters.relationship || s.relationship_strength === advancedFilters.relationship)
      .filter(s => !advancedFilters.lifecycle || s.lifecycle_stage === advancedFilters.lifecycle)
      .filter(s => !advancedFilters.priority || s.priority_level === advancedFilters.priority);
  }, [safeSupporters, showArchived, searchTerm, typeFilter, advancedFilters]);

  // Calculate counts for filter buttons
  const typeCounts = useMemo(() => {
    const activeSupporter = safeSupporters.filter(s => 
      showArchived ? s.is_archived === true : s.is_archived !== true
    );
    
    return {
      all: activeSupporter.length,
      donor: activeSupporter.filter(s => s.type === 'donor').length,
      volunteer: activeSupporter.filter(s => s.type === 'volunteer').length,
      sponsor: activeSupporter.filter(s => s.type === 'sponsor').length,
    };
  }, [safeSupporters, showArchived]);

  const archivedCount = safeSupporters.filter(s => s.is_archived === true).length;
  const activeCount = safeSupporters.filter(s => s.is_archived !== true).length;

  const hasActiveFilters = Boolean(
    searchTerm || 
    typeFilter || 
    advancedFilters.relationship || 
    advancedFilters.lifecycle || 
    advancedFilters.priority
  );

  const handleClearFilters = () => {
    setSearchTerm('');
    setTypeFilter(null);
    setAdvancedFilters({
      relationship: null,
      lifecycle: null,
      priority: null,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Supporters</h2>
          <p className="text-sm text-gray-600 mt-1">
            {showArchived 
              ? `${archivedCount} archived supporter${archivedCount !== 1 ? 's' : ''}`
              : `${activeCount} active supporter${activeCount !== 1 ? 's' : ''}`
            }
            {hasActiveFilters && ` • Showing ${filteredSupporters.length} filtered`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              title="Grid view"
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              title="Table view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Archive Toggle */}
          {onToggleArchived && archivedCount > 0 && (
            <button
              onClick={onToggleArchived}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                showArchived
                  ? 'bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {showArchived ? (
                <>
                  <ArchiveRestore className="h-4 w-4" />
                  Show Active
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4" />
                  Show Archived ({archivedCount})
                </>
              )}
            </button>
          )}

          {/* Add Supporter Button */}
          <button
            onClick={onCreateSupporter}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Supporter
          </button>
        </div>
      </div>

      {/* Filters */}
   <SupporterListFilters
  searchTerm={searchTerm}
  onSearchChange={setSearchTerm}
  typeFilter={typeFilter}
  onTypeFilterChange={setTypeFilter}
  advancedFilters={advancedFilters}
  onAdvancedFiltersChange={setAdvancedFilters}
  onClearFilters={handleClearFilters}
  typeCounts={typeCounts}
  hasActiveFilters={hasActiveFilters}
/>

      {/* Content - Grid or Table View */}
      {filteredSupporters.length > 0 ? (
        viewMode === 'grid' ? (
          <SupporterGrid
            supporters={filteredSupporters}
            onEdit={onEditSupporter}
            onDelete={onDeleteSupporter}
            onView={onViewSupporter}
            onQuickCall={onQuickCall}
            onQuickEmail={onQuickEmail}
          />
        ) : (
          <SupporterTable
            supporters={filteredSupporters}
            onEdit={onEditSupporter}
            onDelete={onDeleteSupporter}
            onView={onViewSupporter}
            onQuickCall={onQuickCall}
            onQuickEmail={onQuickEmail}
          />
        )
      ) : (
        <div className="text-center py-12">
          {showArchived ? (
            <>
              <Archive className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No archived supporters</h3>
              <p className="mt-1 text-sm text-gray-500">Archived supporters will appear here</p>
            </>
          ) : hasActiveFilters ? (
            <>
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No supporters match your filters</h3>
              <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filters</p>
              <button
                onClick={handleClearFilters}
                className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Clear all filters
              </button>
            </>
          ) : (
            <>
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No supporters yet</h3>
              <p className="mt-1 text-sm text-gray-500">Add supporters to track volunteers, donors, and sponsors</p>
              <button
                onClick={onCreateSupporter}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                Add First Supporter
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SupportersTab;

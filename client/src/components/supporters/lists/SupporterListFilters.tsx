// File: client/src/components/supporters/lists/SupporterListFilters.tsx
import React from 'react';

interface SupporterListFiltersProps {
  onFilterChange: (filters: any) => void;
}

const SupporterListFilters: React.FC<SupporterListFiltersProps> = ({ onFilterChange }) => {
  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="font-semibold mb-3">Filters</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select className="w-full border rounded px-3 py-2">
            <option value="">All Types</option>
            <option value="donor">Donors</option>
            <option value="volunteer">Volunteers</option>
            <option value="sponsor">Sponsors</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
          <select className="w-full border rounded px-3 py-2">
            <option value="">All Relationships</option>
            <option value="prospect">Prospect</option>
            <option value="new">New</option>
            <option value="regular">Regular</option>
            <option value="major">Major</option>
            <option value="lapsed">Lapsed</option>
          </select>
        </div>
        <p className="text-sm text-gray-500">Advanced filtering - To be implemented</p>
      </div>
    </div>
  );
};

export default SupporterListFilters;
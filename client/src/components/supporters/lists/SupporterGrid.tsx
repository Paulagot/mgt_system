// File: client/src/components/supporters/lists/SupporterGrid.tsx
import React from 'react';

interface SupporterGridProps {
  supporters: any[];
  onSupporterClick?: (supporter: any) => void;
}

const SupporterGrid: React.FC<SupporterGridProps> = ({ supporters, onSupporterClick }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {supporters.map((supporter) => (
        <div key={supporter.id} className="bg-white rounded-lg border p-4">
          <h3>{supporter.name}</h3>
          <p>Supporter grid item - To be implemented</p>
        </div>
      ))}
    </div>
  );
};

export default SupporterGrid;
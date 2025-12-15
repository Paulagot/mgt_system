// client/src/components/supporters/lists/SupporterGrid.tsx
import React from 'react';
import SupporterCard from '../cards/SupporterCard';
import { Supporter } from '../../../types/types';

interface SupporterGridProps {
  supporters: Supporter[];
  onEdit: (supporter: Supporter) => void;
  onDelete: (supporter: Supporter) => void;
  onView: (supporter: Supporter) => void;
  onQuickCall?: (supporter: Supporter) => void;
  onQuickEmail?: (supporter: Supporter) => void;
}

const SupporterGrid: React.FC<SupporterGridProps> = ({
  supporters,
  onEdit,
  onDelete,
  onView,
  onQuickCall,
  onQuickEmail,
}) => {
  if (supporters.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No supporters found matching your filters</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {supporters.map((supporter) => (
        <SupporterCard
          key={supporter.id}
          supporter={supporter}
          onEdit={onEdit}
          onDelete={onDelete}
          onView={onView}
          onQuickCall={onQuickCall}
          onQuickEmail={onQuickEmail}
        />
      ))}
    </div>
  );
};

export default SupporterGrid;
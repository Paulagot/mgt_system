// File: client/src/components/supporters/widgets/RelationshipIndicator.tsx
import React from 'react';

interface RelationshipIndicatorProps {
  relationship: string;
  size?: 'sm' | 'md' | 'lg';
}

const RelationshipIndicator: React.FC<RelationshipIndicatorProps> = ({ relationship, size = 'md' }) => {
  return (
    <div className={`inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-${size === 'sm' ? 'xs' : 'sm'}`}>
      {relationship}
    </div>
  );
};

export default RelationshipIndicator;
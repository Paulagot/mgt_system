import React from 'react';

interface SupporterQuickCardProps {
  supporter: any;
}

const SupporterQuickCard: React.FC<SupporterQuickCardProps> = ({ supporter }) => {
  return (
    <div className="bg-white rounded-lg border p-4">
      <h3>{supporter.name}</h3>
      <p>Quick card view - To be implemented</p>
    </div>
  );
};

export default SupporterQuickCard;
// File: client/src/components/supporters/cards/SupporterMetricCard.tsx
import React from 'react';

interface SupporterMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
}

const SupporterMetricCard: React.FC<SupporterMetricCardProps> = ({ title, value, subtitle }) => {
  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="text-sm font-medium text-gray-600">{title}</h3>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
};

export default SupporterMetricCard;
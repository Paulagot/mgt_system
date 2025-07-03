// File: client/src/components/supporters/widgets/DonorMetrics.tsx
import React from 'react';

interface DonorMetricsProps {
  clubId: string;
}

const DonorMetrics: React.FC<DonorMetricsProps> = ({ clubId }) => {
  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="font-semibold mb-2">Donor Metrics</h3>
      <p>KPI dashboard - To be implemented</p>
    </div>
  );
};

export default DonorMetrics;
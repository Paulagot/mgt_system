// File: client/src/components/supporters/panels/DonationHistoryPanel.tsx
import React from 'react';

interface DonationHistoryPanelProps {
  supporterId: string;
}

const DonationHistoryPanel: React.FC<DonationHistoryPanelProps> = ({ supporterId }) => {
  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="font-semibold mb-2">Donation History</h3>
      <p>Financial relationship view - To be implemented</p>
    </div>
  );
};

export default DonationHistoryPanel;
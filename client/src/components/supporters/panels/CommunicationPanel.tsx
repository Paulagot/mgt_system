// File: client/src/components/supporters/panels/CommunicationPanel.tsx
import React from 'react';

interface CommunicationPanelProps {
  supporterId: string;
}

const CommunicationPanel: React.FC<CommunicationPanelProps> = ({ supporterId }) => {
  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="font-semibold mb-2">Communication History</h3>
      <p>Communication timeline - To be implemented</p>
    </div>
  );
};

export default CommunicationPanel;
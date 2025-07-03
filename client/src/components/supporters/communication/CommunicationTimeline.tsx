// File: client/src/components/supporters/communication/CommunicationTimeline.tsx
import React from 'react';

interface CommunicationTimelineProps {
  supporterId: string;
}

const CommunicationTimeline: React.FC<CommunicationTimelineProps> = ({ supporterId }) => {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Communication Timeline</h3>
      <p>Full communication history - To be implemented</p>
    </div>
  );
};

export default CommunicationTimeline;
// File: client/src/components/supporters/communication/CommunicationLogEntry.tsx
import React from 'react';

interface CommunicationLogEntryProps {
  communication: any;
}

const CommunicationLogEntry: React.FC<CommunicationLogEntryProps> = ({ communication }) => {
  return (
    <div className="border-l-2 border-blue-200 pl-4 py-2">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-medium">{communication.type}</p>
          <p className="text-sm text-gray-600">{communication.notes}</p>
        </div>
        <span className="text-xs text-gray-500">{communication.date}</span>
      </div>
    </div>
  );
};

export default CommunicationLogEntry;
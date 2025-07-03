// File: client/src/components/supporters/widgets/NextActionWidget.tsx
import React from 'react';

interface NextActionWidgetProps {
  clubId: string;
}

const NextActionWidget: React.FC<NextActionWidgetProps> = ({ clubId }) => {
  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="font-semibold mb-2">Next Actions</h3>
      <p>Follow-up reminders - To be implemented</p>
    </div>
  );
};

export default NextActionWidget;
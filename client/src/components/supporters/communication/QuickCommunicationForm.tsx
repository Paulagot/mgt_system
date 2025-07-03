// File: client/src/components/supporters/communication/QuickCommunicationForm.tsx
import React from 'react';

interface QuickCommunicationFormProps {
  supporterId: string;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const QuickCommunicationForm: React.FC<QuickCommunicationFormProps> = ({ supporterId, onSubmit, onCancel }) => {
  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="font-semibold mb-3">Log Communication</h3>
      <div className="space-y-3">
        <select className="w-full border rounded px-3 py-2">
          <option>Call</option>
          <option>Email</option>
          <option>Meeting</option>
        </select>
        <textarea 
          placeholder="Notes..." 
          className="w-full border rounded px-3 py-2 h-20"
        />
        <div className="flex space-x-2">
          <button onClick={() => onSubmit({})} className="px-4 py-2 bg-blue-600 text-white rounded">Log</button>
          <button onClick={onCancel} className="px-4 py-2 border rounded">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default QuickCommunicationForm;
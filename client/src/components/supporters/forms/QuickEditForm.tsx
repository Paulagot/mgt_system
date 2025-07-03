// File: client/src/components/supporters/forms/QuickEditForm.tsx
import React from 'react';

interface QuickEditFormProps {
  supporter: any;
  onSave: (data: any) => void;
  onCancel: () => void;
}

const QuickEditForm: React.FC<QuickEditFormProps> = ({ supporter, onSave, onCancel }) => {
  return (
    <div className="bg-white border rounded-lg p-4">
      <h3>Quick Edit - {supporter.name}</h3>
      <p>Quick edit form - To be implemented</p>
      <div className="mt-2 flex space-x-2">
        <button onClick={() => onSave({})} className="px-3 py-1 bg-green-600 text-white text-sm rounded">Save</button>
        <button onClick={onCancel} className="px-3 py-1 border text-sm rounded">Cancel</button>
      </div>
    </div>
  );
};

export default QuickEditForm;
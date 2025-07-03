// File: client/src/components/supporters/forms/BulkImportForm.tsx
import React from 'react';

interface BulkImportFormProps {
  onImport: (data: any[]) => void;
  onCancel: () => void;
}

const BulkImportForm: React.FC<BulkImportFormProps> = ({ onImport, onCancel }) => {
  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-lg font-semibold mb-4">Bulk Import Supporters</h3>
      <p>CSV import functionality - To be implemented</p>
      <div className="mt-4 flex space-x-3">
        <button onClick={onCancel} className="px-4 py-2 border rounded">Cancel</button>
        <button onClick={() => onImport([])} className="px-4 py-2 bg-blue-600 text-white rounded">Import</button>
      </div>
    </div>
  );
};

export default BulkImportForm;
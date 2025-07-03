// File: client/src/components/supporters/lists/SupporterTable.tsx
import React from 'react';

interface SupporterTableProps {
  supporters: any[];
}

const SupporterTable: React.FC<SupporterTableProps> = ({ supporters }) => {
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left">Name</th>
            <th className="px-4 py-2 text-left">Type</th>
            <th className="px-4 py-2 text-left">Email</th>
            <th className="px-4 py-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {supporters.map((supporter) => (
            <tr key={supporter.id} className="border-t">
              <td className="px-4 py-2">{supporter.name}</td>
              <td className="px-4 py-2">{supporter.type}</td>
              <td className="px-4 py-2">{supporter.email}</td>
              <td className="px-4 py-2">Actions</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SupporterTable;
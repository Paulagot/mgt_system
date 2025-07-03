import React from 'react';
import { Plus, Users } from 'lucide-react';
import SupporterCard from '../supporters/cards/SupporterCard';
import { Supporter } from '../../types/types';


interface SupportersTabProps {
  supporters: Supporter[];
  onCreateSupporter: () => void;
  onEditSupporter: (supporter: Supporter) => void;
  onDeleteSupporter: (supporterId: string) => void;
  onViewSupporter: (supporter: Supporter) => void;
  onQuickCall: (supporter: Supporter) => void;
  onQuickEmail: (supporter: Supporter) => void;
}

const SupportersTab: React.FC<SupportersTabProps> = ({
  supporters,
  onCreateSupporter,
  onEditSupporter,
  onDeleteSupporter,
  onViewSupporter,
  onQuickCall,
  onQuickEmail,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Supporters</h2>
        <button
          onClick={onCreateSupporter}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Supporter
        </button>
      </div>

      {supporters.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {supporters.map((supporter) => (
            <SupporterCard
              key={supporter.id}
              supporter={supporter}
              onEdit={onEditSupporter}
              onDelete={onDeleteSupporter}
              onView={onViewSupporter}
              onQuickCall={onQuickCall}
              onQuickEmail={onQuickEmail}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No supporters yet</h3>
          <p className="mt-1 text-sm text-gray-500">Add supporters to track volunteers, donors, and sponsors</p>
          <button
            onClick={onCreateSupporter}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Add First Supporter
          </button>
        </div>
      )}
    </div>
  );
};

export default SupportersTab;

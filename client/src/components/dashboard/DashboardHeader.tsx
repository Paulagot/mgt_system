// client/src/components/dashboard/DashboardHeader.tsx
import React from 'react';
import { Plus, Target, Users, Trophy, Receipt, PiggyBank, ClipboardList } from 'lucide-react';

interface DashboardHeaderProps {
  clubName?: string;
  userName?: string;
  onNewEvent: () => void;
  onNewCampaign: () => void;

  // ✅ NEW quick actions
  onNewSupporter: () => void;
  onNewPrize: () => void;
  onNewExpense: () => void;
  onNewIncome: () => void; // placeholder
  onQuickTask: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  clubName,
  userName,
  onNewEvent,
  onNewCampaign,
  onNewSupporter,
  onNewPrize,
  onNewExpense,
  onNewIncome,
  onQuickTask,
}) => (
  <div className="bg-white shadow-sm border-b border-gray-200">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quick Actions</h1>
         
        </div>

        {/* ✅ Quick Actions */}
        <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
          <button onClick={onNewCampaign} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg flex items-center text-sm">
            <Target className="h-4 w-4 mr-2" />
            + Campaign
          </button>

          <button onClick={onNewEvent} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center text-sm">
            <Plus className="h-4 w-4 mr-2" />
            + Event
          </button>

          <button onClick={onNewSupporter} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg flex items-center text-sm">
            <Users className="h-4 w-4 mr-2" />
            + Supporter
          </button>

          <button onClick={onNewPrize} className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-lg flex items-center text-sm">
            <Trophy className="h-4 w-4 mr-2" />
            + Prize
          </button>

          <button onClick={onNewExpense} className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-2 rounded-lg flex items-center text-sm">
            <Receipt className="h-4 w-4 mr-2" />
            + Expense
          </button>

          <button
            onClick={onNewIncome}
            disabled
            className="bg-gray-200 text-gray-600 px-3 py-2 rounded-lg flex items-center text-sm cursor-not-allowed"
            title="Income Manager is coming soon"
          >
            <PiggyBank className="h-4 w-4 mr-2" />
            + Income
          </button>

          <button onClick={onQuickTask} className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-2 rounded-lg flex items-center text-sm">
            <ClipboardList className="h-4 w-4 mr-2" />
            + Quick Task
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default DashboardHeader;


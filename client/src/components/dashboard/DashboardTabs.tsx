// client/src/components/dashboard/DashboardTabs.tsx
import React from 'react';

interface DashboardTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

// ✅ Central tab config (IDs stay stable, labels can change anytime)
const tabs: { id: string; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'campaigns', label: 'Campaigns' },  
  { id: 'events', label: 'Events' },
  { id: 'supporters', label: 'Supporters' },
  { id: 'income', label: 'Income' },        // placeholder for now
  { id: 'expenses', label: 'Expense' },     // NEW
  { id: 'impact', label: 'Impact' },        // NEW - Impact tracking
  { id: 'prizes', label: 'Prize' },
  { id: 'tasks', label: 'Task' },           // NEW
  { id: 'prizefinder', label: 'AI Supporter Finder' }, // relabel existing tab
  { id: 'financials', label: 'Financials' },
];

const DashboardTabs: React.FC<DashboardTabsProps> = ({ activeTab, onTabChange }) => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  </div>
);

export default DashboardTabs;


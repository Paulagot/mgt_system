import React from 'react';
import { Clock, DollarSign, PieChart, TrendingDown, TrendingUp } from 'lucide-react';

interface FinancialsTabProps {
  financialData: {
    monthly_income: number;
    monthly_expenses: number;
    net_profit: number;
    pending_expenses: number;
  };
  loading: boolean;
}

const FinancialsTab: React.FC<FinancialsTabProps> = ({ financialData, loading }) => {
  const {
    monthly_income = 0,
    monthly_expenses = 0,
    net_profit = 0,
    pending_expenses = 0,
  } = financialData || {};

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 rounded-lg bg-green-100">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Income</p>
              <p className="text-2xl font-bold text-green-600">
                £{(monthly_income ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 rounded-lg bg-red-100">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">
                £{(monthly_expenses ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 rounded-lg bg-blue-100">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Net Profit</p>
              <p className="text-2xl font-bold text-blue-600">
                £{(net_profit ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 rounded-lg bg-yellow-100">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Expenses</p>
              <p className="text-2xl font-bold text-yellow-600">
                £{(pending_expenses ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Loading financial data...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Financial Overview</h2>
            <p className="text-sm text-gray-600">Detailed financial reports coming soon</p>
          </div>
          <div className="p-6">
            <div className="text-center py-8 text-gray-500">
              <PieChart className="mx-auto h-12 w-12 text-gray-300 mb-2" />
              <p className="text-sm">Advanced financial reporting in development</p>
              <p className="text-xs">Charts and detailed breakdowns will be available soon</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialsTab;


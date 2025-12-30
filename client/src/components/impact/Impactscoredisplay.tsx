// client/src/components/impact/ImpactScoreDisplay.tsx
import React from 'react';
import { Award, TrendingUp, Star } from 'lucide-react';

interface ImpactScoreDisplayProps {
  score: number;
  maxScore?: number;
  variant?: 'compact' | 'full';
  showBreakdown?: boolean;
  breakdown?: {
    mediaPoints: number;
    metricsPoints: number;
    financialPoints: number;
    testimonialPoints: number;
  };
}

const ImpactScoreDisplay: React.FC<ImpactScoreDisplayProps> = ({
  score,
  maxScore = 310,
  variant = 'compact',
  showBreakdown = false,
  breakdown,
}) => {
  const percentage = Math.min((score / maxScore) * 100, 100);

  // Determine rating based on score
  const getRating = () => {
    if (score >= 200) return { label: 'Exceptional', color: 'text-purple-600', bg: 'bg-purple-100', icon: '🏆' };
    if (score >= 150) return { label: 'Excellent', color: 'text-green-600', bg: 'bg-green-100', icon: '⭐' };
    if (score >= 100) return { label: 'Great', color: 'text-blue-600', bg: 'bg-blue-100', icon: '✨' };
    if (score >= 80) return { label: 'Good', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: '👍' };
    return { label: 'Developing', color: 'text-gray-600', bg: 'bg-gray-100', icon: '📈' };
  };

  const rating = getRating();

  if (variant === 'compact') {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200">
        <Award size={16} className="text-blue-600" />
        <span className="font-semibold text-blue-900">{score}</span>
        <span className="text-xs text-blue-600">pts</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Star className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Impact Reputation</h3>
            <p className="text-xs text-gray-600">Based on evidence quality</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full ${rating.bg}`}>
          <span className="text-sm font-medium">{rating.icon} {rating.label}</span>
        </div>
      </div>

      {/* Score Display */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {score}
          </span>
          <span className="text-2xl text-gray-400">/</span>
          <span className="text-2xl text-gray-500">{maxScore}</span>
          <span className="text-sm text-gray-500 ml-2">points</span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500"
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs text-gray-500">{percentage.toFixed(0)}% of maximum</span>
          {score >= 80 && (
            <span className="text-xs text-green-600 font-medium">✓ Above minimum (80pts)</span>
          )}
        </div>
      </div>

      {/* Breakdown */}
      {showBreakdown && breakdown && (
        <div className="space-y-2 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Score Breakdown</h4>
          
          <div className="grid grid-cols-2 gap-3">
            {/* Media */}
            <div className="flex items-center justify-between bg-green-50 rounded p-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-green-100 flex items-center justify-center">
                  <span className="text-xs">📸</span>
                </div>
                <span className="text-xs text-gray-700">Media</span>
              </div>
              <span className="text-sm font-semibold text-green-700">{breakdown.mediaPoints}</span>
            </div>

            {/* Metrics */}
            <div className="flex items-center justify-between bg-blue-50 rounded p-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center">
                  <TrendingUp size={12} className="text-blue-600" />
                </div>
                <span className="text-xs text-gray-700">Metrics</span>
              </div>
              <span className="text-sm font-semibold text-blue-700">{breakdown.metricsPoints}</span>
            </div>

            {/* Financial */}
            <div className="flex items-center justify-between bg-purple-50 rounded p-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-purple-100 flex items-center justify-center">
                  <span className="text-xs">💰</span>
                </div>
                <span className="text-xs text-gray-700">Financial</span>
              </div>
              <span className="text-sm font-semibold text-purple-700">{breakdown.financialPoints}</span>
            </div>

            {/* Testimonials */}
            <div className="flex items-center justify-between bg-yellow-50 rounded p-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-yellow-100 flex items-center justify-center">
                  <span className="text-xs">💬</span>
                </div>
                <span className="text-xs text-gray-700">Testimonials</span>
              </div>
              <span className="text-sm font-semibold text-yellow-700">{breakdown.testimonialPoints}</span>
            </div>
          </div>

          {/* Tips */}
          {score < 310 && (
            <div className="mt-3 p-3 bg-blue-50 rounded text-xs text-blue-800">
              <p className="font-medium mb-1">💡 Improve your score:</p>
              <ul className="list-disc list-inside space-y-1">
                {breakdown.mediaPoints < 60 && <li>Add more photos/videos (max 4 = 60pts)</li>}
                {breakdown.metricsPoints < 80 && <li>Add more impact metrics (max 4 = 80pts)</li>}
                {breakdown.financialPoints < 120 && <li>Include receipts/invoices (max 120pts)</li>}
                {breakdown.testimonialPoints < 50 && <li>Request testimonials (max 5 = 50pts)</li>}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImpactScoreDisplay;
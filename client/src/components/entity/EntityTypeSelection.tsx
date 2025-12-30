// client/src/components/EntitySetup/EntityTypeSelection.tsx
import React, { useState } from 'react';
import { useAuth } from '../../store/app_store';
import entitySetupService, { EntityType } from '../../services/entitySetupService';
import { 
  Building2, 
  Heart, 
  GraduationCap, 
  Users, 
  Target,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';

interface EntityTypeOption {
  type: EntityType;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  examples: string;
}

interface Props {
  onComplete: () => void;
}

export default function EntityTypeSelection({ onComplete }: Props) {
  const { club } = useAuth();
  const [selectedType, setSelectedType] = useState<EntityType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entityTypes: EntityTypeOption[] = [
    {
      type: EntityType.CLUB,
      icon: Building2,
      title: 'Club',
      description: 'Sports clubs, social clubs, hobby groups, and member organizations',
      examples: 'GAA clubs, golf clubs, rugby clubs, community clubs',
    },
    {
      type: EntityType.CHARITY,
      icon: Heart,
      title: 'Charity',
      description: 'Registered charities and non-profit organizations',
      examples: 'Food banks, animal rescues, homeless services, health organizations',
    },
    {
      type: EntityType.SCHOOL,
      icon: GraduationCap,
      title: 'School',
      description: 'Educational institutions and parent associations',
      examples: 'Primary schools, secondary schools, parent-teacher associations',
    },
    {
      type: EntityType.COMMUNITY_GROUP,
      icon: Users,
      title: 'Community Group',
      description: 'Local community organizations and resident associations',
      examples: 'Tidy towns, residents associations, community centers, volunteer groups',
    },
    {
      type: EntityType.CAUSE,
      icon: Target,
      title: 'Cause',
      description: 'Specific campaigns or causes that need support',
      examples: 'Medical fundraisers, memorial funds, community projects',
    },
  ];

  const handleSubmit = async () => {
    if (!selectedType || !club?.id) return;

    try {
      setLoading(true);
      setError(null);

      await entitySetupService.setEntityType(club.id, selectedType);
      
      // Notify parent component that entity type is set
      onComplete();
    } catch (err: any) {
      console.error('Set entity type error:', err);
      setError(err.message || 'Failed to set entity type');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">What type of organization are you?</h1>
        <p className="text-lg text-gray-600">
          Select the category that best describes your organization. This helps us customize your experience.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Entity Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {entityTypes.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedType === option.type;

          return (
            <button
              key={option.type}
              onClick={() => setSelectedType(option.type)}
              className={`text-left p-6 rounded-lg border-2 transition-all ${
                isSelected
                  ? 'border-blue-600 bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start gap-4 mb-3">
                <div
                  className={`p-3 rounded-lg ${
                    isSelected ? 'bg-blue-100' : 'bg-gray-100'
                  }`}
                >
                  <Icon
                    className={`h-6 w-6 ${
                      isSelected ? 'text-blue-600' : 'text-gray-600'
                    }`}
                  />
                </div>
                <div className="flex-1">
                  <h3
                    className={`font-semibold text-lg mb-1 ${
                      isSelected ? 'text-blue-900' : 'text-gray-900'
                    }`}
                  >
                    {option.title}
                  </h3>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-3">{option.description}</p>

              <div className="pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500 font-medium mb-1">Examples:</p>
                <p className="text-xs text-gray-600">{option.examples}</p>
              </div>

              {isSelected && (
                <div className="mt-4 flex items-center justify-center">
                  <div className="flex items-center gap-2 text-blue-600 font-medium text-sm">
                    <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center">
                      <svg
                        className="h-3 w-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    Selected
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Submit Button */}
      <div className="flex justify-center">
        <button
          onClick={handleSubmit}
          disabled={!selectedType || loading}
          className={`flex items-center gap-2 px-8 py-3 rounded-lg font-semibold text-lg transition-colors ${
            selectedType && !loading
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              Setting up...
            </>
          ) : (
            <>
              Continue to Details
              <ChevronRight className="h-5 w-5" />
            </>
          )}
        </button>
      </div>

      {/* Help Text */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          Don't worry, you can change this later if needed.
        </p>
      </div>
    </div>
  );
}
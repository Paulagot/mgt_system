// client/src/components/EntitySetup/ChangeEntityType.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../store/app_store';
import { useNavigate } from 'react-router-dom';
import entitySetupService, { EntityType, OnboardingStatus } from '../../services/entitySetupService';
import { 
  Building2, 
  Heart, 
  GraduationCap, 
  Users, 
  Target,
  ArrowLeft,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';

interface EntityTypeOption {
  type: EntityType;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

export default function ChangeEntityType() {
  const { club } = useAuth();
  const navigate = useNavigate();
  const [currentType, setCurrentType] = useState<EntityType | null>(null);
  const [selectedType, setSelectedType] = useState<EntityType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);

  console.log('🔧 ChangeEntityType - Component mounted', { clubId: club?.id });

  const entityTypes: EntityTypeOption[] = [
    {
      type: EntityType.CLUB,
      icon: Building2,
      title: 'Club',
      description: 'Sports clubs, social clubs, hobby groups',
    },
    {
      type: EntityType.CHARITY,
      icon: Heart,
      title: 'Charity',
      description: 'Registered charities and non-profits',
    },
    {
      type: EntityType.SCHOOL,
      icon: GraduationCap,
      title: 'School',
      description: 'Educational institutions and PTAs',
    },
    {
      type: EntityType.COMMUNITY_GROUP,
      icon: Users,
      title: 'Community Group',
      description: 'Local organizations and resident associations',
    },
    {
      type: EntityType.CAUSE,
      icon: Target,
      title: 'Cause',
      description: 'Specific campaigns or fundraisers',
    },
  ];

  useEffect(() => {
    loadCurrentType();
  }, [club?.id]);

  const loadCurrentType = async () => {
    if (!club?.id) {
      console.log('❌ ChangeEntityType - No club ID');
      return;
    }

    try {
      setLoading(true);
      console.log('📡 ChangeEntityType - Loading current type for club:', club.id);
      
      const { status } = await entitySetupService.getOnboardingStatus(club.id);
      console.log('✅ ChangeEntityType - Status loaded:', status);
      
      if (status.entity_type) {
        setCurrentType(status.entity_type as EntityType);
        setSelectedType(status.entity_type as EntityType);
      }
      
      setIsVerified(status.onboarding_status === OnboardingStatus.VERIFIED);
    } catch (err) {
      console.error('❌ ChangeEntityType - Load error:', err);
      setError('Failed to load current entity type');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedType || !club?.id || selectedType === currentType) {
      navigate('/entity-setup');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await entitySetupService.setEntityType(club.id, selectedType);
      
      // Navigate back to entity setup
      navigate('/entity-setup');
    } catch (err: any) {
      console.error('Change type error:', err);
      setError(err.message || 'Failed to change entity type');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (isVerified) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-yellow-900 mb-2">
                Cannot Change Verified Entity Type
              </h2>
              <p className="text-yellow-700 mb-4">
                Your entity has been verified and the type cannot be changed. If you need to update this, please contact our support team.
              </p>
              <button
                onClick={() => navigate('/entity-setup')}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
              >
                Back to Entity Setup
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/entity-setup')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Entity Setup
        </button>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Change Organization Type</h1>
        <p className="text-gray-600">
          {currentType ? (
            <>
              Currently set as: <span className="font-semibold">{entitySetupService.getEntityTypeName(currentType)}</span>
            </>
          ) : (
            'Select a new organization type'
          )}
        </p>
      </div>

      {/* Warning if type is already set */}
      {currentType && selectedType !== currentType && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">Changing your organization type</p>
            <p>This will update how your organization is displayed and may affect available features.</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Entity Type Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {entityTypes.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedType === option.type;
          const isCurrent = currentType === option.type;

          return (
            <button
              key={option.type}
              onClick={() => setSelectedType(option.type)}
              className={`text-left p-6 rounded-lg border-2 transition-all ${
                isSelected
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-4">
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
                  <div className="flex items-center gap-2 mb-1">
                    <h3
                      className={`font-semibold ${
                        isSelected ? 'text-blue-900' : 'text-gray-900'
                      }`}
                    >
                      {option.title}
                    </h3>
                    {isCurrent && (
                      <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{option.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/entity-setup')}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>

        <button
          onClick={handleSave}
          disabled={saving || !selectedType}
          className={`px-6 py-2 rounded-lg font-semibold ${
            selectedType && !saving
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {saving ? 'Saving...' : selectedType === currentType ? 'Continue' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
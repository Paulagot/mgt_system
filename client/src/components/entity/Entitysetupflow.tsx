// client/src/components/EntitySetup/EntitySetupFlow.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../store/app_store';
import entitySetupService, { OnboardingStatus } from '../../services/entitySetupService';
import EntityTypeSelection from './EntityTypeSelection';
import EntitySetupWizard from './Entitysetupwizard';

export default function EntitySetupFlow() {
  const { club } = useAuth();
  const [loading, setLoading] = useState(true);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);
  const [hasEntityType, setHasEntityType] = useState(false);

  useEffect(() => {
    checkStatus();
  }, [club?.id]);

  const checkStatus = async () => {
    if (!club?.id) return;

    try {
      setLoading(true);
      const { status } = await entitySetupService.getOnboardingStatus(club.id);
      setOnboardingStatus(status.onboarding_status);
      
      // If entity_type is set, show wizard. Otherwise show type selection
      const hasType = status.entity_type !== null;
      console.log('🔍 EntitySetupFlow - Status Check:', {
        entity_type: status.entity_type,
        onboarding_status: status.onboarding_status,
        hasType,
      });
      setHasEntityType(hasType);
    } catch (err) {
      console.error('Check status error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTypeSelected = () => {
    // Refresh status and proceed to wizard
    setHasEntityType(true);
    checkStatus();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  console.log('🎯 EntitySetupFlow - Render Decision:', {
    hasEntityType,
    onboardingStatus,
    willShowTypeSelection: !hasEntityType,
  });

  // Show type selection if no entity type set yet OR if in draft status
  if (!hasEntityType) {
    return <EntityTypeSelection onComplete={handleTypeSelected} />;
  }

  // Show wizard if entity type is set
  return <EntitySetupWizard />;
}
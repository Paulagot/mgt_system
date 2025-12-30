// client/src/components/EntitySetup/VerificationStatus.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../store/app_store';
import { Link } from 'react-router-dom';
import entitySetupService, {
  OnboardingStatus,
  EntityDetails,
} from '../../services/entitySetupService';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  XCircle,
  Edit,
  RefreshCw,
  ChevronRight,
  FileText,
} from 'lucide-react';

export default function VerificationStatus() {
  const { club } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);
  const [entityDetails, setEntityDetails] = useState<EntityDetails | null>(null);
  const [completeness, setCompleteness] = useState(0);

  console.log('🔍 VerificationStatus - Component mounted', { clubId: club?.id });

  useEffect(() => {
    loadStatus();
  }, [club?.id]);

  const loadStatus = async () => {
    if (!club?.id) {
      console.log('❌ VerificationStatus - No club ID');
      return;
    }

    try {
      setLoading(true);
      console.log('📡 VerificationStatus - Loading status for club:', club.id);
      
      const { status } = await entitySetupService.getOnboardingStatus(club.id);
      console.log('✅ VerificationStatus - Status loaded:', status);
      setOnboardingStatus(status.onboarding_status);

      try {
        const { entityDetails: details, completeness: comp } = 
          await entitySetupService.getEntityDetails(club.id);
        console.log('✅ VerificationStatus - Entity details loaded:', details);
        setEntityDetails(details);
        setCompleteness(comp);
      } catch (err) {
        console.log('⚠️ VerificationStatus - No entity details found');
        setEntityDetails(null);
        setCompleteness(0);
      }
    } catch (err) {
      console.error('❌ VerificationStatus - Load status error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStatus();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const getStatusDisplay = () => {
    if (!onboardingStatus) return null;

    switch (onboardingStatus) {
      case OnboardingStatus.DRAFT:
      case OnboardingStatus.ENTITY_SETUP:
        // Calculate what's missing
        const missingSteps = [];
        if (!entityDetails) {
          missingSteps.push('Complete the entity setup form');
        } else {
          if (!entityDetails.legal_name) missingSteps.push('Add legal name');
          if (!entityDetails.address_line1) missingSteps.push('Add address');
          if (!entityDetails.city) missingSteps.push('Add city');
          if (!entityDetails.postal_code) missingSteps.push('Add postal code');
          if (!entityDetails.legal_structure) missingSteps.push('Select legal structure');
          
          if (completeness < 100) {
            missingSteps.push(`Complete remaining details (${completeness}% done)`);
          }
        }

        return {
          icon: AlertTriangle,
          iconColor: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          title: 'Setup Not Complete',
          description: 'Complete the following steps to submit your organization for verification:',
          details: missingSteps.length > 0 ? missingSteps : ['Complete all required fields in entity setup'],
          action: (
            <Link
              to="/entity-setup"
              className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
              Complete Entity Setup
              <ChevronRight className="h-4 w-4" />
            </Link>
          ),
        };

      case OnboardingStatus.PENDING_VERIFICATION:
        return {
          icon: Clock,
          iconColor: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          title: 'Verification Pending',
          description: 'Our team is reviewing your entity details. This typically takes 1-2 business days.',
          details: [
            'We\'re checking your organization details for accuracy',
            'We may contact you if we need additional information',
            'You\'ll be notified by email once verification is complete',
            'You can still edit your details while we review',
          ],
          action: (
            <div className="flex gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh Status
              </button>
              <Link
                to="/entity-setup"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Edit className="h-4 w-4" />
                Edit Details
              </Link>
            </div>
          ),
        };

      case OnboardingStatus.VERIFIED:
        return {
          icon: CheckCircle,
          iconColor: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          title: 'Verified!',
          description: 'Your organization has been successfully verified. You can now proceed to set up payment methods.',
          details: [
            `Verified on ${entityDetails?.verified_at ? new Date(entityDetails.verified_at).toLocaleDateString() : 'recently'}`,
            'Your verification status is displayed to donors',
            'You can view your details but cannot modify them',
            'Contact support if you need to update verified information',
          ],
          action: (
            <div className="flex gap-3">
              <Link
                to="/entity-setup"
                className="inline-flex items-center gap-2 px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50"
              >
                <FileText className="h-4 w-4" />
                View Details
              </Link>
              <Link
                to="/payment-setup"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Setup Payment Methods
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          ),
        };

      case OnboardingStatus.SUSPENDED:
        return {
          icon: XCircle,
          iconColor: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          title: 'Account Suspended',
          description: 'Your account has been suspended. Please contact support for assistance.',
          details: entityDetails?.verification_notes 
            ? [`Reason: ${entityDetails.verification_notes}`]
            : ['Contact support@fundraisely.com for more information'],
          action: null,
        };

      default:
        return null;
    }
  };

  const statusDisplay = getStatusDisplay();

  if (!statusDisplay) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center text-gray-600">
          Unable to load verification status. Please try again.
        </div>
      </div>
    );
  }

  const StatusIcon = statusDisplay.icon;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Verification Status</h1>
        <p className="text-gray-600">
          Track the status of your organization verification
        </p>
      </div>

      {/* Main Status Card */}
      <div className={`${statusDisplay.bgColor} border ${statusDisplay.borderColor} rounded-lg p-8 mb-6`}>
        <div className="flex items-start gap-4 mb-6">
          <StatusIcon className={`h-12 w-12 ${statusDisplay.iconColor} flex-shrink-0`} />
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {statusDisplay.title}
            </h2>
            <p className="text-gray-700 text-lg">
              {statusDisplay.description}
            </p>
          </div>
        </div>

        {statusDisplay.details && (
          <div className="mb-6 space-y-2">
            {statusDisplay.details.map((detail, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className={`h-2 w-2 rounded-full mt-2 ${statusDisplay.iconColor.replace('text-', 'bg-')}`} />
                <p className="text-gray-700">{detail}</p>
              </div>
            ))}
          </div>
        )}

        {statusDisplay.action && (
          <div className="pt-4 border-t border-gray-200">
            {statusDisplay.action}
          </div>
        )}
      </div>

      {/* Progress Card for Non-Verified */}
      {onboardingStatus !== OnboardingStatus.VERIFIED && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Setup Checklist</h3>
          
          {entityDetails ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-600">Overall Completeness</span>
                <span className="text-sm font-medium text-blue-600">{completeness}%</span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${completeness}%` }}
                />
              </div>

              {/* Checklist */}
              <div className="space-y-3">
                <ChecklistItem 
                  label="Organization name" 
                  completed={!!entityDetails.legal_name} 
                />
                <ChecklistItem 
                  label="Address details" 
                  completed={!!(entityDetails.address_line1 && entityDetails.city && entityDetails.postal_code)} 
                />
                <ChecklistItem 
                  label="Legal structure" 
                  completed={!!entityDetails.legal_structure} 
                />
                <ChecklistItem 
                  label="Registration details" 
                  completed={!!(
                    entityDetails.ie_cro_number || 
                    entityDetails.ie_charity_rcn || 
                    entityDetails.uk_company_number || 
                    entityDetails.uk_charity_england_wales ||
                    entityDetails.uk_charity_scotland ||
                    entityDetails.uk_charity_ni
                  )} 
                  optional={true}
                />
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-600 mb-4">No entity details found. Start by completing the entity setup form.</p>
              <Link
                to="/entity-setup"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Start Entity Setup
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Help Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Need Help?</h3>
        <p className="text-sm text-gray-600 mb-4">
          If you have questions about the verification process or need assistance, our support team is here to help.
        </p>
        <a
          href="mailto:support@fundraisely.com"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Contact Support →
        </a>
      </div>
    </div>
  );
}

// Helper component for checklist items
function ChecklistItem({ 
  label, 
  completed, 
  optional = false 
}: { 
  label: string; 
  completed: boolean; 
  optional?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center ${
        completed ? 'bg-green-100' : 'bg-gray-100'
      }`}>
        {completed ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <div className="h-2 w-2 rounded-full bg-gray-400" />
        )}
      </div>
      <span className={`text-sm flex-1 ${completed ? 'text-gray-900' : 'text-gray-600'}`}>
        {label}
      </span>
      {optional && !completed && (
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
          Optional
        </span>
      )}
      {completed && (
        <span className="text-xs text-green-600 font-medium">
          ✓
        </span>
      )}
    </div>
  );
}
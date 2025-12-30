// client/src/components/EntitySetup/EntitySetupDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../store/app_store';
import entitySetupService, {
  OnboardingStatus,
  EntityDetails,
} from '../../services/entitySetupService';
import { 
  Building2, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Edit,
  ChevronRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EntitySetupDashboard() {
  const { club } = useAuth();
  const [loading, setLoading] = useState(true);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);
  const [entityType, setEntityType] = useState<string | null>(null);
  const [entityDetails, setEntityDetails] = useState<EntityDetails | null>(null);
  const [completeness, setCompleteness] = useState(0);

  useEffect(() => {
    loadStatus();
  }, [club?.id]);

  const loadStatus = async () => {
    if (!club?.id) return;

    try {
      setLoading(true);
      
      // Get onboarding status
      const { status } = await entitySetupService.getOnboardingStatus(club.id);
      setOnboardingStatus(status.onboarding_status);
      setEntityType(status.entity_type);

      // Try to load entity details
      try {
        const { entityDetails: details, completeness: comp } = 
          await entitySetupService.getEntityDetails(club.id);
        setEntityDetails(details);
        setCompleteness(comp);
      } catch (err) {
        // Entity details don't exist yet
        setEntityDetails(null);
        setCompleteness(0);
      }
    } catch (err) {
      console.error('Load status error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const getStatusBadge = () => {
    if (!onboardingStatus) return null;

    const badges = {
      [OnboardingStatus.DRAFT]: {
        icon: AlertTriangle,
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        text: 'Getting Started',
      },
      [OnboardingStatus.ENTITY_SETUP]: {
        icon: Clock,
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        text: 'In Progress',
      },
      [OnboardingStatus.PENDING_VERIFICATION]: {
        icon: Clock,
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        text: 'Pending Verification',
      },
      [OnboardingStatus.VERIFIED]: {
        icon: CheckCircle,
        color: 'bg-green-100 text-green-800 border-green-200',
        text: 'Verified',
      },
      [OnboardingStatus.SUSPENDED]: {
        icon: AlertTriangle,
        color: 'bg-red-100 text-red-800 border-red-200',
        text: 'Suspended',
      },
    };

    const badge = badges[onboardingStatus];
    const Icon = badge.icon;

    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${badge.color}`}>
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium">{badge.text}</span>
      </div>
    );
  };

  const getNextAction = () => {
    const canProceed = entitySetupService.canProceed(onboardingStatus || OnboardingStatus.DRAFT);

    if (!canProceed.allowed) {
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">{canProceed.reason}</p>
        </div>
      );
    }

    if (onboardingStatus === OnboardingStatus.VERIFIED) {
      return (
        <Link
          to="/payment-setup"
          className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4 hover:bg-blue-100 transition-colors"
        >
          <div>
            <p className="font-medium text-blue-900">Setup Payment Methods</p>
            <p className="text-sm text-blue-700">Configure how you'll receive donations</p>
          </div>
          <ChevronRight className="h-5 w-5 text-blue-600" />
        </Link>
      );
    }

    return (
      <Link
        to="/entity-setup"
        className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4 hover:bg-blue-100 transition-colors"
      >
        <div>
          <p className="font-medium text-blue-900">
            {entityDetails ? 'Review & Update' : 'Complete'} Entity Details
          </p>
          <p className="text-sm text-blue-700">{canProceed.nextStep}</p>
        </div>
        <ChevronRight className="h-5 w-5 text-blue-600" />
      </Link>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Entity Setup</h1>
            <p className="text-sm text-gray-600">Manage your organization details and verification</p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* Completeness Progress */}
      {entityDetails && onboardingStatus !== OnboardingStatus.VERIFIED && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Setup Progress</h2>
            <span className="text-sm font-medium text-blue-600">{completeness}%</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${completeness}%` }}
            />
          </div>
          
          <p className="text-xs text-gray-600">
            {completeness < 100
              ? 'Complete all required fields to submit for verification'
              : 'Ready to submit for verification!'}
          </p>
        </div>
      )}

      {/* Entity Details Summary */}
      {entityDetails && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Organization Details</h2>
            {!entityDetails.registration_verified && (
              <Link
                to="/entity-setup"
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Link>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6">
            {entityType && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Organization Type</p>
                <p className="font-medium text-gray-900">
                  {entitySetupService.getEntityTypeName(entityType as any)}
                </p>
              </div>
            )}

            <div>
              <p className="text-sm text-gray-500 mb-1">Legal Name</p>
              <p className="font-medium text-gray-900">{entityDetails.legal_name}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Country</p>
              <p className="font-medium text-gray-900">
                {entityDetails.country === 'IE' ? 'Ireland' : 'United Kingdom'}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Legal Structure</p>
              <p className="font-medium text-gray-900">
                {entitySetupService.getLegalStructureName(entityDetails.legal_structure)}
              </p>
            </div>

            {entityDetails.founded_year && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Founded</p>
                <p className="font-medium text-gray-900">{entityDetails.founded_year}</p>
              </div>
            )}

            {entityDetails.address_line1 && (
              <div className="col-span-2">
                <p className="text-sm text-gray-500 mb-1">Address</p>
                <p className="font-medium text-gray-900">
                  {entityDetails.address_line1}
                  {entityDetails.address_line2 && `, ${entityDetails.address_line2}`}
                  <br />
                  {entityDetails.city}
                  {entityDetails.county_state && `, ${entityDetails.county_state}`}
                  {' '}
                  {entityDetails.postal_code}
                </p>
              </div>
            )}

            {/* Registration Numbers */}
            {(entityDetails.ie_cro_number || 
              entityDetails.ie_charity_rcn || 
              entityDetails.ie_charity_chy ||
              entityDetails.uk_company_number ||
              entityDetails.uk_charity_england_wales ||
              entityDetails.uk_charity_scotland ||
              entityDetails.uk_charity_ni) && (
              <div className="col-span-2">
                <p className="text-sm text-gray-500 mb-2">Registration Numbers</p>
                <div className="grid grid-cols-2 gap-3">
                  {entityDetails.ie_cro_number && (
                    <div className="bg-gray-50 px-3 py-2 rounded">
                      <p className="text-xs text-gray-500">CRO Number</p>
                      <p className="text-sm font-medium text-gray-900">{entityDetails.ie_cro_number}</p>
                    </div>
                  )}
                  {entityDetails.ie_charity_rcn && (
                    <div className="bg-gray-50 px-3 py-2 rounded">
                      <p className="text-xs text-gray-500">RCN</p>
                      <p className="text-sm font-medium text-gray-900">{entityDetails.ie_charity_rcn}</p>
                    </div>
                  )}
                  {entityDetails.uk_company_number && (
                    <div className="bg-gray-50 px-3 py-2 rounded">
                      <p className="text-xs text-gray-500">Companies House</p>
                      <p className="text-sm font-medium text-gray-900">{entityDetails.uk_company_number}</p>
                    </div>
                  )}
                  {entityDetails.uk_charity_england_wales && (
                    <div className="bg-gray-50 px-3 py-2 rounded">
                      <p className="text-xs text-gray-500">Charity Commission</p>
                      <p className="text-sm font-medium text-gray-900">{entityDetails.uk_charity_england_wales}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Verification Status */}
          {entityDetails.registration_verified && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Verified on {new Date(entityDetails.verified_at!).toLocaleDateString()}</span>
              </div>
              {entityDetails.verification_notes && (
                <p className="mt-2 text-sm text-gray-600">{entityDetails.verification_notes}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Next Action */}
      <div>
        <h2 className="text-sm font-medium text-gray-700 mb-3">Next Steps</h2>
        {getNextAction()}
      </div>

      {/* Help Text */}
      {onboardingStatus === OnboardingStatus.PENDING_VERIFICATION && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900 font-medium mb-1">What happens next?</p>
          <p className="text-sm text-blue-700">
            Our team is reviewing your entity details. This typically takes 1-2 business days. 
            We may contact you if we need additional information. You'll be notified once verification is complete.
          </p>
        </div>
      )}
    </div>
  );
}
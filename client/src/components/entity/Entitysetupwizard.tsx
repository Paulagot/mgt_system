// client/src/components/EntitySetup/EntitySetupWizard.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/app_store';
import entitySetupService, {
  EntityType,
  Country,
  LegalStructure,
  EntitySetupFormData,
  IrelandRegistration,
  UKRegistration,
  OnboardingStatus,
} from '../../services/entitySetupService';
import { ChevronLeft, ChevronRight, Check, AlertCircle, Building2, MapPin, FileText, Award } from 'lucide-react';

interface StepStatus {
  completed: boolean;
  valid: boolean;
}

export default function EntitySetupWizard() {
  const { club } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);
  const [entityType, setEntityType] = useState<string | null>(null);
  const [existingData, setExistingData] = useState(false);
  
  const [formData, setFormData] = useState<EntitySetupFormData>({
    legalName: '',
    tradingNames: [],
    description: '',
    foundedYear: undefined,
    
    addressLine1: '',
    addressLine2: '',
    city: '',
    countyState: '',
    postalCode: '',
    country: Country.IRELAND,
    
    legalStructure: LegalStructure.UNINCORPORATED_ASSOCIATION,
    
    registrationDetails: {
      ieCroNumber: '',
      ieCharityChyNumber: '',
      ieCharityRcn: '',
      ieRevenueSportsBody: false,
    } as IrelandRegistration,
  });

  const [stepStatus, setStepStatus] = useState<Record<number, StepStatus>>({
    1: { completed: false, valid: false },
    2: { completed: false, valid: false },
    3: { completed: false, valid: false },
    4: { completed: false, valid: false },
  });

  // Load existing data if available
  useEffect(() => {
    loadExistingData();
  }, [club?.id]);

  const loadExistingData = async () => {
    if (!club?.id) return;

    try {
      setLoading(true);
      
      // Get onboarding status
      const { status } = await entitySetupService.getOnboardingStatus(club.id);
      setOnboardingStatus(status.onboarding_status);
      setEntityType(status.entity_type);

      // Try to load entity details if they exist
      try {
        const { entityDetails } = await entitySetupService.getEntityDetails(club.id);
        
        if (entityDetails) {
          const loadedData = entitySetupService.entityDetailsToFormData(entityDetails);
          setFormData(loadedData);
          setExistingData(true);
          
          // Mark steps as completed
          setStepStatus({
            1: { completed: true, valid: true },
            2: { completed: true, valid: true },
            3: { completed: true, valid: true },
            4: { completed: true, valid: true },
          });
        }
      } catch (err) {
        // Entity details don't exist yet - that's fine
        console.log('No existing entity details');
      }

      setError(null);
    } catch (err: any) {
      console.error('Load data error:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (updates: Partial<EntitySetupFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const validateCurrentStep = (): boolean => {
    const validation = entitySetupService.validateFormData(formData, currentStep);
    
    if (!validation.valid) {
      setError(validation.errors.join(', '));
      return false;
    }
    
    setError(null);
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    
    setStepStatus(prev => ({
      ...prev,
      [currentStep]: { completed: true, valid: true },
    }));
    
    setCurrentStep(prev => Math.min(prev + 1, 4));
    setError(null);
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setError(null);
  };

  const handleSubmit = async () => {
    if (!club?.id) {
      setError('Club ID not found');
      return;
    }

    // Validate all steps
    const validation = entitySetupService.validateFormData(formData);
    if (!validation.valid) {
      setError(validation.errors.join(', '));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (existingData) {
        // Update existing
        const result = await entitySetupService.updateEntityDetails(club.id, formData);
        setSuccessMessage(result.message);
      } else {
        // Create new
        const result = await entitySetupService.createEntityDetails(club.id, formData);
        setSuccessMessage(result.message);
        setExistingData(true);
      }

      // Wait a moment to show success message, then redirect to verification status
      setTimeout(() => {
        navigate('/verification-status');
      }, 1500);
    } catch (err: any) {
      console.error('Submit error:', err);
      setError(err.message || 'Failed to submit entity details');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'Basic Information', icon: Building2 },
    { number: 2, title: 'Address', icon: MapPin },
    { number: 3, title: 'Legal Structure', icon: FileText },
    { number: 4, title: 'Registration Details', icon: Award },
  ];

  // Show verification complete message for verified status
  const isVerified = onboardingStatus === OnboardingStatus.VERIFIED;
  const isPendingVerification = onboardingStatus === OnboardingStatus.PENDING_VERIFICATION;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">Entity Setup</h1>
            {entityType && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                {entitySetupService.getEntityTypeName(entityType as any)}
              </span>
            )}
          </div>
          {entityType && !isVerified && (
            <Link
              to="/entity-setup/change-type"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Change Type
            </Link>
          )}
        </div>
        <p className="text-gray-600 mt-2">
          Complete your entity details to get verified and start fundraising.
        </p>
      </div>

      {/* Status Banners */}
      {isVerified && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-green-900">Entity Verified!</p>
            <p className="text-sm text-green-700 mt-1">
              Your entity details have been verified. You can view them below but cannot make changes. Contact support if you need to update verified information.
            </p>
          </div>
        </div>
      )}

      {isPendingVerification && !isVerified && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-blue-900">Verification Pending</p>
            <p className="text-sm text-blue-700 mt-1">
              Your entity details are being reviewed by our team. You can still edit them while pending. We'll notify you once verification is complete.
            </p>
          </div>
        </div>
      )}

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.number;
            const isCompleted = stepStatus[step.number]?.completed;
            
            return (
              <React.Fragment key={step.number}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                      isCompleted
                        ? 'bg-green-600 text-white'
                        : isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {isCompleted ? <Check className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                  </div>
                  <p className={`text-sm font-medium ${isActive ? 'text-blue-600' : 'text-gray-600'}`}>
                    {step.title}
                  </p>
                </div>
                
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-4 ${isCompleted ? 'bg-green-600' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-green-700">{successMessage}</p>
        </div>
      )}

      {/* Step Content */}
      <div className={`bg-white border border-gray-200 rounded-lg p-6 mb-6 ${isVerified ? 'pointer-events-none opacity-60' : ''}`}>
        {currentStep === 1 && (
          <Step1BasicInfo formData={formData} updateFormData={updateFormData} disabled={isVerified} />
        )}
        
        {currentStep === 2 && (
          <Step2Address formData={formData} updateFormData={updateFormData} disabled={isVerified} />
        )}
        
        {currentStep === 3 && (
          <Step3LegalStructure formData={formData} updateFormData={updateFormData} disabled={isVerified} />
        )}
        
        {currentStep === 4 && (
          <Step4Registration formData={formData} updateFormData={updateFormData} disabled={isVerified} />
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleBack}
          disabled={currentStep === 1}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            currentStep === 1
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        {currentStep < 4 ? (
          <button
            onClick={handleNext}
            disabled={isVerified}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg ${
              isVerified
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading || isVerified}
            className={`px-6 py-2 rounded-lg ${
              isVerified
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700 disabled:opacity-50'
            }`}
          >
            {loading ? 'Submitting...' : existingData ? 'Update Details' : 'Submit for Verification'}
          </button>
        )}
      </div>
    </div>
  );
}

// Step 1: Basic Information
function Step1BasicInfo({ 
  formData, 
  updateFormData,
  disabled = false
}: { 
  formData: EntitySetupFormData; 
  updateFormData: (updates: Partial<EntitySetupFormData>) => void;
  disabled?: boolean;
}) {
  const [newTradingName, setNewTradingName] = useState('');

  const addTradingName = () => {
    if (newTradingName.trim()) {
      updateFormData({
        tradingNames: [...formData.tradingNames, newTradingName.trim()],
      });
      setNewTradingName('');
    }
  };

  const removeTradingName = (index: number) => {
    updateFormData({
      tradingNames: formData.tradingNames.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Legal Name <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          value={formData.legalName}
          onChange={(e) => updateFormData({ legalName: e.target.value })}
          disabled={disabled}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder="Official registered name"
        />
        <p className="mt-1 text-sm text-gray-500">The official name of your organization</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Trading Names / Alternative Names
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={newTradingName}
            onChange={(e) => setNewTradingName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !disabled && addTradingName()}
            disabled={disabled}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="Add an alternative name"
          />
          <button
            type="button"
            onClick={addTradingName}
            disabled={disabled}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>
        
        {formData.tradingNames.length > 0 && (
          <div className="space-y-2">
            {formData.tradingNames.map((name, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                <span className="text-sm text-gray-700">{name}</span>
                <button
                  type="button"
                  onClick={() => removeTradingName(index)}
                  disabled={disabled}
                  className="text-red-600 hover:text-red-700 text-sm disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => updateFormData({ description: e.target.value })}
          disabled={disabled}
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder="Tell us about your organization..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Founded Year
        </label>
        <input
          type="number"
          value={formData.foundedYear || ''}
          onChange={(e) => updateFormData({ foundedYear: e.target.value ? parseInt(e.target.value) : undefined })}
          disabled={disabled}
          min="1800"
          max={new Date().getFullYear()}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder="YYYY"
        />
      </div>
    </div>
  );
}

// Step 2: Address
function Step2Address({ 
  formData, 
  updateFormData,
  disabled = false
}: { 
  formData: EntitySetupFormData; 
  updateFormData: (updates: Partial<EntitySetupFormData>) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Country <span className="text-red-600">*</span>
        </label>
        <select
          value={formData.country}
          onChange={(e) => {
            const country = e.target.value as Country;
            updateFormData({ 
              country,
              // Reset registration details when country changes
              registrationDetails: country === Country.IRELAND
                ? {
                    ieCroNumber: '',
                    ieCharityChyNumber: '',
                    ieCharityRcn: '',
                    ieRevenueSportsBody: false,
                  } as IrelandRegistration
                : {
                    ukCompanyNumber: '',
                    ukCharityEnglandWales: '',
                    ukCharityScotland: '',
                    ukCharityNi: '',
                    ukCascRegistered: false,
                  } as UKRegistration,
            });
          }}
          disabled={disabled}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value={Country.IRELAND}>Ireland</option>
          <option value={Country.UK}>United Kingdom</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Address Line 1 <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          value={formData.addressLine1}
          onChange={(e) => updateFormData({ addressLine1: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Street address"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Address Line 2
        </label>
        <input
          type="text"
          value={formData.addressLine2 || ''}
          onChange={(e) => updateFormData({ addressLine2: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Apartment, suite, etc. (optional)"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            City <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => updateFormData({ city: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {formData.country === Country.IRELAND ? 'County' : 'County/Region'}
          </label>
          <input
            type="text"
            value={formData.countyState}
            onChange={(e) => updateFormData({ countyState: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {formData.country === Country.IRELAND ? 'Eircode' : 'Postcode'} <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          value={formData.postalCode}
          onChange={(e) => updateFormData({ postalCode: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}

// Step 3: Legal Structure
function Step3LegalStructure({ 
  formData, 
  updateFormData 
}: { 
  formData: EntitySetupFormData; 
  updateFormData: (updates: Partial<EntitySetupFormData>) => void;
}) {
  const structures = [
    {
      value: LegalStructure.UNINCORPORATED_ASSOCIATION,
      label: 'Unincorporated Association',
      description: 'Most common for small clubs and community groups',
    },
    {
      value: LegalStructure.COMPANY_LIMITED_BY_GUARANTEE,
      label: 'Company Limited by Guarantee',
      description: 'Formal company structure without shareholders',
    },
    {
      value: LegalStructure.CHARITABLE_TRUST,
      label: 'Charitable Trust',
      description: 'Trust established for charitable purposes',
    },
    {
      value: LegalStructure.COMMUNITY_INTEREST_COMPANY,
      label: 'Community Interest Company (CIC)',
      description: 'UK-specific structure for social enterprises',
    },
    {
      value: LegalStructure.OTHER,
      label: 'Other',
      description: 'Another legal structure',
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 mb-4">
        Select the legal structure that best describes your organization
      </p>
      
      {structures.map((structure) => (
        <label
          key={structure.value}
          className={`block p-4 border-2 rounded-lg cursor-pointer transition-colors ${
            formData.legalStructure === structure.value
              ? 'border-blue-600 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-start gap-3">
            <input
              type="radio"
              name="legalStructure"
              value={structure.value}
              checked={formData.legalStructure === structure.value}
              onChange={(e) => updateFormData({ legalStructure: e.target.value as LegalStructure })}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900">{structure.label}</div>
              <div className="text-sm text-gray-600 mt-1">{structure.description}</div>
            </div>
          </div>
        </label>
      ))}
    </div>
  );
}

// Step 4: Registration Details
function Step4Registration({ 
  formData, 
  updateFormData 
}: { 
  formData: EntitySetupFormData; 
  updateFormData: (updates: Partial<EntitySetupFormData>) => void;
}) {
  const updateRegistration = (updates: Partial<IrelandRegistration> | Partial<UKRegistration>) => {
    updateFormData({
      registrationDetails: {
        ...formData.registrationDetails,
        ...updates,
      } as any,
    });
  };

  if (formData.country === Country.IRELAND) {
    const reg = formData.registrationDetails as IrelandRegistration;
    
    return (
      <div className="space-y-6">
        <p className="text-sm text-gray-600">
          Provide any registration numbers if your organization is formally registered
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            CRO Number (Companies Registration Office)
          </label>
          <input
            type="text"
            value={reg.ieCroNumber || ''}
            onChange={(e) => updateRegistration({ ieCroNumber: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., 123456 or A12345"
          />
          <p className="mt-1 text-xs text-gray-500">For companies limited by guarantee</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            CHY Number (Charity Number - Legacy)
          </label>
          <input
            type="text"
            value={reg.ieCharityChyNumber || ''}
            onChange={(e) => updateRegistration({ ieCharityChyNumber: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., CHY12345"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            RCN (Charities Regulator Number)
          </label>
          <input
            type="text"
            value={reg.ieCharityRcn || ''}
            onChange={(e) => updateRegistration({ ieCharityRcn: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., 20123456"
          />
          <p className="mt-1 text-xs text-gray-500">For registered charities (newer system)</p>
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={reg.ieRevenueSportsBody}
              onChange={(e) => updateRegistration({ ieRevenueSportsBody: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">
              Approved Revenue Sports Body (for tax relief on donations)
            </span>
          </label>
        </div>
      </div>
    );
  }

  // UK Registration
  const reg = formData.registrationDetails as UKRegistration;
  
  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Provide any registration numbers if your organization is formally registered
      </p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Companies House Number
        </label>
        <input
          type="text"
          value={reg.ukCompanyNumber || ''}
          onChange={(e) => updateRegistration({ ukCompanyNumber: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., 12345678 or AB123456"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Charity Commission Number (England & Wales)
        </label>
        <input
          type="text"
          value={reg.ukCharityEnglandWales || ''}
          onChange={(e) => updateRegistration({ ukCharityEnglandWales: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., 1234567"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          OSCR Number (Scotland)
        </label>
        <input
          type="text"
          value={reg.ukCharityScotland || ''}
          onChange={(e) => updateRegistration({ ukCharityScotland: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., SC012345"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          CCNI Number (Northern Ireland)
        </label>
        <input
          type="text"
          value={reg.ukCharityNi || ''}
          onChange={(e) => updateRegistration({ ukCharityNi: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., NIC101234"
        />
      </div>

      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={reg.ukCascRegistered}
            onChange={(e) => updateRegistration({ ukCascRegistered: e.target.checked })}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">
            Registered as CASC (Community Amateur Sports Club)
          </span>
        </label>
      </div>
    </div>
  );
}
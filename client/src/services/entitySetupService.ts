// client/src/services/entitySetupService.ts
import BaseService from './baseServices';

// Enums
export enum EntityType {
  CLUB = 'club',
  CHARITY = 'charity',
  SCHOOL = 'school',
  COMMUNITY_GROUP = 'community_group',
  CAUSE = 'cause'
}

export enum OnboardingStatus {
  DRAFT = 'draft',
  ENTITY_SETUP = 'entity_setup',
  PENDING_VERIFICATION = 'pending_verification',
  VERIFIED = 'verified',
  SUSPENDED = 'suspended'
}

export enum LegalStructure {
  UNINCORPORATED_ASSOCIATION = 'unincorporated_association',
  COMPANY_LIMITED_BY_GUARANTEE = 'company_limited_by_guarantee',
  CHARITABLE_TRUST = 'charitable_trust',
  COMMUNITY_INTEREST_COMPANY = 'community_interest_company',
  OTHER = 'other'
}

export enum Country {
  IRELAND = 'IE',
  UK = 'GB'
}

// Interfaces
export interface OnboardingStatusResponse {
  id: string;
  entity_type: EntityType | null;
  onboarding_status: OnboardingStatus;
  onboarding_completed_at: string | null;
}

export interface IrelandRegistration {
  ieCroNumber?: string;
  ieCharityChyNumber?: string;
  ieCharityRcn?: string;
  ieRevenueSportsBody: boolean;
}

export interface UKRegistration {
  ukCompanyNumber?: string;
  ukCharityEnglandWales?: string;
  ukCharityScotland?: string;
  ukCharityNi?: string;
  ukCascRegistered: boolean;
}

export interface EntityDetails {
  id: string;
  club_id: string;
  
  // Basic info
  legal_name: string;
  trading_names: string[];
  description?: string;
  founded_year?: number;
  
  // Address
  address_line1?: string;
  address_line2?: string;
  city?: string;
  county_state?: string;
  postal_code?: string;
  country: Country;
  
  // Legal structure
  legal_structure: LegalStructure;
  is_registered_charity: boolean;
  is_registered_company: boolean;
  
  // Ireland registrations
  ie_cro_number?: string;
  ie_charity_chy?: string;
  ie_charity_rcn?: string;
  ie_revenue_sports_body: boolean;
  
  // UK registrations
  uk_company_number?: string;
  uk_charity_england_wales?: string;
  uk_charity_scotland?: string;
  uk_charity_ni?: string;
  uk_casc_registered: boolean;
  
  // Verification
  registration_verified: boolean;
  verification_notes?: string;
  verified_at?: string | Date;
  verified_by?: string;
  
  // Timestamps
  created_at: string | Date;
  updated_at: string | Date;
}

export interface EntitySetupFormData {
  // Step 1: Basic Info
  legalName: string;
  tradingNames: string[];
  description: string;
  foundedYear?: number;
  
  // Step 2: Address
  addressLine1: string;
  addressLine2?: string;
  city: string;
  countyState: string;
  postalCode: string;
  country: Country;
  
  // Step 3: Legal Structure
  legalStructure: LegalStructure;
  
  // Step 4: Registration Details
  registrationDetails: IrelandRegistration | UKRegistration;
}

export interface EntityDetailsResponse {
  entityDetails: EntityDetails;
  completeness: number;
}

export interface RegistrationValidation {
  valid: boolean;
  type: string;
  value: string;
}

class EntitySetupService extends BaseService {
  /**
   * Set entity type for club (Step 1)
   */
  async setEntityType(clubId: string, entityType: EntityType): Promise<{ message: string; entityType: EntityType }> {
    return this.request(`/clubs/${clubId}/entity-type`, {
      method: 'POST',
      body: JSON.stringify({ entityType }),
    });
  }

  /**
   * Get club onboarding status
   */
  async getOnboardingStatus(clubId: string): Promise<{ status: OnboardingStatusResponse }> {
    return this.request(`/clubs/${clubId}/onboarding-status`, {
      method: 'GET',
    });
  }

  /**
   * Create entity details (Phase 2)
   */
  async createEntityDetails(clubId: string, data: EntitySetupFormData): Promise<{ message: string; entityDetails: EntityDetails }> {
    const payload = this._normalizeFormData(data);
    
    return this.request(`/clubs/${clubId}/entity-details`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Get entity details
   */
  async getEntityDetails(clubId: string): Promise<EntityDetailsResponse> {
    return this.request(`/clubs/${clubId}/entity-details`, {
      method: 'GET',
    });
  }

  /**
   * Update entity details
   */
  async updateEntityDetails(clubId: string, data: Partial<EntitySetupFormData>): Promise<{ message: string; entityDetails: EntityDetails }> {
    const payload = this._normalizeFormData(data);
    
    return this.request(`/clubs/${clubId}/entity-details`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Delete entity details
   */
  async deleteEntityDetails(clubId: string): Promise<{ message: string }> {
    return this.request(`/clubs/${clubId}/entity-details`, {
      method: 'DELETE',
    });
  }

  /**
   * Validate registration number format
   */
  async validateRegistrationNumber(type: string, value: string): Promise<RegistrationValidation> {
    return this.request(`/entity-setup/validate-registration?type=${type}&value=${encodeURIComponent(value)}`, {
      method: 'GET',
    });
  }

  /**
   * Verify entity (admin only)
   */
  async verifyEntity(clubId: string, notes?: string): Promise<{ message: string; entityDetails: EntityDetails }> {
    return this.request(`/admin/clubs/${clubId}/verify-entity`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  }

  /**
   * Reject entity verification (admin only)
   */
  async rejectEntity(clubId: string, notes: string): Promise<{ message: string; entityDetails: EntityDetails }> {
    return this.request(`/admin/clubs/${clubId}/reject-entity`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  }

  // ---- Helper Methods ----

  /**
   * Normalize form data to API format
   */
  private _normalizeFormData(data: Partial<EntitySetupFormData>): any {
    const payload: any = {};

    // Basic info
    if (data.legalName !== undefined) payload.legalName = data.legalName;
    if (data.tradingNames !== undefined) payload.tradingNames = data.tradingNames;
    if (data.description !== undefined) payload.description = data.description;
    if (data.foundedYear !== undefined) payload.foundedYear = data.foundedYear;

    // Address
    if (data.addressLine1 !== undefined) payload.addressLine1 = data.addressLine1;
    if (data.addressLine2 !== undefined) payload.addressLine2 = data.addressLine2;
    if (data.city !== undefined) payload.city = data.city;
    if (data.countyState !== undefined) payload.countyState = data.countyState;
    if (data.postalCode !== undefined) payload.postalCode = data.postalCode;
    if (data.country !== undefined) payload.country = data.country;

    // Legal structure
    if (data.legalStructure !== undefined) payload.legalStructure = data.legalStructure;

    // Registration details
    if (data.registrationDetails !== undefined) {
      const reg = data.registrationDetails;
      
      // Check if Ireland or UK based on fields
      if ('ieCroNumber' in reg || 'ieCharityChyNumber' in reg || 'ieCharityRcn' in reg || 'ieRevenueSportsBody' in reg) {
        const ieReg = reg as IrelandRegistration;
        payload.ieCroNumber = ieReg.ieCroNumber;
        payload.ieCharityChyNumber = ieReg.ieCharityChyNumber;
        payload.ieCharityRcn = ieReg.ieCharityRcn;
        payload.ieRevenueSportsBody = ieReg.ieRevenueSportsBody;
      }
      
      if ('ukCompanyNumber' in reg || 'ukCharityEnglandWales' in reg || 'ukCharityScotland' in reg || 'ukCharityNi' in reg || 'ukCascRegistered' in reg) {
        const ukReg = reg as UKRegistration;
        payload.ukCompanyNumber = ukReg.ukCompanyNumber;
        payload.ukCharityEnglandWales = ukReg.ukCharityEnglandWales;
        payload.ukCharityScotland = ukReg.ukCharityScotland;
        payload.ukCharityNi = ukReg.ukCharityNi;
        payload.ukCascRegistered = ukReg.ukCascRegistered;
      }
    }

    return payload;
  }

  /**
   * Convert EntityDetails to form data
   */
  entityDetailsToFormData(details: EntityDetails): EntitySetupFormData {
    const registrationDetails = details.country === Country.IRELAND
      ? {
          ieCroNumber: details.ie_cro_number,
          ieCharityChyNumber: details.ie_charity_chy,
          ieCharityRcn: details.ie_charity_rcn,
          ieRevenueSportsBody: details.ie_revenue_sports_body,
        } as IrelandRegistration
      : {
          ukCompanyNumber: details.uk_company_number,
          ukCharityEnglandWales: details.uk_charity_england_wales,
          ukCharityScotland: details.uk_charity_scotland,
          ukCharityNi: details.uk_charity_ni,
          ukCascRegistered: details.uk_casc_registered,
        } as UKRegistration;

    return {
      legalName: details.legal_name,
      tradingNames: details.trading_names || [],
      description: details.description || '',
      foundedYear: details.founded_year,
      
      addressLine1: details.address_line1 || '',
      addressLine2: details.address_line2,
      city: details.city || '',
      countyState: details.county_state || '',
      postalCode: details.postal_code || '',
      country: details.country,
      
      legalStructure: details.legal_structure,
      
      registrationDetails,
    };
  }

  /**
   * Validate form data before submission
   */
  validateFormData(data: Partial<EntitySetupFormData>, step?: number): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (step === undefined || step === 1) {
      // Step 1: Basic Info
      if (!data.legalName?.trim()) {
        errors.push('Legal name is required');
      }
    }

    if (step === undefined || step === 2) {
      // Step 2: Address
      if (!data.addressLine1?.trim()) {
        errors.push('Address line 1 is required');
      }
      if (!data.city?.trim()) {
        errors.push('City is required');
      }
      if (!data.postalCode?.trim()) {
        errors.push('Postal code is required');
      }
      if (!data.country) {
        errors.push('Country is required');
      }
    }

    if (step === undefined || step === 3) {
      // Step 3: Legal Structure
      if (!data.legalStructure) {
        errors.push('Legal structure is required');
      }
    }

    // Founded year validation
    if (data.foundedYear !== undefined && data.foundedYear !== null) {
      const year = Number(data.foundedYear);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1800 || year > currentYear) {
        errors.push(`Founded year must be between 1800 and ${currentYear}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get friendly name for entity type
   */
  getEntityTypeName(type: EntityType | null): string {
    if (!type) return 'Unknown';
    
    const names: Record<EntityType, string> = {
      [EntityType.CLUB]: 'Club',
      [EntityType.CHARITY]: 'Charity',
      [EntityType.SCHOOL]: 'School',
      [EntityType.COMMUNITY_GROUP]: 'Community Group',
      [EntityType.CAUSE]: 'Cause',
    };
    
    return names[type] || type;
  }

  /**
   * Get friendly name for onboarding status
   */
  getOnboardingStatusName(status: OnboardingStatus): string {
    const names: Record<OnboardingStatus, string> = {
      [OnboardingStatus.DRAFT]: 'Getting Started',
      [OnboardingStatus.ENTITY_SETUP]: 'Setting Up',
      [OnboardingStatus.PENDING_VERIFICATION]: 'Pending Verification',
      [OnboardingStatus.VERIFIED]: 'Verified',
      [OnboardingStatus.SUSPENDED]: 'Suspended',
    };
    
    return names[status] || status;
  }

  /**
   * Get friendly name for legal structure
   */
  getLegalStructureName(structure: LegalStructure): string {
    const names: Record<LegalStructure, string> = {
      [LegalStructure.UNINCORPORATED_ASSOCIATION]: 'Unincorporated Association',
      [LegalStructure.COMPANY_LIMITED_BY_GUARANTEE]: 'Company Limited by Guarantee',
      [LegalStructure.CHARITABLE_TRUST]: 'Charitable Trust',
      [LegalStructure.COMMUNITY_INTEREST_COMPANY]: 'Community Interest Company (CIC)',
      [LegalStructure.OTHER]: 'Other',
    };
    
    return names[structure] || structure;
  }

  /**
   * Check if club can proceed to next onboarding step
   */
  canProceed(status: OnboardingStatus): { allowed: boolean; nextStep?: string; reason?: string } {
    switch (status) {
      case OnboardingStatus.DRAFT:
        return {
          allowed: true,
          nextStep: 'Select entity type',
        };
      
      case OnboardingStatus.ENTITY_SETUP:
        return {
          allowed: true,
          nextStep: 'Complete entity details',
        };
      
      case OnboardingStatus.PENDING_VERIFICATION:
        return {
          allowed: false,
          reason: 'Waiting for verification from our team',
        };
      
      case OnboardingStatus.VERIFIED:
        return {
          allowed: true,
          nextStep: 'Complete - proceed to payment setup',
        };
      
      case OnboardingStatus.SUSPENDED:
        return {
          allowed: false,
          reason: 'Account suspended - contact support',
        };
      
      default:
        return {
          allowed: false,
          reason: 'Unknown status',
        };
    }
  }
}

export default new EntitySetupService();
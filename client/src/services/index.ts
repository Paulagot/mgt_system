// /client/src/services/index.ts
// Main service exports - corrected to match your actual file names

// Import service instances (matching your lowercase filenames)
import supporterServiceInstance from './supporterService';
import communicationServiceInstance from './communicationService';

// Export base service class
export { default as BaseService } from './baseServices';

// Export service instances (recommended way)
export const supporterService = supporterServiceInstance;
export const communicationService = communicationServiceInstance;

// For backward compatibility, also export with capital names
export const SupporterService = supporterServiceInstance;
export const CommunicationService = communicationServiceInstance;

// Re-export the original apiService
export { apiService } from './apiService';

// Service types for TypeScript
export type { 
  CreateSupporterData, 
  SupporterFilters, 
  DonorStats,
  RetentionAnalysis 
} from './supporterService';

export type { 
  CreateCommunicationData, 
  CommunicationFilters 
} from './communicationService';

/*
USAGE IN YOUR COMPONENTS:

// ✅ This should work now:
import { supporterService, communicationService } from '../../../services';

// Usage:
const engagement = await supporterService.getSupporterEngagement(supporter.id);
const comms = await communicationService.getCommunicationHistory(supporter.id, 10);
*/
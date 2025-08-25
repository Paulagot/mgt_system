// client/src/services/index.ts
// Main service exports - FIXED

// Import service instances (matching your actual file names)
import supporterServiceInstance from './supporterService';
import communicationServiceInstance from './communicationService';
import prizeServiceInstance from './prizeServices'; // FIXED: Correct filename and variable name

// Export base service class
export { default as BaseService } from './baseServices';

// Export service instances (recommended way)
export const supporterService = supporterServiceInstance;
export const communicationService = communicationServiceInstance;
export const prizeService = prizeServiceInstance; // FIXED: No conflicts now

// For backward compatibility, also export with capital names
export const SupporterService = supporterServiceInstance;
export const CommunicationService = communicationServiceInstance;
export const PrizeService = prizeServiceInstance; // FIXED: Add this

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

export type {
  CreatePrizeData,
  Prize,
  PrizeStats,
  PrizeResponse,
  PrizesResponse
} from '../types/types';

/* USAGE EXAMPLES:
import { supporterService, communicationService, prizeService } from '../services';

// Usage:
const engagement = await supporterService.getSupporterEngagement(supporter.id);
const comms = await communicationService.getCommunicationHistory(supporter.id, 10);
const prizes = await prizeService.getPrizes(eventId);
*/
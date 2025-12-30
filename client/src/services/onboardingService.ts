// Registration number format validators
export const registrationValidators = {
  // Ireland
  ieCroNumber: /^[A-Z]?\d{5,6}$/,
  ieCharityChyNumber: /^CHY\d{4,5}$/i,
  ieCharityRcn: /^20\d{6}$/,
  
  // UK
  ukCompanyNumber: /^([A-Z]{2}\d{6}|\d{8})$/,
  ukCharityEnglandWales: /^\d{6,7}$/,
  ukCharityScotland: /^SC\d{6}$/i,
  ukCharityNi: /^NIC\d{6}$/i,
};

// Validation function example
export function validateRegistrationNumber(
  type: string,
  value: string
): boolean {
  const validator = registrationValidators[type as keyof typeof registrationValidators];
  return validator ? validator.test(value) : false;
}
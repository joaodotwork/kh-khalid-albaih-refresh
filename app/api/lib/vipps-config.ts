/**
 * Vipps API configuration
 * This file centralizes all Vipps API URLs in one place
 * Always using test endpoints until explicitly changed for production
 */

// Authentication endpoints
export const VIPPS_TOKEN_URL = 'https://apitest.vipps.no/accesstoken/get';

// Payment endpoints
export const VIPPS_PAYMENT_URL = 'https://apitest.vipps.no/epayment/v1/payments';
export const VIPPS_CAPTURE_URL = (reference: string) => 
  `https://apitest.vipps.no/epayment/v1/payments/${reference}/capture`;

// When ready for production, change these to the production endpoints:
// export const VIPPS_TOKEN_URL = 'https://api.vipps.no/accesstoken/get';
// export const VIPPS_PAYMENT_URL = 'https://api.vipps.no/epayment/v1/payments';
// export const VIPPS_CAPTURE_URL = (reference: string) => 
//   `https://api.vipps.no/epayment/v1/payments/${reference}/capture`;
import { NextRequest, NextResponse } from 'next/server';

/**
 * API route to check Vipps credentials formatting
 * This is a DEVELOPMENT-ONLY route to help debug API authentication issues
 * It should be REMOVED before deploying to production
 */
export async function GET(request: NextRequest) {
  // Security check - only allow in development environments
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is not available in production' },
      { status: 403 }
    );
  }
  
  try {
    // Get Vipps API credentials
    const subscriptionKey = process.env.VIPPS_SUBSCRIPTION_KEY || '';
    const accessToken = process.env.VIPPS_ACCESS_TOKEN || '';
    const merchantSerialNumber = process.env.VIPPS_MERCHANT_SERIAL_NUMBER || '';
    
    // Check token format
    const hasBearer = accessToken.startsWith('Bearer ');
    const tokenLength = accessToken.length;
    const tokenFormat = hasBearer 
      ? 'Includes "Bearer " prefix' 
      : 'Missing "Bearer " prefix';
    
    // Prepare credential analysis
    const analysis = {
      environment: process.env.NODE_ENV,
      credentials: {
        VIPPS_SUBSCRIPTION_KEY: {
          present: !!subscriptionKey,
          length: subscriptionKey.length,
          firstFiveChars: subscriptionKey.slice(0, 5),
          lastFiveChars: subscriptionKey.slice(-5),
          endsWithEquals: subscriptionKey.endsWith('='),
          containsSpaces: subscriptionKey.includes(' '),
        },
        VIPPS_ACCESS_TOKEN: {
          present: !!accessToken,
          length: tokenLength,
          format: tokenFormat,
          firstTenChars: accessToken.slice(0, 10),
          lastFiveChars: accessToken.slice(-5),
          trimmedLength: accessToken.trim().length,
          containsSpaces: accessToken.includes(' ') && !hasBearer,
        },
        VIPPS_MERCHANT_SERIAL_NUMBER: {
          present: !!merchantSerialNumber,
          length: merchantSerialNumber.length,
          value: merchantSerialNumber, // MSN is generally not sensitive
          containsSpaces: merchantSerialNumber.includes(' '),
        }
      },
      formattedToken: {
        correct: hasBearer ? accessToken : `Bearer ${accessToken}`,
      }
    };
    
    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Error checking credentials:', error);
    return NextResponse.json(
      { error: 'Failed to check credentials' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '../lib/vipps-auth';

/**
 * API route to refresh the Vipps access token
 * This is a protected endpoint to be used when the token expires
 */
// Support GET requests for scheduled refreshes
export async function GET(request: NextRequest) {
  return handleRefresh(request);
}

// Support POST for manual refreshes
export async function POST(request: NextRequest) {
  return handleRefresh(request);
}

// Shared handler function
async function handleRefresh(request: NextRequest) {
  // Security check - require a secret to prevent unauthorized access
  const { authorization } = Object.fromEntries(request.headers);
  const adminSecret = process.env.ADMIN_SECRET;
  
  if (!adminSecret || authorization !== `Bearer ${adminSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  try {
    // Use our centralized token refresh mechanism
    const token = await getValidAccessToken();
    
    // Return success response with token info
    return NextResponse.json({
      success: true,
      message: 'Token refreshed successfully',
      token: token
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    return NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 }
    );
  }
}
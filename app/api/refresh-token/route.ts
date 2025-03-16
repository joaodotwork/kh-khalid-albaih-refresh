import { NextRequest, NextResponse } from 'next/server';

/**
 * API route to refresh the Vipps access token
 * This is a protected endpoint to be used when the token expires
 */
export async function POST(request: NextRequest) {
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
    // Get Vipps API credentials
    const clientId = process.env.VIPPS_CLIENT_ID;
    const clientSecret = process.env.VIPPS_CLIENT_SECRET; 
    const subscriptionKey = process.env.VIPPS_SUBSCRIPTION_KEY;
    
    if (!clientId || !clientSecret || !subscriptionKey) {
      return NextResponse.json(
        { error: 'Missing Vipps API credentials' },
        { status: 500 }
      );
    }
    
    // Encode client ID and secret for Basic authentication
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    // Make the request to Vipps token endpoint
    const tokenResponse = await fetch('https://apitest.vipps.no/accesstoken/get', {
      method: 'POST',
      headers: {
        'client_id': clientId,
        'client_secret': clientSecret,
        'Ocp-Apim-Subscription-Key': subscriptionKey,
        'Authorization': `Basic ${credentials}`,
      },
    });
    
    if (!tokenResponse.ok) {
      let errorMessage = 'Failed to refresh token';
      try {
        const errorData = await tokenResponse.json();
        console.error('Token refresh error:', errorData);
        errorMessage = errorData.error_description || errorData.error || errorMessage;
      } catch (parseError) {
        console.error('Could not parse token error response');
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: tokenResponse.status }
      );
    }
    
    // Parse the token response
    const tokenData = await tokenResponse.json();
    
    // Format the new token with Bearer prefix
    const newToken = `Bearer ${tokenData.access_token}`;
    
    // Note: In a real implementation, you would update an environment variable or 
    // securely store this token. Here we just return it for manual updating.
    return NextResponse.json({
      success: true,
      message: 'Token refreshed successfully',
      token: newToken,
      expires_in: tokenData.expires_in,
      token_type: tokenData.token_type,
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    return NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 }
    );
  }
}
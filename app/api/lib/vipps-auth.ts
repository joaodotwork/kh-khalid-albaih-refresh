import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';
import { VIPPS_TOKEN_URL } from './vipps-config';

interface TokenResponse {
  token_type: string;
  expires_in: number;
  ext_expires_in: number;
  access_token: string;
}

// Store token info in memory for the duration of the server process
let cachedToken: {
  token: string;
  expiresAt: number;
} | null = null;

/**
 * Gets a valid access token, refreshing if necessary
 */
export async function getValidAccessToken(): Promise<string> {
  const now = Date.now();
  
  // If we have a cached token and it's not expired (with 5 minute buffer)
  if (cachedToken && cachedToken.expiresAt > now + 5 * 60 * 1000) {
    console.log('Using cached Vipps access token');
    return cachedToken.token;
  }
  
  console.log('Refreshing Vipps access token...');
  
  // Get token from environment
  const clientId = process.env.VIPPS_CLIENT_ID;
  const clientSecret = process.env.VIPPS_CLIENT_SECRET;
  const subscriptionKey = process.env.VIPPS_SUBSCRIPTION_KEY;
  
  if (!clientId || !clientSecret || !subscriptionKey) {
    throw new Error('Missing Vipps credentials');
  }
  
  try {
    // Log the token URL we're using
    console.log(`Using Vipps test environment URL: ${VIPPS_TOKEN_URL}`);
    const tokenUrl = VIPPS_TOKEN_URL;
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'client_id': clientId,
        'client_secret': clientSecret,
        'Ocp-Apim-Subscription-Key': subscriptionKey,
        'Authorization': `Basic ${credentials}`,
      }
    });
    
    if (!response.ok) {
      // Try to get detailed error information
      let errorDetail = '';
      try {
        const errorData = await response.json();
        errorDetail = JSON.stringify(errorData);
      } catch (e) {
        try {
          errorDetail = await response.text();
        } catch (e2) {
          errorDetail = 'Could not parse error response';
        }
      }
      
      throw new Error(`Failed to refresh token: ${response.status} ${response.statusText}. Details: ${errorDetail}`);
    }
    
    const tokenData: TokenResponse = await response.json();
    
    // Build full token with Bearer prefix
    const fullToken = `Bearer ${tokenData.access_token}`;
    
    // Calculate expiration time (convert seconds to milliseconds)
    const expiresAt = now + (tokenData.expires_in * 1000);
    
    // Cache the token
    cachedToken = {
      token: fullToken,
      expiresAt
    };
    
    // Update environment variable for other parts of the app
    process.env.VIPPS_ACCESS_TOKEN = fullToken;
    
    // Optional: Update .env file for persistence across restarts
    updateEnvFile(fullToken);
    
    console.log(`Token refreshed, expires in ${tokenData.expires_in} seconds`);
    return fullToken;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
}

/**
 * Updates the .env file with the new token
 */
function updateEnvFile(token: string) {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    
    // Read the current .env file
    let envContent = '';
    try {
      envContent = fs.readFileSync(envPath, 'utf8');
    } catch (error) {
      console.warn('Could not read .env file, will create new one');
    }
    
    // Replace or add the VIPPS_ACCESS_TOKEN line
    const tokenRegex = /^VIPPS_ACCESS_TOKEN=.*/m;
    if (tokenRegex.test(envContent)) {
      envContent = envContent.replace(tokenRegex, `VIPPS_ACCESS_TOKEN=${token}`);
    } else {
      envContent += `\nVIPPS_ACCESS_TOKEN=${token}`;
    }
    
    // Write the updated content back to the .env file
    fs.writeFileSync(envPath, envContent);
    console.log('Updated .env file with new token');
  } catch (error) {
    console.error('Error updating .env file:', error);
    // Non-critical error, just log it
  }
}

/**
 * Middleware to ensure a valid Vipps token before processing Vipps API requests
 */
export async function withValidVippsToken(request: NextRequest, handler: (req: NextRequest) => Promise<Response>): Promise<Response> {
  try {
    // Get a valid token
    await getValidAccessToken();
    
    // Continue with the request
    return await handler(request);
  } catch (error) {
    console.error('Error in Vipps token middleware:', error);
    
    // Return an appropriate error response
    return new Response(
      JSON.stringify({ error: 'Failed to authenticate with Vipps' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
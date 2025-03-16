#!/usr/bin/env node

/**
 * This script fetches a fresh Vipps access token and outputs it to the console
 * It can also be used to update the .env file directly by adding --update flag
 * 
 * Usage:
 *   node scripts/refresh-vipps-token.js
 *   node scripts/refresh-vipps-token.js --update
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
// We'll use native fetch since it's available in newer Node versions
// If not available, fallback will be handled

async function refreshVippsToken(updateEnv = false) {
  // Ensure we have fetch available
  const fetch = globalThis.fetch || await import('node-fetch').then(mod => mod.default);
  
  try {
    // Get Vipps API credentials from env
    const clientId = process.env.VIPPS_CLIENT_ID;
    const clientSecret = process.env.VIPPS_CLIENT_SECRET; 
    const subscriptionKey = process.env.VIPPS_SUBSCRIPTION_KEY;
    
    if (!clientId || !clientSecret || !subscriptionKey) {
      console.error('Error: Missing required Vipps API credentials!');
      console.error('Make sure VIPPS_CLIENT_ID, VIPPS_CLIENT_SECRET, and VIPPS_SUBSCRIPTION_KEY are set in .env');
      process.exit(1);
    }
    
    // Encode client ID and secret for Basic authentication
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    console.log('Fetching fresh access token from Vipps API...');
    
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
      console.error(`Error: Vipps API returned status ${tokenResponse.status}`);
      
      try {
        const errorData = await tokenResponse.json();
        console.error('Error details:', JSON.stringify(errorData, null, 2));
      } catch (parseError) {
        const textResponse = await tokenResponse.text();
        console.error('Response text:', textResponse);
      }
      
      process.exit(1);
    }
    
    // Parse the token response
    const tokenData = await tokenResponse.json();
    
    // Format the token with Bearer prefix
    const formattedToken = `Bearer ${tokenData.access_token}`;
    
    console.log('\nToken successfully retrieved!');
    console.log('--------------------------------');
    console.log(`Token Type: ${tokenData.token_type}`);
    console.log(`Expires In: ${tokenData.expires_in} seconds`);
    
    // Calculate expiry time in human-readable format
    const expiryDate = new Date(Date.now() + (parseInt(tokenData.expires_in) * 1000));
    console.log(`Expires On: ${expiryDate.toLocaleString()}`);
    
    if (updateEnv) {
      // Update the .env file with the new token
      const envPath = path.join(process.cwd(), '.env');
      
      if (!fs.existsSync(envPath)) {
        console.error('Error: .env file not found!');
        process.exit(1);
      }
      
      // Read current .env content
      let envContent = fs.readFileSync(envPath, 'utf8');
      
      // Replace existing token or add new one if not present
      if (envContent.includes('VIPPS_ACCESS_TOKEN=')) {
        envContent = envContent.replace(
          /VIPPS_ACCESS_TOKEN=.*/,
          `VIPPS_ACCESS_TOKEN=${formattedToken}`
        );
      } else {
        envContent += `\nVIPPS_ACCESS_TOKEN=${formattedToken}\n`;
      }
      
      // Write updated content back to .env
      fs.writeFileSync(envPath, envContent);
      console.log('\n✅ .env file updated with new access token!');
    } else {
      // Output formatted token for manual copy
      console.log('\nAccess Token (with Bearer prefix):');
      console.log('--------------------------------');
      console.log(formattedToken);
      console.log('\nAdd this to your .env file as VIPPS_ACCESS_TOKEN');
      console.log('Or run with --update flag to update .env automatically');
    }
    
  } catch (error) {
    console.error('Error refreshing token:', error);
    process.exit(1);
  }
}

// Check if --update flag is present
const updateEnv = process.argv.includes('--update');

// Run the token refresh
refreshVippsToken(updateEnv);
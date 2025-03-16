#!/usr/bin/env node
// @ts-check
// Above line allows type checking in JavaScript files

// This script uses ES modules
// You need to run it with: node --experimental-modules scripts/register-vipps-webhook.js

/**
 * Script to register webhooks with Vipps Webhooks API
 * 
 * Usage:
 * node scripts/register-vipps-webhook.js
 * 
 * If you get ESM errors, run with:
 * node --experimental-modules scripts/register-vipps-webhook.js
 * 
 * This will register your callback URL with Vipps to receive payment events.
 * Make sure your environment variables are properly set before running.
 */

// Load environment variables from .env file
import 'dotenv/config';
import fetch from 'node-fetch';

// Configuration from environment variables
const VIPPS_SUBSCRIPTION_KEY = process.env.VIPPS_SUBSCRIPTION_KEY;
const VIPPS_MERCHANT_SERIAL_NUMBER = process.env.VIPPS_MERCHANT_SERIAL_NUMBER;
const VIPPS_ACCESS_TOKEN = process.env.VIPPS_ACCESS_TOKEN;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://khalid-albaih.vercel.app';

// Check for required environment variables
if (!VIPPS_SUBSCRIPTION_KEY || !VIPPS_MERCHANT_SERIAL_NUMBER || !VIPPS_ACCESS_TOKEN) {
  console.error('❌ Missing required environment variables. Please check your .env file.');
  console.error('Required variables: VIPPS_SUBSCRIPTION_KEY, VIPPS_MERCHANT_SERIAL_NUMBER, VIPPS_ACCESS_TOKEN');
  process.exit(1);
}

// Forced to test mode for now - change this to false for production
const forceTestMode = true;

// Determine if we're in test or production mode
// By default assume test mode unless explicitly set to production
const isTestMode = forceTestMode || 
                  !process.env.VIPPS_ENVIRONMENT || 
                  process.env.VIPPS_ENVIRONMENT === 'test' ||
                  BASE_URL.includes('vercel.app') || 
                  BASE_URL.includes('localhost') ||
                  BASE_URL.includes('ngrok');

// Set the API endpoint based on environment
const API_ENDPOINT = isTestMode
  ? 'https://apitest.vipps.no/webhooks/v1/webhooks'
  : 'https://api.vipps.no/webhooks/v1/webhooks';

// Webhook callback URL - this is the endpoint Vipps will call with payment events
const WEBHOOK_URL = `${BASE_URL}/api/vipps-callback`;

// Payment events to subscribe to
const PAYMENT_EVENTS = [
  'epayments.payment.created.v1',        // Payment created
  'epayments.payment.authorized.v1',     // Payment authorized
  'epayments.payment.captured.v1',       // Payment captured
  'epayments.payment.cancelled.v1',      // Payment cancelled
  'epayments.payment.failed.v1'          // Payment failed
];

/**
 * Register a webhook with Vipps
 */
async function registerWebhook() {
  console.log('🔄 Registering Vipps webhook...');
  console.log(`📌 Callback URL: ${WEBHOOK_URL}`);
  console.log(`📌 Environment: ${isTestMode ? 'TEST' : 'PRODUCTION'}`);
  console.log(`📌 Events: ${PAYMENT_EVENTS.join(', ')}`);
  console.log(`📌 API Endpoint: ${API_ENDPOINT}`);
  
  // Debug info
  console.log('\n📋 Configuration:');
  console.log(`- Subscription Key: ${VIPPS_SUBSCRIPTION_KEY.substring(0, 5)}...`);
  console.log(`- Merchant Serial Number: ${VIPPS_MERCHANT_SERIAL_NUMBER}`);
  const tokenPreview = VIPPS_ACCESS_TOKEN.length > 15 ? 
    `${VIPPS_ACCESS_TOKEN.substring(0, 15)}...` : 
    'Invalid Token';
  console.log(`- Access Token: ${tokenPreview}`);
  console.log(`- Base URL: ${BASE_URL}`);

  try {
    // Format the access token correctly (ensure it has Bearer prefix)
    let formattedToken = VIPPS_ACCESS_TOKEN.trim();
    if (!formattedToken.startsWith('Bearer ')) {
      formattedToken = `Bearer ${formattedToken}`;
      console.log('Added "Bearer " prefix to token');
    }

    // Create the request payload
    const payload = {
      url: WEBHOOK_URL,
      events: PAYMENT_EVENTS
    };

    // Configure headers
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': formattedToken,
      'Ocp-Apim-Subscription-Key': VIPPS_SUBSCRIPTION_KEY,
      'Merchant-Serial-Number': VIPPS_MERCHANT_SERIAL_NUMBER,
      'Vipps-System-Name': 'kh-khalid-albaih',
      'Vipps-System-Version': '1.0.0',
      'Vipps-System-Plugin-Name': 'nextjs-app',
      'Vipps-System-Plugin-Version': '1.0.0'
    };
    
    console.log('\n📤 Sending request to Vipps...');
    
    // Make the API request
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });

    // Try to parse the response as JSON
    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      // If parsing fails, try to get text content
      const textContent = await response.text();
      console.error('❌ Failed to parse response as JSON. Raw response:', textContent);
      data = { error: 'Failed to parse response' };
    }

    // Check if the request was successful
    if (response.ok) {
      console.log('✅ Webhook registered successfully!');
      console.log('📋 Webhook ID:', data.id);
      console.log('🔑 Webhook Secret:', data.secret);
      console.log('\n⚠️ IMPORTANT: Save this webhook secret! It is used to verify webhook requests.');
      console.log('You should store it in your environment variables as VIPPS_WEBHOOK_SECRET.');
      
      // Suggestion to add the secret to .env file
      console.log('\nAdd this to your .env file:');
      console.log(`VIPPS_WEBHOOK_SECRET=${data.secret}`);
    } else {
      console.error('❌ Failed to register webhook:');
      console.error('Status:', response.status, response.statusText);
      console.error('Error details:', data);
      
      // Provide troubleshooting tips
      console.log('\n🔍 Troubleshooting tips:');
      console.log('1. Check that your subscription key is correct for the test environment');
      console.log('2. Ensure the access token is valid and properly formatted');
      console.log('3. Verify that your merchant serial number is authorized for the test environment');
      console.log('4. Make sure your callback URL uses HTTPS and is publicly accessible');
    }
  } catch (error) {
    console.error('❌ Error registering webhook:', error.message);
    console.error('Full error:', error);
  }
}

/**
 * List all registered webhooks
 */
async function listWebhooks() {
  console.log('📋 Listing registered webhooks...');
  console.log(`📌 Environment: ${isTestMode ? 'TEST' : 'PRODUCTION'}`);
  console.log(`📌 API Endpoint: ${API_ENDPOINT}`);
  
  // Debug info
  console.log('\n📋 Configuration:');
  console.log(`- Subscription Key: ${VIPPS_SUBSCRIPTION_KEY.substring(0, 5)}...`);
  console.log(`- Merchant Serial Number: ${VIPPS_MERCHANT_SERIAL_NUMBER}`);

  try {
    // Format the access token correctly (ensure it has Bearer prefix)
    let formattedToken = VIPPS_ACCESS_TOKEN.trim();
    if (!formattedToken.startsWith('Bearer ')) {
      formattedToken = `Bearer ${formattedToken}`;
      console.log('Added "Bearer " prefix to token');
    }

    // Configure headers
    const headers = {
      'Authorization': formattedToken,
      'Ocp-Apim-Subscription-Key': VIPPS_SUBSCRIPTION_KEY,
      'Merchant-Serial-Number': VIPPS_MERCHANT_SERIAL_NUMBER
    };
    
    console.log('\n📤 Sending request to Vipps...');
    
    // Make the API request
    const response = await fetch(API_ENDPOINT, {
      method: 'GET',
      headers: headers
    });

    // Try to parse the response as JSON
    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      // If parsing fails, try to get text content
      const textContent = await response.text();
      console.error('❌ Failed to parse response as JSON. Raw response:', textContent);
      data = { error: 'Failed to parse response' };
    }

    // Check if the request was successful
    if (response.ok) {
      console.log('✅ Successfully retrieved webhooks');
      
      if (data.webhooks && data.webhooks.length > 0) {
        console.log(`Found ${data.webhooks.length} registered webhooks:`);
        
        data.webhooks.forEach((webhook, index) => {
          console.log(`\n📌 Webhook #${index + 1}:`);
          console.log(`   ID: ${webhook.id}`);
          console.log(`   URL: ${webhook.url}`);
          console.log(`   Events: ${webhook.events.join(', ')}`);
        });
      } else {
        console.log('No webhooks registered yet.');
      }
    } else {
      console.error('❌ Failed to list webhooks:');
      console.error('Status:', response.status, response.statusText);
      console.error('Error details:', data);
      
      // Provide troubleshooting tips
      console.log('\n🔍 Troubleshooting tips:');
      console.log('1. Check that your subscription key is correct for the test environment');
      console.log('2. Ensure the access token is valid and properly formatted');
      console.log('3. Verify that your merchant serial number is authorized for the test environment');
    }
  } catch (error) {
    console.error('❌ Error listing webhooks:', error.message);
    console.error('Full error:', error);
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'register';

  // Determine which command to run
  switch (command) {
    case 'list':
      await listWebhooks();
      break;
    case 'register':
    default:
      await registerWebhook();
      break;
  }
}

// Run the script
main().catch(console.error);
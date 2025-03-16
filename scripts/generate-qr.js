#!/usr/bin/env node
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config();

// Generate idempotency key (UUID v4)
const idempotencyKey = crypto.randomUUID();

// Generate unique QR ID
const qrId = crypto.randomUUID();

// Get environment variables
const accessToken = process.env.VIPPS_ACCESS_TOKEN;
const subscriptionKey = process.env.VIPPS_SUBSCRIPTION_KEY;
const merchantSerialNumber = process.env.VIPPS_MERCHANT_SERIAL_NUMBER;

// Check required environment variables
if (!accessToken || !subscriptionKey || !merchantSerialNumber) {
  console.error('Error: Missing required environment variables. Make sure you have set:');
  console.error('- VIPPS_ACCESS_TOKEN');
  console.error('- VIPPS_SUBSCRIPTION_KEY');
  console.error('- VIPPS_MERCHANT_SERIAL_NUMBER');
  process.exit(1);
}

// Set the redirect URL (must be HTTPS according to the API requirements)
// For testing purposes, we'll use a placeholder HTTPS URL
// In production, this would be your actual HTTPS domain
const redirectUrl = 'https://khalid-albaih.vercel.app/donate';

// Request data
const requestData = JSON.stringify({
  redirectUrl: redirectUrl,
  id: qrId
});

// Request options
const options = {
  hostname: 'apitest.vipps.no',
  port: 443,
  path: '/qr/v1/merchant-redirect',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'image/svg+xml',
    'Authorization': `Bearer ${accessToken}`,
    'Ocp-Apim-Subscription-Key': subscriptionKey,
    'Merchant-Serial-Number': merchantSerialNumber,
    'Idempotency-Key': idempotencyKey,
    'Vipps-System-Name': 'kh-khalid-albaih',
    'Vipps-System-Version': '1.0.0',
    'Vipps-System-Plugin-Name': 'nextjs-app',
    'Vipps-System-Plugin-Version': '1.0.0',
    'Content-Length': requestData.length
  }
};

console.log('Generating QR code with:');
console.log(`- QR ID: ${qrId}`);
console.log(`- Idempotency Key: ${idempotencyKey}`);
console.log(`- Redirect URL: ${redirectUrl}`);

// Make the HTTP request
const req = https.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    try {
      const parsedData = JSON.parse(responseData);
      console.log('Response:', JSON.stringify(parsedData, null, 2));
      
      // Save QR code URL and data to a file
      if (parsedData.url) {
        // Ensure public directory exists
        const publicDir = path.join(__dirname, '..', 'public');
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir, { recursive: true });
        }
        
        // Save QR metadata
        const qrData = {
          id: qrId,
          url: parsedData.url,
          generatedAt: new Date().toISOString()
        };
        
        fs.writeFileSync(
          path.join(publicDir, 'qr-metadata.json'), 
          JSON.stringify(qrData, null, 2)
        );
        
        console.log(`QR metadata saved to public/qr-metadata.json`);
        console.log(`\nNext steps:`);
        console.log(`1. Download the QR code image from the URL above`);
        console.log(`2. Save it in the public directory as 'static-qr-code.png'`);
        console.log(`3. Update the QRCodeDisplay component to use this image`);
      }
    } catch (e) {
      console.error('Error parsing response:', e);
      console.log('Raw response:', responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('Error making request:', error);
});

// Write data to request body
req.write(requestData);
req.end();
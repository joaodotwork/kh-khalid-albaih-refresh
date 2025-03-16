import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { put, list } from '@vercel/blob';
import { getValidAccessToken } from '../lib/vipps-auth';
import { VIPPS_CAPTURE_URL } from '../lib/vipps-config';
import crypto from 'crypto';

/**
 * This endpoint handles callbacks from Vipps regarding payment status
 * It will be called when a payment is confirmed, or other status changes occur
 * 
 * The webhooks API uses a different format than the direct callbacks from the eCom API.
 * Documentation: https://developer.vippsmobilepay.com/docs/APIs/webhooks-api/
 * 
 * Events we handle:
 * - epayments.payment.created.v1: Payment created
 * - epayments.payment.authorized.v1: Payment authorized
 * - epayments.payment.captured.v1: Payment captured 
 * 
 * Note: The naming convention is "epayments" (plural) not "epayment" (singular)
 */
/**
 * Validates the webhook signature from Vipps
 * @param body The raw request body
 * @param signature The X-Signature header from Vipps
 * @param secret The webhook secret from Vipps
 * @returns boolean indicating if the signature is valid
 */
function validateSignature(body: string, signature: string, secret: string): boolean {
  try {
    // Calculate a HMAC SHA-256 hash of the request body using the webhook secret
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(body);
    const calculatedSignature = hmac.digest('hex');
    
    // Compare the calculated signature with the one from Vipps
    return calculatedSignature === signature;
  } catch (error) {
    console.error('Error validating signature:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  // Track when this endpoint was called
  const callbackStartTime = new Date().toISOString();
  console.log(`--- Vipps callback starting at ${callbackStartTime} ---`);
  
  // Get request headers for debugging
  const headers = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  console.log('Callback headers:', headers);
  
  try {
    // Parse the callback data from Vipps
    const rawText = await request.text();
    let webhookData;
    
    try {
      webhookData = JSON.parse(rawText);
      console.log('Received webhook data:', JSON.stringify(webhookData, null, 2));
    } catch (parseError) {
      console.error('Error parsing webhook data:', parseError);
      console.error('Raw webhook body:', rawText);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }
    
    // Validate the webhook signature if secret is set
    const webhookSecret = process.env.VIPPS_WEBHOOK_SECRET;
    const signature = request.headers.get('X-Signature');
    
    if (webhookSecret && signature) {
      console.log('Validating webhook signature');
      const isValid = validateSignature(rawText, signature, webhookSecret);
      
      if (!isValid) {
        console.error('Invalid webhook signature');
        return NextResponse.json(
          { error: 'Invalid webhook signature' },
          { status: 401 }
        );
      }
      console.log('Webhook signature validated successfully');
    } else {
      console.warn('Webhook secret or signature missing, skipping signature validation');
    }
    
    // Extract the event type and payment information from the webhook data
    const eventType = webhookData.eventName;
    const eventId = webhookData.eventId;
    const timestamp = webhookData.timestamp;
    
    console.log(`Processing webhook event: ${eventType} (ID: ${eventId})`);
    
    // Extract payment information from the webhook data
    // The structure depends on the event type
    const paymentData = webhookData.data;
    
    if (!paymentData) {
      console.error('No payment data in webhook');
      return NextResponse.json(
        { error: 'No payment data in webhook' },
        { status: 400 }
      );
    }
    
    // Extract payment details which can vary by event type
    // The reference is the order reference we generated
    const reference = paymentData.reference || paymentData.orderId || '';
    
    if (!reference) {
      console.error('Missing payment reference in webhook data');
      return NextResponse.json(
        { error: 'Missing payment reference' },
        { status: 400 }
      );
    }
    
    console.log(`Processing payment reference: ${reference}`);
    
    // Extract payment status - this depends on the event type
    let status;
    let amount;
    let userInfo;
    
    // Map the event type to a payment status
    switch (eventType) {
      case 'epayments.payment.created.v1':
        status = 'CREATED';
        break;
      case 'epayments.payment.authorized.v1':
        status = 'AUTHORIZED';
        break;
      case 'epayments.payment.captured.v1':
        status = 'CAPTURED';
        break;
      // The following may use different event names but we'll keep the handler for them
      case 'epayments.payment.cancelled.v1':
      case 'payment.cancelled.v1': 
        status = 'CANCELLED';
        break;
      case 'epayments.payment.failed.v1':
      case 'payment.failed.v1':
        status = 'FAILED';
        break;
      default:
        status = 'UNKNOWN';
        console.log(`Unhandled event type: ${eventType}`);
    }
    
    // Extract amount information if available
    // The structure can be different based on the event type
    if (paymentData.amount) {
      amount = {
        value: paymentData.amount.value || 0,
        currency: paymentData.amount.currency || 'NOK'
      };
    } else if (paymentData.transaction && paymentData.transaction.amount) {
      amount = {
        value: paymentData.transaction.amount.value || 0,
        currency: paymentData.transaction.amount.currency || 'NOK'
      };
    } else {
      // Default values if amount is not found
      amount = {
        value: 0,
        currency: 'NOK'
      };
    }
    
    // Try to extract user information if available
    // This might be in different places based on event type
    if (paymentData.userInfo) {
      userInfo = paymentData.userInfo;
    } else if (paymentData.user) {
      userInfo = paymentData.user;
    } else {
      userInfo = null;
    }
    
    console.log(`Payment ${reference} is in state: ${status}`);
    
    // Create a standardized callback data object that matches our existing code
    const callbackData = {
      reference,
      amount,
      status,
      userInfo,
      eventType,
      eventId,
      timestamp,
      rawData: paymentData  // Store the original data for debugging
    };
    
    // Verify that we received the necessary data
    if (!reference) {
      console.error('Missing reference in callback data');
      return NextResponse.json(
        { error: 'Missing reference in callback data' },
        { status: 400 }
      );
    }
    
    if (!status) {
      console.error('Missing status in callback data');
      return NextResponse.json(
        { error: 'Missing status in callback data' },
        { status: 400 }
      );
    }
    
    console.log(`Processing payment reference ${reference} with status ${status}`);
    
    // Check if the payment is successful
    if (status === 'AUTHORIZED' || status === 'CAPTURED') {
      console.log(`Payment ${reference} was successful with status ${status}`);
      
      // Auto-capture payment if it's in AUTHORIZED state
      if (status === 'AUTHORIZED') {
        try {
          console.log(`Attempting to auto-capture payment ${reference}`);
          await capturePayment(reference, callbackData);
          // Update status to CAPTURED for our records
          callbackData.status = 'CAPTURED';
          console.log(`Successfully auto-captured payment ${reference}`);
        } catch (captureError) {
          console.error(`Failed to auto-capture payment ${reference}:`, captureError);
          // Continue processing with original status
          // The admin can manually capture it later
        }
      }
      
      // Generate a unique download ID
      const downloadId = nanoid();
      console.log(`Generated download ID ${downloadId} for payment ${reference}`);
      
      // Extract user information if available
      const userProfile = userInfo || {};
      
      // Create a record of the donation
      const donationRecord = {
        reference,
        amount: amount.value / 100, // Convert from øre to NOK
        currency: amount.currency,
        status: callbackData.status, // Make sure we use the potentially updated status after auto-capture
        timestamp: new Date().toISOString(),
        userProfile: {
          name: userProfile.name || null,
          email: userProfile.email || null,
          phoneNumber: userProfile.phoneNumber || null
        },
        downloadId
      };
      
      console.log(`Created donation record for ${reference}:`, JSON.stringify(donationRecord, null, 2));
      
      // Store donation record in Vercel Blob
      // In a production environment, this might use a database instead
      try {
        // Create a unique filename for this donation record
        const blobName = `donations/${reference}_${downloadId}.json`;
        console.log(`Preparing to store donation record at ${blobName}`);
        
        // Store the donation record
        const donationBlob = await put(
          blobName,
          JSON.stringify(donationRecord, null, 2),
          {
            contentType: 'application/json',
            access: 'public'
          }
        );
        
        console.log(`Stored donation record at ${blobName}, URL: ${donationBlob.url}`);
        
        // Update donation index for easy retrieval
        console.log(`Updating donation index for ${reference}`);
        await updateDonationIndex(donationRecord);
        console.log(`Donation index updated successfully`);
      } catch (storageError) {
        console.error(`Error storing donation record for ${reference}:`, storageError);
        // Continue processing even if storage fails
      }
      
      // Create a mapping between downloadId and donationRecord
      // This would be used when the user accesses the download page
      try {
        console.log(`Creating download mapping for ID: ${downloadId}`);
        
        const downloadMapping = {
          downloadId,
          reference,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        };
        
        console.log(`Download mapping data:`, JSON.stringify(downloadMapping, null, 2));
        
        // Ensure the blob path is correct
        const blobPath = `downloads/${downloadId}.json`;
        console.log(`Storing download mapping at path: ${blobPath}`);
        
        const downloadBlob = await put(
          blobPath,
          JSON.stringify(downloadMapping, null, 2),
          {
            contentType: 'application/json',
            access: 'public'
          }
        );
        
        console.log(`Download mapping created successfully at: ${downloadBlob.url}`);
        
        // Verify that the blob can be accessed to confirm it was stored correctly
        try {
          console.log(`Verifying download mapping was stored correctly`);
          const verifyResponse = await fetch(downloadBlob.url, { cache: 'no-store' });
          
          if (verifyResponse.ok) {
            console.log(`Successfully verified download mapping blob is accessible`);
          } else {
            console.error(`Download mapping blob verification failed: ${verifyResponse.status} ${verifyResponse.statusText}`);
          }
        } catch (verifyError) {
          console.error(`Error verifying download mapping blob:`, verifyError);
        }
      } catch (mappingError) {
        console.error(`Error creating download mapping for ${downloadId}:`, mappingError);
      }
      
      // Prepare the base URL for the download
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const downloadUrl = `${baseUrl}/download/${downloadId}`;
      
      console.log(`Payment successful, download URL: ${downloadUrl}`);
      
      // A small delay to ensure all blob operations complete before redirecting the user
      // This should help prevent race conditions
      const delayMs = 1000;
      console.log(`Adding ${delayMs}ms delay to ensure blob operations complete`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      
      // Mark callback as complete
      const callbackEndTime = new Date().toISOString();
      console.log(`--- Vipps callback completed at ${callbackEndTime} ---`);
      
      // Return a success response to Vipps (for API to API callbacks)
      return NextResponse.json({
        success: true,
        message: 'Payment processed successfully',
        downloadId: downloadId,
        downloadUrl: downloadUrl,
        callbackStartTime,
        callbackEndTime
      });
    } else {
      // Payment was not successful or is in another state
      console.log(`Payment ${reference} is in state: ${status}`);
      
      return NextResponse.json({
        success: false,
        message: `Payment in state: ${status}`
      });
    }
  } catch (error) {
    console.error('Error processing Vipps callback:', error);
    return NextResponse.json(
      { error: 'Failed to process callback' },
      { status: 500 }
    );
  }
}

/**
 * Function to capture a payment in Vipps
 * @param reference The payment reference to capture
 * @param paymentData The payment data from Vipps
 */
async function capturePayment(reference: string, paymentData: any) {
  // 1. Get a fresh access token
  const accessToken = await getValidAccessToken();
  
  // 2. Make the capture API request to Vipps
  const captureUrl = VIPPS_CAPTURE_URL(reference);
  console.log(`Auto-capturing payment ${reference} at ${captureUrl}`);
  
  const captureResponse = await fetch(captureUrl, {
    method: 'POST',
    headers: {
      'Authorization': accessToken,
      'Ocp-Apim-Subscription-Key': process.env.VIPPS_SUBSCRIPTION_KEY || '',
      'Merchant-Serial-Number': process.env.VIPPS_MERCHANT_SERIAL_NUMBER || '',
      'Content-Type': 'application/json',
      'Idempotency-Key': `auto-capture-${reference}-${Date.now()}`,
    },
    body: JSON.stringify({
      modificationAmount: {
        currency: paymentData.amount.currency,
        value: paymentData.amount.value // Already in øre/cents
      },
      merchantInformation: {
        merchantSerialNumber: process.env.VIPPS_MERCHANT_SERIAL_NUMBER || '',
        callbackPrefix: process.env.NEXT_PUBLIC_BASE_URL || ''
      }
    })
  });
  
  if (!captureResponse.ok) {
    const errorData = await captureResponse.json().catch(() => ({}));
    throw new Error(`Vipps capture failed: ${captureResponse.status} ${captureResponse.statusText} - ${JSON.stringify(errorData)}`);
  }
  
  const captureResult = await captureResponse.json();
  console.log(`Successfully auto-captured payment ${reference}:`, captureResult);
  
  return captureResult;
}

/**
 * Helper function to update the donation index
 * This maintains a list of all donations for admin viewing
 */
async function updateDonationIndex(donationRecord) {
  try {
    // Attempt to get existing index directly from blob storage
    let donationIndex;
    
    // First, list all blobs to find the index file
    const { blobs } = await list({ prefix: 'donations/' });
    const indexBlob = blobs.find(b => b.pathname === 'donations/index.json');
    
    if (indexBlob) {
      // If the index exists, get its content
      console.log(`Found existing donation index at ${indexBlob.url}`);
      const response = await fetch(indexBlob.url);
      
      if (response.ok) {
        const text = await response.text();
        try {
          donationIndex = JSON.parse(text);
          console.log('Successfully loaded existing donation index');
        } catch (parseError) {
          console.error('Error parsing donation index JSON:', parseError);
          donationIndex = { donations: [] };
        }
      } else {
        console.log('Failed to fetch existing index, creating new one');
        donationIndex = { donations: [] };
      }
    } else {
      console.log('Donation index does not exist, creating new one');
      donationIndex = { donations: [] };
    }
    
    // Add minimal donation info to index
    donationIndex.donations.push({
      reference: donationRecord.reference,
      amount: donationRecord.amount,
      currency: donationRecord.currency,
      timestamp: donationRecord.timestamp,
      status: donationRecord.status,
      name: donationRecord.userProfile?.name || null,
      email: donationRecord.userProfile?.email || null,
      phoneNumber: donationRecord.userProfile?.phoneNumber || null,
      downloadId: donationRecord.downloadId
    });
    
    // Store updated index
    await put(
      'donations/index.json',
      JSON.stringify(donationIndex, null, 2),
      {
        contentType: 'application/json',
        access: 'public'
      }
    );
  } catch (error) {
    console.error('Error updating donation index:', error);
    // Continue even if index update fails
  }
}
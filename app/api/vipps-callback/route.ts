import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { put, list } from '@vercel/blob';
import { getValidAccessToken } from '../lib/vipps-auth';
import { VIPPS_CAPTURE_URL } from '../lib/vipps-config';

/**
 * This endpoint handles callbacks from Vipps regarding payment status
 * It will be called when a payment is confirmed, or other status changes occur
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the callback data from Vipps
    const callbackData = await request.json();
    
    // In production, validate the webhook signature
    // This requires a specific implementation based on Vipps documentation
    // Example: verifyVippsSignature(request.headers, JSON.stringify(callbackData))
    
    console.log('Received callback from Vipps:', callbackData);
    
    // Extract payment information
    const { 
      reference,      // The unique reference we generated for this order
      amount,         // Amount details including currency and value
      status,         // Payment status: CREATED, AUTHORIZED, CAPTURED, etc.
      paymentMethod,  // Payment method details
      metadata,       // Any metadata we sent with the payment
      userInfo        // User information if consent was given
    } = callbackData;
    
    // Check if the payment is successful
    if (status === 'AUTHORIZED' || status === 'CAPTURED') {
      // Payment was successful
      
      // Auto-capture payment if it's in AUTHORIZED state
      if (status === 'AUTHORIZED') {
        try {
          await capturePayment(reference, callbackData);
          // Update status to CAPTURED for our records
          callbackData.status = 'CAPTURED';
        } catch (captureError) {
          console.error(`Failed to auto-capture payment ${reference}:`, captureError);
          // Continue processing with original status
          // The admin can manually capture it later
        }
      }
      
      // Generate a unique download ID
      const downloadId = nanoid();
      
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
      
      // Store donation record in Vercel Blob
      // In a production environment, this might use a database instead
      try {
        // Create a unique filename for this donation record
        const blobName = `donations/${reference}_${downloadId}.json`;
        
        // Store the donation record
        await put(
          blobName,
          JSON.stringify(donationRecord, null, 2),
          {
            contentType: 'application/json',
            access: 'public'
          }
        );
        
        console.log(`Stored donation record to ${blobName}`);
        
        // Update donation index for easy retrieval
        await updateDonationIndex(donationRecord);
      } catch (storageError) {
        console.error('Error storing donation record:', storageError);
        // Continue processing even if storage fails
      }
      
      // Create a mapping between downloadId and donationRecord
      // This would be used when the user accesses the download page
      try {
        const downloadMapping = {
          downloadId,
          reference,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        };
        
        await put(
          `downloads/${downloadId}.json`,
          JSON.stringify(downloadMapping, null, 2),
          {
            contentType: 'application/json',
            access: 'public'
          }
        );
      } catch (mappingError) {
        console.error('Error creating download mapping:', mappingError);
      }
      
      // Return a success response to Vipps (for API to API callbacks)
      return NextResponse.json({
        success: true,
        message: 'Payment processed successfully'
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
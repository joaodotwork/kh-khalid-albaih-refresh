import { NextRequest, NextResponse } from 'next/server';
import { list, put } from '@vercel/blob';
import { withValidVippsToken } from '../../lib/vipps-auth';

// Wrap the handler function with the token middleware
export const POST = (request: NextRequest) => withValidVippsToken(request, handlePost);

/**
 * POST handler for capturing a payment
 * This endpoint captures a previously authorized payment in Vipps
 */
async function handlePost(request: NextRequest) {
  try {
    const { reference } = await request.json();
    
    if (!reference) {
      return NextResponse.json(
        { error: 'Missing payment reference' },
        { status: 400 }
      );
    }
    
    console.log(`Capturing payment for reference: ${reference}`);
    
    // 1. Get the access token from environment variable
    const accessToken = process.env.VIPPS_ACCESS_TOKEN;
    if (!accessToken) {
      console.error('VIPPS_ACCESS_TOKEN is not set');
      return NextResponse.json(
        { error: 'Missing Vipps credentials' },
        { status: 500 }
      );
    }
    
    // 2. Find the donation record for this reference
    const blobsList = await list({ prefix: 'donations/' });
    const donationBlobs = blobsList.blobs.filter(b => b.pathname.includes(reference));
    
    if (donationBlobs.length === 0) {
      console.log(`No donation record found for reference: ${reference}`);
      return NextResponse.json(
        { error: 'Donation record not found' },
        { status: 404 }
      );
    }
    
    // Get the donation record
    const donationBlob = donationBlobs[0];
    const response = await fetch(donationBlob.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch donation record: ${response.status} ${response.statusText}`);
    }
    
    const donationRecord = await response.json();
    
    // Check if the payment is already captured
    if (donationRecord.status === 'CAPTURED') {
      console.log(`Payment ${reference} is already captured`);
      return NextResponse.json({ 
        success: true,
        message: 'Payment was already captured',
        status: 'CAPTURED'
      });
    }
    
    // Check if the payment is in an authorized state
    if (donationRecord.status !== 'AUTHORIZED') {
      console.log(`Payment ${reference} is in state ${donationRecord.status}, cannot capture`);
      return NextResponse.json(
        { error: `Payment is in state ${donationRecord.status}, cannot capture` },
        { status: 400 }
      );
    }
    
    // 3. Make the capture API request to Vipps
    const captureUrl = `https://api.vipps.no/epayment/v1/payments/${reference}/capture`;
    const captureResponse = await fetch(captureUrl, {
      method: 'POST',
      headers: {
        'Authorization': accessToken,
        'Ocp-Apim-Subscription-Key': process.env.VIPPS_SUBSCRIPTION_KEY || '',
        'Merchant-Serial-Number': process.env.VIPPS_MERCHANT_SERIAL_NUMBER || '',
        'Content-Type': 'application/json',
        'Idempotency-Key': `capture-${reference}-${Date.now()}`,
      },
      body: JSON.stringify({
        modificationAmount: {
          currency: donationRecord.currency,
          value: Math.round(donationRecord.amount * 100) // Convert to øre/cents
        },
        merchantInformation: {
          merchantSerialNumber: process.env.VIPPS_MERCHANT_SERIAL_NUMBER || '',
          callbackPrefix: process.env.NEXT_PUBLIC_BASE_URL || ''
        }
      })
    });
    
    // 4. Process the capture response
    if (!captureResponse.ok) {
      const errorData = await captureResponse.json().catch(() => ({}));
      console.error('Vipps capture failed:', errorData);
      return NextResponse.json(
        { error: `Vipps capture failed: ${captureResponse.status} ${captureResponse.statusText}` },
        { status: captureResponse.status }
      );
    }
    
    const captureResult = await captureResponse.json();
    console.log('Vipps capture successful:', captureResult);
    
    // 5. Update the donation record with the new status
    donationRecord.status = 'CAPTURED';
    
    // Save the updated donation record
    await put(
      donationBlob.pathname,
      JSON.stringify(donationRecord, null, 2),
      {
        contentType: 'application/json',
        access: 'public'
      }
    );
    
    // 6. Update the donation index
    await updateDonationIndex(donationRecord);
    
    // 7. Return the success response
    return NextResponse.json({
      success: true,
      message: 'Payment captured successfully',
      status: 'CAPTURED'
    });
    
  } catch (error) {
    console.error('Error capturing payment:', error);
    return NextResponse.json(
      { error: 'Failed to capture payment' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to update the donation index
 */
async function updateDonationIndex(updatedDonation) {
  try {
    // First, get the donation index
    const blobsList = await list({ prefix: 'donations/' });
    const indexBlob = blobsList.blobs.find(b => b.pathname === 'donations/index.json');
    
    if (!indexBlob) {
      console.log('Donation index not found, cannot update');
      return;
    }
    
    // Get the index content
    const response = await fetch(indexBlob.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch donation index: ${response.status} ${response.statusText}`);
    }
    
    const indexData = await response.json();
    
    // Update the donation in the index
    indexData.donations = indexData.donations.map(donation => {
      if (donation.reference === updatedDonation.reference) {
        return {
          ...donation,
          status: updatedDonation.status
        };
      }
      return donation;
    });
    
    // Save the updated index
    await put(
      'donations/index.json',
      JSON.stringify(indexData, null, 2),
      {
        contentType: 'application/json',
        access: 'public'
      }
    );
    
    console.log(`Donation index updated for reference: ${updatedDonation.reference}`);
  } catch (error) {
    console.error('Error updating donation index:', error);
  }
}
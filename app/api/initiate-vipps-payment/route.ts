import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

/**
 * API route to initiate a Vipps payment
 * This handles the payment initiation step in the Vipps ePayment flow
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request data
    const { amount, phoneNumber } = await request.json();

    // Validate input
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount provided' },
        { status: 400 }
      );
    }

    if (!phoneNumber || phoneNumber.length !== 8) {
      return NextResponse.json(
        { error: 'Invalid phone number provided' },
        { status: 400 }
      );
    }

    // Generate a unique order reference
    const orderReference = nanoid();

    // Create the Vipps ePayment request
    // Documentation: https://developer.vippsmobilepay.com/docs/APIs/ecom-api/

    // The return URL where the user is redirected after payment (success or failure)
    const returnURL = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://khalid-albaih.vercel.app'}/download/${orderReference}`;
    
    // The API endpoint that Vipps will call with payment updates
    const callbackPrefix = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://khalid-albaih.vercel.app'}/api/vipps-callback`;
    
    // Convert amount to smallest currency unit (øre for NOK)
    const amountInOre = Math.round(Number(amount) * 100);

    // Construct the request payload according to ePayment API v1
    const payload = {
      // Set merchant reference (order ID)
      reference: orderReference,
      
      // Set amount details
      amount: {
        currency: "NOK",
        value: amountInOre
      },
      
      // Set customer information
      customer: {
        phoneNumber: phoneNumber,
      },
      
      // Set payment description that will appear in the app
      paymentDescription: `Donation to Khalid Albaih - ${amount} NOK`,
      
      // Set return URL where user will be redirected after payment
      returnUrl: returnURL,
      
      // Request user profile information using OIDC scope
      profile: {
        // Request name, phone number and email information
        // This will trigger user consent within the Vipps app
        scope: "name phoneNumber email",
      },
      
      // Set the user interaction type
      customerInteraction: "CUSTOMER_PRESENT",
      
      // Set payment method to wallet (Vipps)
      paymentMethod: {
        type: "WALLET"
      },
      
      // Set user flow to WEB_REDIRECT for browser-based flow
      userFlow: "WEB_REDIRECT",
    };

    // Get Vipps API credentials from environment variables
    const subscriptionKey = process.env.VIPPS_SUBSCRIPTION_KEY;
    const accessToken = process.env.VIPPS_ACCESS_TOKEN;

    if (!subscriptionKey || !accessToken) {
      console.error('Missing Vipps API credentials');
      return NextResponse.json(
        { error: 'Payment service configuration error' },
        { status: 500 }
      );
    }

    // Make the API request to Vipps ePayment API v2
    const vippsResponse = await fetch('https://apitest.vipps.no/epayment/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Ocp-Apim-Subscription-Key': subscriptionKey,
        'Merchant-Serial-Number': process.env.VIPPS_MERCHANT_SERIAL_NUMBER || '',
        'Vipps-System-Name': 'kh-khalid-albaih',
        'Vipps-System-Version': '1.0.0',
        'Vipps-System-Plugin-Name': 'nextjs-app',
        'Vipps-System-Plugin-Version': '1.0.0',
      },
      body: JSON.stringify(payload),
    });

    // Check if the request was successful
    if (!vippsResponse.ok) {
      const errorData = await vippsResponse.json();
      console.error('Vipps API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to initiate payment with Vipps' },
        { status: vippsResponse.status }
      );
    }

    // Parse the successful response
    const vippsData = await vippsResponse.json();

    // Store payment initiation details in database or blob storage
    // For a real implementation, this would save to a database
    console.log('Payment initiated:', {
      orderReference,
      amount,
      phoneNumber,
      timestamp: new Date().toISOString(),
    });

    // Return the URL where the user should be redirected to complete payment
    return NextResponse.json({
      success: true,
      redirectUrl: vippsData.url,
      orderReference,
    });
  } catch (error) {
    console.error('Error initiating payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
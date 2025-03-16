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
    const merchantSerialNumber = process.env.VIPPS_MERCHANT_SERIAL_NUMBER;

    if (!subscriptionKey || !accessToken || !merchantSerialNumber) {
      console.error('Missing Vipps API credentials:');
      console.error(`- Subscription Key: ${subscriptionKey ? 'Present' : 'Missing'}`);
      console.error(`- Access Token: ${accessToken ? 'Present' : 'Missing'}`);
      console.error(`- MSN: ${merchantSerialNumber ? 'Present' : 'Missing'}`);
      
      return NextResponse.json(
        { error: 'Payment service configuration error' },
        { status: 500 }
      );
    }

    // Check and format access token correctly with Bearer prefix
    const formattedToken = accessToken.startsWith('Bearer ') 
      ? accessToken 
      : `Bearer ${accessToken}`;

    // Log headers for debugging (remove in production)
    console.log('Request headers:', {
      'Content-Type': 'application/json',
      'Authorization': `${formattedToken.substring(0, 15)}...`, // Log only beginning for security
      'Ocp-Apim-Subscription-Key': `${subscriptionKey.substring(0, 5)}...`, // Log only beginning for security
      'Merchant-Serial-Number': merchantSerialNumber,
    });

    // Make the API request to Vipps ePayment API
    const vippsResponse = await fetch('https://apitest.vipps.no/epayment/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': formattedToken,
        'Ocp-Apim-Subscription-Key': subscriptionKey,
        'Merchant-Serial-Number': merchantSerialNumber,
        'Vipps-System-Name': 'kh-khalid-albaih',
        'Vipps-System-Version': '1.0.0',
        'Vipps-System-Plugin-Name': 'nextjs-app',
        'Vipps-System-Plugin-Version': '1.0.0',
      },
      body: JSON.stringify(payload),
    });

    // Check if the request was successful
    if (!vippsResponse.ok) {
      let errorMessage = 'Failed to initiate payment with Vipps';
      
      // Log the HTTP status for debugging
      console.error(`Vipps API error status: ${vippsResponse.status}`);
      
      // Log all response headers for debugging
      console.error('Response headers:', Object.fromEntries([...vippsResponse.headers.entries()]));
      
      try {
        // Try to get detailed error information from the response body
        const errorData = await vippsResponse.json();
        console.error('Vipps API error details:', errorData);
        
        // If there's a specific error message, use it
        if (errorData.error) {
          errorMessage = `Vipps error: ${errorData.error}`;
        } else if (errorData.message) {
          errorMessage = `Vipps error: ${errorData.message}`;
        } else if (errorData.type) {
          errorMessage = `Vipps error type: ${errorData.type}`;
        }
        
        // Special handling for 401 errors
        if (vippsResponse.status === 401) {
          errorMessage = 'Payment authentication failed. Please check API credentials.';
          console.error('Likely causes: Invalid access token or subscription key');
        }
      } catch (parseError) {
        // The response might not contain JSON
        console.error('Could not parse error response as JSON:', parseError);
        try {
          // Try to get the text response
          const textResponse = await vippsResponse.text();
          console.error('Error response text:', textResponse);
        } catch (textError) {
          console.error('Could not get error response text');
        }
      }
      
      return NextResponse.json(
        { error: errorMessage },
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
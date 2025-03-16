# Vipps Integration Reference

This document outlines the complete Vipps integration flow for the Khalid Albaih donation system, including consent capture, payment processing, and data storage.

## Table of Contents
1. [Donation Flow Overview](#donation-flow-overview)
2. [Vipps Payment Process](#vipps-payment-process)
3. [Consent Capture](#consent-capture)
4. [Webhook Implementation](#webhook-implementation)
5. [Data Storage](#data-storage)
6. [Donation Administration](#donation-administration)
7. [Security Considerations](#security-considerations)

## Donation Flow Overview

The complete donation flow consists of these steps:

1. **QR Code Scan**: User scans the exhibition QR code with their phone
2. **Donation Page**: User lands on the donation page with preset and custom amount options
3. **Vipps Initiation**: User enters phone number and amount, initiating Vipps payment
4. **Consent Collection**: During payment, obtain user consent for data storage
5. **Payment Processing**: Complete payment with auto-capture
6. **Webhook Processing**: Receive and process payment confirmation webhook
7. **Data Storage**: Store donation and consent data securely
8. **Download Generation**: Generate unique download link for the user
9. **Download Page**: Redirect user to download page

## Vipps Payment Process

### Vipps API Authentication

Authentication with the Vipps API requires careful attention to formatting and proper credentials. There are several key components:

1. **Access Token**: 
   - Must be formatted with `Bearer` prefix: `Bearer eyJhbGci...`
   - Has a limited validity period (typically 24 hours)
   - Must be refreshed when expired

2. **Subscription Key**:
   - Must be included in all API requests as `Ocp-Apim-Subscription-Key` header
   - Specific to the environment (test vs. production)
   - Must match the key used for obtaining the access token

3. **Merchant Serial Number (MSN)**:
   - Must be included in the API request headers
   - Must match the MSN associated with your subscription key

#### Token Management

```typescript
// Function to refresh the Vipps access token
async function refreshVippsToken() {
  const clientId = process.env.VIPPS_CLIENT_ID;
  const clientSecret = process.env.VIPPS_CLIENT_SECRET;
  const subscriptionKey = process.env.VIPPS_SUBSCRIPTION_KEY;
  
  // Base64 encode credentials
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  const response = await fetch('https://apitest.vipps.no/accesstoken/get', {
    method: 'POST',
    headers: {
      'client_id': clientId,
      'client_secret': clientSecret,
      'Ocp-Apim-Subscription-Key': subscriptionKey,
      'Authorization': `Basic ${credentials}`,
    },
  });
  
  const data = await response.json();
  return `Bearer ${data.access_token}`;
}
```

#### Header Formatting Best Practices

Always ensure your headers match exactly what Vipps expects:

```typescript
// Correct header formatting for Vipps API requests
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${accessToken}`, // Include "Bearer " prefix!
  'Ocp-Apim-Subscription-Key': subscriptionKey,
  'Merchant-Serial-Number': merchantSerialNumber,
};
```

### Payment Initiation with Profile Sharing

The ePayment API allows requesting profile information from users during payment:

```typescript
// Example payment initiation code
async function initiateVippsPayment(amount: number, phoneNumber: string) {
  const response = await fetch('/api/initiate-vipps-payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount,
      phoneNumber,
      reference: nanoid(), // Unique reference for this payment
    }),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Payment initiation failed');
  }
  
  return data;
}
```

### API Route Implementation

```typescript
// Modern ePayment API implementation
export async function POST(request: NextRequest) {
  const { amount, phoneNumber } = await request.json();
  
  // Generate a unique reference
  const reference = nanoid();
  
  // Convert amount to øre (smallest monetary unit in NOK)
  const amountInOre = Math.round(Number(amount) * 100);
  
  // Get and format credentials
  const subscriptionKey = process.env.VIPPS_SUBSCRIPTION_KEY;
  const accessToken = process.env.VIPPS_ACCESS_TOKEN;
  const msn = process.env.VIPPS_MERCHANT_SERIAL_NUMBER;
  
  // Ensure Bearer prefix
  const formattedToken = accessToken.startsWith('Bearer ') 
    ? accessToken 
    : `Bearer ${accessToken}`;
  
  // Construct ePayment API request payload
  const payload = {
    // Set merchant reference
    reference,
    
    // Amount details
    amount: {
      currency: "NOK",
      value: amountInOre
    },
    
    // Customer details
    customer: {
      phoneNumber,
    },
    
    // Return URL after payment
    returnUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/download/${reference}`,
    
    // Payment description
    paymentDescription: `Donation to Khalid Albaih`,
    
    // Request profile information
    profile: {
      scope: "name phoneNumber email" // Request user consent to share data
    },
    
    // Payment method configuration
    paymentMethod: {
      type: "WALLET"
    },
    
    // Set userFlow for browser redirect
    userFlow: "WEB_REDIRECT",
  };
  
  // Make API request
  const response = await fetch('https://apitest.vipps.no/epayment/v1/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': formattedToken,
      'Ocp-Apim-Subscription-Key': subscriptionKey,
      'Merchant-Serial-Number': msn,
      'Vipps-System-Name': 'kh-khalid-albaih',
      'Vipps-System-Version': '1.0.0',
    },
    body: JSON.stringify(payload),
  });
  
  // Process response
  const data = await response.json();
  
  return NextResponse.json({
    success: response.ok,
    redirectUrl: data.url,
    reference
  });
}
```

## Consent Capture

### Consent Options

Vipps provides options to collect user consent during payment:

1. **Email Address**: For sending receipt and future communications
2. **Shipping Address**: Not needed for digital products
3. **Profile Information**: Name and contact details

### Consent Configuration

Configure Vipps to request the following consent options:

```json
{
  "consentRemovalPrefixUrl": "https://yourdomain.com/api/consent-removal",
  "consent": {
    "customerInfo": {
      "email": {
        "isVisible": true,
        "required": false
      },
      "firstName": {
        "isVisible": true,
        "required": false
      },
      "lastName": {
        "isVisible": true,
        "required": false
      }
    }
  }
}
```

### Handling Consent Data

When receiving webhook callbacks from Vipps, extract and store consent data:

```typescript
// Extract user consent from webhook data
const userConsent = {
  email: webhookData.customerInfo?.email || null,
  firstName: webhookData.customerInfo?.firstName || null,
  lastName: webhookData.customerInfo?.lastName || null,
  consentTimestamp: new Date().toISOString(),
  reference: webhookData.orderId
};

// Store consent data securely
await storeConsentData(userConsent);
```

## Webhook Implementation

### Webhook Endpoints

Create a webhook endpoint to receive payment confirmations from Vipps:

```typescript
// Example webhook handler in /api/vipps-callback/route.ts
import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { nanoid } from 'nanoid';

export async function POST(request: Request) {
  // Verify webhook signature or authentication
  const webhookData = await request.json();
  
  // Check transaction status
  if (webhookData.transactionInfo.status === 'RESERVED') {
    // Payment is reserved/confirmed
    
    // 1. Extract payment data
    const paymentData = {
      orderId: webhookData.orderId,
      amount: webhookData.transactionInfo.amount / 100, // Convert from øre to kroner
      status: webhookData.transactionInfo.status,
      timestamp: new Date().toISOString()
    };
    
    // 2. Extract consent data if provided
    const consentData = {
      email: webhookData.customerInfo?.email || null,
      firstName: webhookData.customerInfo?.firstName || null,
      lastName: webhookData.customerInfo?.lastName || null,
      consentTimestamp: new Date().toISOString()
    };
    
    // 3. Store payment and consent data
    await storePaymentData(paymentData, consentData);
    
    // 4. Generate unique download ID
    const downloadId = nanoid();
    
    // 5. Store download mapping
    await storeDownloadMapping(downloadId, webhookData.orderId);
    
    // 6. Construct redirect URL for the user
    const redirectUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/download/${downloadId}`;
    
    // 7. Return redirect URL for Vipps to send to the user
    return NextResponse.json({ redirectUrl });
  } else {
    // Handle failed or cancelled payment
    return NextResponse.json({ 
      error: 'Payment not completed', 
      status: webhookData.transactionInfo.status 
    }, { status: 400 });
  }
}
```

### Auto-Capture Configuration

Ensure that Vipps is configured to auto-capture payments:

1. Configure in the Vipps Merchant Portal
2. Set capture timeout period (recommended: 7 days)

## Data Storage

### Storage Architecture

Store donation data in Vercel Blob with proper security:

```typescript
// Example function to store payment data in Vercel Blob
async function storePaymentData(paymentData, consentData) {
  // Combine payment and consent data
  const donationRecord = {
    ...paymentData,
    consent: consentData,
    createdAt: new Date().toISOString()
  };
  
  // Generate a unique, secure filename
  const recordId = `donation_${paymentData.orderId}_${nanoid()}`;
  
  // Store in Vercel Blob
  await put(
    `donations/${recordId}.json`,
    JSON.stringify(donationRecord, null, 2),
    {
      contentType: 'application/json',
      access: 'private'
    }
  );
  
  // Also add to donation index for easy listing
  await updateDonationIndex(donationRecord);
}
```

### Donation Index

Maintain an index of all donations for easy access:

```typescript
// Example function to update donation index
async function updateDonationIndex(donationRecord) {
  // Get existing index or create new one
  let donationIndex;
  try {
    const indexBlob = await get('donations/index.json');
    donationIndex = JSON.parse(await indexBlob.text());
  } catch (error) {
    // Index doesn't exist yet
    donationIndex = { donations: [] };
  }
  
  // Add minimal donation info to index
  donationIndex.donations.push({
    orderId: donationRecord.orderId,
    amount: donationRecord.amount,
    timestamp: donationRecord.createdAt,
    email: donationRecord.consent.email,
    name: `${donationRecord.consent.firstName || ''} ${donationRecord.consent.lastName || ''}`.trim() || null
  });
  
  // Store updated index
  await put(
    'donations/index.json',
    JSON.stringify(donationIndex, null, 2),
    {
      contentType: 'application/json',
      access: 'private'
    }
  );
}
```

## Donation Administration

### Admin Dashboard

Create a simple admin page for the artist to view donation records:

1. Protected with password or authentication
2. List all donations with amounts and timestamps
3. Option to export data for accounting purposes

```typescript
// Example admin page route at /admin/donations/page.tsx
export default async function DonationsAdminPage() {
  // Fetch donation index from Vercel Blob
  const donationIndex = await fetchDonationIndex();
  
  // Sort donations by timestamp (newest first)
  const sortedDonations = donationIndex.donations.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-8">Donation Records</h1>
      
      <div className="mb-4">
        <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={exportToCsv}>
          Export to CSV
        </button>
      </div>
      
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 text-left">Date</th>
            <th className="p-2 text-left">Order ID</th>
            <th className="p-2 text-left">Amount</th>
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-left">Email</th>
          </tr>
        </thead>
        <tbody>
          {sortedDonations.map(donation => (
            <tr key={donation.orderId} className="border-b">
              <td className="p-2">{formatDate(donation.timestamp)}</td>
              <td className="p-2">{donation.orderId}</td>
              <td className="p-2">NOK {donation.amount}</td>
              <td className="p-2">{donation.name || '-'}</td>
              <td className="p-2">{donation.email || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### CSV Export Function

Add functionality to export donation data as CSV:

```typescript
// Example function to export donations as CSV
function exportToCsv(donations) {
  const headers = ['Date', 'Order ID', 'Amount', 'Name', 'Email'];
  const rows = donations.map(d => [
    formatDate(d.timestamp),
    d.orderId,
    d.amount,
    d.name || '',
    d.email || ''
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `donations-${formatDate(new Date())}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

## Security Considerations

### Data Protection

1. **Encrypt Sensitive Data**: Ensure all user data is encrypted
2. **Minimal Data Collection**: Only store what is necessary
3. **Access Control**: Restrict access to donation data using authentication
4. **Data Retention Policy**: Implement a policy for data deletion after a certain period

### Webhook Security

1. **Signature Verification**: Verify Vipps webhook signatures
2. **IP Whitelisting**: Consider restricting webhook endpoints to Vipps IP addresses
3. **Idempotency**: Prevent duplicate processing by checking order IDs

```typescript
// Example webhook signature verification
function verifyWebhookSignature(request) {
  const signature = request.headers.get('X-Vipps-Signature');
  // Implement signature verification logic
}
```

### Environmental Variables

Required environment variables:
```
# Vipps API Authentication
VIPPS_MERCHANT_SERIAL_NUMBER=your-merchant-serial-number
VIPPS_SUBSCRIPTION_KEY=your-subscription-key
VIPPS_CLIENT_ID=your-client-id
VIPPS_CLIENT_SECRET=your-client-secret
VIPPS_ACCESS_TOKEN=Bearer your-access-token-without-spaces  # Include 'Bearer ' prefix!

# Application Configuration
NEXT_PUBLIC_BASE_URL=https://your-production-domain.com
BLOB_READ_WRITE_TOKEN=your-blob-token
ADMIN_PASSWORD=secure-password-for-admin-access
ADMIN_SECRET=secret-for-admin-apis
```

### Common Authentication Issues

1. **401 Unauthorized Errors**:
   - Missing `Bearer` prefix in the access token
   - Expired access token (typically valid for 24 hours)
   - Whitespace in token or credentials
   - Truncated credentials (missing characters at the end)
   - Using test credentials in production environment or vice versa

2. **Debug Endpoints**:
   - Use `/api/debug-credentials` in development to check credential formatting
   - Use `/api/refresh-token` to obtain a new access token when expired

3. **Token Refresh Process**:
   - Tokens expire after 24 hours and should be refreshed
   - Store the expiration time and refresh automatically before making API calls
   - Use Basic authentication with client ID and secret for token refresh

## Implementation Checklist

- [ ] Set up Vipps production account and configure auto-capture
- [ ] Implement payment initiation API endpoint
- [ ] Configure user consent collection in Vipps
- [ ] Set up secure webhook endpoint with signature verification
- [ ] Create blob storage architecture for donation data
- [ ] Implement donation index for quick access
- [ ] Build simple admin dashboard with authentication
- [ ] Add CSV export functionality
- [ ] Implement secure error handling and logging
- [ ] Test end-to-end payment flow in test environment
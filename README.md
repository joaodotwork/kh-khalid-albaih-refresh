# KH Khalid Albaih

An interactive exhibition experience that enables visitors to support the artist and receive exclusive digital content. The system displays a static QR code generated using the Vipps QR API. When scanned, visitors are directed to a donation page where they can select an amount to contribute via Vipps mobile payment. After completing the payment, they receive access to a unique, single-use download link for exclusive digital art, secured through Vercel Blob storage.

## User Journey Diagram

```mermaid
journey
    title Exhibition to Download User Experience
    section Exhibition Experience
        Visit exhibition: 5: Visitor
        See static QR code display: 5: Visitor
        Scan QR with mobile phone: 4: Visitor
    section Donation Process
        Redirected to donation page: 4: Visitor
        Select donation amount: 5: Visitor
        Vipps payment triggered: 4: Visitor
        Complete payment in Vipps app: 5: Visitor
    section Download Process
        Redirected to unique download page: 4: Visitor
        Access secured digital content: 5: Visitor
        Download unique digital asset: 5: Visitor
        Access link expires after use: 5: System
```

## Technical Flow Diagram

```mermaid
flowchart TD
    A[Visitor at exhibition] --> B[Static QR code displayed]
    B --> C[Visitor scans QR code]
    C --> D[Vipps QR API processes scan]
    D --> E[Redirect to donation page]
    E --> F[Visitor selects donation amount]
    F --> G[Vipps ePayment initiated]
    G --> H[Payment processed in Vipps app]
    H --> I[Generate unique download token with nanoid]
    I --> J[Redirect to unique download page]
    J --> K[Visitor downloads asset from Vercel Blob]
    
    subgraph "Security Features"
    L[Each download URL is unique]
    M[Download links are single-use]
    N[Assets secured in Vercel Blob Storage]
    end
```

## Sequence Diagram

```mermaid
sequenceDiagram
    actor Visitor
    participant QR as QR Code Display
    participant Vipps as Vipps API
    participant Donation as Donation Page
    participant VippsApp as Vipps Mobile App
    participant Server as Server
    participant Blob as Vercel Blob Storage
    
    Visitor->>QR: Scans static QR code
    QR->>Vipps: QR code contains Vipps merchant redirect URL
    Vipps->>Donation: Redirects to donation page
    Donation->>Visitor: Displays donation options
    Visitor->>Donation: Selects donation amount
    Donation->>VippsApp: Initiates Vipps ePayment
    VippsApp->>Visitor: Requests payment confirmation
    Visitor->>VippsApp: Confirms payment
    VippsApp->>Server: Payment confirmation webhook
    Server->>Server: Generates unique download token
    Server->>Visitor: Redirects to unique download page
    Visitor->>Server: Requests download
    Server->>Blob: Requests asset with single-use token
    Blob->>Visitor: Returns digital asset
    Server->>Server: Marks download token as used
```

## Features

- Interactive exhibition experience with QR code display
- Static QR code generation using Vipps Merchant Redirect API
- Donation page with customizable contribution amounts
- Vipps mobile payment integration
- Secure payment processing and webhooks
- Unique, single-use download links using nanoid
- Secure digital asset delivery via Vercel Blob Storage
- Download tracking and analytics
- Mobile-optimized user experience

## Tech Stack

- Next.js for frontend, API routes, and server components
- Tailwind CSS for responsive design
- Vercel for hosting and Blob Storage
- Vipps QR API for QR code generation
- Vipps ePayment for donation processing
- nanoid for secure unique URL generation
- TypeScript for type safety

## Getting Started

1. Clone the repository
   ```bash
   git clone <repository-url>
   cd kh-khalid-albaih
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`
   ```bash
   cp .env.example .env
   ```
   
4. Update the environment variables in `.env` with your Vipps API credentials and Vercel Blob token

5. Run the development server
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application

## Vipps Webhooks Integration

This project uses Vipps Webhooks API for payment notifications. To register webhooks with Vipps:

1. Set up your environment variables:
   ```
   VIPPS_SUBSCRIPTION_KEY=your_subscription_key
   VIPPS_MERCHANT_SERIAL_NUMBER=your_msn
   VIPPS_ACCESS_TOKEN=Bearer your_access_token
   NEXT_PUBLIC_BASE_URL=https://your-domain.com
   ```

2. Register your webhook:
   ```bash
   node --experimental-modules scripts/register-vipps-webhook.js
   ```

3. Store the webhook secret provided in the response:
   ```
   VIPPS_WEBHOOK_SECRET=your_webhook_secret
   ```

4. To list your registered webhooks:
   ```bash
   node --experimental-modules scripts/register-vipps-webhook.js list
   ```

## Troubleshooting Downloads

If a payment is completed but the download doesn't work (404 error), you can manually create the download mapping:

1. Identify the order reference from the payment (this is the unique ID generated during payment initiation)

2. Run the create-missing-download script:
   ```bash
   node scripts/create-missing-download.js <orderReference>
   ```

3. The script will output a download URL that you can share with the customer

This situation can occur if the Vipps callback doesn't reach the server or fails to complete. The script creates both the download mapping and a basic donation record to ensure the download works.

### Deployment

1. Push to the `dev` branch for development environments
   ```bash
   git checkout dev
   git push origin dev
   ```

2. For production deployment, merge changes to the `prod` branch
   ```bash
   git checkout prod
   git merge dev
   git push origin prod
   ```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
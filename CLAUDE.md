# Development Notes for Claude

## Project Commands

- **Install dependencies**: `npm install`
- **Run dev server**: `npm run dev`
- **Build for production**: `npm run build`
- **Start production server**: `npm run start`
- **Run linting**: `npm run lint`
- **Run type checking**: `npm run typecheck`
- **Set up tunneling for local Vipps testing**: `node scripts/setup-tunnel.js`
- **Refresh Vipps token**: `node scripts/refresh-vipps-token.js --update`
- **Upload sample artwork file**: `node scripts/upload-sample-artwork.js`
- **Create test data for downloads**: `node scripts/create-test-data.js [downloadId]`
- **Create missing download mapping**: `node scripts/create-missing-download.js <orderReference> [downloadId]`
- **Register Vipps webhooks**: `node --experimental-modules scripts/register-vipps-webhook.js`
- **List registered Vipps webhooks**: `node --experimental-modules scripts/register-vipps-webhook.js list`
- **Rebuild donation index**: `node scripts/rebuild-donation-index.js`

## Project Structure

```
kh-khalid-albaih/
├── app/                      # Next.js app directory
│   ├── api/                  # API routes
│   │   ├── download/[id]/    # Download API endpoint
│   │   └── vipps-callback/   # Vipps QR callback endpoint
│   ├── download/[id]/        # Download page route
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   ├── not-found.tsx         # 404 page
│   └── page.tsx              # Landing page
├── components/               # Reusable components
│   └── QRCodeDisplay.tsx     # QR code component
├── public/                   # Static assets
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore file
├── CLAUDE.md                 # Development notes for Claude
├── package.json              # Project dependencies
├── postcss.config.js         # PostCSS config
├── README.md                 # Project documentation
├── tailwind.config.js        # Tailwind CSS config
└── tsconfig.json             # TypeScript config
```

## API Integration

### Vipps API Integration
- Comprehensive integration documentation: See `VIPPS_INTEGRATION_REFERENCE.md`
- Authentication: Client ID, Client Secret, Subscription Key
- ePayment API: https://developer.vippsmobilepay.com/docs/APIs/epayment-api/
- UserInfo API: https://developer.vippsmobilepay.com/docs/APIs/userinfo-api/
- Access Token: **IMPORTANT** - Store as `VIPPS_ACCESS_TOKEN` with `Bearer ` prefix included
- API Keys Configuration:
  - Subscription Key: Must match the environment (test/prod)
  - Client IDs/Secrets: Must be complete with no trailing/leading spaces
  - Merchant Serial Number: Must match the MSN associated with your keys

#### Authentication Troubleshooting
- Use `/api/debug-credentials` endpoint for checking credential formatting (dev only)
- Use `/api/refresh-token` endpoint for obtaining a new access token
- Common 401 errors are caused by:
  1. Missing `Bearer` prefix in Authorization header
  2. Expired access tokens (valid for 24 hours)
  3. Whitespace in credentials
  4. Truncated API keys

#### Token Management

The application includes an automatic token management system that handles token refreshes for you:

1. **Automatic Refresh**: Tokens are automatically refreshed before API calls when they're about to expire
2. **In-Memory Caching**: Tokens are cached in memory to avoid unnecessary refresh calls
3. **Middleware**: All Vipps API endpoints use the token middleware to ensure valid tokens

You can manually refresh the token when needed:

```bash
# Show the new token but don't update .env
node scripts/refresh-vipps-token.js

# Fetch a fresh token and automatically update .env
node scripts/refresh-vipps-token.js --update

# Or use the API endpoint (requires ADMIN_SECRET)
curl -X POST https://your-domain.com/api/refresh-token \
  -H "Authorization: Bearer your-admin-secret"
```

**For Production Deployment**:
- Set up a cron job or scheduled task to call `/api/refresh-token` every 12 hours with your ADMIN_SECRET
- For Vercel deployments, use a service like Uptime Robot or GitHub Actions to periodically call the endpoint

The token is valid for 24 hours in production and 1 hour in the test environment.

#### API Flow
1. Generate static QR code on the landing page with merchant redirect
2. User scans QR code with phone camera
3. User is redirected to donation page
4. User selects amount and enters phone number
5. Vipps ePayment API is called with profile scope
6. User completes payment in Vipps app and grants profile access
7. Vipps sends callback with payment confirmation and profile data
8. System creates download link and stores donation data
9. User is redirected to download page

### Vercel Blob Storage
- Used for storing and serving downloadable files
- Each download gets a unique URL that expires after use
- Requires `BLOB_READ_WRITE_TOKEN` environment variable
- Storage structure:
  - `artwork/khalid-albaih-digital-artwork.pdf` - Digital artwork file
  - `donations/<reference>_<downloadId>.json` - Donation records
  - `downloads/<downloadId>.json` - Download mappings
  - `donations/index.json` - Index of all donations for admin dashboard

## Local Development with Vipps

Testing the Vipps integration locally requires a public URL for callbacks. We use ngrok for this:

1. Run the tunnel script: `node scripts/setup-tunnel.js`
2. The script will start ngrok and update your `.env` with the correct `NEXT_PUBLIC_BASE_URL`
3. Restart your Next.js dev server to pick up the new URL
4. Test the complete payment flow

### Testing the Download Flow

To test the download functionality without completing a real payment:

1. Generate a sample artwork file: `node scripts/upload-sample-artwork.js`
2. Create test data for a fake donation: `node scripts/create-test-data.js`
3. The script will output a URL to visit in your browser
4. Go to the download page and test the "Download Your Artwork" button

For authentication issues:
1. Make sure you have a valid access token: `node scripts/refresh-vipps-token.js --update`
2. Check credential formatting with the `/api/debug-credentials` endpoint

Common issues:
- Phone number format (must be 10-15 digits with country code)
- Order reference format (must match regex `^[a-zA-Z0-9-]{8,64}$` - only alphanumeric and hyphens, 8-64 chars)
- Expired access token (valid for 1 hour in test environment)
- Missing idempotency key in API requests
- Missing or incorrect tunneling setup for local development

## Deployment

- **Development**: Deploy from `dev` branch
- **Production**: Deploy from `prod` branch
- Set up environment variables in Vercel dashboard
- Make sure to add all required env variables for both environments
- Configure build settings for Next.js

## Code Style Preferences

- Use TypeScript for type safety
- Use functional components with React hooks
- Use server components and server actions where appropriate
- Use Tailwind CSS for styling
- Follow ESLint configuration
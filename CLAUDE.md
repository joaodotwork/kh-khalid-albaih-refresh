# Development Notes for Claude

## Project Commands

- **Install dependencies**: `npm install`
- **Run dev server**: `npm run dev`
- **Build for production**: `npm run build`
- **Start production server**: `npm run start`
- **Run linting**: `npm run lint`
- **Run type checking**: `npm run typecheck`

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
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

### Vipps QR API
- Endpoint: https://developer.vippsmobilepay.com/docs/APIs/qr-api/qr-api-guide/
- Authentication: Client ID, Client Secret, Subscription Key
- API flow:
  1. Generate static QR code on the landing page
  2. User scans QR code with Vipps app
  3. Vipps calls our callback endpoint with reference ID
  4. Our server generates a unique download link with nanoid
  5. User is redirected to the download page

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
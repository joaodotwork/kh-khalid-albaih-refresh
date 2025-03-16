# KH Khalid Albaih

A responsive landing page that displays a static QR code generated using the Vipps QR API. When scanned, the QR code redirects users to a unique download link, allowing secure access to digital assets with protection against link sharing.

## User Journey Diagram

```mermaid
journey
    title User Experience Flow
    section Landing Page
        Visit landing page: 5: User
        See static QR code: 5: User
        Scan QR with Vipps app: 4: User
    section Behind the Scenes
        Process QR scan: 5: Vipps API
        Generate unique ID: 5: Vipps API
        Callback to our server: 5: Server
        Create download URL: 5: Server
    section Download Process
        Redirect to download page: 4: User
        Authenticate download: 5: Server
        Download digital asset: 5: User
        Access expires: 5: Server
```

## Technical Flow Diagram

```mermaid
flowchart TD
    A[User visits landing page] --> B[Static QR code displayed]
    B --> C[User scans QR code with smartphone]
    C --> D[Vipps QR API processes scan]
    D --> E[Callback to our server with unique ID]
    E --> F[Generate unique download URL with nanoid]
    F --> G[Redirect user to unique download page]
    G --> H[User downloads asset from Vercel Blob Storage]
    
    subgraph "Security Features"
    I[Each download URL is unique]
    J[Download links are single-use or time-limited]
    K[Asset stored in Vercel Blob Storage]
    end
```

## Features

- Responsive landing page with Vipps QR code
- QR code generation using Vipps QR API
- Unique download links using nanoid
- Secure asset delivery via Vercel Blob Storage
- Download tracking and analytics

## Tech Stack

- Next.js for frontend and API routes
- Vercel for hosting and Blob Storage
- Vipps QR API for QR code generation
- nanoid for unique URL generation

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
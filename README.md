# KH Khalid Albair

A responsive landing page that displays a static QR code generated using the Vipps QR API. When scanned, the QR code redirects users to a unique download link, allowing secure access to digital assets with protection against link sharing.

## Flow Diagram

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

Instructions for setting up and running the project will go here.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
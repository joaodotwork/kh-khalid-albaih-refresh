import { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Use dynamic import to avoid hydration issues with the QR component
const QRCodeDisplay = dynamic(() => import('@/components/QRCodeDisplay'), {
  ssr: false,
  loading: () => (
    <div className="w-64 h-64 bg-gray-200 animate-pulse flex items-center justify-center rounded">
      <p className="text-gray-500">Loading QR code...</p>
    </div>
  ),
});

export default function Home() {
  // In a real implementation, this would be your API endpoint for Vipps callbacks
  const callbackUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/vipps-callback`;
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 sm:p-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">KH Khalid Albair</h1>
          <p className="text-gray-600 mb-6">
            Scan the QR code below to access your exclusive content
          </p>
          
          <div className="bg-gray-100 p-6 rounded-lg flex justify-center mb-6">
            <Suspense fallback={<div className="w-64 h-64 bg-gray-200 animate-pulse"></div>}>
              <QRCodeDisplay callbackUrl={callbackUrl} />
            </Suspense>
          </div>
          
          <div className="text-sm text-gray-500">
            <p>Scan with your Vipps app to access your unique download.</p>
            <p className="mt-2">The download link is unique to you and should not be shared.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
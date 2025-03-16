'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';

interface QRCodeDisplayProps {
  // No props needed as we're using a static QR code
}

export default function QRCodeDisplay({}: QRCodeDisplayProps) {
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // We're now using a pre-generated static QR code
    const loadQRCode = async () => {
      try {
        setIsLoading(true);
        
        // Use the static QR code SVG that we generated with Vipps API
        setQrImage('/static-qr-code.svg');
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading QR code:', err);
        setError('Failed to load QR code. Please refresh the page.');
        setIsLoading(false);
      }
    };
    
    loadQRCode();
  }, []);

  if (isLoading) {
    return (
      <div className="w-64 h-64 bg-gray-200 animate-pulse flex items-center justify-center rounded">
        <p className="text-gray-500">Loading QR code...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-64 h-64 bg-red-100 border border-red-300 flex items-center justify-center rounded p-4">
        <p className="text-red-500 text-center">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative w-64 h-64 border-2 border-gray-300 flex items-center justify-center rounded">
      {qrImage ? (
        // Display the static SVG QR code
        <div className="w-56 h-56 flex items-center justify-center">
          <Image 
            src={qrImage} 
            alt="Vipps QR Code - Scan to download"
            width={224}
            height={224}
            priority
          />
        </div>
      ) : (
        <p className="text-sm text-gray-500 text-center p-4">
          QR code will display here
        </p>
      )}
    </div>
  );
}
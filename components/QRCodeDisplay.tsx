import Image from 'next/image';
import { useState, useEffect } from 'react';

interface QRCodeDisplayProps {
  // The URL for the Vipps callback - in a real app, this would be 
  // dynamically generated with your API endpoint
  callbackUrl: string;
}

export default function QRCodeDisplay({ callbackUrl }: QRCodeDisplayProps) {
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // In a real implementation, this would call the Vipps QR API
    // For demo purposes, we're just simulating the API call
    
    const generateQRCode = async () => {
      try {
        setIsLoading(true);
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // For demo purposes, we'll use a placeholder QR code image
        // In production, this would be the response from the Vipps QR API
        setQrImage('/placeholder-qr-code.png');
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error generating QR code:', err);
        setError('Failed to generate QR code. Please try again.');
        setIsLoading(false);
      }
    };
    
    generateQRCode();
  }, [callbackUrl]);

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
        // In production, this would be the actual QR code image
        <div className="w-56 h-56 bg-gray-200 flex items-center justify-center">
          <p className="text-sm text-gray-500 text-center p-4">
            QR code placeholder (would be generated by Vipps API)
          </p>
        </div>
      ) : (
        <p className="text-sm text-gray-500 text-center p-4">
          QR code would be displayed here
        </p>
      )}
    </div>
  );
}
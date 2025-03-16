import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

// In a real implementation, this would be a database or another persistent storage solution
const tempStorage: Record<string, { createdAt: Date }> = {};

// Purge old entries (for demo purposes)
const purgeOldEntries = () => {
  const now = new Date();
  Object.keys(tempStorage).forEach(key => {
    const entry = tempStorage[key];
    const hoursDiff = (now.getTime() - entry.createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursDiff > 24) {
      delete tempStorage[key];
    }
  });
};

export async function POST(request: Request) {
  try {
    // Purge old entries
    purgeOldEntries();
    
    // Validate request from Vipps
    const data = await request.json();
    
    // In production, validate the request has come from Vipps
    // This would involve checking headers, signatures, etc.
    
    console.log('Received callback from Vipps:', data);
    
    // Generate a unique download ID
    const downloadId = nanoid();
    
    // Store the download ID with metadata
    // In a real implementation, this would be stored in a database
    tempStorage[downloadId] = {
      createdAt: new Date(),
      // Additional metadata from Vipps callback would be stored here
    };
    
    // Generate the download URL that the user will be redirected to
    const downloadUrl = new URL(`/download/${downloadId}`, request.url).toString();
    
    // Return the URL that Vipps should redirect the user to
    return NextResponse.json({ 
      redirectUrl: downloadUrl 
    });
  } catch (error) {
    console.error('Error processing Vipps callback:', error);
    return NextResponse.json({ error: 'Failed to process callback' }, { status: 500 });
  }
}
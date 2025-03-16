// Script to manually create download mappings for successful payments
// Usage: node scripts/create-missing-download.js <orderReference> <downloadId>

import { put } from '@vercel/blob';
import { nanoid } from 'nanoid';

async function createDownloadMapping() {
  // Get order reference and optional download ID from command line arguments
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: node scripts/create-missing-download.js <orderReference> [downloadId]');
    process.exit(1);
  }
  
  const reference = args[0];
  // Use provided downloadId or generate a new one
  const downloadId = args.length > 1 ? args[1] : nanoid();
  
  console.log(`Creating download mapping for order reference: ${reference}`);
  console.log(`Using download ID: ${downloadId}`);
  
  try {
    // Create a mapping between downloadId and reference
    const downloadMapping = {
      downloadId,
      reference,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    };
    
    console.log(`Creating download mapping for ID: ${downloadId}`);
    const downloadBlob = await put(
      `downloads/${downloadId}.json`,
      JSON.stringify(downloadMapping, null, 2),
      {
        contentType: 'application/json',
        access: 'public'
      }
    );
    console.log(`Download mapping created successfully at: ${downloadBlob.url}`);
    
    // Also create a donation record with minimal information
    const donationRecord = {
      reference,
      amount: 100,
      currency: 'NOK',
      status: 'CAPTURED',
      timestamp: new Date().toISOString(),
      userProfile: {
        name: null,
        email: null,
        phoneNumber: null
      },
      downloadId
    };
    
    // Store donation record in Vercel Blob
    const blobName = `donations/${reference}_${downloadId}.json`;
    const donationBlob = await put(
      blobName,
      JSON.stringify(donationRecord, null, 2),
      {
        contentType: 'application/json',
        access: 'public'
      }
    );
    
    console.log(`Stored donation record to ${donationBlob.url}`);
    
    // Generate download URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://khalid-albaih.vercel.app';
    const downloadUrl = `${baseUrl}/download/${downloadId}`;
    
    console.log(`\nSuccess! Download URL: ${downloadUrl}`);
    console.log(`Visit this URL to download the artwork.`);
  } catch (error) {
    console.error('Error creating download mapping:', error);
    process.exit(1);
  }
}

createDownloadMapping();
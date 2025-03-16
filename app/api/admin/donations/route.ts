import { NextRequest, NextResponse } from 'next/server';
import { list, getDownloadUrl } from '@vercel/blob';

/**
 * GET handler for retrieving all donations
 * This endpoint serves the donation index for the admin panel
 */
export async function GET(request: NextRequest) {
  console.log('Admin donations API called');
  try {
    console.log('Fetching donation index');
    
    // First, try to get the donation index
    const blobsList = await list({ prefix: 'donations/' });
    console.log('Blob list result:', blobsList.blobs.map(b => b.pathname));
    
    // Find the newest index file
    const indexBlobs = blobsList.blobs
      .filter(b => b.pathname === 'donations/index.json')
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    
    const indexBlob = indexBlobs.length > 0 ? indexBlobs[0] : null;
    
    if (indexBlob) {
      console.log(`Using newest index from ${indexBlob.uploadedAt}`);
    }
    
    if (!indexBlob) {
      console.log('Donation index not found, returning empty array');
      // Create a sample donation for testing if no donations exist
      return NextResponse.json({ donations: [{
        reference: 'sample-reference',
        amount: 100,
        currency: 'NOK',
        status: 'AUTHORIZED',
        timestamp: new Date().toISOString(),
        name: 'Test User',
        email: 'test@example.com',
        phoneNumber: null,
        downloadId: 'sample-download-id'
      }] });
    }
    
    // Get the URL for the index file
    const indexUrl = indexBlob.url;
    console.log(`Donation index found at: ${indexUrl}`);
    
    // Fetch the index content
    console.log('Fetching index content from URL...');
    const response = await fetch(indexUrl);
    console.log('Index fetch response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch donation index: ${response.status} ${response.statusText}`);
    }
    
    // Parse the index data
    const indexText = await response.text();
    console.log('Raw index content:', indexText.substring(0, 200) + '...');
    
    try {
      const indexData = JSON.parse(indexText);
      console.log('Parsed donation index:', indexData);
      
      // Add a fallback if donations array is missing
      if (!indexData.donations) {
        console.log('No donations array in index, creating empty array');
        indexData.donations = [];
      }
      
      return NextResponse.json(indexData);
    } catch (parseError) {
      console.error('Error parsing JSON from index:', parseError);
      return NextResponse.json({ donations: [] });
    }
  } catch (error) {
    console.error('Error fetching donations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch donations', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
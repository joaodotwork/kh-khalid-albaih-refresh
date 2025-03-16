import { NextRequest, NextResponse } from 'next/server';
import { list, getDownloadUrl } from '@vercel/blob';

/**
 * GET handler for retrieving all donations
 * This endpoint serves the donation index for the admin panel
 */
export async function GET(request: NextRequest) {
  try {
    console.log('Fetching donation index');
    
    // First, try to get the donation index
    const blobsList = await list({ prefix: 'donations/' });
    
    // Find the index file
    const indexBlob = blobsList.blobs.find(b => b.pathname === 'donations/index.json');
    
    if (!indexBlob) {
      console.log('Donation index not found, returning empty array');
      return NextResponse.json({ donations: [] });
    }
    
    // Get the URL for the index file
    const indexUrl = indexBlob.url;
    console.log(`Donation index found at: ${indexUrl}`);
    
    // Fetch the index content
    const response = await fetch(indexUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch donation index: ${response.status} ${response.statusText}`);
    }
    
    // Parse the index data
    const indexData = await response.json();
    
    return NextResponse.json(indexData);
  } catch (error) {
    console.error('Error fetching donations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch donations' },
      { status: 500 }
    );
  }
}
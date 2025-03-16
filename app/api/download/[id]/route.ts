import { NextRequest, NextResponse } from 'next/server';
import { read } from '@vercel/blob';

/**
 * GET handler for download API route
 * This endpoint serves digital content after validating the download ID
 * 
 * @param {NextRequest} request - The request object
 * @param {Object} context - The route context
 * @param {Object} context.params - The route parameters
 * @param {string} context.params.id - The download ID
 */
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const id = context.params.id;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing download ID' },
        { status: 400 }
      );
    }
    
    // Step 1: Validate the download ID by checking the download mapping
    const downloadMapping = await validateDownloadId(id);
    
    if (!downloadMapping) {
      console.log(`Invalid or expired download ID: ${id}`);
      return NextResponse.json(
        { error: 'Invalid or expired download link' },
        { status: 404 }
      );
    }
    
    // Step 2: Get the donation details to confirm payment status
    const donation = await getDonationDetails(downloadMapping.reference, id);
    
    if (!donation) {
      console.log(`No donation record found for download ID: ${id}`);
      return NextResponse.json(
        { error: 'No payment record found' },
        { status: 404 }
      );
    }
    
    // Step 3: Check payment status
    if (donation.status !== 'AUTHORIZED' && donation.status !== 'CAPTURED') {
      console.log(`Payment not completed for download ID: ${id}, status: ${donation.status}`);
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 403 }
      );
    }
    
    // Step 4: Serve the digital artwork file
    // For a real implementation, you would have a mapping of which file to serve
    // We'll use a fixed artwork file for simplicity

    // This is the name of the file in your Vercel Blob storage
    const artworkBlobName = 'artwork/khalid-albaih-digital-artwork.pdf';
    
    // Get the file from Vercel Blob storage
    const artwork = await read(artworkBlobName);
    
    // If the artwork file doesn't exist in blob storage
    if (!artwork) {
      console.error(`Artwork file not found: ${artworkBlobName}`);
      return NextResponse.json(
        { error: 'Artwork file not found' },
        { status: 404 }
      );
    }
    
    // Log the download event
    console.log(`Serving download for ID: ${id}, reference: ${downloadMapping.reference}`);
    
    // Update download record to mark it as used (optional)
    await markDownloadAsUsed(id);
    
    // Return the file as a download
    return new NextResponse(artwork, {
      headers: {
        'Content-Disposition': `attachment; filename="khalid-albaih-digital-artwork.pdf"`,
        'Content-Type': 'application/pdf',
        'Cache-Control': 'no-store, must-revalidate',
      },
    });
    
  } catch (error) {
    console.error('Error serving download:', error);
    return NextResponse.json(
      { error: 'Failed to serve download' },
      { status: 500 }
    );
  }
}

/**
 * Validates the download ID by checking if a corresponding record exists
 * @param id The download ID to validate
 * @returns The download mapping record if valid, null otherwise
 */
async function validateDownloadId(id: string) {
  try {
    // Try to get the download mapping from Vercel Blob
    const blobName = `downloads/${id}.json`;
    const blob = await read(blobName);
    
    if (!blob) {
      return null;
    }
    
    // Parse the mapping data
    const text = new TextDecoder().decode(blob);
    const mapping = JSON.parse(text);
    
    // Check if the download has expired
    const expiresAt = new Date(mapping.expiresAt);
    if (expiresAt < new Date()) {
      console.log(`Download ${id} has expired`);
      return null;
    }
    
    // Check if the download has already been used (optional)
    if (mapping.used) {
      console.log(`Download ${id} has already been used`);
      // You might decide to allow multiple downloads or not
      // For now, we'll allow multiple downloads
      // return null;
    }
    
    return mapping;
  } catch (error) {
    console.error(`Error validating download ID ${id}:`, error);
    return null;
  }
}

/**
 * Gets the donation details associated with the download
 */
async function getDonationDetails(reference: string, downloadId: string) {
  try {
    // Try to get the donation record from Vercel Blob
    const blobName = `donations/${reference}_${downloadId}.json`;
    const blob = await read(blobName);
    
    if (!blob) {
      return null;
    }
    
    // Parse the donation data
    const text = new TextDecoder().decode(blob);
    return JSON.parse(text);
  } catch (error) {
    console.error('Error getting donation details:', error);
    return null;
  }
}

/**
 * Marks a download as used
 */
async function markDownloadAsUsed(id: string) {
  try {
    // This is just a placeholder for now
    // In a full implementation, you would update the download record
    // in your blob storage or database to mark it as used
    
    // For a Vercel Blob implementation, you'd:
    // 1. Get the current mapping
    // 2. Update the 'used' property
    // 3. Write it back to blob storage
    
    // For simplicity, we'll just log that it would be marked as used
    console.log(`Would mark download ${id} as used`);
    
    return true;
  } catch (error) {
    console.error(`Error marking download ${id} as used:`, error);
    return false;
  }
}
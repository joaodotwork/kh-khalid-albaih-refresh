import { NextRequest, NextResponse } from 'next/server';
import { head, getDownloadUrl, list } from '@vercel/blob';

/**
 * GET handler for download API route
 * This endpoint serves digital content after validating the download ID
 * 
 * @param {NextRequest} request - The request object
 * @param {Object} context - The route context
 */
export async function GET(
  request: NextRequest
) {
  // Extract the download ID from the URL path
  const matches = request.nextUrl.pathname.match(/\/api\/download\/([^\/]+)/);
  const id = matches ? matches[1] : '';
  
  try {
    
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

    // Use the specific MP4 video file
    console.log(`API: Using specific MP4 video file`);
    let artwork;
    
    try {
      // Direct URL to the MP4 file
      const artworkUrl = "https://kjrgf7beznvdqbud.public.blob.vercel-storage.com/artwork/kh-Khalid-Albaih-Hijab-mw7vKH23VXp1yspduarwt3EfWc7sZl.mp4";
      console.log(`API: Using artwork blob URL directly: ${artworkUrl}`);
      
      const artworkResponse = await fetch(artworkUrl);
      if (!artworkResponse.ok) {
        console.error(`API: Error fetching artwork: ${artworkResponse.status} ${artworkResponse.statusText}`);
        return NextResponse.json(
          { error: 'Artwork file could not be retrieved' },
          { status: 500 }
        );
      }
      
      artwork = await artworkResponse.arrayBuffer();
      console.log(`API: Artwork content retrieved, size: ${artwork.byteLength} bytes`);
    } catch (artworkError) {
      console.error(`API: Error fetching artwork:`, artworkError);
      return NextResponse.json(
        { error: 'Failed to retrieve artwork' },
        { status: 500 }
      );
    }
    
    // If the artwork file doesn't exist in blob storage (should not reach here)
    if (!artwork) {
      console.error(`Artwork file not found`);
      return NextResponse.json(
        { error: 'Artwork file not found' },
        { status: 404 }
      );
    }
    
    // Log the download event
    console.log(`Serving download for ID: ${id}, reference: ${downloadMapping.reference}`);
    
    // Update download record to mark it as used (optional)
    await markDownloadAsUsed(id);
    
    // Set the content type for MP4 video
    const fileExtension = 'mp4';
    const contentType = 'video/mp4';
    
    console.log(`API: Using content type: ${contentType} for MP4 video`);
    
    // Return the file as a download
    return new NextResponse(artwork, {
      headers: {
        'Content-Disposition': `attachment; filename="Khalid-Albaih-Hijab.${fileExtension}"`,
        'Content-Type': contentType,
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
    // Find the matching blob URL directly from the list results
    console.log(`API: Looking for blobs that match download ID: ${id}`);
    const blobsList = await list({ prefix: 'downloads/' });
    
    // Find blobs that contain our ID
    const matchingBlobs = blobsList.blobs.filter(b => b.pathname.includes(id));
    console.log(`API: Found ${matchingBlobs.length} matching blobs:`, matchingBlobs.map(b => b.pathname));
    
    if (matchingBlobs.length === 0) {
      console.log(`API: No matching blobs found for ID: ${id}`);
      return null;
    }
    
    // Get the URL directly from the blob object
    const blobUrl = matchingBlobs[0].url;
    console.log(`API: Using blob URL directly: ${blobUrl}`);
    
    // Fetch the blob content directly using its URL
    try {
      const response = await fetch(blobUrl);
      if (!response.ok) {
        console.error(`API: Error fetching blob: ${response.status} ${response.statusText}`);
        return null;
      }
      
      const text = await response.text();
      console.log(`API: Blob content: ${text.substring(0, 100)}...`);
      const mapping = JSON.parse(text);
      
      // Check if the download has expired
      const expiresAt = new Date(mapping.expiresAt);
      if (expiresAt < new Date()) {
        console.log(`API: Download ${id} has expired`);
        return null;
      }
      
      // Check if the download has already been used (optional)
      if (mapping.used) {
        console.log(`API: Download ${id} has already been used`);
        // You might decide to allow multiple downloads or not
        // For now, we'll allow multiple downloads
        // return null;
      }
      
      return mapping;
    } catch (fetchError) {
      console.error(`API: Error fetching blob content:`, fetchError);
      return null;
    }
  } catch (error) {
    console.error(`API: Error validating download ID ${id}:`, error);
    return null;
  }
}

/**
 * Gets the donation details associated with the download
 */
async function getDonationDetails(reference: string, downloadId: string) {
  try {
    // Find donation records directly from the list results
    console.log(`API: Looking for donation blobs that match download ID: ${downloadId}`);
    const blobsList = await list({ prefix: 'donations/' });
    
    // Find blobs that contain our download ID
    const matchingBlobs = blobsList.blobs.filter(b => b.pathname.includes(downloadId));
    console.log(`API: Found ${matchingBlobs.length} matching donation blobs:`, matchingBlobs.map(b => b.pathname));
    
    if (matchingBlobs.length === 0) {
      console.log(`API: No matching donation blobs found for ID: ${downloadId}`);
      return null;
    }
    
    // Get the URL directly from the blob object
    const blobUrl = matchingBlobs[0].url;
    console.log(`API: Using donation blob URL directly: ${blobUrl}`);
    
    // Fetch the donation data directly using its URL
    try {
      const response = await fetch(blobUrl);
      if (!response.ok) {
        console.error(`API: Error fetching donation blob: ${response.status} ${response.statusText}`);
        return null;
      }
      
      const text = await response.text();
      console.log(`API: Donation blob content: ${text.substring(0, 100)}...`);
      return JSON.parse(text);
    } catch (fetchError) {
      console.error(`API: Error fetching donation blob content:`, fetchError);
      return null;
    }
  } catch (error) {
    console.error('API: Error getting donation details:', error);
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
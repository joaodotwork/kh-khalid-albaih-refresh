import { NextResponse } from 'next/server';
import { get } from '@vercel/blob';

// In a real implementation, this would be a database table or collection
const downloadMap: Record<string, string> = {
  // Mapping from download IDs to blob URLs
  // This would be populated dynamically in a real application
  'example-id': 'example-blob-url',
};

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // Validate the download ID
    // In a real implementation, this would check a database
    // and potentially mark the download as used
    
    // For demo purposes, let's pretend this is a valid ID
    // In production, you'd query a database to find the correct blob URL
    
    // Get the blob URL associated with this download ID
    // const blobUrl = downloadMap[id];
    
    // In a real implementation using Vercel Blob Storage:
    // const blob = await get(blobUrl);
    
    // For demo purposes, we'll just return a placeholder response
    return new NextResponse(
      'This is where the actual file content would be served from Vercel Blob Storage',
      {
        headers: {
          'Content-Disposition': 'attachment; filename="sample-file.pdf"',
          'Content-Type': 'application/pdf',
        },
      }
    );
  } catch (error) {
    console.error('Error serving download:', error);
    return NextResponse.json(
      { error: 'Failed to serve download' },
      { status: 500 }
    );
  }
}
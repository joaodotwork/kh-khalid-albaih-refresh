import { notFound } from 'next/navigation';
import Link from 'next/link';
import { get } from '@vercel/blob';
import Image from 'next/image';

// Define page props type
type DownloadPageProps = {
  params: {
    id: string;
  };
};

/**
 * Validates the download ID by checking if a corresponding record exists
 * @param id The download ID to validate
 * @returns The download mapping record if valid, null otherwise
 */
async function validateDownloadId(id: string) {
  try {
    // Try to get the download mapping from Vercel Blob
    const blobName = `downloads/${id}.json`;
    const blob = await get(blobName);
    
    if (!blob) {
      return null;
    }
    
    // Parse the mapping data
    const mapping = JSON.parse(await blob.text());
    
    // Check if the download has expired
    const expiresAt = new Date(mapping.expiresAt);
    if (expiresAt < new Date()) {
      console.log(`Download ${id} has expired`);
      return null;
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
    const blob = await get(blobName);
    
    if (!blob) {
      return null;
    }
    
    // Parse the donation data
    return JSON.parse(await blob.text());
  } catch (error) {
    console.error('Error getting donation details:', error);
    return null;
  }
}

/**
 * Download page component
 * This page is shown to users after successful payment
 * It provides access to the downloadable digital content
 */
export default async function DownloadPage({ params }: DownloadPageProps) {
  // Extract id from params
  const id = params.id;
  
  // Validate the download ID
  const mapping = await validateDownloadId(id);
  
  if (!mapping) {
    notFound();
  }
  
  // Get donation details
  const donation = await getDonationDetails(mapping.reference, id);
  
  // Prepare download URL
  const downloadUrl = `/api/download/${id}`;
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 sm:p-10">
          <div className="text-center mb-8">
            <div className="inline-block bg-green-100 p-3 rounded-full mb-4">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-10 w-10 text-green-500" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M5 13l4 4L19 7" 
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Thank You for Your Support!
            </h1>
            <p className="text-gray-600">
              Your exclusive digital artwork is ready to download.
            </p>
          </div>
          
          {donation && donation.amount && (
            <div className="mb-6 bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-blue-800">
                Thank you for your generous donation of 
                <span className="font-bold"> {donation.amount} {donation.currency}</span>
              </p>
              {donation.userProfile?.name && (
                <p className="text-blue-600 mt-1 text-sm">
                  {donation.userProfile.name}
                </p>
              )}
            </div>
          )}
          
          <div className="mb-8 bg-gray-100 p-4 rounded-lg">
            <div className="flex items-center mb-4">
              <div className="bg-blue-100 p-2 rounded-lg mr-3">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-6 w-6 text-blue-600" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                  />
                </svg>
              </div>
              <h2 className="text-lg font-medium text-gray-800">About Your Download</h2>
            </div>
            <p className="text-gray-600 text-sm mb-2">
              You're about to download an exclusive digital artwork by Khalid Albaih.
            </p>
            <p className="text-gray-600 text-sm">
              This file is for personal use only and is not to be redistributed.
            </p>
          </div>
          
          <div className="mb-10">
            <Link 
              href={downloadUrl} 
              className="inline-block w-full py-4 px-6 text-center font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
            >
              <span className="flex items-center justify-center">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-5 w-5 mr-2" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" 
                  />
                </svg>
                Download Your Artwork
              </span>
            </Link>
          </div>
          
          <div className="text-sm text-gray-500 border-t pt-4">
            <p>This download link is unique to you and will expire after use.</p>
            <p className="mt-2">Your support helps Khalid Albaih continue creating powerful and meaningful art.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
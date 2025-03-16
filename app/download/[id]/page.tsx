import { notFound } from 'next/navigation';
import Link from 'next/link';

// This will be replaced with database lookup in a real implementation
const validateDownloadId = async (id: string) => {
  // Placeholder for database/storage validation
  console.log(`Validating download ID: ${id}`);
  // In a real implementation, we would check if this ID exists and is valid
  return true;
};

/**
 * Download page component
 * @param {Object} props - Page props
 * @param {Object} props.params - URL parameters
 * @param {string} props.params.id - Download ID
 */
export default async function DownloadPage(props) {
  const id = props.params?.id;
  
  const isValid = await validateDownloadId(id);
  
  if (!isValid) {
    notFound();
  }
  
  // In a real implementation, this would come from Vercel Blob storage or another storage solution
  const downloadUrl = `/api/download/${id}`;
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 sm:p-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Download is Ready</h1>
          <p className="text-gray-600 mb-6">
            Thank you for using our service. Your download is ready.
          </p>
          
          <div className="mb-10">
            <Link 
              href={downloadUrl} 
              className="inline-block w-full py-3 px-6 text-center font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition duration-200"
            >
              Download Now
            </Link>
          </div>
          
          <div className="text-sm text-gray-500">
            <p>This download link is unique to you and will expire after use.</p>
            <p className="mt-2">If you encounter any issues, please contact support.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
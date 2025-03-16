import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 sm:p-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">404 - Not Found</h1>
          <p className="text-gray-600 mb-6">
            Sorry, the download link you're looking for doesn't exist or has expired.
          </p>
          
          <div className="mb-10">
            <Link 
              href="/" 
              className="inline-block w-full py-3 px-6 text-center font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition duration-200"
            >
              Return to Home Page
            </Link>
          </div>
          
          <div className="text-sm text-gray-500">
            <p>If you believe this is an error, please contact our support team.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
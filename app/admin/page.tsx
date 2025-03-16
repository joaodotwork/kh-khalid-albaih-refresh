'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminHomePage() {
  const router = useRouter();
  
  // Redirect to donations page
  useEffect(() => {
    router.push('/admin/donations');
  }, [router]);
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow rounded-lg p-6 mt-6">
        <h2 className="text-xl font-medium mb-4">Admin Dashboard</h2>
        <p className="text-gray-500 mb-6">Redirecting to donations page...</p>
        <div className="flex space-x-4">
          <Link 
            href="/admin/donations"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            View Donations
          </Link>
        </div>
      </div>
    </div>
  );
}
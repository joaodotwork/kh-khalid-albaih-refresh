'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Donation {
  reference: string;
  amount: number;
  currency: string;
  status: string;
  timestamp: string;
  name: string | null;
  email: string | null;
  phoneNumber: string | null;
  downloadId: string;
}

export default function AdminDonationsPage() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [captureStatus, setCaptureStatus] = useState<Record<string, string>>({});

  // Fetch donations when the component mounts
  useEffect(() => {
    fetchDonations();
  }, []);

  // Function to fetch donations from the index
  async function fetchDonations() {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/donations');
      
      if (!response.ok) {
        throw new Error(`Error fetching donations: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Sort donations by timestamp (newest first)
      const sortedDonations = data.donations.sort((a: Donation, b: Donation) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
      
      setDonations(sortedDonations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching donations:', err);
    } finally {
      setLoading(false);
    }
  }

  // Function to capture a payment
  async function capturePayment(reference: string) {
    try {
      setCaptureStatus(prev => ({ ...prev, [reference]: 'processing' }));
      
      const response = await fetch('/api/admin/capture-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reference }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to capture payment');
      }
      
      const result = await response.json();
      
      setCaptureStatus(prev => ({ ...prev, [reference]: 'success' }));
      
      // Update the donations list to show the new status
      setDonations(prev => 
        prev.map(donation => 
          donation.reference === reference 
            ? { ...donation, status: 'CAPTURED' } 
            : donation
        )
      );
      
      setTimeout(() => {
        setCaptureStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[reference];
          return newStatus;
        });
      }, 3000);
    } catch (err) {
      setCaptureStatus(prev => ({ ...prev, [reference]: 'error' }));
      console.error('Error capturing payment:', err);
      
      setTimeout(() => {
        setCaptureStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[reference];
          return newStatus;
        });
      }, 3000);
    }
  }

  // Render status badge with appropriate color
  function renderStatusBadge(status: string) {
    let bgColor = 'bg-gray-200';
    let textColor = 'text-gray-800';
    
    switch (status) {
      case 'CREATED':
        bgColor = 'bg-blue-100';
        textColor = 'text-blue-800';
        break;
      case 'AUTHORIZED':
        bgColor = 'bg-yellow-100';
        textColor = 'text-yellow-800';
        break;
      case 'CAPTURED':
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
        break;
      case 'CANCELLED':
      case 'FAILED':
        bgColor = 'bg-red-100';
        textColor = 'text-red-800';
        break;
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
        {status}
      </span>
    );
  }

  // Render capture button based on payment status
  function renderCaptureButton(donation: Donation) {
    if (donation.status !== 'AUTHORIZED') {
      return null;
    }
    
    const status = captureStatus[donation.reference];
    
    if (status === 'processing') {
      return (
        <button
          disabled
          className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-400 cursor-wait"
        >
          Processing...
        </button>
      );
    }
    
    if (status === 'success') {
      return (
        <button
          disabled
          className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-500"
        >
          Captured!
        </button>
      );
    }
    
    if (status === 'error') {
      return (
        <button
          onClick={() => capturePayment(donation.reference)}
          className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-500 hover:bg-red-600"
        >
          Try Again
        </button>
      );
    }
    
    return (
      <button
        onClick={() => capturePayment(donation.reference)}
        className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
      >
        Capture
      </button>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="p-4 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-700">Loading donations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md p-6 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={fetchDonations}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Donations</h1>
          <button
            onClick={fetchDonations}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
        
        {donations.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <p className="text-gray-500">No donations found.</p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reference
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Download
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {donations.map((donation) => (
                    <tr key={donation.reference} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(donation.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                        {donation.reference}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {donation.amount} {donation.currency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {donation.name || 'Anonymous'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderStatusBadge(donation.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {donation.downloadId && (
                          <Link
                            href={`/download/${donation.downloadId}`}
                            target="_blank"
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            View
                          </Link>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {renderCaptureButton(donation)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
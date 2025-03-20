'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Script from 'next/script';

// Preset donation amount options
const presetAmounts = [
  { id: 'small', amount: 100, label: 'NOK 100' },
  { id: 'medium', amount: 500, label: 'NOK 500' },
  { id: 'large', amount: 1000, label: 'NOK 1000' },
];

export default function DonatePage() {
  const [showModal, setShowModal] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleOpenModal = () => {
    setShowModal(true);
  };
  
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedAmount(null);
    setCustomAmount('');
    setPhoneNumber('');
    setError(null);
  };
  
  const handleSelectAmount = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
    setError(null);
  };
  
  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomAmount(e.target.value);
    setSelectedAmount(null);
    setError(null);
  };
  
  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only numbers and limit to 8 digits (Norwegian phone number format)
    const value = e.target.value.replace(/\D/g, '').slice(0, 8);
    setPhoneNumber(value);
    setError(null);
  };
  
  const handleSubmit = async () => {
    // Validate phone number
    if (phoneNumber.length !== 8) {
      setError('Please enter a valid 8-digit phone number');
      return;
    }
    
    // Validate amount
    let finalAmount: number;
    
    if (selectedAmount) {
      finalAmount = selectedAmount;
    } else if (customAmount) {
      const parsedAmount = parseFloat(customAmount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        setError('Please enter a valid amount');
        return;
      }
      
      if (parsedAmount < 10) {
        setError('Minimum donation amount is NOK 10');
        return;
      }
      
      // No maximum limit for custom donations
      
      finalAmount = parsedAmount;
    } else {
      setError('Please select or enter a donation amount');
      return;
    }
    
    // Show loading state
    setError(null);
    setIsLoading(true);
    
    try {
      // Call our API endpoint to initiate Vipps payment
      const response = await fetch('/api/initiate-vipps-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: finalAmount,
          phoneNumber,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate payment');
      }
      
      // Check if we have a redirect URL from Vipps
      if (data.redirectUrl) {
        // Redirect the user to Vipps payment page
        window.location.href = data.redirectUrl;
      } else {
        throw new Error('No redirect URL received from payment service');
      }
    } catch (error) {
      console.error('Payment initiation error:', error);
      setError(typeof error === 'object' && error !== null && 'message' in error 
        ? (error as Error).message 
        : 'Failed to initiate payment. Please try again.');
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <Script
        async
        type="text/javascript"
        src="https://checkout.vipps.no/checkout-button/v1/vipps-checkout-button.js"
      />
      <div className="max-w-lg w-full bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 sm:p-10">
          <div className="flex items-center justify-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Support Khalid Albaih</h1>
          </div>
          
          <div className="mb-8">
            <div className="mb-6 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg p-8 text-center">
              <h2 className="text-2xl font-bold text-blue-800 mb-4">Exclusive Digital Artwork</h2>
              <div className="w-24 h-1 bg-blue-600 mx-auto mb-6 rounded-full"></div>
              <p className="text-blue-900 italic">
                "Art should comfort the disturbed and disturb the comfortable."
              </p>
            </div>
            
            <p className="text-gray-700 mb-6 leading-relaxed">
              Your support helps Khalid Albaih continue creating powerful and impactful artwork. 
              By donating, you will receive <span className="font-semibold text-blue-700">exclusive access</span> to a unique digital piece 
              that will not be available anywhere else.
            </p>
            
            <p className="text-gray-700 mb-6 leading-relaxed">
              Each donation gives you access to a one-time download of a high-resolution digital 
              artwork, specially created for supporters of this exhibition.
            </p>
            
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
              <p className="text-blue-800">
                <span className="font-bold">Note:</span> You'll need the Vipps app installed on your phone to complete the donation.
              </p>
            </div>
          </div>
          
          <div className="flex justify-center">
            <button
              onClick={handleOpenModal}
              className="px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-all duration-200 transform hover:scale-105 hover:shadow-lg flex items-center"
            >
              <span className="mr-2">Donate Now</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Donation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-4">
                <h2 className="text-2xl font-bold text-blue-900">Select Donation Amount</h2>
                <button 
                  onClick={handleCloseModal}
                  className="text-gray-500 hover:text-red-600 transition-colors duration-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  Choose a preset amount or enter your own:
                </p>
                
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {presetAmounts.map((option) => (
                    <button
                      key={option.id}
                      className={`py-4 px-4 border-2 rounded-lg text-center transition-all duration-200 ${
                        selectedAmount === option.amount
                          ? 'bg-blue-100 border-blue-500 text-blue-700 font-bold shadow-inner'
                          : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                      }`}
                      onClick={() => handleSelectAmount(option.amount)}
                    >
                      <span className="block text-lg">{option.label}</span>
                    </button>
                  ))}
                </div>
                
                <div className="mb-6">
                  <label htmlFor="customAmount" className="block text-sm font-medium text-gray-700 mb-2">
                    Custom amount (NOK)
                  </label>
                  <div className="relative mt-1 rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <span className="text-gray-500 font-medium">NOK</span>
                    </div>
                    <input
                      type="text"
                      name="customAmount"
                      id="customAmount"
                      className={`block w-full rounded-md border-2 pl-14 pr-4 py-3 text-lg focus:ring-blue-500 ${
                        customAmount 
                          ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium' 
                          : 'border-gray-300 focus:border-blue-500'
                      }`}
                      placeholder="Enter amount"
                      value={customAmount}
                      onChange={handleCustomAmountChange}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-600">
                    Min: NOK 10, No maximum limit
                  </p>
                </div>
                
                <div className="mb-6">
                  <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone number (for Vipps payment)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <input
                      type="tel"
                      name="phoneNumber"
                      id="phoneNumber"
                      className="block w-full rounded-md border-2 border-gray-300 py-3 px-4 pl-10 focus:border-blue-500 focus:ring-blue-500 text-lg"
                      placeholder="8-digit Norwegian phone number"
                      value={phoneNumber}
                      onChange={handlePhoneNumberChange}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-600">
                    Enter your 8-digit Norwegian phone number linked to Vipps
                  </p>
                </div>
                
                {error && (
                  <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md mb-6">
                    <div className="flex">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {error}
                    </div>
                  </div>
                )}
                
                {isLoading ? (
                  <button
                    disabled
                    className="w-full py-4 px-4 bg-blue-400 text-white font-bold rounded-lg shadow-md cursor-not-allowed flex items-center justify-center"
                  >
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </button>
                ) : (
                  <div onClick={handleSubmit} className="w-full flex justify-center">
                    <vipps-mobilepay-button
                      type="button"
                      brand="vipps"
                      language="en"
                      variant="primary"
                      rounded="true"
                      verb="donate"
                      stretched="false"
                      branded="true"
                      loading="false"
                    ></vipps-mobilepay-button>
                  </div>
                )}
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-200 text-sm text-gray-500 text-center">
                <p>You will receive your download link after successful payment</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
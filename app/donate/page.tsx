'use client';

import { useState } from 'react';
import Image from 'next/image';

// Preset donation amount options
const presetAmounts = [
  { id: 'small', amount: 50, label: 'NOK 50' },
  { id: 'medium', amount: 100, label: 'NOK 100' },
  { id: 'large', amount: 200, label: 'NOK 200' },
];

export default function DonatePage() {
  const [showModal, setShowModal] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
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
  
  const handleSubmit = () => {
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
      
      if (parsedAmount > 1000) {
        setError('Maximum donation amount is NOK 1000');
        return;
      }
      
      finalAmount = parsedAmount;
    } else {
      setError('Please select or enter a donation amount');
      return;
    }
    
    // Here, you would normally initiate the Vipps payment
    // For now, we'll just log the values and show an alert
    console.log('Initiating payment:', {
      amount: finalAmount,
      phoneNumber,
    });
    
    alert(`Payment process would start now for NOK ${finalAmount} to phone number ${phoneNumber}`);
    handleCloseModal();
  };
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 sm:p-10">
          <div className="flex items-center justify-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Support Khalid Albaih</h1>
          </div>
          
          <div className="mb-8">
            <div className="aspect-w-16 aspect-h-9 mb-6 bg-gray-100 rounded-lg overflow-hidden">
              <Image 
                src="/static-qr-code.svg" 
                alt="Khalid Albaih Artwork"
                width={500}
                height={280}
                className="object-cover"
                priority
              />
            </div>
            
            <p className="text-gray-700 mb-6">
              Your support helps Khalid Albaih continue creating powerful and impactful artwork. 
              By donating, you will receive exclusive access to a unique digital piece that will 
              not be available anywhere else.
            </p>
            
            <p className="text-gray-700 mb-6">
              Each donation gives you access to a one-time download of a high-resolution digital 
              artwork, specially created for supporters of this exhibition.
            </p>
          </div>
          
          <div className="flex justify-center">
            <button
              onClick={handleOpenModal}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors duration-200"
            >
              Donate Now
            </button>
          </div>
        </div>
      </div>
      
      {/* Donation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Select Donation Amount</h2>
                <button 
                  onClick={handleCloseModal}
                  className="text-gray-500 hover:text-gray-700"
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
                      className={`py-3 px-4 border rounded-lg text-center ${
                        selectedAmount === option.amount
                          ? 'bg-blue-50 border-blue-500 text-blue-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onClick={() => handleSelectAmount(option.amount)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                
                <div className="mb-6">
                  <label htmlFor="customAmount" className="block text-sm font-medium text-gray-700 mb-1">
                    Custom amount (NOK)
                  </label>
                  <div className="relative mt-1 rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">NOK</span>
                    </div>
                    <input
                      type="text"
                      name="customAmount"
                      id="customAmount"
                      className={`block w-full rounded-md border-gray-300 pl-14 pr-4 py-2 focus:border-blue-500 focus:ring-blue-500 ${
                        customAmount ? 'bg-blue-50 border-blue-500' : ''
                      }`}
                      placeholder="Enter amount"
                      value={customAmount}
                      onChange={handleCustomAmountChange}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Min: NOK 10, Max: NOK 1000
                  </p>
                </div>
                
                <div className="mb-6">
                  <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone number (for Vipps payment)
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    id="phoneNumber"
                    className="block w-full rounded-md border-gray-300 py-2 px-4 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="8-digit Norwegian phone number"
                    value={phoneNumber}
                    onChange={handlePhoneNumberChange}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Enter your 8-digit Norwegian phone number linked to Vipps
                  </p>
                </div>
                
                {error && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-lg mb-4">
                    {error}
                  </div>
                )}
                
                <button
                  onClick={handleSubmit}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors duration-200"
                >
                  Proceed to Payment
                </button>
              </div>
              
              <div className="text-xs text-gray-500 text-center">
                <p>Payment processed securely through Vipps</p>
                <p className="mt-1">You will receive your download link after successful payment</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
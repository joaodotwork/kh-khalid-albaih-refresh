#!/usr/bin/env node

/**
 * This script creates test data in Vercel Blob storage for testing the download functionality
 * It creates a sample download mapping and donation record
 * 
 * Usage:
 *   node scripts/create-test-data.js [downloadId]
 *   
 * If downloadId is not provided, a random one will be generated
 */

import('dotenv').then(dotenv => dotenv.config());
import('@vercel/blob').then(({ put }) => {
  import('nanoid').then(({ nanoid }) => {
    main(nanoid, put).catch(err => {
      console.error('Script error:', err);
      process.exit(1);
    });
  });
});

/**
 * Main function that orchestrates the test data creation
 */
async function main(nanoid, put) {
  try {
    console.log('Creating test data in Vercel Blob storage...');
    
    // Check if BLOB_READ_WRITE_TOKEN is set
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('ERROR: BLOB_READ_WRITE_TOKEN environment variable is not set.');
      console.error('Please add it to your .env file and try again.');
      process.exit(1);
    }
    
    // Generate or use provided download ID
    const downloadId = process.argv[2] || nanoid();
    console.log(`Using download ID: ${downloadId}`);
    
    // Generate a reference ID (simulating payment reference from Vipps)
    const reference = nanoid().replace(/_/g, '-');
    console.log(`Using payment reference: ${reference}`);
    
    // Create a test download mapping
    await createDownloadMapping(downloadId, reference, put);
    
    // Create a test donation record
    await createDonationRecord(reference, downloadId, put);
    
    console.log('\n✅ Test data created successfully!');
    console.log('\nTo test the download:');
    console.log(`1. Visit: http://localhost:3000/download/${downloadId}`);
    console.log('2. Click the "Download Your Artwork" button');
    
  } catch (error) {
    console.error('Error creating test data:', error);
    process.exit(1);
  }
}

/**
 * Creates a test download mapping in Vercel Blob storage
 */
async function createDownloadMapping(downloadId, reference, put) {
  console.log('\nCreating download mapping...');
  
  // Create expiration date (7 days from now)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  
  // Create download mapping object
  const mapping = {
    downloadId,
    reference,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
    used: false
  };
  
  // Convert to JSON
  const jsonData = JSON.stringify(mapping, null, 2);
  
  // Blob path
  const blobName = `downloads/${downloadId}.json`;
  
  // Upload to Vercel Blob
  const blob = await put(blobName, jsonData, {
    contentType: 'application/json',
    access: 'public',
  });
  
  console.log(`✅ Download mapping created at: ${blob.url}`);
  return blob;
}

/**
 * Creates a test donation record in Vercel Blob storage
 */
async function createDonationRecord(reference, downloadId, put) {
  console.log('\nCreating donation record...');
  
  // Create donation record object
  const donation = {
    reference,
    amount: 100,
    currency: "NOK",
    status: "CAPTURED", // Important: This status allows download
    timestamp: new Date().toISOString(),
    userProfile: {
      name: "Test User",
      email: "test@example.com",
      phoneNumber: "4712345678"
    },
    downloadId
  };
  
  // Convert to JSON
  const jsonData = JSON.stringify(donation, null, 2);
  
  // Blob path
  const blobName = `donations/${reference}_${downloadId}.json`;
  
  // Upload to Vercel Blob
  const blob = await put(blobName, jsonData, {
    contentType: 'application/json',
    access: 'public',
  });
  
  console.log(`✅ Donation record created at: ${blob.url}`);
  
  // Update donation index
  await updateDonationIndex(donation, put);
  
  return blob;
}

/**
 * Updates the donation index with the new donation
 */
async function updateDonationIndex(donation, put) {
  console.log('\nUpdating donation index...');
  
  let donationIndex = { donations: [] };
  
  // Try to get existing index
  try {
    // Check if index already exists
    const blobName = 'donations/index.json';
    try {
      const existingBlob = await fetch(
        `https://api.vercel.com/v6/blobs/${process.env.BLOB_READ_WRITE_TOKEN.split('_')[1]}/${blobName}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN.split('_')[2]}`
          }
        }
      );
      
      if (existingBlob.ok) {
        donationIndex = await existingBlob.json();
      }
    } catch (error) {
      console.log('No existing index found, creating new one');
    }
    
    // Add donation to index
    donationIndex.donations.push({
      reference: donation.reference,
      amount: donation.amount,
      currency: donation.currency,
      timestamp: donation.timestamp,
      name: donation.userProfile?.name || null,
      email: donation.userProfile?.email || null,
      phoneNumber: donation.userProfile?.phoneNumber || null,
      downloadId: donation.downloadId
    });
    
    // Convert to JSON
    const jsonData = JSON.stringify(donationIndex, null, 2);
    
    // Upload to Vercel Blob
    const blob = await put('donations/index.json', jsonData, {
      contentType: 'application/json',
      access: 'public',
    });
    
    console.log(`✅ Donation index updated at: ${blob.url}`);
    return blob;
  } catch (error) {
    console.error('Error updating donation index:', error);
    console.log('Continuing without updating index');
  }
}
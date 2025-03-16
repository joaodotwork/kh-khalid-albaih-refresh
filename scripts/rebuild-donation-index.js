#!/usr/bin/env node

/**
 * This script rebuilds the donation index by scanning all donation files
 * It fixes missing fields in the index, including transaction status
 */

import('dotenv').then(dotenv => dotenv.config());
import('@vercel/blob').then(({ list, put, getDownloadUrl }) => {
  main(list, put, getDownloadUrl).catch(err => {
    console.error('Script error:', err);
    process.exit(1);
  });
});

/**
 * Main function that rebuilds the donation index
 */
async function main(list, put, getDownloadUrl) {
  try {
    console.log('Rebuilding donation index...');
    
    // Check if BLOB_READ_WRITE_TOKEN is set
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('ERROR: BLOB_READ_WRITE_TOKEN environment variable is not set.');
      console.error('Please add it to your .env file and try again.');
      process.exit(1);
    }
    
    // Get all donation files
    console.log('Listing all donation files...');
    const result = await list({ prefix: 'donations/' });
    
    // Filter to get only actual donation records (not index or other files)
    const donationBlobs = result.blobs.filter(b => 
      b.pathname.includes('_') && 
      b.pathname.endsWith('.json') &&
      !b.pathname.includes('index')
    );
    
    console.log(`Found ${donationBlobs.length} donation files`);
    
    // Process each donation file
    const donations = [];
    for (const blob of donationBlobs) {
      try {
        console.log(`Processing ${blob.pathname}...`);
        
        // Get the donation data
        const url = blob.url;
        const response = await fetch(url);
        if (!response.ok) {
          console.error(`  Failed to fetch ${blob.pathname}: ${response.status} ${response.statusText}`);
          continue;
        }
        
        // Parse the donation data
        const donationRecord = await response.json();
        
        // Create the index entry
        donations.push({
          reference: donationRecord.reference,
          amount: donationRecord.amount,
          currency: donationRecord.currency,
          timestamp: donationRecord.timestamp,
          status: donationRecord.status || 'UNKNOWN', // Ensure status is included
          name: donationRecord.userProfile?.name || null,
          email: donationRecord.userProfile?.email || null,
          phoneNumber: donationRecord.userProfile?.phoneNumber || null,
          downloadId: donationRecord.downloadId
        });
        
        console.log(`  Added ${donationRecord.reference} to index with status: ${donationRecord.status || 'UNKNOWN'}`);
      } catch (error) {
        console.error(`  Error processing ${blob.pathname}:`, error);
      }
    }
    
    // Sort donations by timestamp (newest first)
    donations.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
    
    // Create the new index
    const donationIndex = { donations };
    
    // Save the index
    console.log(`Saving new index with ${donations.length} entries...`);
    const blob = await put(
      'donations/index.json',
      JSON.stringify(donationIndex, null, 2),
      {
        contentType: 'application/json',
        access: 'public'
      }
    );
    
    console.log(`Donation index rebuilt successfully and saved to ${blob.url}`);
    
  } catch (error) {
    console.error('Error rebuilding donation index:', error);
    process.exit(1);
  }
}
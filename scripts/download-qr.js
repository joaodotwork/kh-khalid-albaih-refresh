#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');

// Read the QR metadata from the saved file
const metadataPath = path.join(__dirname, '../public/qr-metadata.json');

if (!fs.existsSync(metadataPath)) {
  console.error('Error: QR metadata file not found.');
  console.error('Please run generate-qr.js first to create the QR code metadata.');
  process.exit(1);
}

const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
const qrUrl = metadata.url;

if (!qrUrl) {
  console.error('Error: QR URL not found in metadata file.');
  process.exit(1);
}

console.log(`Downloading QR code SVG from: ${qrUrl}`);

// Setup the download path
const downloadPath = path.join(__dirname, '../public/static-qr-code.svg');

// Create a file write stream
const fileStream = fs.createWriteStream(downloadPath);

// Download the file
https.get(qrUrl, (response) => {
  if (response.statusCode !== 200) {
    console.error(`Failed to download the QR code: ${response.statusCode} ${response.statusMessage}`);
    fs.unlinkSync(downloadPath); // Delete the file if download fails
    process.exit(1);
  }

  // Pipe the response to a file
  response.pipe(fileStream);

  fileStream.on('finish', () => {
    fileStream.close();
    console.log(`Successfully downloaded QR code SVG to: ${downloadPath}`);
    console.log('\nNext steps:');
    console.log('1. Update the QRCodeDisplay component to use this image');
  });
}).on('error', (err) => {
  console.error(`Error downloading QR code: ${err.message}`);
  fs.unlinkSync(downloadPath); // Delete the file if download fails
  process.exit(1);
});
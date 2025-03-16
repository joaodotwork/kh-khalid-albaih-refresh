#!/usr/bin/env node

/**
 * This script creates a sample PDF artwork file and uploads it to Vercel Blob Storage
 * Run this script to set up the demo artwork file needed for downloads
 * 
 * Usage:
 *   node scripts/upload-sample-artwork.js
 */

// Use dynamic imports since pdf-lib is ESM
import('dotenv').then(dotenv => dotenv.config());
import('fs').then(fs => {
  import('path').then(path => {
    import('@vercel/blob').then(({ put }) => {
      import('pdf-lib').then(({ PDFDocument, rgb, StandardFonts }) => {
        main(fs, path, put, { PDFDocument, rgb, StandardFonts }).catch(err => {
          console.error('Script error:', err);
          process.exit(1);
        });
      });
    });
  });
});

async function main(fs, path, put, { PDFDocument, rgb, StandardFonts }) {
  try {
    console.log('Creating sample artwork PDF...');
    
    // Create a temporary directory for the sample file
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Generate a sample PDF file
    const pdfPath = await createSamplePDF(tempDir, fs, path, { PDFDocument, rgb, StandardFonts });
    
    console.log(`Sample PDF created at: ${pdfPath}`);
    
    // Upload the file to Vercel Blob Storage
    const blobName = 'artwork/khalid-albaih-digital-artwork.pdf';
    
    console.log(`Uploading to Vercel Blob as: ${blobName}`);
    
    // Check if BLOB_READ_WRITE_TOKEN is set
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('ERROR: BLOB_READ_WRITE_TOKEN environment variable is not set.');
      console.error('Please add it to your .env file and try again.');
      process.exit(1);
    }
    
    // Upload to Vercel Blob
    const blob = await put(blobName, fs.createReadStream(pdfPath), {
      access: 'public',
      contentType: 'application/pdf',
    });
    
    console.log('\n✅ Artwork successfully uploaded to Vercel Blob!');
    console.log(`URL: ${blob.url}`);
    
    // Clean up the temporary file
    fs.unlinkSync(pdfPath);
    console.log('Temporary file cleaned up');
    
    console.log('\nThe artwork is now ready to be served from the download endpoint.');
    
  } catch (error) {
    console.error('Error uploading sample artwork:', error);
    process.exit(1);
  }
}

/**
 * Creates a sample PDF file with some text
 */
async function createSamplePDF(tempDir, fs, path, { PDFDocument, rgb, StandardFonts }) {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  const { width, height } = page.getSize();
  
  // Get the font
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Add title
  page.drawText('Khalid Albaih - Digital Artwork', {
    x: 50,
    y: height - 50,
    size: 24,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  
  // Add subtitle
  page.drawText('Exclusive artwork for supporters', {
    x: 50,
    y: height - 80,
    size: 14,
    font: font,
    color: rgb(0.3, 0.3, 0.3),
  });
  
  // Add a message
  page.drawText('Thank you for your support!', {
    x: 50,
    y: height - 130,
    size: 12,
    font: font,
    color: rgb(0, 0, 0),
  });
  
  page.drawText('This is a sample digital artwork that will be replaced', {
    x: 50,
    y: height - 160,
    size: 12,
    font: font,
    color: rgb(0, 0, 0),
  });
  
  page.drawText('with the actual artwork in production.', {
    x: 50,
    y: height - 180,
    size: 12,
    font: font,
    color: rgb(0, 0, 0),
  });
  
  // Add a footer
  page.drawText('© Khalid Albaih - For personal use only - Not for redistribution', {
    x: 50,
    y: 50,
    size: 10,
    font: font,
    color: rgb(0.5, 0.5, 0.5),
  });
  
  // Save the PDF
  const pdfBytes = await pdfDoc.save();
  const filePath = path.join(tempDir, 'sample-artwork.pdf');
  
  fs.writeFileSync(filePath, pdfBytes);
  
  return filePath;
}
#!/usr/bin/env node

/**
 * This script sets up ngrok tunneling for local development with Vipps integration
 * It starts a tunnel and updates .env with the correct public URL for callbacks
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Port your Next.js app is running on
const PORT = 3000;

// Check if ngrok is installed
try {
  console.log('Checking for ngrok installation...');
  execSync('ngrok --version', { stdio: 'ignore' });
  console.log('✅ ngrok is installed');
} catch (error) {
  console.error('❌ ngrok is not installed. Please install it first:');
  console.error('npm install -g ngrok   or   brew install ngrok');
  process.exit(1);
}

// Start ngrok
console.log(`\n🚀 Starting ngrok tunnel to localhost:${PORT}...`);
const ngrok = spawn('ngrok', ['http', PORT]);

// Variable to store the public URL
let publicUrl = null;

// Get ngrok public URL using the API instead of parsing stdout
// This is more reliable across different ngrok versions
function checkNgrokUrl() {
  console.log('Checking for ngrok tunnel URL...');
  
  // Try to get the tunnel URL from ngrok's API
  const http = require('http');
  const options = {
    hostname: 'localhost',
    port: 4040,  // ngrok web interface port
    path: '/api/tunnels',
    method: 'GET'
  };
  
  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const tunnels = JSON.parse(data);
        if (tunnels && tunnels.tunnels && tunnels.tunnels.length > 0) {
          // Find the HTTPS tunnel
          const httpsTunnel = tunnels.tunnels.find(t => t.proto === 'https');
          if (httpsTunnel && httpsTunnel.public_url) {
            publicUrl = httpsTunnel.public_url;
            console.log(`Found ngrok tunnel: ${publicUrl}`);
            updateEnvFile(publicUrl);
          } else {
            console.log('No HTTPS tunnel found, retrying in 1 second...');
            setTimeout(checkNgrokUrl, 1000);
          }
        } else {
          console.log('No tunnels found, retrying in 1 second...');
          setTimeout(checkNgrokUrl, 1000);
        }
      } catch (error) {
        console.error('Error parsing ngrok API response:', error);
        setTimeout(checkNgrokUrl, 1000);
      }
    });
  });
  
  req.on('error', (error) => {
    console.log('Waiting for ngrok to start...');
    setTimeout(checkNgrokUrl, 1000);
  });
  
  req.end();
}

// Start checking for the URL after a short delay to allow ngrok to start
setTimeout(checkNgrokUrl, 2000);

// Also log ngrok output for debugging
ngrok.stdout.on('data', (data) => {
  console.log(data.toString());
});

ngrok.stderr.on('data', (data) => {
  console.error(`ngrok error: ${data}`);
});

ngrok.on('close', (code) => {
  console.log(`ngrok process exited with code ${code}`);
});

// Update .env file with the public URL
function updateEnvFile(url) {
  console.log(`\n✨ Ngrok tunnel established at: ${url}`);
  
  try {
    const envPath = path.join(process.cwd(), '.env');
    
    if (!fs.existsSync(envPath)) {
      console.error('❌ .env file not found! Creating a new one.');
      fs.writeFileSync(envPath, `NEXT_PUBLIC_BASE_URL=${url}\n`);
      console.log('✅ Created new .env file with BASE_URL');
      return;
    }
    
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Replace or add BASE_URL
    if (envContent.includes('NEXT_PUBLIC_BASE_URL=')) {
      envContent = envContent.replace(
        /NEXT_PUBLIC_BASE_URL=.*/,
        `NEXT_PUBLIC_BASE_URL=${url}`
      );
    } else {
      envContent += `\nNEXT_PUBLIC_BASE_URL=${url}\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Updated .env file with new BASE_URL');
    
    console.log('\n⚠️  IMPORTANT: You need to restart your Next.js server to apply these changes!');
    console.log('\n📋 Manual Steps:');
    console.log('1. Stop your current Next.js server (Ctrl+C)');
    console.log('2. Run: npm run dev');
    console.log('3. Test your Vipps integration with the new public URL');
    
    console.log('\n💡 Your callback URLs are now:');
    console.log(`${url}/api/vipps-callback`);
    console.log(`${url}/download/:id`);
    
    console.log('\n⚠️  This terminal is now running the tunnel. Keep it open during testing.');
    console.log('Press Ctrl+C to stop the tunnel when you\'re done.');
    
  } catch (error) {
    console.error('❌ Error updating .env file:', error);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down ngrok tunnel...');
  ngrok.kill();
  process.exit();
});
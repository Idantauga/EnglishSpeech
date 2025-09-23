const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Function to run a command and log output
function runCommand(command, cwd) {
  console.log(`Running: ${command} in ${cwd || 'current directory'}`);
  try {
    execSync(command, { 
      stdio: 'inherit', 
      cwd: cwd || process.cwd() 
    });
    return true;
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error);
    return false;
  }
}

// Main build function
async function build() {
  console.log('Starting build process...');
  
  // Install dependencies in client directory
  console.log('\n--- Installing client dependencies ---');
  if (!runCommand('npm install', path.join(process.cwd(), 'client'))) {
    process.exit(1);
  }
  
  // Build client
  console.log('\n--- Building client ---');
  if (!runCommand('CI=false npm run build', path.join(process.cwd(), 'client'))) {
    process.exit(1);
  }
  
  // Install dependencies in api directory
  console.log('\n--- Installing API dependencies ---');
  if (!runCommand('npm install', path.join(process.cwd(), 'api'))) {
    process.exit(1);
  }
  
  console.log('\n--- Build completed successfully ---');
}

// Run the build
build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});

const { execSync } = require('child_process');
const path = require('path');

// Change to the client directory
process.chdir(path.resolve(__dirname));

// Run the build command
console.log('Building client application...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('Client build completed successfully!');
} catch (error) {
  console.error('Error building client:', error);
  process.exit(1);
}

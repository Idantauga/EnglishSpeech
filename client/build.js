const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure we're in the client directory
process.chdir(__dirname);

console.log('Starting client build process...');

// Run the build command
try {
  console.log('Building React app...');
  execSync('CI=false npm run build', { stdio: 'inherit' });
  console.log('React build completed successfully!');
  
  // Create a simple index.html in the build directory if it doesn't exist
  const indexPath = path.join(__dirname, 'build', 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.log('Creating fallback index.html...');
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>English Speech Assessment</title>
      </head>
      <body>
        <div id="root"></div>
        <script>
          // Attempt to load the main JS file
          const script = document.createElement('script');
          script.src = './static/js/main.js';
          document.body.appendChild(script);
        </script>
      </body>
      </html>
    `;
    fs.writeFileSync(indexPath, html);
    console.log('Created fallback index.html');
  }
  
  console.log('Build process completed successfully!');
} catch (error) {
  console.error('Error during build:', error);
  process.exit(1);
}

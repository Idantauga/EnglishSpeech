// This file helps Vercel understand the project structure
// It redirects to the appropriate handler based on the request path

// For API requests, use the API handler
export { default as api } from './api/index.js';

// For all other requests, serve the static files
export default function handler(req, res) {
  // Log the request for debugging
  console.log('Root handler received request for:', req.url);
  
  // Redirect to the client's index.html
  res.status(200).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="refresh" content="0;url=/client/build/index.html">
      <title>English Speech Assessment</title>
    </head>
    <body>
      <p>Redirecting to application...</p>
    </body>
    </html>
  `);
}

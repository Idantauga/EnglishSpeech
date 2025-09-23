// This file helps Vercel understand the project structure
// It redirects to the appropriate handler based on the request path

// For API requests, use the API handler
export { default as api } from './api/index.js';

// For all other requests, serve the static files
export default function handler(req, res) {
  res.status(308).setHeader('Location', '/client/build/index.html').end();
}

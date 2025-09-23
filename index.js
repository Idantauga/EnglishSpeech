// This file is a simple redirect to the client build

import { createServer } from 'http';
import { parse } from 'url';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Export the API handler for Vercel to use
export { default as api } from './api/index.js';

// Default handler for the root path
export default function handler(req, res) {
  console.log('Request received for:', req.url);
  
  // Redirect to the client build
  res.writeHead(302, { Location: '/client/build/index.html' });
  res.end();
}

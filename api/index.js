// Import required modules
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';
import FormData from 'form-data';
import axios from 'axios';
import multer from 'multer';

// Configure multer for memory storage (serverless environment)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit for faster processing
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed!'), false);
    }
  }
});

// Error handler for multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large. Maximum size is 15MB.' });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};

// Initialize Express app
const app = express();

// CORS configuration
const corsOptions = {
  origin: '*', // Allow all origins in serverless function
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Content-Length', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Apply CORS middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Simple test endpoint - handle both with and without /api prefix
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from Vercel serverless function!' });
});

app.get('/hello', (req, res) => {
  res.json({ message: 'Hello from Vercel serverless function!' });
});

// Helper function to handle check-english requests
async function handleCheckEnglish(req, res) {
  try {
    // Extract data from request body
    const { question, studyLevel, criteria } = req.body;
    
    console.log('Received form data:', { 
      question, 
      studyLevel,
      hasFile: !!req.file,
      fileName: req.file?.originalname
    });
    
    // Create form data for n8n webhook
    const formData = new FormData();
    
    // Add form fields
    if (question) formData.append('question', question);
    if (studyLevel) formData.append('studyLevel', studyLevel);
    
    // Handle criteria as JSON
    if (criteria) {
      try {
        const criteriaObj = typeof criteria === 'string' ? JSON.parse(criteria) : criteria;
        console.log('Criteria parsed successfully:', criteriaObj);
        formData.append('criteria', JSON.stringify(criteriaObj));
      } catch (e) {
        console.warn('Failed to parse criteria as JSON, sending as-is:', e);
        formData.append('criteria', criteria);
      }
    }
    
    // Check for audio file in request (multer puts it in req.file)
    if (!req.file) {
      console.log('No audio file found in request');
      return res.status(400).json({ error: 'No audio data provided' });
    }
    
    // Add the audio file to formData
    formData.append('audio', req.file.buffer, {
      filename: req.file.originalname || 'recording.wav',
      contentType: req.file.mimetype,
      knownLength: req.file.size
    });
    
    // Generate a unique request ID for tracking
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    // Send immediate acknowledgment to client
    res.json({
      status: 'processing',
      message: 'Your audio is being processed. Results will be available shortly.',
      requestId: requestId
    });
    
    // Forward to n8n webhook (fire and forget)
    const webhookUrl = 'https://tauga.app.n8n.cloud/webhook/english-test';
    console.log(`Sending request ${requestId} to webhook URL:`, webhookUrl);
    
    // Add request ID to form data
    formData.append('requestId', requestId);
    
    // Fire and forget - don't await the response
    axios.post(webhookUrl, formData.getBuffer(), {
      headers: {
        ...formData.getHeaders(),
      },
      maxContentLength: 15 * 1024 * 1024, // 15MB limit
      maxBodyLength: 15 * 1024 * 1024,    // 15MB limit
      timeout: 300000, // 5 minute timeout for the background process
    })
    .then(response => {
      console.log(`Request ${requestId} completed successfully`);
    })
    .catch(error => {
      console.error(`Error processing request ${requestId}:`, error.message);
    });
    
    // Note: We've already sent the response to the client, so this function will complete
    // while the webhook processing continues in the background
  } catch (error) {
    console.error('Error processing request:', error);
    
    res.status(500).json({
      error: 'Failed to process request',
      details: error.message
    });
  }
}

// Handle check-english endpoint - with /api prefix (from client)
app.post('/api/check-english', upload.single('audio'), handleMulterError, async (req, res) => {
  console.log('Received request at /api/check-english');
  handleCheckEnglish(req, res);
});

// Handle check-english endpoint - without /api prefix (from Vercel rewrites)
app.post('/check-english', upload.single('audio'), handleMulterError, async (req, res) => {
  console.log('Received request at /check-english');
  handleCheckEnglish(req, res);
});

// Export the Express API
export default app;

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
    fileSize: 50 * 1024 * 1024, // 50MB limit
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

// Test endpoint that doesn't use the external webhook
app.post('/api/test-upload', upload.single('audio'), async (req, res) => {
  try {
    // Check if we received a file
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Return file information without forwarding to external service
    res.json({
      success: true,
      message: 'File received successfully',
      file: {
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        encoding: req.file.encoding
      },
      body: {
        keys: Object.keys(req.body),
        question: req.body.question,
        studyLevel: req.body.studyLevel
      }
    });
  } catch (error) {
    console.error('Error in test upload:', error);
    res.status(500).json({ error: error.message });
  }
});

// Same endpoint without /api prefix
app.post('/test-upload', upload.single('audio'), async (req, res) => {
  try {
    // Check if we received a file
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Return file information without forwarding to external service
    res.json({
      success: true,
      message: 'File received successfully',
      file: {
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        encoding: req.file.encoding
      },
      body: {
        keys: Object.keys(req.body),
        question: req.body.question,
        studyLevel: req.body.studyLevel
      }
    });
  } catch (error) {
    console.error('Error in test upload:', error);
    res.status(500).json({ error: error.message });
  }
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
    
    console.log(`Processing audio file: ${req.file.originalname}, size: ${req.file.size} bytes, type: ${req.file.mimetype}`);
    
    // Add the audio file to formData - optimize for performance
    try {
      // Add a smaller file size limit for better performance
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      
      if (req.file.size > MAX_FILE_SIZE) {
        return res.status(413).json({ error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.` });
      }
      
      // Add the file to the form data
      formData.append('audio', req.file.buffer, {
        filename: req.file.originalname || 'recording.wav',
        contentType: req.file.mimetype,
        knownLength: req.file.size
      });
    } catch (error) {
      console.error('Error processing audio file:', error);
      return res.status(500).json({ error: 'Failed to process audio file', details: error.message });
    }
    
    // Forward to n8n webhook
    try {
      const webhookUrl = 'https://tauga.app.n8n.cloud/webhook/english-test';
      console.log('Sending to webhook URL:', webhookUrl);
      
      // Set timeout to 50 seconds (just under the 60 second function limit)
      const timeoutMs = 50000;
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), timeoutMs);
      });
      
      // Create the actual request promise
      const requestPromise = axios.post(webhookUrl, formData.getBuffer(), {
        headers: {
          ...formData.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
      
      // Race the request against the timeout
      const response = await Promise.race([requestPromise, timeoutPromise]);
      
      // Forward the response from n8n
      res.json(response.data);
    } catch (error) {
      console.error('Error forwarding request to n8n:', error);
      
      // Check if it's a timeout error
      if (error.message === 'Request timed out') {
        return res.status(504).json({
          error: 'Gateway Timeout',
          message: 'The request to the external service timed out. Please try again with a smaller audio file.',
          details: 'The n8n webhook did not respond within the allowed time limit.'
        });
      }
      
      // Check for axios specific errors
      if (error.isAxiosError) {
        const statusCode = error.response?.status || 500;
        const errorMessage = error.response?.data?.message || error.message;
        
        console.error(`Axios error: ${statusCode} - ${errorMessage}`);
        console.error('Response data:', error.response?.data);
        
        return res.status(statusCode).json({
          error: 'External Service Error',
          message: errorMessage,
          details: `Status code: ${statusCode}`
        });
      }
      
      // Generic error
      res.status(500).json({
        error: 'Failed to forward request to n8n',
        message: error.message,
        details: error.stack?.split('\n')[0] || 'No stack trace available'
      });
    }
  } catch (error) {
    console.error('Error processing request:', error);
    
    res.status(500).json({
      error: 'Failed to process request',
      details: error.message
    });
  }
}

// Handle check-english endpoint - with /api prefix (from client)
app.post('/api/check-english', upload.single('audio'), async (req, res) => {
  console.log('Received request at /api/check-english');
  handleCheckEnglish(req, res);
});

// Handle check-english endpoint - without /api prefix (from Vercel rewrites)
app.post('/check-english', upload.single('audio'), async (req, res) => {
  console.log('Received request at /check-english');
  handleCheckEnglish(req, res);
});

// Export the Express API
export default app;

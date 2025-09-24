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
    
    // Forward to n8n webhook
    try {
      const webhookUrl = 'https://tauga.app.n8n.cloud/webhook/english-test';
      console.log('Sending to webhook URL:', webhookUrl);
      
      // Use formData.getBuffer() to get the raw form data with proper headers
      const response = await axios.post(webhookUrl, formData.getBuffer(), {
        headers: {
          ...formData.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
      
      // Forward the response from n8n
      res.json(response.data);
    } catch (error) {
      console.error('Error forwarding request to n8n:', error);
      
      res.status(500).json({
        error: 'Failed to forward request to n8n',
        details: error.message
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

// Handle form submission with audio file - with /api prefix (from client)
app.post('/api/check-english', (req, res) => {
  console.log('Received request at /api/check-english');
  const uploadHandler = upload.single('audio');
  
  uploadHandler(req, res, async (err) => {
    try {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: 'File too large. Maximum size is 50MB.' });
        } else if (err.message === 'Only audio files are allowed!') {
          return res.status(400).json({ error: 'Only audio files are allowed' });
        }
        throw err;
      }
      
      // Get form fields from the request body
      const { question, studyLevel, criteria } = req.body;
      const audioFile = req.file;
      
      console.log('Received form data:', {
        question,
        studyLevel,
        audioFile: audioFile ? `${audioFile.originalname} (${audioFile.size} bytes)` : 'Not provided'
      });
      
      if (!audioFile) {
        return res.status(400).json({ error: 'No audio file provided' });
      }

      // Create form data for n8n webhook
      const formData = new FormData();
      
      // Add the audio file buffer to form data
      formData.append('audio', audioFile.buffer, {
        filename: audioFile.originalname || 'recording.wav',
        contentType: audioFile.mimetype,
        knownLength: audioFile.size
      });
      
      // Add other form fields
      if (question) formData.append('question', question);
      if (studyLevel) formData.append('studyLevel', studyLevel);
      
      // Handle criteria as JSON
      if (criteria) {
        try {
          // Verify it's valid JSON by parsing and stringifying again
          const criteriaObj = JSON.parse(criteria);
          console.log('Criteria parsed successfully:', criteriaObj);
          formData.append('criteria', JSON.stringify(criteriaObj));
        } catch (e) {
          console.warn('Failed to parse criteria as JSON, sending as-is:', e);
          formData.append('criteria', criteria);
        }
      }

      console.log('Forwarding request to n8n webhook...');
      
      // Forward to n8n webhook
      try {
        const webhookUrl = 'https://tauga.app.n8n.cloud/webhook/english-test';
        console.log('Sending to webhook URL:', webhookUrl);
        
        // Use formData.getBuffer() to get the raw form data with proper headers
        const response = await axios.post(webhookUrl, formData.getBuffer(), {
          headers: {
            ...formData.getHeaders(),
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        });

        // Forward the response from n8n
        res.json(response.data);
      } catch (error) {
        console.error('Error forwarding request to n8n:', error);
        
        res.status(500).json({
          error: 'Failed to forward request to n8n',
          details: error.message
        });
      }
    } catch (error) {
      console.error('Error processing request:', error);
      
      res.status(500).json({
        error: 'Failed to process request',
        details: error.message
      });
    }
  });
});

// Handle form submission with audio file - without /api prefix (from Vercel rewrites)
app.post('/check-english', (req, res) => {
  console.log('Received request at /check-english');
  const uploadHandler = upload.single('audio');
  
  uploadHandler(req, res, async (err) => {
    try {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: 'File too large. Maximum size is 50MB.' });
        } else if (err.message === 'Only audio files are allowed!') {
          return res.status(400).json({ error: 'Only audio files are allowed' });
        }
        throw err;
      }
      
      // Get form fields from the request body
      const { question, studyLevel, criteria } = req.body;
      const audioFile = req.file;
      
      console.log('Received form data:', {
        question,
        studyLevel,
        audioFile: audioFile ? `${audioFile.originalname} (${audioFile.size} bytes)` : 'Not provided'
      });
      
      if (!audioFile) {
        return res.status(400).json({ error: 'No audio file provided' });
      }

      // Create form data for n8n webhook
      const formData = new FormData();
      
      // Add the audio file buffer to form data
      formData.append('audio', audioFile.buffer, {
        filename: audioFile.originalname || 'recording.wav',
        contentType: audioFile.mimetype,
        knownLength: audioFile.size
      });
      
      // Add other form fields
      if (question) formData.append('question', question);
      if (studyLevel) formData.append('studyLevel', studyLevel);
      
      // Handle criteria as JSON
      if (criteria) {
        try {
          // Verify it's valid JSON by parsing and stringifying again
          const criteriaObj = JSON.parse(criteria);
          console.log('Criteria parsed successfully:', criteriaObj);
          formData.append('criteria', JSON.stringify(criteriaObj));
        } catch (e) {
          console.warn('Failed to parse criteria as JSON, sending as-is:', e);
          formData.append('criteria', criteria);
        }
      }

      console.log('Forwarding request to n8n webhook...');
      
      // Forward to n8n webhook
      try {
        const webhookUrl = 'https://tauga.app.n8n.cloud/webhook/english-test';
        console.log('Sending to webhook URL:', webhookUrl);
        
        // Use formData.getBuffer() to get the raw form data with proper headers
        const response = await axios.post(webhookUrl, formData.getBuffer(), {
          headers: {
            ...formData.getHeaders(),
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        });

        // Forward the response from n8n
        res.json(response.data);
      } catch (error) {
        console.error('Error forwarding request to n8n:', error);
        
        res.status(500).json({
          error: 'Failed to forward request to n8n',
          details: error.message
        });
      }
    } catch (error) {
      console.error('Error processing request:', error);
      
      res.status(500).json({
        error: 'Failed to process request',
        details: error.message
      });
    }
  });
});

// Export the Express API
export default app;

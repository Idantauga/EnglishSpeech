import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import FormData from 'form-data';
import axios from 'axios';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Configure multer with file size limits and file filter
const upload = multer({
  dest: 'uploads/',
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

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Content-Length', 'X-Requested-With'],
  credentials: true,
  preflightContinue: true
}));

// Handle preflight requests
app.options('*', cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// API Routes
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from Vercel backend!' });
});

// Handle form submission with audio file
app.post('/api/check-english', (req, res) => {
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
      const { question, studyLevel } = req.body;
      const audioFile = req.file;

      if (!audioFile) {
        return res.status(400).json({ error: 'No audio file provided' });
      }

      // Create form data for n8n webhook
      const formData = new FormData();
      
      // Read the file into a buffer
      const fileBuffer = fs.readFileSync(audioFile.path);
      
      // Match the structure used in Tauga AI project
      formData.append('audio', fileBuffer, {
        filename: 'recording.wav',
        contentType: audioFile.mimetype,
        knownLength: fileBuffer.length
      });
      
      // Add other form fields
      if (question) formData.append('question', question);
      if (studyLevel) formData.append('studyLevel', studyLevel);

      console.log('Forwarding request to n8n webhook...');
      
      // Log form data fields (compatible with Node.js)
      console.log('Form data fields:', ['audio', 'question', 'studyLevel']);
      
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

        // Clean up the uploaded file
        fs.unlinkSync(audioFile.path);

        // Forward the response from n8n
        res.json(response.data);
      } catch (error) {
        console.error('Error forwarding request to n8n:', error);
        
        // Clean up the uploaded file in case of error
        if (req.file?.path) {
          try {
            fs.unlinkSync(req.file.path);
          } catch (e) {
            console.error('Error cleaning up file:', e);
          }
        }
        
        res.status(500).json({
          error: 'Failed to forward request to n8n',
          details: error.message
        });
      }
    } catch (error) {
      console.error('Error processing request:', error);
      
      // Clean up the uploaded file in case of error
      if (req.file?.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          console.error('Error cleaning up file:', e);
        }
      }
      
      res.status(500).json({
        error: 'Failed to process request',
        details: error.message
      });
    }
  });
});

// For local development
const PORT = process.env.PORT || 5001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;

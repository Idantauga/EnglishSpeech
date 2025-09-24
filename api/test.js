// Simple test file to verify API functionality
export default function handler(req, res) {
  res.status(200).json({ 
    message: 'API is working correctly!',
    timestamp: new Date().toISOString()
  });
}

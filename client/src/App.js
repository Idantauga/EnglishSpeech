import React, { useState, useEffect } from 'react';
import './App.css';
import {
  Container,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Slider,
  Grid,
  Paper
} from '@mui/material';
import AudioInputModal from './components/AudioInputModal';
import ProcessingModal from './components/ProcessingModal';
import AssessmentResults from './components/AssessmentResults';

function App() {
  const [question, setQuestion] = useState('');
  const [isCustomQuestion, setIsCustomQuestion] = useState(true);
  const [questionError, setQuestionError] = useState('');
  const [studentLevel, setStudentLevel] = useState('3 Units');
  
  // Preset questions
  const presetQuestions = [
    "Talk about your dream vacation.",
    "Tell me about yourself.",
    "Describe your best friend and his hobbies."
  ];
  const [parameters, setParameters] = useState([
    { id: 1, name: 'Vocabulary', description: 'Richness and appropriateness of vocabulary', weight: 1 },
    { id: 2, name: 'Clarity', description: 'Clarity of expression', weight: 1 },
    { id: 3, name: 'Fluency', description: 'Fluency and flow of speech', weight: 1 },
    { id: 4, name: 'Grammar', description: 'Grammar and syntax correctness', weight: 1 }
  ]);
  
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [audioURL, setAudioURL] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [assessmentResults, setAssessmentResults] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [requestId, setRequestId] = useState(null);

  const handleWeightChange = (id, value) => {
    const newValue = Math.max(0, parseInt(value) || 0);
    setParameters(parameters.map(param => 
      param.id === id ? { ...param, weight: newValue } : param
    ));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate question field
    if (!question.trim()) {
      setQuestionError('Please enter a question or select a preset question');
      return;
    }
    
    // Clear any previous error
    setQuestionError('');
    
    // Open audio modal
    setShowAudioModal(true);
  };
  
  // Handle question type toggle
  const handleQuestionTypeChange = (isCustom) => {
    setIsCustomQuestion(isCustom);
    setQuestion(''); // Clear the question when switching types
    setQuestionError('');
  };
  
  // Handle preset question selection
  const handlePresetQuestionChange = (e) => {
    setQuestion(e.target.value);
    setQuestionError('');
  };

  const handleAudioSubmit = async (file, fileURL) => {
    // Store any active polling interval
    let pollInterval;
    
    try {
      setAudioURL(fileURL);
      setIsSubmitting(true);
      setShowResults(false);
      
      // Create FormData and append fields
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('question', question);
      formData.append('studyLevel', studentLevel);
      
      // Add criteria and weights as properly formatted JSON
      const criteriaData = parameters.map(param => ({
        name: param.name,
        description: param.description,
        weight: param.weight
      }));
      
      // Convert to JSON string and append to form data
      formData.append('criteria', JSON.stringify(criteriaData));
      
      // For production, use /api/check-english directly
      // For development, use the full URL with port
      const endpoint = process.env.NODE_ENV === 'production' 
        ? '/api/check-english'
        : 'http://localhost:5001/api/check-english';
      
      console.log('Submitting form with data:', {
        question,
        studyLevel: studentLevel,
        criteria: criteriaData,
        file: { name: file.name, size: file.size, type: file.type },
        endpoint
      });
      
      // Log form data entries for debugging
      for (let [key, value] of formData.entries()) {
        console.log(key, value);
      }

      // Make the actual request
      let response;
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
          // Let the browser set the Content-Type with the correct boundary
          headers: {
            'Accept': 'application/json',
          },
          credentials: 'include' // Include credentials if needed for CORS
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
      } catch (fetchError) {
        console.error('Fetch error:', fetchError);
        throw new Error(`Failed to send request to server: ${fetchError.message}`);
      }
      
      let result;
      try {
        const responseText = await response.text();
        console.log('Raw response:', responseText);
        result = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        throw new Error('Invalid response from server');
      }
      
      if (!response.ok) {
        console.error('Server error response:', {
          status: response.status,
          statusText: response.statusText,
          result
        });
        
        // If we get a 504 Gateway Timeout, try to call the webhook directly
        if (response.status === 504) {
          console.log('Backend timed out, attempting direct webhook call...');
          setShowAudioModal(false);
          setIsProcessing(true);
          
          // Create a new FormData for the direct webhook call
          const webhookFormData = new FormData();
          webhookFormData.append('audio', file);
          webhookFormData.append('question', question);
          webhookFormData.append('studyLevel', studentLevel);
          
          // Add criteria
          const criteriaData = parameters.map(param => ({
            name: param.name,
            description: param.description,
            weight: param.weight
          }));
          webhookFormData.append('criteria', JSON.stringify(criteriaData));
          
          // Call the webhook directly
          try {
            const webhookUrl = 'https://tauga.app.n8n.cloud/webhook/english-test';
            console.log('Calling webhook directly:', webhookUrl);
            
            // Make the request
            const webhookResponse = await fetch(webhookUrl, {
              method: 'POST',
              body: webhookFormData
            });
            
            if (webhookResponse.ok) {
              const webhookResult = await webhookResponse.json();
              console.log('Direct webhook response:', webhookResult);
              
              // Process the webhook response
              const webhookData = Array.isArray(webhookResult) ? webhookResult[0] : webhookResult;
              if (webhookData && webhookData.output) {
                setAssessmentResults(webhookData);
                setIsProcessing(false);
                setShowResults(true);
                return; // Exit early since we've handled the response
              }
            } else {
              console.error('Direct webhook call failed:', webhookResponse.status);
              throw new Error(`Webhook call failed: ${webhookResponse.status}`);
            }
          } catch (webhookError) {
            console.error('Error calling webhook directly:', webhookError);
            throw new Error(`Failed to process your audio: ${webhookError.message}`);
          }
        }
        
        // If we get here, either it wasn't a 504 error or the direct webhook call also failed
        throw new Error(result.error || `Server error: ${response.status} ${response.statusText}`);
      }
      
      // Handle different response formats
      const responseData = Array.isArray(result) ? result[0] : result;
      console.log('Response data:', responseData);
      
      if (responseData && responseData.status === 'processing') {
        // This is a processing acknowledgment
        console.log('Processing started with request ID:', responseData.requestId);
        setRequestId(responseData.requestId);
        setShowAudioModal(false);
        setIsProcessing(true);
        
        // Start polling for results
        pollInterval = setInterval(async () => {
          try {
            console.log('Polling for results...');
            const statusEndpoint = process.env.NODE_ENV === 'production'
              ? `/api/status?requestId=${responseData.requestId}`
              : `http://localhost:5001/api/status?requestId=${responseData.requestId}`;
            
            const statusResponse = await fetch(statusEndpoint);
            
            if (statusResponse.ok) {
              const statusResult = await statusResponse.json();
              console.log('Status check result:', statusResult);
              
              if (statusResult && statusResult.output) {
                // We have results!
                clearInterval(pollInterval);
                setAssessmentResults(statusResult);
                setIsProcessing(false);
                setShowResults(true);
              }
            } else {
              console.warn('Status check failed:', statusResponse.status);
            }
          } catch (pollError) {
            console.error('Error polling for results:', pollError);
          }
        }, 3000); // Poll every 3 seconds
        
        // Set a timeout to stop polling after 30 seconds
        setTimeout(() => {
          clearInterval(pollInterval);
          if (isProcessing) {
            // If we're still processing after 30 seconds, show a timeout message
            setIsProcessing(false);
            alert('Processing is taking longer than expected. Please try again with a shorter audio file.');
          }
        }, 30000);
        
      } else if (responseData && responseData.output) {
        // This is a direct result
        setAssessmentResults(responseData);
        setShowAudioModal(false);
        setShowResults(true);
        
        // Log the structured data
        console.log('Assessment:', responseData.output.assessment);
        console.log('Feedback:', responseData.output.feedback);
      } else {
        console.warn('Unexpected response format:', result);
        throw new Error('Invalid response format from server');
      }
      
    } catch (error) {
      console.error('Error submitting form:', error);
      alert(`Error: ${error.message}`);
      setShowAudioModal(false); // Close the audio modal on error
      setIsProcessing(false); // Reset processing state on error
      
      // Clear any polling interval
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        {/* Empty header or add a subtle logo if needed */}
      </header>

      <main className="app-main">
        <form onSubmit={handleSubmit} className="check-form">
          <div className="form-header">
            <h1>English AI Check</h1>
            <p>Check your English with AI</p>
          </div>
          <div className="form-group">
            <label>What question was asked?</label>
            
            <div className="question-type-toggle">
              <button 
                type="button"
                className={`toggle-btn ${isCustomQuestion ? 'active' : ''}`}
                onClick={() => handleQuestionTypeChange(true)}
              >
                Custom Question
              </button>
              <button 
                type="button"
                className={`toggle-btn ${!isCustomQuestion ? 'active' : ''}`}
                onClick={() => handleQuestionTypeChange(false)}
              >
                Preset Questions
              </button>
            </div>
            
            {isCustomQuestion ? (
              <input
                type="text"
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Type the question here..."
                className={`question-input ${questionError ? 'error' : ''}`}
                required
              />
            ) : (
              <select 
                className={`question-select ${questionError ? 'error' : ''}`}
                value={question}
                onChange={handlePresetQuestionChange}
                required
              >
                <option value="">-- Select a question --</option>
                {presetQuestions.map((q, index) => (
                  <option key={index} value={q}>{q}</option>
                ))}
              </select>
            )}
            
            {questionError && <div className="error-message">{questionError}</div>}
          </div>

          <div className="form-group">
            <label>Student level</label>
            <div className="radio-group">
              {['3 Units', '4 Units', '5 Units'].map(unit => (
                <label key={unit} className="radio-label">
                  <input
                    type="radio"
                    name="studentLevel"
                    checked={studentLevel === unit}
                    onChange={() => setStudentLevel(unit)}
                  />
                  <span className="radio-custom"></span>
                  {unit}
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Parameters to check</label>
            <div className="parameters-list">
              {parameters.map(param => (
                <div key={param.id} className="parameter-item">
                  <div className="parameter-info">
                    <div className="parameter-name">{param.name}</div>
                    <div className="parameter-desc">{param.description}</div>
                  </div>
                  <div className="parameter-weight">
                    <span className="weight-label">Weight:</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={param.weight}
                      onChange={(e) => handleWeightChange(param.id, e.target.value)}
                      className="weight-input"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="submit-btn">
              Check English
            </button>
          </div>
        </form>
      </main>

      <AudioInputModal 
        isOpen={showAudioModal}
        onClose={() => !isSubmitting && setShowAudioModal(false)}
        onSubmit={handleAudioSubmit}
        isSubmitting={isSubmitting}
      />
      
      <ProcessingModal
        isOpen={isProcessing}
        onClose={() => setIsProcessing(false)}
        requestId={requestId}
      />
      
      <AssessmentResults 
        open={showResults} 
        onClose={() => setShowResults(false)} 
        results={assessmentResults}
        audioURL={audioURL}
        question={question}
      />
    </div>
  );
}

export default App;

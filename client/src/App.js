import { useState, useRef, useEffect } from 'react';
import './App.css';
import AssessmentResults from './components/AssessmentResults';

// Constants for audio duration limits (in seconds)
const MIN_DURATION = 20;
const MAX_DURATION = 90; // 1 minute 30 seconds

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
  
  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [audioURL, setAudioURL] = useState('');
  const [audioDuration, setAudioDuration] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [durationError, setDurationError] = useState('');
  
  // Results and submission states
  const [showResults, setShowResults] = useState(false);
  const [assessmentResults, setAssessmentResults] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Audio recording refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const handleWeightChange = (id, value) => {
    const newValue = Math.max(0, parseInt(value) || 0);
    setParameters(parameters.map(param => 
      param.id === id ? { ...param, weight: newValue } : param
    ));
  };

  // Format time in MM:SS format with safety checks
  const formatTime = (seconds) => {
    // Handle invalid inputs
    if (seconds === undefined || seconds === null || isNaN(seconds) || !isFinite(seconds)) {
      return '0:00';
    }
    
    // Ensure seconds is a number
    const sec = Math.max(0, Math.round(Number(seconds)));
    const minutes = Math.floor(sec / 60);
    const remainingSeconds = sec % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  // Audio recording functions
  const startRecording = async () => {
    try {
      // Clean up any previous recording
      if (audioURL) {
        URL.revokeObjectURL(audioURL); // Free up memory by revoking previous URL
      }
      
      // Reset all states
      setRecordingTime(0);
      setDurationError('');
      setAudioDuration(0);
      setSelectedFile(null);
      setAudioURL('');
      
      // Get audio stream with better quality options
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Create new MediaRecorder with mime type optimized for playback navigation
      let options = {};
      
      // Try different formats in order of preference for better playback control
      // MP3 is best for playback navigation but not always supported
      if (MediaRecorder.isTypeSupported('audio/mp3')) {
        options = { mimeType: 'audio/mp3' };
        console.log('Using audio/mp3 format for recording');
      } else if (MediaRecorder.isTypeSupported('audio/mpeg')) {
        options = { mimeType: 'audio/mpeg' };
        console.log('Using audio/mpeg format for recording');
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        options = { mimeType: 'audio/wav' };
        console.log('Using audio/wav format for recording');
      } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=pcm')) {
        options = { mimeType: 'audio/webm;codecs=pcm' }; // Uncompressed audio for better seeking
        console.log('Using audio/webm;codecs=pcm format for recording');
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
        console.log('Using audio/webm format for recording');
      } else {
        console.log('Using default recording format');
      }
      
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      audioChunksRef.current = [];

      // Handle data available event - request data more frequently
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Handle recording stop event with error handling
      mediaRecorderRef.current.onstop = () => {
        try {
          // Create audio blob and URL with proper MIME type handling
          let mimeType = mediaRecorderRef.current.mimeType || '';
          let fileExtension = 'webm'; // Default extension
          
          // Determine the correct file extension based on MIME type
          if (mimeType.includes('mp3') || mimeType.includes('mpeg')) {
            fileExtension = 'mp3';
            // Ensure we're using the correct MIME type for MP3
            mimeType = 'audio/mpeg';
          } else if (mimeType.includes('wav')) {
            fileExtension = 'wav';
            mimeType = 'audio/wav';
          } else if (mimeType.includes('webm')) {
            fileExtension = 'webm';
            mimeType = 'audio/webm';
          }
          
          console.log('Creating blob with MIME type:', mimeType);
          
          // Create the blob with the correct MIME type
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          const audioUrl = URL.createObjectURL(audioBlob);
          const file = new File([audioBlob], `recording.${fileExtension}`, { type: mimeType });
          
          // Log file details for debugging
          console.log('Created audio file:', {
            name: file.name,
            type: file.type,
            size: Math.round(file.size / 1024) + 'KB'
          });
          
          // Get the final recording time - ensure it's a valid number
          let finalDuration = 0;
          if (typeof recordingTime === 'number' && isFinite(recordingTime) && recordingTime > 0) {
            finalDuration = recordingTime;
          }
          
          console.log('Setting audio duration to:', finalDuration, 'seconds');
          setAudioDuration(finalDuration);
          
          // Update UI with new audio
          setSelectedFile(file);
          setAudioURL(audioUrl);
          
          // Validate duration here as well
          if (finalDuration < MIN_DURATION) {
            setDurationError(`Recording is too short. Please record at least ${MIN_DURATION} seconds.`);
          } else if (finalDuration > MAX_DURATION) {
            setDurationError(`Recording is too long. Maximum allowed is ${Math.floor(MAX_DURATION/60)}:${MAX_DURATION%60 < 10 ? '0' : ''}${MAX_DURATION%60}.`);
          } else {
            setDurationError('');
          }
          
          console.log('Recording stopped successfully. Duration:', finalDuration, 'seconds');
        } catch (error) {
          console.error('Error processing recording:', error);
          setDurationError('Error processing recording. Please try again.');
        }
      };

      // Start the recorder with very small time slices for better playback navigation
      // Smaller time slices = more data points = better seeking ability
      mediaRecorderRef.current.start(200); // 200ms chunks for smoother playback
      setIsRecording(true);
      
      // Use a more accurate timing approach with Date.now()
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        setRecordingTime(elapsedSeconds);
        
        // Auto-stop if max duration is reached
        if (elapsedSeconds >= MAX_DURATION) {
          stopRecording();
        }
      }, 250); // Update more frequently for smoother display
      
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone. Please check your permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        // Stop the recorder
        mediaRecorderRef.current.stop();
        
        // Stop all audio tracks
        if (mediaRecorderRef.current.stream && mediaRecorderRef.current.stream.getTracks) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
        
        // Stop the timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        
        setIsRecording(false);
        
        // Check if recording is too short
        if (recordingTime < MIN_DURATION) {
          setDurationError(`Recording is too short. Please record at least ${MIN_DURATION} seconds.`);
        } else {
          setDurationError('');
        }
      } catch (error) {
        console.error('Error stopping recording:', error);
        setDurationError('Error stopping recording. Please refresh and try again.');
        setIsRecording(false);
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    
    // Clean up previous recording/file
    if (audioURL) {
      URL.revokeObjectURL(audioURL); // Free up memory by revoking previous URL
    }
    
    // Reset states
    setDurationError('');
    setAudioDuration(0);
    setSelectedFile(null);
    setAudioURL('');
    
    // Check for various MP3 MIME types or file extension
    const isMP3 = file && (
      file.type === 'audio/mp3' || 
      file.type === 'audio/mpeg' || 
      file.type === 'audio/mpeg3' ||
      file.name.toLowerCase().endsWith('.mp3')
    );
    
    if (file && isMP3) {
      console.log('File accepted:', file.name, file.type);
      setSelectedFile(file);
      const newAudioURL = URL.createObjectURL(file);
      setAudioURL(newAudioURL);
      console.log('Created new audio URL for uploaded file:', newAudioURL);
    } else if (file) {
      console.error('Invalid file type:', file.type);
      alert(`Invalid file type: ${file.type}. Please select an MP3 file.`);
    } else {
      alert('Please select an MP3 file');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate question field
    if (!question.trim()) {
      setQuestionError('Please enter a question or select a preset question');
      return;
    }
    
    // Validate audio file
    if (!selectedFile) {
      setDurationError('Please record or upload an audio file');
      return;
    }
    
    // Validate audio duration
    if (audioDuration < MIN_DURATION) {
      setDurationError(`Audio must be at least ${MIN_DURATION} seconds long. Current duration: ${audioDuration} seconds.`);
      return;
    }
    
    if (audioDuration > MAX_DURATION) {
      setDurationError(`Audio must be no longer than ${MAX_DURATION} seconds (${Math.floor(MAX_DURATION/60)}:${MAX_DURATION%60 < 10 ? '0' : ''}${MAX_DURATION%60}). Current duration: ${audioDuration} seconds.`);
      return;
    }
    
    // Clear any previous errors
    setQuestionError('');
    setDurationError('');
    
    // Submit the form
    await handleAudioSubmit();
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

  const handleAudioSubmit = async () => {
    try {
      setIsSubmitting(true);
      setShowResults(false);
      
      // Create FormData and append fields
      const formData = new FormData();
      formData.append('audio', selectedFile);
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
      
      // Direct n8n webhook call - no backend proxy needed!
      const endpoint = 'https://tauga.app.n8n.cloud/webhook/english-test';
      
      /* OLD BACKEND APPROACH (commented out for future reference):
      // For production, use /api/check-english directly
      // For development, use the full URL with port
      const endpoint = process.env.NODE_ENV === 'production' 
        ? '/api/check-english'
        : 'http://localhost:5001/api/check-english';
      */
      
      console.log('Submitting form with data:', {
        question,
        studyLevel: studentLevel,
        criteria: criteriaData,
        file: { name: selectedFile.name, size: selectedFile.size, type: selectedFile.type },
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
          }
          // No credentials needed for n8n webhook
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
        throw new Error(result.error || `Server error: ${response.status} ${response.statusText}`);
      }
      
      // The response is an array with a single object containing the results
      const responseData = Array.isArray(result) ? result[0] : result;
      console.log('Response data:', responseData);
      
      if (responseData && responseData.output) {
        // Store the assessment results
        setAssessmentResults(responseData);
        // Show results
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
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Clean up recorder if active
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
          
          // Stop all audio tracks
          if (mediaRecorderRef.current.stream && mediaRecorderRef.current.stream.getTracks) {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
          }
        } catch (error) {
          console.error('Error cleaning up media recorder:', error);
        }
      }
      
      // Clean up timer if active
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Clean up any object URLs
      if (audioURL) {
        try {
          URL.revokeObjectURL(audioURL);
        } catch (error) {
          console.error('Error revoking URL:', error);
        }
      }
    };
  }, [audioURL]); // Add audioURL as dependency to ensure cleanup when it changes

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

          {/* Audio Input Section */}
          <div className="form-group">
            <label>Your Audio Response</label>
            
            <div className="audio-instructions">
              <p>Audio must be between {MIN_DURATION} seconds and {Math.floor(MAX_DURATION/60)}:{MAX_DURATION%60 < 10 ? '0' : ''}{MAX_DURATION%60} minutes long.</p>
            </div>
            
            <div className="audio-options">
              <div className="audio-option">
                <button 
                  type="button"
                  className={`record-btn ${isRecording ? 'recording' : ''}`} 
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isSubmitting}
                >
                  {isRecording ? `Stop Recording (${formatTime(recordingTime)})` : 'Start Recording'}
                </button>
                {isRecording && recordingTime >= MAX_DURATION - 10 && (
                  <div className="recording-warning">
                    Recording will stop in {MAX_DURATION - recordingTime} seconds
                  </div>
                )}
              </div>
              
              <div className="audio-option">
                <label className="upload-btn">
                  Upload MP3
                  <input 
                    type="file" 
                    accept=".mp3,audio/mp3,audio/mpeg" 
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    disabled={isSubmitting}
                  />
                </label>
              </div>
            </div>

            {durationError && (
              <div className="duration-error">
                {durationError}
              </div>
            )}

            {audioURL && (
              <div className="audio-preview">
                <audio 
                  key={audioURL}
                  src={audioURL} 
                  controls 
                  preload="metadata"
                  ref={(audioElement) => {
                    if (audioElement) {
                      // Add both loadedmetadata and loadeddata events for better reliability
                      const handleDurationLoad = () => {
                        try {
                          // Check if duration is valid
                          if (audioElement.duration && isFinite(audioElement.duration)) {
                            const duration = Math.round(audioElement.duration);
                            console.log('Audio duration detected:', duration, 'seconds');
                            setAudioDuration(duration);
                            
                            if (duration < MIN_DURATION) {
                              setDurationError(`Audio is too short. Please provide audio that is at least ${MIN_DURATION} seconds long.`);
                            } else if (duration > MAX_DURATION) {
                              setDurationError(`Audio is too long. Please provide audio that is no longer than ${MAX_DURATION} seconds (${Math.floor(MAX_DURATION/60)}:${MAX_DURATION%60 < 10 ? '0' : ''}${MAX_DURATION%60}).`);
                            } else {
                              setDurationError('');
                            }
                          } else {
                            // If we're here, it means the duration is invalid
                            console.warn('Invalid audio duration:', audioElement.duration);
                            // For recorded audio, use the recordingTime instead
                            if (recordingTime > 0) {
                              setAudioDuration(recordingTime);
                              if (recordingTime < MIN_DURATION) {
                                setDurationError(`Audio is too short. Please provide audio that is at least ${MIN_DURATION} seconds long.`);
                              } else {
                                setDurationError('');
                              }
                            } else {
                              // If all else fails, don't show an error yet
                              setDurationError('');
                            }
                          }
                        } catch (error) {
                          console.error('Error determining audio duration:', error);
                          setDurationError('');
                        }
                      };
                      
                      // Try multiple events for better browser compatibility
                      audioElement.addEventListener('loadedmetadata', handleDurationLoad);
                      audioElement.addEventListener('loadeddata', handleDurationLoad);
                      audioElement.addEventListener('durationchange', handleDurationLoad);
                    }
                  }}
                />
                {audioDuration > 0 && (
                  <div className="audio-duration">
                    Duration: {formatTime(audioDuration)}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              className="submit-btn"
              disabled={isSubmitting || !selectedFile}
            >
              {isSubmitting ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="spinner"></span>
                  Processing...
                </div>
              ) : 'Check English'}
            </button>
          </div>
        </form>
      </main>
      
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

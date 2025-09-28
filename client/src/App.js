import { useState, useRef, useEffect } from 'react';
import './App.css';
import AssessmentResults from './components/AssessmentResults';
import LanguageSwitcher from './components/LanguageSwitcher';
import { useLanguage } from './contexts/LanguageContext';
import { getTranslation } from './translations';
import { FFmpeg } from '@ffmpeg/ffmpeg';

// Constants for audio duration limits (in seconds)
const MIN_DURATION = 20;
const MAX_DURATION = 90; // 1 minute 30 seconds

function App() {
  const { language } = useLanguage();
  const [question, setQuestion] = useState('');
  const [isCustomQuestion, setIsCustomQuestion] = useState(true);
  const [questionError, setQuestionError] = useState('');
  const [studentLevel, setStudentLevel] = useState('3 Units');
  
  // Get preset questions based on current language
  const presetQuestions = getTranslation(language, 'presetQuestionsList');
  // Parameters with translations
  const getParameters = () => [
    { 
      id: 1, 
      name: getTranslation(language, 'parameters.vocabulary.name'), 
      description: getTranslation(language, 'parameters.vocabulary.description'), 
      weight: 100 
    },
    { 
      id: 2, 
      name: getTranslation(language, 'parameters.articulation.name'), 
      description: getTranslation(language, 'parameters.articulation.description'), 
      weight: 100 
    },
    { 
      id: 3, 
      name: getTranslation(language, 'parameters.fluency.name'), 
      description: getTranslation(language, 'parameters.fluency.description'), 
      weight: 100 
    },
    { 
      id: 4, 
      name: getTranslation(language, 'parameters.grammar.name'), 
      description: getTranslation(language, 'parameters.grammar.description'), 
      weight: 100 
    },
    { 
      id: 5, 
      name: getTranslation(language, 'parameters.syntax.name'), 
      description: getTranslation(language, 'parameters.syntax.description'), 
      weight: 100 
    }
  ];
  
  const [parameters, setParameters] = useState(getParameters());
  
  // Update parameters when language changes
  useEffect(() => {
    setParameters(getParameters());
  }, [language]);
  
  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [audioURL, setAudioURL] = useState('');
  const [audioDuration, setAudioDuration] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [durationError, setDurationError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // FFmpeg instance
  const ffmpegRef = useRef(null);
  
  // Results and submission states
  const [showResults, setShowResults] = useState(false);
  const [assessmentResults, setAssessmentResults] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Audio recording refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const recordingTimeRef = useRef(0); // Ref to track recording time directly

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
  
  // Convert audio blob to MP3 using FFmpeg
  const convertToMP3 = async (audioBlob, duration) => {
    try {
      if (!ffmpegRef.current) {
        console.error('FFmpeg not loaded');
        return { success: false, error: 'FFmpeg not loaded' };
      }
      
      setIsProcessing(true);
      const ffmpeg = ffmpegRef.current;
      
      // Get input file extension based on blob type
      let inputExt = 'webm';
      if (audioBlob.type.includes('mp3') || audioBlob.type.includes('mpeg')) {
        // If it's already MP3, no need to convert
        return { 
          success: true, 
          file: new File([audioBlob], 'recording.mp3', { type: 'audio/mp3' }),
          url: URL.createObjectURL(audioBlob),
          duration
        };
      } else if (audioBlob.type.includes('wav')) {
        inputExt = 'wav';
      } else if (audioBlob.type.includes('ogg')) {
        inputExt = 'ogg';
      }
      
      // Write the blob to FFmpeg's virtual file system
      const inputFileName = `recording.${inputExt}`;
      const outputFileName = 'recording.mp3';
      
      // Convert the blob to ArrayBuffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      
      // Write to FFmpeg virtual filesystem
      await ffmpeg.writeFile(inputFileName, new Uint8Array(arrayBuffer));
      
      // Convert to MP3 with good quality
      await ffmpeg.exec([
        '-i', inputFileName,
        '-c:a', 'libmp3lame',
        '-q:a', '2',  // High quality (0-9, lower is better)
        outputFileName
      ]);
      
      // Read the result
      const data = await ffmpeg.readFile(outputFileName);
      
      // Create a blob from the result
      const mp3Blob = new Blob([data], { type: 'audio/mp3' });
      const mp3File = new File([mp3Blob], outputFileName, { type: 'audio/mp3' });
      const mp3Url = URL.createObjectURL(mp3Blob);
      
      // Clean up
      await ffmpeg.deleteFile(inputFileName);
      await ffmpeg.deleteFile(outputFileName);
      
      console.log('Conversion to MP3 successful');
      return { success: true, file: mp3File, url: mp3Url, duration };
    } catch (error) {
      console.error('Error converting to MP3:', error);
      return { success: false, error: error.message };
    } finally {
      setIsProcessing(false);
    }
  };

  // Audio recording functions
  const startRecording = async () => {
    try {
      // Clean up any previous recording
      if (audioURL) {
        URL.revokeObjectURL(audioURL);
      }
      
      // Reset all states - IMPORTANT: This ensures we don't keep old duration values
      setRecordingTime(0);
      setDurationError('');
      setAudioDuration(0);
      setSelectedFile(null);
      setAudioURL('');
      
      // Reset refs to ensure we don't mix with previous recordings
      audioChunksRef.current = [];
      recordingTimeRef.current = 0; // Reset the recording time ref
      
      // Get audio stream with basic settings
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Try to use MP3 if supported, otherwise fall back to WebM
      let options = {};
      if (MediaRecorder.isTypeSupported('audio/mp3')) {
        options = { mimeType: 'audio/mp3' };
        console.log('Using MP3 for recording');
      } else {
        options = { mimeType: 'audio/webm' };
        console.log('Using WebM for recording');
      }
      
      // Create the media recorder
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      
      // Explicitly reset audio chunks array
      audioChunksRef.current = [];
      console.log('Audio chunks array reset');
      
      // Collect audio chunks
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log('Audio chunk collected, size:', Math.round(event.data.size / 1024) + 'KB');
        }
      };
      
      // Handle recording stop
      mediaRecorderRef.current.onstop = async () => {
        try {
          // Get the MIME type
          const mimeType = mediaRecorderRef.current.mimeType || 'audio/webm';
          console.log('Recording MIME type:', mimeType);
          
          // Create blob from audio chunks
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          
          // Get the final recording time from ref (more reliable than state)
          const finalRecordingTime = recordingTimeRef.current;
          console.log('Using recording time from ref for conversion:', finalRecordingTime, 'seconds (state value:', recordingTime, ')');
          
          // Convert to MP3 for better playback and seeking
          setIsProcessing(true);
          const result = await convertToMP3(audioBlob, finalRecordingTime);
          
          if (result.success) {
            // Use the MP3 file and URL
            console.log('Using MP3 file for playback:', result.file.name, result.file.type, Math.round(result.file.size / 1024) + 'KB');
            
            // Update UI with MP3 file
            setSelectedFile(result.file);
            setAudioURL(result.url);
            console.log('Setting audio duration to:', result.duration, 'seconds');
            setAudioDuration(result.duration);
            
            // Validate duration using finalRecordingTime
            if (finalRecordingTime < MIN_DURATION) {
              console.log('Recording too short in onstop handler:', finalRecordingTime, 'seconds');
              setDurationError(`Recording is too short. Please record at least ${MIN_DURATION} seconds.`);
            } else if (finalRecordingTime > MAX_DURATION) {
              console.log('Recording too long in onstop handler:', finalRecordingTime, 'seconds');
              setDurationError(`Recording is too long. Maximum allowed is ${Math.floor(MAX_DURATION/60)}:${MAX_DURATION%60 < 10 ? '0' : ''}${MAX_DURATION%60}.`);
            } else {
              console.log('Recording duration OK in onstop handler:', finalRecordingTime, 'seconds');
              setDurationError('');
            }
          } else {
            // Fallback to original blob if conversion failed
            console.error('MP3 conversion failed, using original format:', result.error);
            
            // Determine file extension for the original format
            let fileExtension = 'webm';
            if (mimeType.includes('mp3')) fileExtension = 'mp3';
            else if (mimeType.includes('wav')) fileExtension = 'wav';
            else if (mimeType.includes('ogg')) fileExtension = 'ogg';
            
            // Create file and URL from original blob
            const file = new File([audioBlob], `recording.${fileExtension}`, { type: mimeType });
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // Update UI with original file
            setSelectedFile(file);
            setAudioURL(audioUrl);
            console.log('Setting audio duration in fallback case to:', finalRecordingTime, 'seconds');
            setAudioDuration(finalRecordingTime);
            
            // Show error about conversion
            setDurationError('Note: Audio playback may have limited seeking capabilities.');
            
            // Validate duration using finalRecordingTime in fallback case
            if (finalRecordingTime < MIN_DURATION) {
              console.log('Recording too short in fallback case:', finalRecordingTime, 'seconds');
              setDurationError(`Recording is too short. Please record at least ${MIN_DURATION} seconds.`);
            } else if (finalRecordingTime > MAX_DURATION) {
              console.log('Recording too long in fallback case:', finalRecordingTime, 'seconds');
              setDurationError(`Recording is too long. Maximum allowed is ${Math.floor(MAX_DURATION/60)}:${MAX_DURATION%60 < 10 ? '0' : ''}${MAX_DURATION%60}.`);
            }
          }
        } catch (error) {
          console.error('Error processing recording:', error);
          setDurationError('Error processing recording. Please try again.');
        } finally {
          setIsProcessing(false);
        }
      };
      
      // Start recording with 1-second chunks
      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
      
      // Start timer
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        // Update both the state and the ref
        setRecordingTime(elapsedSeconds);
        recordingTimeRef.current = elapsedSeconds;
        console.log('Recording time updated:', elapsedSeconds, 'seconds (ref value:', recordingTimeRef.current, ')');
        
        // Auto-stop if max duration is reached
        if (elapsedSeconds >= MAX_DURATION) {
          stopRecording();
        }
      }, 1000);
      
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone. Please check your permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        // Capture the final recording time from the ref (more reliable than state)
        const finalRecordingTime = recordingTimeRef.current;
        console.log('Final recording time from ref:', finalRecordingTime, 'seconds (state value:', recordingTime, ')');
        
        // Force update the state to match the ref
        setRecordingTime(finalRecordingTime);
        
        // Stop the recorder
        mediaRecorderRef.current.stop();
        
        // Stop all audio tracks
        if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
        
        // Stop the timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        
        setIsRecording(false);
        
        // Validate duration right away
        if (finalRecordingTime < MIN_DURATION) {
          console.log('Recording too short:', finalRecordingTime, 'seconds');
          setDurationError(`Recording is too short. Please record at least ${MIN_DURATION} seconds.`);
        } else if (finalRecordingTime > MAX_DURATION) {
          console.log('Recording too long:', finalRecordingTime, 'seconds');
          setDurationError(`Recording is too long. Maximum allowed is ${Math.floor(MAX_DURATION/60)}:${MAX_DURATION%60 < 10 ? '0' : ''}${MAX_DURATION%60}.`);
        } else {
          setDurationError('');
        }
      } catch (error) {
        console.error('Error stopping recording:', error);
        setDurationError('Error stopping recording. Please try again.');
        setIsRecording(false);
      }
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    
    if (!file) {
      alert('Please select an audio file');
      return;
    }
    
    // Clean up previous recording/file
    if (audioURL) {
      URL.revokeObjectURL(audioURL);
    }
    
    // Reset states
    setDurationError('');
    setAudioDuration(0);
    setSelectedFile(null);
    setAudioURL('');
    setRecordingTime(0);
    
    // Reset recording time ref for uploaded files
    recordingTimeRef.current = 0;
    console.log('Recording time ref reset for file upload');
    
    // Check for various MP3 MIME types or file extension
    const isMP3 = file && (
      file.type === 'audio/mp3' || 
      file.type === 'audio/mpeg' || 
      file.type === 'audio/mpeg3' ||
      file.name.toLowerCase().endsWith('.mp3')
    );
    
    if (isMP3) {
      // If it's already MP3, use it directly
      console.log('MP3 file accepted:', file.name, file.type);
      setSelectedFile(file);
      const newAudioURL = URL.createObjectURL(file);
      setAudioURL(newAudioURL);
      console.log('Created new audio URL for MP3 file:', newAudioURL);
    } else {
      // For non-MP3 files, try to convert them
      try {
        setIsProcessing(true);
        console.log('Converting non-MP3 file to MP3:', file.name, file.type);
        
        // Create a blob from the file
        const fileBlob = new Blob([await file.arrayBuffer()], { type: file.type });
        
        // Convert to MP3
        const result = await convertToMP3(fileBlob, 0); // Duration will be detected from the audio element
        
        if (result.success) {
          // Use the converted MP3 file
          console.log('File converted to MP3 successfully');
          setSelectedFile(result.file);
          setAudioURL(result.url);
          if (result.duration > 0) {
            setAudioDuration(result.duration);
          }
        } else {
          // If conversion failed, reject the file
          console.error('Failed to convert file to MP3:', result.error);
          alert(`Could not process the audio file. Please try an MP3 file instead.`);
        }
      } catch (error) {
        console.error('Error processing file:', error);
        alert(`Error processing file: ${error.message}. Please try an MP3 file instead.`);
      } finally {
        setIsProcessing(false);
      }
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate question field
    if (!question.trim()) {
      setQuestionError(getTranslation(language, 'questionRequired'));
      return;
    }
    
    // Validate audio file
    if (!selectedFile) {
      setDurationError(getTranslation(language, 'audioRequired'));
      return;
    }
    
    // For recordings, prioritize the ref value which is more reliable
    const finalDuration = recordingTimeRef.current > 0 ? recordingTimeRef.current : audioDuration;
    console.log('Final duration check in handleSubmit:', finalDuration, 'seconds (state value:', audioDuration, ', ref value:', recordingTimeRef.current, ')');
    
    // Validate audio duration
    if (finalDuration < MIN_DURATION) {
      setDurationError(getTranslation(language, 'recordingTooShort', { minDuration: MIN_DURATION }));
      return;
    }
    
    if (finalDuration > MAX_DURATION) {
      setDurationError(getTranslation(language, 'recordingTooLong', { 
        maxDuration: `${Math.floor(MAX_DURATION/60)}:${MAX_DURATION%60 < 10 ? '0' : ''}${MAX_DURATION%60}`
      }));
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
      console.log('Submitting audio file as-is:', selectedFile.name, selectedFile.type, Math.round(selectedFile.size / 1024) + 'KB');
      formData.append('question', question);
      formData.append('studyLevel', studentLevel);
      formData.append('language', language);
      
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

  // Initialize FFmpeg
  useEffect(() => {
    const loadFFmpeg = async () => {
      try {
        if (!ffmpegRef.current) {
          const ffmpeg = new FFmpeg();
          await ffmpeg.load();
          ffmpegRef.current = ffmpeg;
          console.log('FFmpeg loaded successfully');
        }
      } catch (error) {
        console.error('Error loading FFmpeg:', error);
      }
    };
    
    loadFFmpeg();
  }, []);

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
      <LanguageSwitcher />
      <header className="app-header">
        {/* Empty header or add a subtle logo if needed */}
      </header>

      <main className="app-main">
        <form onSubmit={handleSubmit} className="check-form">
          <div className="form-header">
            <h1>{getTranslation(language, 'appTitle')}</h1>
            <p>{getTranslation(language, 'appSubtitle')}</p>
          </div>
          <div className="form-group">
            <label>{getTranslation(language, 'questionLabel')}</label>
            
            <div className="question-type-toggle">
              <button 
                type="button"
                className={`toggle-btn ${isCustomQuestion ? 'active' : ''}`}
                onClick={() => handleQuestionTypeChange(true)}
              >
                {getTranslation(language, 'customQuestion')}
              </button>
              <button 
                type="button"
                className={`toggle-btn ${!isCustomQuestion ? 'active' : ''}`}
                onClick={() => handleQuestionTypeChange(false)}
              >
                {getTranslation(language, 'presetQuestions')}
              </button>
            </div>
            
            {isCustomQuestion ? (
              <input
                type="text"
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={getTranslation(language, 'questionPlaceholder')}
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
                <option value="">{getTranslation(language, 'selectQuestion')}</option>
                {presetQuestions.map((q, index) => (
                  <option key={index} value={q}>{q}</option>
                ))}
              </select>
            )}
            
            {questionError && <div className="error-message">{questionError}</div>}
          </div>

          <div className="form-group">
            <label>{getTranslation(language, 'studentLevelLabel')}</label>
            <div className="radio-group">
              {['3Units', '4Units', '5Units'].map(unitKey => {
                const unitText = getTranslation(language, `studentLevels.${unitKey}`);
                const unitValue = getTranslation('english', `studentLevels.${unitKey}`); // Use English value for backend
                return (
                  <label key={unitKey} className="radio-label">
                    <input
                      type="radio"
                      name="studentLevel"
                      checked={studentLevel === unitValue}
                      onChange={() => setStudentLevel(unitValue)}
                    />
                    <span className="radio-custom"></span>
                    {unitText}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label>{getTranslation(language, 'parametersLabel')}</label>
            <div className="parameters-list">
              {parameters.map(param => (
                <div key={param.id} className="parameter-item">
                  <div className="parameter-info">
                    <div className="parameter-name">{param.name}</div>
                    <div className="parameter-desc">{param.description}</div>
                  </div>
                  <div className="parameter-weight">
                    <span className="weight-label">{getTranslation(language, 'weightLabel')}</span>
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
            <label>{getTranslation(language, 'audioResponseLabel')}</label>
            
            <div className="audio-instructions">
              <p>{getTranslation(language, 'audioInstructions', {
                minDuration: MIN_DURATION,
                maxDuration: `${Math.floor(MAX_DURATION/60)}:${MAX_DURATION%60 < 10 ? '0' : ''}${MAX_DURATION%60}`
              })}</p>
            </div>
            
            <div className="audio-options">
              <div className="audio-option">
                <button 
                  type="button"
                  className={`record-btn ${isRecording ? 'recording' : ''}`} 
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isSubmitting}
                >
                  {isRecording ? 
                    getTranslation(language, 'stopRecording', { time: formatTime(recordingTime) }) : 
                    getTranslation(language, 'startRecording')
                  }
                </button>
                {isRecording && recordingTime >= MAX_DURATION - 10 && (
                  <div className="recording-warning">
                    {getTranslation(language, 'recordingWarning', { seconds: MAX_DURATION - recordingTime })}
                  </div>
                )}
              </div>
              
              <div className="audio-option">
                <label className="upload-btn">
                  {getTranslation(language, 'uploadMP3')}
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

            {isProcessing && (
              <div className="processing-indicator">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', margin: '15px 0' }}>
                  <span className="spinner"></span>
                  <span>{getTranslation(language, 'processingAudio')}</span>
                </div>
              </div>
            )}

            {audioURL && !isProcessing && (
              <div className="audio-preview">
                <audio 
                  key={audioURL}
                  src={audioURL} 
                  controls 
                  preload="auto"
                  ref={(audioElement) => {
                    if (audioElement) {
                      // Add multiple event listeners for better reliability
                      const updateDuration = () => {
                        try {
                          if (audioElement.duration && isFinite(audioElement.duration)) {
                            const duration = Math.round(audioElement.duration);
                            console.log('Audio element duration:', duration, 'seconds');
                            
                            // For recordings, use the recording time from ref if available
                            if (recordingTimeRef.current > 0) {
                              console.log('Using recording time from ref:', recordingTimeRef.current, 'seconds');
                              setAudioDuration(recordingTimeRef.current);
                            } 
                            // For uploaded files or as fallback, use the audio element duration
                            else if (duration > 0) {
                              console.log('Using audio element duration:', duration, 'seconds');
                              setAudioDuration(duration);
                            }
                          }
                        } catch (error) {
                          console.error('Error getting audio duration:', error);
                        }
                      };
                      
                      // Try multiple events for better reliability
                      audioElement.addEventListener('loadedmetadata', updateDuration);
                      audioElement.addEventListener('loadeddata', updateDuration);
                      audioElement.addEventListener('durationchange', updateDuration);
                      
                      // Force a duration check after a short delay
                      setTimeout(updateDuration, 500);
                    }
                  }}
                />
                {audioDuration > 0 && (
                  <div className="audio-duration">
                    {getTranslation(language, 'durationLabel', { duration: formatTime(audioDuration) })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              className="submit-btn"
              disabled={isSubmitting || !selectedFile || isProcessing}
            >
              {isSubmitting ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="spinner"></span>
                  {getTranslation(language, 'processing')}
                </div>
              ) : getTranslation(language, 'submitButton')}
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

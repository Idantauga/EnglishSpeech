import { useState, useRef, useEffect } from 'react';

// Constants for audio duration limits (in seconds)
const MIN_DURATION = 20;
const MAX_DURATION = 90; // 1 minute 30 seconds

const AudioInputModal = ({ isOpen, onClose, onSubmit, isSubmitting = false }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [durationError, setDurationError] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Timer reference for recording duration
  const timerRef = useRef(null);

  const startRecording = async () => {
    try {
      // Reset states
      setRecordingTime(0);
      setDurationError('');
      setAudioDuration(0);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const file = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });
        
        // Set the duration to the recorded time
        setAudioDuration(recordingTime);
        
        // Update UI
        setSelectedFile(file);
        setAudioURL(audioUrl); // This should trigger the audio element to remount
      };

      // Start the recorder
      mediaRecorderRef.current.start(1000); // Capture data every second
      setIsRecording(true);
      
      // Start the timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prevTime => {
          const newTime = prevTime + 1;
          // Auto-stop if max duration is reached
          if (newTime >= MAX_DURATION) {
            stopRecording();
          }
          return newTime;
        });
      }, 1000);
      
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone. Please check your permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Stop the recorder
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      
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
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setDurationError('');
    setAudioDuration(0); // Reset duration when changing files
    
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
      
      // Create object URL for the audio element
      // The actual duration check will happen in the audio element's loadedmetadata event
      setAudioURL(URL.createObjectURL(file));
    } else if (file) {
      console.error('Invalid file type:', file.type);
      alert(`Invalid file type: ${file.type}. Please select an MP3 file.`);
    } else {
      alert('Please select an MP3 file');
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault(); // Prevent form submission if triggered by a form
    
    if (!selectedFile) {
      alert('Please record or upload an audio file');
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
    
    // If all validations pass, submit the file and its URL
    onSubmit(selectedFile, audioURL);
    // Don't call onClose() here - let the parent component handle the modal state
  };

  useEffect(() => {
    return () => {
      // Clean up recorder if active
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      
      // Clean up timer if active
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  
  // Format time in MM:SS format
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Add Your Audio Response</h3>
        
        <div className="audio-instructions">
          <p>Audio must be between {MIN_DURATION} seconds and {Math.floor(MAX_DURATION/60)}:{MAX_DURATION%60 < 10 ? '0' : ''}{MAX_DURATION%60} minutes long.</p>
        </div>
        
        <div className="audio-options">
          <div className="audio-option">
            <button 
              className={`record-btn ${isRecording ? 'recording' : ''}`} 
              onClick={isRecording ? stopRecording : startRecording}
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
              key={audioURL} /* Add key to ensure the element remounts when URL changes */
              src={audioURL} 
              controls 
              ref={(audioElement) => {
                // When the audio element is created/updated, set up event listeners
                if (audioElement) {
                  // Listen for loadedmetadata event to get duration
                  audioElement.addEventListener('loadedmetadata', () => {
                    const duration = Math.round(audioElement.duration);
                    setAudioDuration(duration);
                    
                    // Validate duration
                    if (duration < MIN_DURATION) {
                      setDurationError(`Audio is too short. Please provide audio that is at least ${MIN_DURATION} seconds long.`);
                    } else if (duration > MAX_DURATION) {
                      setDurationError(`Audio is too long. Please provide audio that is no longer than ${MAX_DURATION} seconds (${Math.floor(MAX_DURATION/60)}:${MAX_DURATION%60 < 10 ? '0' : ''}${MAX_DURATION%60}).`);
                    } else {
                      setDurationError('');
                    }
                  });
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

        <div className="modal-actions">
          <button 
            className="cancel-btn" 
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button 
            className="submit-btn" 
            onClick={handleSubmit}
            disabled={!selectedFile || isSubmitting}
            style={{ minWidth: '120px' }}
          >
            {isSubmitting ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="spinner"></span>
                Processing...
              </div>
            ) : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AudioInputModal;

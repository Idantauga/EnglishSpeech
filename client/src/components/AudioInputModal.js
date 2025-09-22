import { useState, useRef, useEffect } from 'react';

const AudioInputModal = ({ isOpen, onClose, onSubmit }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    try {
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
        setAudioURL(audioUrl);
        setSelectedFile(new File([audioBlob], 'recording.wav', { type: 'audio/wav' }));
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone. Please check your permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'audio/mp3') {
      setSelectedFile(file);
      setAudioURL(URL.createObjectURL(file));
    } else {
      alert('Please select an MP3 file');
    }
  };

  const handleSubmit = () => {
    if (selectedFile) {
      onSubmit(selectedFile);
      onClose();
    } else {
      alert('Please record or upload an audio file');
    }
  };

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Add Your Audio Response</h3>
        
        <div className="audio-options">
          <div className="audio-option">
            <button 
              className={`record-btn ${isRecording ? 'recording' : ''}`} 
              onClick={isRecording ? stopRecording : startRecording}
            >
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
          </div>
          
          <div className="audio-option">
            <label className="upload-btn">
              Upload MP3
              <input 
                type="file" 
                accept=".mp3,audio/mp3" 
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>

        {audioURL && (
          <div className="audio-preview">
            <audio src={audioURL} controls />
          </div>
        )}

        <div className="modal-actions">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button 
            className="submit-btn" 
            onClick={handleSubmit}
            disabled={!selectedFile}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default AudioInputModal;

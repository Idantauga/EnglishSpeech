import { useState } from 'react';
import './App.css';
import AudioInputModal from './components/AudioInputModal';

function App() {
  const [question, setQuestion] = useState('');
  const [studentLevel, setStudentLevel] = useState('3 Units');
  const [parameters, setParameters] = useState([
    { id: 1, name: 'Vocabulary', description: 'Richness and appropriateness of vocabulary', weight: 1 },
    { id: 2, name: 'Clarity', description: 'Clarity of expression', weight: 1 },
    { id: 3, name: 'Fluency', description: 'Fluency and flow of speech', weight: 1 },
    { id: 4, name: 'Grammar', description: 'Grammar and syntax correctness', weight: 1 }
  ]);
  
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [audioFile, setAudioFile] = useState(null);

  const handleWeightChange = (id, value) => {
    const newValue = Math.max(0, parseInt(value) || 0);
    setParameters(parameters.map(param => 
      param.id === id ? { ...param, weight: newValue } : param
    ));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowAudioModal(true);
  };

  const handleAudioSubmit = async (file) => {
    try {
      setAudioFile(file);
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('question', question);
      formData.append('studyLevel', studentLevel);
      
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      const endpoint = `${apiUrl}/api/check-english`;
      
      console.log('Submitting form with data:', {
        question,
        studyLevel: studentLevel,
        file: { name: file.name, size: file.size, type: file.type },
        endpoint
      });

      // Test server connection first
      try {
        const testResponse = await fetch(apiUrl);
        console.log('Server test response status:', testResponse.status);
      } catch (testError) {
        console.error('Server connection test failed:', testError);
        throw new Error(`Cannot connect to server at ${apiUrl}. ${testError.message}`);
      }
      
      // Make the actual request
      let response;
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
          // Don't set Content-Type header, let the browser set it with the correct boundary
        });
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
      
      console.log('Success:', result);
      
      // Handle successful response from n8n
      if (result.output && result.output.assessment) {
        // Process the assessment results
        const { assessment, feedback } = result.output;
        console.log('Assessment:', assessment);
        console.log('Feedback:', feedback);
        
        // TODO: Update UI with the assessment results
        alert('Your submission was successful! Check the console for details.');
      } else {
        console.warn('Unexpected response format:', result);
        alert('Received an unexpected response format. Check the console for details.');
      }
      
    } catch (error) {
      console.error('Error submitting form:', error);
      alert(`Error: ${error.message}`);
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
            <label htmlFor="question">What question was asked?</label>
            <input
              type="text"
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Type the question here..."
              className="question-input"
            />
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
        onClose={() => setShowAudioModal(false)}
        onSubmit={handleAudioSubmit}
      />
    </div>
  );
}

export default App;

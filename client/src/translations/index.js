export const translations = {
  english: {
    // Header and main title
    appTitle: "English AI Check",
    appSubtitle: "Check your English with AI",
    
    // Form labels and inputs
    questionLabel: "What question was asked?",
    customQuestion: "Custom Question",
    presetQuestions: "Preset Questions",
    questionPlaceholder: "Type the question here...",
    selectQuestion: "-- Select a question --",
    
    // Preset questions
    presetQuestionsList: [
      "Talk about your dream vacation.",
      "Tell me about yourself.",
      "Describe your best friend and his hobbies."
    ],
    
    // Student level
    studentLevelLabel: "Student level",
    studentLevels: {
      "3Units": "3 Units",
      "4Units": "4 Units",
      "5Units": "5 Units"
    },
    
    // Parameters
    parametersLabel: "Parameters to check",
    weightLabel: "Weight:",
    
    // Parameter names and descriptions
    parameters: {
      vocabulary: {
        name: "Vocabulary",
        description: "Richness and appropriateness of vocabulary"
      },
      articulation: {
        name: "Articulation", 
        description: "Clarity of expression"
      },
      fluency: {
        name: "Fluency",
        description: "Fluency and flow of speech"
      },
      grammar: {
        name: "Grammar",
        description: "Grammatical accuracy and correctness"
      },
      syntax: {
        name: "Syntax",
        description: "Proper sentence structure and word order"
      },
      relevance: {
        name: "Relevance",
        description: "How well the answer addresses the question asked"
      }
    },
    
    // Audio section
    audioResponseLabel: "Your Audio Response",
    audioInstructions: "Audio must be between {minDuration} seconds and {maxDuration} minutes long.",
    startRecording: "Start Recording",
    stopRecording: "Stop Recording ({time})",
    uploadMP3: "Upload MP3",
    recordingWarning: "Recording will stop in {seconds} seconds",
    
    // Duration and errors
    durationLabel: "Duration: {duration}",
    recordingTooShort: "Recording is too short. Please record at least {minDuration} seconds.",
    recordingTooLong: "Recording is too long. Maximum allowed is {maxDuration}.",
    audioRequired: "Please record or upload an audio file",
    questionRequired: "Please enter a question or select a preset question",
    processingAudio: "Processing audio for better playback...",
    
    // Submit button
    submitButton: "Check my recording",
    processing: "Processing...",
    
    // Results modal
    assessmentResults: "Assessment Results",
    question: "Question",
    yourResponse: "Your Response",
    duration: "Duration",
    wordCount: "Word Count",
    words: "words",
    transcript: "Transcript",
    overallAssessment: "Overall Assessment",
    score: "Score:",
    overallScoreDescription: "This score represents a weighted average based on the assessment criteria.",
    whatYouDidWell: "What You Did Well",
    improvementSuggestions: "Improvement Suggestions",
    done: "Done",
    
    // Language switcher
    languageSwitch: "עברית",
    
    // Word Count Distribution
    wordCountDistribution: "Word Count Distribution",
    yourWordCount: "Your word count",
    average: "Average",
    percentile: "Percentile",
    wordCountMuchShorter: "Your response is significantly shorter than average.",
    wordCountShorter: "Your response is somewhat shorter than average.",
    wordCountAverage: "Your response length is about average.",
    wordCountLonger: "Your response is somewhat longer than average.",
    wordCountMuchLonger: "Your response is significantly longer than average."
  },
  
  hebrew: {
    // Header and main title
    appTitle: "בדיקת אנגלית בינה מלאכותית",
    appSubtitle: "בדוק את האנגלית שלך עם בינה מלאכותית",
    
    // Form labels and inputs
    questionLabel: "איזו שאלה נשאלה?",
    customQuestion: "שאלה מותאמת אישית",
    presetQuestions: "שאלות מוכנות מראש",
    questionPlaceholder: "הקלד את השאלה כאן...",
    selectQuestion: "-- בחר שאלה --",
    
    // Preset questions
    presetQuestionsList: [
      "ספר על חופשת החלומות שלך.",
      "ספר לי על עצמך.",
      "תאר את החבר הכי טוב שלך ואת התחביבים שלו."
    ],
    
    // Student level
    studentLevelLabel: "רמת התלמיד",
    studentLevels: {
      "3Units": "3 יחידות",
      "4Units": "4 יחידות",
      "5Units": "5 יחידות"
    },
    
    // Parameters
    parametersLabel: "פרמטרים לבדיקה",
    weightLabel: "משקל:",
    
    // Parameter names and descriptions
    parameters: {
      vocabulary: {
        name: "אוצר מילים",
        description: "עושר והתאמה של אוצר המילים"
      },
      articulation: {
        name: "ביטוי", 
        description: "בהירות הביטוי"
      },
      fluency: {
        name: "שטף",
        description: "שטף וזרימת הדיבור"
      },
      grammar: {
        name: "דקדוק",
        description: "דיוק ונכונות דקדוקית"
      },
      syntax: {
        name: "תחביר",
        description: "מבנה משפט נכון וסדר מילים"
      },
      relevance: {
        name: "רלוונטיות",
        description: "עד כמה התשובה מתייחסת לשאלה שנשאלה"
      }
    },
    
    // Audio section
    audioResponseLabel: "התגובה הקולית שלך",
    audioInstructions: "האודיו חייב להיות באורך של {minDuration} שניות עד {maxDuration} דקות.",
    startRecording: "התחל הקלטה",
    stopRecording: "עצור הקלטה ({time})",
    uploadMP3: "העלה MP3",
    recordingWarning: "ההקלטה תיעצר בעוד {seconds} שניות",
    
    // Duration and errors
    durationLabel: "משך זמן: {duration}",
    recordingTooShort: "ההקלטה קצרה מדי. אנא הקלט לפחות {minDuration} שניות.",
    recordingTooLong: "ההקלטה ארוכה מדי. המקסימום המותר הוא {maxDuration}.",
    audioRequired: "אנא הקלט או העלה קובץ אודיו",
    questionRequired: "אנא הזן שאלה או בחר שאלה מוכנה מראש",
    processingAudio: "מעבד אודיו לשיפור הנגינה...",
    
    // Submit button
    submitButton: "בדוק את ההקלטה שלי",
    processing: "מעבד...",
    
    // Results modal
    assessmentResults: "תוצאות הערכה",
    question: "שאלה",
    yourResponse: "התגובה שלך",
    duration: "משך זמן",
    wordCount: "מספר מילים",
    words: "מילים",
    transcript: "תמליל",
    overallAssessment: "הערכה כוללת",
    score: "ציון:",
    overallScoreDescription: "ציון זה מייצג ממוצע משוקלל על בסיס קריטריוני ההערכה.",
    whatYouDidWell: "מה עשית טוב",
    improvementSuggestions: "הצעות לשיפור",
    done: "סיום",
    
    // Language switcher
    languageSwitch: "English",
    
    // Word Count Distribution
    wordCountDistribution: "התפלגות מספר מילים",
    yourWordCount: "מספר המילים שלך",
    average: "ממוצע",
    percentile: "אחוזון",
    wordCountMuchShorter: "התשובה שלך קצרה באופן משמעותי מהממוצע.",
    wordCountShorter: "התשובה שלך קצת קצרה מהממוצע.",
    wordCountAverage: "אורך התשובה שלך בערך ממוצע.",
    wordCountLonger: "התשובה שלך קצת ארוכה מהממוצע.",
    wordCountMuchLonger: "התשובה שלך ארוכה באופן משמעותי מהממוצע."
  }
};

export const getTranslation = (language, key, params = {}) => {
  let translation;
  // Handle nested keys (e.g., 'parameters.vocabulary.name')
  if (key.includes('.')) {
    const keys = key.split('.');
    let value = translations[language];
    
    // Navigate through the nested objects
    for (const k of keys) {
      if (value && value[k] !== undefined) {
        value = value[k];
      } else {
        // If not found in current language, try English as fallback
        value = undefined;
        break;
      }
    }
    
    // If value is found, use it; otherwise try English or use the key itself
    if (value !== undefined) {
      translation = value;
    } else {
      // Try English fallback for nested keys
      value = translations.english;
      let found = true;
      
      for (const k of keys) {
        if (value && value[k] !== undefined) {
          value = value[k];
        } else {
          found = false;
          break;
        }
      }
      
      translation = found ? value : key;
    }
  } else {
    // Simple key handling (non-nested)
    translation = translations[language]?.[key] || translations.english[key] || key;
  }
  
  // Replace parameters in the translation
  Object.keys(params).forEach(param => {
    translation = translation.replace(`{${param}}`, params[param]);
  });
  
  return translation;
};

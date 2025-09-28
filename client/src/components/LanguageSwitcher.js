import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { getTranslation } from '../translations';
import './LanguageSwitcher.css';

const LanguageSwitcher = () => {
  const { language, switchLanguage } = useLanguage();

  const handleLanguageSwitch = () => {
    const newLanguage = language === 'english' ? 'hebrew' : 'english';
    switchLanguage(newLanguage);
  };

  return (
    <div className="language-switcher">
      <button 
        onClick={handleLanguageSwitch}
        className="language-switch-btn"
        aria-label={`Switch to ${language === 'english' ? 'Hebrew' : 'English'}`}
      >
        {getTranslation(language, 'languageSwitch')}
      </button>
    </div>
  );
};

export default LanguageSwitcher;

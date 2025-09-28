import React, { createContext, useContext, useState } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('english');
  const [isRTL, setIsRTL] = useState(false);

  const switchLanguage = (newLanguage) => {
    setLanguage(newLanguage);
    setIsRTL(newLanguage === 'hebrew');
    
    // Update document direction
    document.documentElement.dir = newLanguage === 'hebrew' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLanguage === 'hebrew' ? 'he' : 'en';
  };

  const value = {
    language,
    isRTL,
    switchLanguage,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

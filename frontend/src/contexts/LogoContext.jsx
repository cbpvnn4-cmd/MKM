import React, { createContext, useContext, useState, useEffect } from 'react';

const LogoContext = createContext();

export const useLogoSettings = () => {
  const context = useContext(LogoContext);
  if (!context) {
    throw new Error('useLogoSettings must be used within LogoProvider');
  }
  return context;
};

export const LogoProvider = ({ children }) => {
  // Load settings from localStorage or use defaults
  const [logoSettings, setLogoSettings] = useState(() => {
    const savedSettings = localStorage.getItem('logoSettings');
    if (savedSettings) {
      try {
        return JSON.parse(savedSettings);
      } catch (e) {
        console.error('Error parsing logo settings:', e);
      }
    }
    return {
      headerSize: 'lg',      // xs, sm, md, lg, xl
      sidebarSize: 'lg',     // xs, sm, md, lg, xl
      headerHeight: 'h-28',  // h-20, h-24, h-28, h-32
      showText: false,
    };
  });

  // Save to localStorage whenever settings change
  useEffect(() => {
    localStorage.setItem('logoSettings', JSON.stringify(logoSettings));
  }, [logoSettings]);

  const updateLogoSize = (location, size) => {
    setLogoSettings(prev => ({
      ...prev,
      [`${location}Size`]: size
    }));
  };

  const updateHeaderHeight = (height) => {
    setLogoSettings(prev => ({
      ...prev,
      headerHeight: height
    }));
  };

  const toggleShowText = () => {
    setLogoSettings(prev => ({
      ...prev,
      showText: !prev.showText
    }));
  };

  const resetToDefaults = () => {
    const defaults = {
      headerSize: 'lg',
      sidebarSize: 'lg',
      headerHeight: 'h-28',
      showText: false,
    };
    setLogoSettings(defaults);
    localStorage.setItem('logoSettings', JSON.stringify(defaults));
  };

  return (
    <LogoContext.Provider
      value={{
        logoSettings,
        updateLogoSize,
        updateHeaderHeight,
        toggleShowText,
        resetToDefaults,
      }}
    >
      {children}
    </LogoContext.Provider>
  );
};

export default LogoContext;

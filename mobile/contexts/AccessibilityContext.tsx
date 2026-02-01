import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const LARGE_TEXT_KEY = 'accessibility_large_text';
const HIGH_CONTRAST_KEY = 'accessibility_high_contrast';

// Font scale values
export const FONT_SCALES = {
  normal: 1,
  large: 1.2,
  extraLarge: 1.4,
};

interface AccessibilityContextType {
  largeText: boolean;
  highContrast: boolean;
  fontScale: number;
  toggleLargeText: () => void;
  toggleHighContrast: () => void;
  isLoading: boolean;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

interface AccessibilityProviderProps {
  children: ReactNode;
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const [largeText, setLargeText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from storage on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [storedLargeText, storedHighContrast] = await Promise.all([
        AsyncStorage.getItem(LARGE_TEXT_KEY),
        AsyncStorage.getItem(HIGH_CONTRAST_KEY),
      ]);

      if (storedLargeText !== null) {
        setLargeText(storedLargeText === 'true');
      }
      if (storedHighContrast !== null) {
        setHighContrast(storedHighContrast === 'true');
      }
    } catch (error) {
      console.log('Failed to load accessibility settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLargeText = async () => {
    try {
      const newValue = !largeText;
      setLargeText(newValue);
      await AsyncStorage.setItem(LARGE_TEXT_KEY, String(newValue));
    } catch (error) {
      console.log('Failed to save large text setting:', error);
    }
  };

  const toggleHighContrast = async () => {
    try {
      const newValue = !highContrast;
      setHighContrast(newValue);
      await AsyncStorage.setItem(HIGH_CONTRAST_KEY, String(newValue));
    } catch (error) {
      console.log('Failed to save high contrast setting:', error);
    }
  };

  const fontScale = largeText ? FONT_SCALES.large : FONT_SCALES.normal;

  return (
    <AccessibilityContext.Provider
      value={{
        largeText,
        highContrast,
        fontScale,
        toggleLargeText,
        toggleHighContrast,
        isLoading,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    // Return default values if used outside provider (for safety)
    return {
      largeText: false,
      highContrast: false,
      fontScale: 1,
      toggleLargeText: () => {},
      toggleHighContrast: () => {},
      isLoading: false,
    };
  }
  return context;
}

export default AccessibilityContext;

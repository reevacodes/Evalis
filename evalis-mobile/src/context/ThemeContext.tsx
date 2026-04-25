import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeType = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: 'light' | 'dark';
  themeSetting: ThemeType;
  setThemeSetting: (setting: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  themeSetting: 'dark',
  setThemeSetting: () => {},
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const systemColorScheme = useColorScheme();
  
  // Defaulting to 'dark' based on user preference, instead of system
  const [themeSetting, setThemeState] = useState<ThemeType>('dark');

  useEffect(() => {
    AsyncStorage.getItem('theme').then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setThemeState(stored);
      }
    });
  }, []);

  const setThemeSetting = async (setting: ThemeType) => {
    setThemeState(setting);
    await AsyncStorage.setItem('theme', setting);
  };

  const currentTheme = themeSetting === 'system' ? (systemColorScheme || 'dark') : themeSetting;

  return (
    <ThemeContext.Provider value={{ theme: currentTheme, themeSetting, setThemeSetting }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

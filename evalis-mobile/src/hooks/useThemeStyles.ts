import { useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '@/constants/Colors';

export const useThemeStyles = <T extends Record<string, any>>(styleCreator: (theme: typeof Colors.light & typeof Colors.dark) => T) => {
  const { theme } = useTheme();
  
  return useMemo(() => {
    const activeColors = theme === 'dark' ? Colors.dark : Colors.light;
    return {
      theme: activeColors,
      isDark: theme === 'dark',
      styles: styleCreator(activeColors)
    };
  }, [theme, styleCreator]);
};

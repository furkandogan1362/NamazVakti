/**
 * Tema yönetimi için context sağlayıcı
 * Light ve dark tema desteği sağlar
 * Gradient arka planlar ve uyumlu renk paletleri içerir
 */

import React, { createContext, useState, useContext, useEffect } from 'react';
import { Dimensions } from 'react-native';

export type ThemeType = 'light' | 'dark';

interface Theme {
    type: ThemeType;
    colors: {
        background: string[];
        cardBackground: string;
        cardBorder: string;
        text: string;
        secondaryText: string;
        activeCard: string[];
        activeText: string;
        buttonBackground: string;
        buttonText: string;
        pickerBackground: string;
        pickerBorder: string;
        headerText: string;
        shadow: string;
    };
    gradientStart: { x: number; y: number };
    gradientEnd: { x: number; y: number };
}

const lightTheme: Theme = {
    type: 'light',
    colors: {
        background: ['#E3F2FD', '#BBDEFB', '#90CAF9'],
        cardBackground: '#FFFFFF',
        cardBorder: '#E0E0E0',
        text: '#212121',
        secondaryText: '#757575',
        activeCard: ['#4CAF50', '#66BB6A'],
        activeText: '#FFFFFF',
        buttonBackground: '#2196F3',
        buttonText: '#FFFFFF',
        pickerBackground: '#F5F5F5',
        pickerBorder: '#E0E0E0',
        headerText: '#1976D2',
        shadow: '#000000',
    },
    gradientStart: { x: 0, y: 0 },
    gradientEnd: { x: 0, y: 1 },
};

const darkTheme: Theme = {
    type: 'dark',
    colors: {
        background: ['#1A237E', '#283593', '#3F51B5'],
        cardBackground: '#263238',
        cardBorder: '#37474F',
        text: '#ECEFF1',
        secondaryText: '#B0BEC5',
        activeCard: ['#00897B', '#26A69A'],
        activeText: '#FFFFFF',
        buttonBackground: '#0288D1',
        buttonText: '#FFFFFF',
        pickerBackground: '#37474F',
        pickerBorder: '#546E7A',
        headerText: '#64B5F6',
        shadow: '#000000',
    },
    gradientStart: { x: 0, y: 0 },
    gradientEnd: { x: 0, y: 1 },
};

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    screenWidth: number;
    screenHeight: number;
    isSmallScreen: boolean;
    isMediumScreen: boolean;
    isLargeScreen: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: lightTheme,
    toggleTheme: () => {},
    screenWidth: 0,
    screenHeight: 0,
    isSmallScreen: false,
    isMediumScreen: false,
    isLargeScreen: false,
});

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const [themeType, setThemeType] = useState<ThemeType>('light');
    const [dimensions, setDimensions] = useState(Dimensions.get('window'));

    useEffect(() => {
        const subscription = Dimensions.addEventListener('change', ({ window }) => {
            setDimensions(window);
        });

        return () => subscription?.remove();
    }, []);

    const toggleTheme = () => {
        setThemeType(prev => prev === 'light' ? 'dark' : 'light');
    };

    const theme = themeType === 'light' ? lightTheme : darkTheme;
    const screenWidth = dimensions.width;
    const screenHeight = dimensions.height;

    // Responsive breakpoints
    const isSmallScreen = screenWidth < 360;
    const isMediumScreen = screenWidth >= 360 && screenWidth < 768;
    const isLargeScreen = screenWidth >= 768;

    return (
        <ThemeContext.Provider value={{
            theme,
            toggleTheme,
            screenWidth,
            screenHeight,
            isSmallScreen,
            isMediumScreen,
            isLargeScreen,
        }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);

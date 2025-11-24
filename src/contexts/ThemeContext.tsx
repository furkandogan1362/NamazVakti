/**
 * Tema yönetimi için context sağlayıcı
 * Light ve dark tema desteği sağlar
 * Gradient arka planlar ve uyumlu renk paletleri içerir
 */

import React, { createContext, useState, useContext, useEffect } from 'react';
import { Dimensions, useColorScheme, LayoutAnimation, Platform, UIManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/theme';

// Android için LayoutAnimation'ı aktifleştir
if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

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
        accent: string;
        highlight: string;
        glass: string;
        icon: string;
        success: string;
        error: string;
    };
    gradientStart: { x: number; y: number };
    gradientEnd: { x: number; y: number };
}

const lightTheme: Theme = {
    type: 'light',
    colors: {
        background: COLORS.light.background,
        cardBackground: COLORS.light.card,
        cardBorder: COLORS.light.cardBorder,
        text: COLORS.light.text,
        secondaryText: COLORS.light.secondaryText,
        activeCard: [COLORS.light.accent, COLORS.light.highlight],
        activeText: '#FFFFFF',
        buttonBackground: COLORS.light.accent,
        buttonText: '#FFFFFF',
        pickerBackground: 'rgba(255, 255, 255, 0.5)',
        pickerBorder: COLORS.light.cardBorder,
        headerText: COLORS.light.text,
        shadow: COLORS.light.shadow,
        accent: COLORS.light.accent,
        highlight: COLORS.light.highlight,
        glass: COLORS.light.glass,
        icon: COLORS.light.icon,
        success: COLORS.light.success,
        error: COLORS.light.error,
    },
    gradientStart: { x: 0, y: 0 },
    gradientEnd: { x: 1, y: 1 },
};

const darkTheme: Theme = {
    type: 'dark',
    colors: {
        background: COLORS.dark.background,
        cardBackground: COLORS.dark.card,
        cardBorder: COLORS.dark.cardBorder,
        text: COLORS.dark.text,
        secondaryText: COLORS.dark.secondaryText,
        activeCard: [COLORS.dark.accent, COLORS.dark.highlight],
        activeText: '#FFFFFF',
        buttonBackground: COLORS.dark.accent,
        buttonText: '#FFFFFF',
        pickerBackground: 'rgba(30, 41, 59, 0.5)',
        pickerBorder: COLORS.dark.cardBorder,
        headerText: COLORS.dark.text,
        shadow: COLORS.dark.shadow,
        accent: COLORS.dark.accent,
        highlight: COLORS.dark.highlight,
        glass: COLORS.dark.glass,
        icon: COLORS.dark.icon,
        success: COLORS.dark.success,
        error: COLORS.dark.error,
    },
    gradientStart: { x: 0, y: 0 },
    gradientEnd: { x: 1, y: 1 },
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
    const systemScheme = useColorScheme();
    const [themeType, setThemeType] = useState<ThemeType>(systemScheme === 'dark' ? 'dark' : 'light');
    const [dimensions, setDimensions] = useState(Dimensions.get('window'));

    // Tema tercihini yükle
    useEffect(() => {
        const loadThemePreference = async () => {
            try {
                const savedTheme = await AsyncStorage.getItem('themePreference');
                if (savedTheme === 'light' || savedTheme === 'dark') {
                    setThemeType(savedTheme);
                }
                // Kayıtlı tema yoksa, başlangıçta systemScheme kullanıldığı için
                // ekstra bir işlem yapmaya gerek yok.
            } catch (error) {
                console.error('Error loading theme preference:', error);
            }
        };
        loadThemePreference();
    }, []);

    useEffect(() => {
        const subscription = Dimensions.addEventListener('change', ({ window }) => {
            setDimensions(window);
        });

        return () => subscription?.remove();
    }, []);

    const toggleTheme = async () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        const newTheme = themeType === 'light' ? 'dark' : 'light';
        setThemeType(newTheme);
        try {
            await AsyncStorage.setItem('themePreference', newTheme);
        } catch (error) {
            console.error('Error saving theme preference:', error);
        }
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

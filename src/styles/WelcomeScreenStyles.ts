import { StyleSheet } from 'react-native';

export const createWelcomeScreenStyles = (theme: any) => {
    return StyleSheet.create({
        welcomeContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
            marginTop: 40,
        },
        welcomeIconContainer: {
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: theme.colors.cardBackground,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 24,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8,
            borderWidth: 1,
            borderColor: theme.colors.cardBorder,
        },
        welcomeIcon: {
            fontSize: 48,
        },
        welcomeTitle: {
            fontSize: 32,
            fontWeight: 'bold',
            color: theme.colors.text,
            marginBottom: 12,
            textAlign: 'center',
        },
        welcomeText: {
            fontSize: 16,
            color: theme.colors.secondaryText,
            textAlign: 'center',
            marginBottom: 32,
            lineHeight: 24,
            maxWidth: '85%',
        },
        welcomeButton: {
            backgroundColor: theme.type === 'dark' ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.9)',
            paddingVertical: 16,
            paddingHorizontal: 32,
            borderRadius: 30,
            borderWidth: 1,
            borderColor: theme.colors.accent,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        welcomeButtonText: {
            color: theme.colors.text,
            fontSize: 18,
            fontWeight: 'bold',
        },
    });
};

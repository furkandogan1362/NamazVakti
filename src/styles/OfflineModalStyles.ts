import { StyleSheet } from 'react-native';

export const createOfflineModalStyles = (theme: any) => {
    return StyleSheet.create({
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
        },
        modalContent: {
            borderRadius: 20,
            width: '90%',
            maxWidth: 400,
        },
        modalInnerContent: {
            padding: 30,
            alignItems: 'center',
            backgroundColor: theme.type === 'dark' ? 'rgba(30, 41, 59, 0.5)' : 'rgba(255, 255, 255, 0.5)',
            borderRadius: 20,
        },
        modalIcon: {
            fontSize: 48,
            marginBottom: 15,
            textAlign: 'center',
        },
        modalTitle: {
            fontSize: 20,
            fontWeight: 'bold',
            color: theme.colors.text,
            marginBottom: 12,
            textAlign: 'center',
        },
        modalMessage: {
            fontSize: 16,
            color: theme.colors.text,
            textAlign: 'center',
            marginBottom: 10,
            lineHeight: 22,
        },
        modalSubMessage: {
            fontSize: 14,
            color: theme.colors.secondaryText,
            textAlign: 'center',
            marginBottom: 20,
            lineHeight: 20,
        },
        modalButton: {
            backgroundColor: theme.colors.accent,
            paddingVertical: 12,
            paddingHorizontal: 40,
            borderRadius: 25,
            marginTop: 10,
            minWidth: 120,
        },
        modalButtonText: {
            color: '#FFFFFF',
            fontSize: 16,
            fontWeight: 'bold',
            textAlign: 'center',
        },
    });
};

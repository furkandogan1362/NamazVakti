import { StyleSheet } from 'react-native';

export const createOfflineBannerStyles = (theme: any) => {
    return StyleSheet.create({
        offlineContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.type === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
            padding: 12,
            borderRadius: 12,
            marginBottom: 8,
            borderWidth: 1,
            borderColor: 'rgba(239, 68, 68, 0.2)',
        },
        offlineIcon: {
            fontSize: 24,
            marginRight: 12,
            color: theme.colors.text,
        },
        offlineTitle: {
            color: theme.colors.error,
            fontSize: 16,
            fontWeight: 'bold',
            marginBottom: 2,
        },
        offlineSubText: {
            color: theme.colors.secondaryText,
            fontSize: 12,
        },
    });
};

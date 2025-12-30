import { StyleSheet } from 'react-native';

export const createHeaderStyles = (theme: any, _isSmallScreen: boolean) => {
    return StyleSheet.create({
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
            paddingHorizontal: 5,
        },
        headerButtons: {
            flexDirection: 'row',
            gap: 10,
        },
        iconButton: {
            width: 44,
            height: 44,
            borderRadius: 22,
            overflow: 'hidden',
            backgroundColor: theme.colors.card,
            borderWidth: 1,
            borderColor: theme.colors.cardBorder,
        },
        iconButtonInner: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
        iconButtonText: {
            fontSize: 22,
            color: theme.colors.text,
        },
    });
};

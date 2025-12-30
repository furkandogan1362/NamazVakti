import { StyleSheet, StatusBar } from 'react-native';

export const appStyles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export const createAppStyles = (theme: any, isSmallScreen: boolean, screenWidth: number) => {
    const padding = isSmallScreen ? 10 : screenWidth < 768 ? 15 : 20;

    return StyleSheet.create({
        animatedContainer: {
            flex: 1,
        },
        gradientContainer: {
            flex: 1,
        },
        scrollContainer: {
            flexGrow: 1,
            padding: padding,
            paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 40,
            paddingBottom: 30,
        },
        // Used in OnboardingOverlay renderSpotlightContent
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

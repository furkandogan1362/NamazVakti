import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import GlassView from './ui/GlassView';

interface Props {
    visible: boolean;
    targetLayout: { x: number; y: number; width: number; height: number } | null;
    onClose: () => void;
    theme: any;
    title: string;
    message: string;
    stepText: string; // "1/2" or "2/2"
    renderSpotlightContent: () => React.ReactNode;
    onSpotlightPress: () => void;
}

const OnboardingOverlay: React.FC<Props> = ({
    visible,
    targetLayout,
    onClose,
    theme,
    title,
    message,
    stepText,
    renderSpotlightContent,
    onSpotlightPress,
}) => {
    if (!visible || !targetLayout) { return null; }

    const isDark = theme.type === 'dark';

    // Calculate arrow position
    // Message container starts at 20px from left
    // Arrow should point to the center of the target
    const arrowLeftPosition = (targetLayout.x + targetLayout.width / 2) - 20 - 10; // -20 for container padding, -10 for half arrow width

    return (
        <Modal
            transparent={true}
            visible={visible}
            animationType="fade"
            onRequestClose={() => {}}
        >
            <View style={styles.overlay}>
                {/* Backdrop */}
                <BlurView
                    style={styles.backdrop}
                    blurType={isDark ? 'dark' : 'light'}
                    blurAmount={10}
                    reducedTransparencyFallbackColor={isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)'}
                />
                <View style={[styles.backdropTint, isDark ? styles.backdropTintDark : styles.backdropTintLight]} />

                {/* Spotlight Element */}
                <View
                    style={[
                        styles.spotlightContainer,
                        {
                            top: targetLayout.y,
                            left: targetLayout.x,
                            width: targetLayout.width,
                            height: targetLayout.height,
                        },
                    ]}
                >
                    <TouchableOpacity
                        style={[
                            styles.iconButton,
                            {
                                backgroundColor: theme.colors.card,
                                borderColor: theme.colors.cardBorder,
                            },
                        ]}
                        onPress={onSpotlightPress}
                        activeOpacity={0.7}
                    >
                        {renderSpotlightContent()}
                    </TouchableOpacity>
                </View>

                {/* Message Box */}
                <View
                    style={[
                        styles.messageContainer,
                        {
                            top: targetLayout.y + targetLayout.height + 20,
                        },
                    ]}
                >
                    <GlassView
                        style={[
                            styles.glassMessage,
                            !isDark ? styles.lightThemeMessage : {},
                        ]}
                        intensity={30}
                        overlayOpacity={isDark ? undefined : 0.95}
                    >
                        <View style={styles.messageBox}>
                            {/* Step Indicator */}
                            <Text style={[styles.stepText, { color: theme.colors.accent }]}>
                                {stepText}
                            </Text>

                            <View style={[
                                styles.arrow,
                                isDark ? styles.arrowDark : styles.arrowLight,
                                {
                                    left: arrowLeftPosition,
                                },
                            ]} />

                            <Text style={[styles.title, { color: theme.colors.text }]}>
                                {title}
                            </Text>
                            <Text style={[styles.message, { color: theme.colors.secondaryText }]}>
                                {message}
                            </Text>

                            <TouchableOpacity
                                style={[styles.okButton, { backgroundColor: theme.colors.accent }]}
                                onPress={onClose}
                            >
                                <Text style={styles.okButtonText}>Tamam</Text>
                            </TouchableOpacity>
                        </View>
                    </GlassView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    backdropTint: {
        ...StyleSheet.absoluteFillObject,
    },
    backdropTintDark: {
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    backdropTintLight: {
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    spotlightContainer: {
        position: 'absolute',
        zIndex: 2,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 10,
    },
    iconButton: {
        width: '100%',
        height: '100%',
        borderRadius: 22,
        overflow: 'hidden',
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    messageContainer: {
        position: 'absolute',
        alignItems: 'center',
        zIndex: 2,
        left: 20,
        right: 20,
    },
    glassMessage: {
        borderRadius: 16,
        width: '100%',
        maxWidth: 400,
    },
    lightThemeMessage: {
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 5,
        },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 15,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    messageBox: {
        padding: 20,
        alignItems: 'center',
        position: 'relative',
    },
    arrow: {
        position: 'absolute',
        top: -10,
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 10,
        borderRightWidth: 10,
        borderBottomWidth: 10,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
    },
    arrowDark: {
        borderBottomColor: 'rgba(63, 63, 70, 0.9)',
    },
    arrowLight: {
        borderBottomColor: '#FFFFFF',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
        marginTop: 10, // Space for step text
    },
    message: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
    },
    okButton: {
        paddingVertical: 10,
        paddingHorizontal: 30,
        borderRadius: 20,
        minWidth: 120,
        alignItems: 'center',
    },
    okButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    stepText: {
        position: 'absolute',
        top: 15,
        left: 20,
        fontSize: 14,
        fontWeight: 'bold',
    },
});

export default OnboardingOverlay;

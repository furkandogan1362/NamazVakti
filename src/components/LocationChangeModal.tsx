import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import GlassView from './ui/GlassView';
import { useTheme } from '../contexts/ThemeContext';

interface LocationChangeModalProps {
    visible: boolean;
    newLocationName: string;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading?: boolean;
}

const LocationChangeModal: React.FC<LocationChangeModalProps> = ({
    visible,
    newLocationName,
    onConfirm,
    onCancel,
    isLoading = false,
}) => {
    const { theme, isSmallScreen, screenWidth } = useTheme();
    const styles = createStyles(theme, isSmallScreen, screenWidth);

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={isLoading ? () => {} : onCancel}
        >
            <View style={styles.modalOverlay}>
                <GlassView style={styles.modalContent} autoHeight={true} overlayOpacity={0.99}>
                    <View style={styles.modalInner}>
                        <View style={styles.iconContainer}>
                            <Text style={styles.icon}>📍</Text>
                        </View>

                        <Text style={styles.title}>Konum Değişikliği Tespit Edildi</Text>

                        <Text style={styles.message}>
                            Konumunuzun <Text style={styles.highlight}>{newLocationName}</Text> olarak değiştiğini tespit ettik.
                        </Text>

                        <Text style={styles.subMessage}>
                            Yeni konumunuza göre namaz vakitlerini güncellememizi ister misiniz?
                        </Text>

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={[styles.cancelButton, isLoading && styles.disabledButton]}
                                onPress={onCancel}
                                disabled={isLoading}
                            >
                                <Text style={[styles.cancelButtonText, isLoading && styles.disabledButtonText]}>Hayır, Kalsın</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.confirmButton, isLoading && styles.disabledButton]}
                                onPress={onConfirm}
                                disabled={isLoading}
                            >
                                <Text style={styles.confirmButtonText}>
                                    {isLoading ? 'Güncelleniyor...' : 'Evet, Güncelle'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </GlassView>
            </View>
        </Modal>
    );
};

const createStyles = (theme: any, _isSmallScreen: boolean, _screenWidth: number) => {
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
            width: '95%',
            maxWidth: 400,
        },
        modalInner: {
            padding: 24,
            alignItems: 'center',
        },
        iconContainer: {
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: theme.colors.cardBackground,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 20,
            borderWidth: 1,
            borderColor: theme.colors.cardBorder,
        },
        icon: {
            fontSize: 40,
        },
        title: {
            fontSize: 20,
            fontWeight: 'bold',
            color: theme.colors.text,
            marginBottom: 16,
            textAlign: 'center',
        },
        message: {
            fontSize: 16,
            color: theme.colors.text,
            textAlign: 'center',
            marginBottom: 8,
            lineHeight: 24,
        },
        highlight: {
            fontWeight: 'bold',
            color: theme.colors.accent,
        },
        subMessage: {
            fontSize: 14,
            color: theme.colors.secondaryText,
            textAlign: 'center',
            marginBottom: 24,
            lineHeight: 20,
        },
        buttonContainer: {
            flexDirection: 'row',
            gap: 12,
            width: '100%',
        },
        cancelButton: {
            flex: 1,
            paddingVertical: 14,
            borderRadius: 12,
            backgroundColor: theme.colors.card,
            borderWidth: 1,
            borderColor: theme.colors.cardBorder,
            alignItems: 'center',
        },
        cancelButtonText: {
            fontSize: 16,
            fontWeight: '600',
            color: theme.colors.text,
        },
        confirmButton: {
            flex: 1,
            paddingVertical: 14,
            borderRadius: 12,
            backgroundColor: theme.colors.accent,
            alignItems: 'center',
        },
        confirmButtonText: {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#FFFFFF',
        },
        disabledButton: {
            opacity: 0.6,
        },
        disabledButtonText: {
            color: theme.colors.secondaryText,
        },
    });
};

export default LocationChangeModal;

import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import GlassView from './ui/GlassView';
import LocationPicker from './LocationPicker';
import { useTheme } from '../contexts/ThemeContext';

interface LocationModalProps {
    visible: boolean;
    onClose: () => void;
}

const LocationModal: React.FC<LocationModalProps> = ({ visible, onClose }) => {
    const { theme, isSmallScreen, screenWidth } = useTheme();
    const styles = createStyles(theme, isSmallScreen, screenWidth);

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <GlassView style={styles.locationModalContent} autoHeight={true} overlayOpacity={0.99}>
                    <View style={styles.locationModalInner}>
                        <View style={styles.locationModalHeader}>
                            <Text style={styles.locationModalTitle}>Konum Değiştir</Text>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={onClose}
                            >
                                <Text style={styles.closeButtonText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.locationModalMessage}>
                            Namaz vakitlerini doğru görüntülemek için lütfen konumunuzu seçin.
                        </Text>

                        <LocationPicker onClose={onClose} />
                    </View>
                </GlassView>
            </View>
        </Modal>
    );
};

const createStyles = (theme: any, isSmallScreen: boolean, screenWidth: number) => {
    return StyleSheet.create({
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
        },
        locationModalContent: {
            borderRadius: 20,
            width: '95%',
            maxWidth: 500,
            maxHeight: '80%',
        },
        locationModalInner: {
            padding: 20,
        },
        locationModalHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 15,
            paddingBottom: 10,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.cardBorder,
        },
        locationModalTitle: {
            fontSize: 20,
            fontWeight: 'bold',
            color: theme.colors.text,
        },
        locationModalMessage: {
            fontSize: 14,
            color: theme.colors.secondaryText,
            marginBottom: 15,
            textAlign: 'center',
        },
        closeButton: {
            width: 30,
            height: 30,
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 15,
            backgroundColor: theme.colors.cardBackground,
        },
        closeButtonText: {
            fontSize: 18,
            color: theme.colors.text,
            fontWeight: 'bold',
        },
    });
};

export default React.memo(LocationModal);

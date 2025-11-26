// LocationMethodModal.tsx

/**
 * Konum belirleme yöntemi seçim modalı
 * Kullanıcıya GPS veya Manuel konum seçme seçenekleri sunar.
 */

import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import GlassView from './ui/GlassView';

interface LocationMethodModalProps {
    visible: boolean;
    onClose: () => void;
    onSelectGPS: () => void;
    onSelectManual: () => void;
}

const LocationMethodModal: React.FC<LocationMethodModalProps> = ({
    visible,
    onClose,
    onSelectGPS,
    onSelectManual,
}) => {
    const { theme } = useTheme();

    // Animasyon değerleri
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    useEffect(() => {
        if (visible) {
            // Modal açılınca animasyon
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            // Reset values when hidden
            fadeAnim.setValue(0);
            scaleAnim.setValue(0.95);
        }
    }, [visible, fadeAnim, scaleAnim]);

    // Animasyonlu kapanış fonksiyonu
    const animateOut = (callback: () => void) => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 0.95,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start(() => callback());
    };

    const handleClose = () => animateOut(onClose);
    const handleSelectGPS = () => animateOut(onSelectGPS);
    const handleSelectManual = () => animateOut(onSelectManual);

    const styles = createStyles(theme);

    return (
        <Modal
            animationType="none"
            transparent={true}
            visible={visible}
            onRequestClose={handleClose}
            statusBarTranslucent={true}
        >
            <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
                <Animated.View style={[styles.animatedContainer, { transform: [{ scale: scaleAnim }] }]}>
                    <GlassView style={styles.modalContent} autoHeight={true} overlayOpacity={0.99}>
                        <View style={styles.modalInner}>
                            {/* Header */}
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Konum Belirleme</Text>
                                <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                                    <Text style={styles.closeButtonText}>✕</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.modalMessage}>
                                Namaz vakitlerini görüntülemek için konum belirleme yönteminizi seçin
                            </Text>

                            {/* GPS Seçeneği */}
                            <TouchableOpacity
                                style={styles.optionButton}
                                onPress={handleSelectGPS}
                                activeOpacity={0.7}
                            >
                                <View style={styles.optionIconContainer}>
                                    <MaterialIcons name="my-location" size={28} color="#FFFFFF" />
                                </View>
                                <View style={styles.optionTextContainer}>
                                    <Text style={styles.optionTitle}>GPS ile Konum Bul</Text>
                                    <Text style={styles.optionDescription}>
                                        Cihazınızın konumunu kullanarak otomatik olarak namaz vakitlerini belirleyin
                                    </Text>
                                </View>
                                <MaterialIcons name="chevron-right" size={24} color={theme.colors.secondaryText} />
                            </TouchableOpacity>

                            {/* Manuel Seçeneği */}
                            <TouchableOpacity
                                style={styles.optionButton}
                                onPress={handleSelectManual}
                                activeOpacity={0.7}
                            >
                                <View style={styles.optionIconContainer}>
                                    <MaterialIcons name="edit-location" size={28} color="#FFFFFF" />
                                </View>
                                <View style={styles.optionTextContainer}>
                                    <Text style={styles.optionTitle}>Manuel Konum Seç</Text>
                                    <Text style={styles.optionDescription}>
                                        Ülke, şehir ve ilçe seçerek konumunuzu manuel olarak belirleyin
                                    </Text>
                                </View>
                                <MaterialIcons name="chevron-right" size={24} color={theme.colors.secondaryText} />
                            </TouchableOpacity>
                        </View>
                    </GlassView>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
};

const createStyles = (theme: any) => {
    return StyleSheet.create({
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
        },
        animatedContainer: {
            width: '95%',
            maxWidth: 500,
        },
        modalContent: {
            borderRadius: 20,
            width: '100%',
        },
        modalInner: {
            padding: 20,
        },
        modalHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 15,
            paddingBottom: 10,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.cardBorder,
        },
        modalTitle: {
            fontSize: 20,
            fontWeight: 'bold',
            color: theme.colors.text,
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
        modalMessage: {
            fontSize: 14,
            color: theme.colors.secondaryText,
            marginBottom: 20,
            textAlign: 'center',
        },
        optionButton: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
            backgroundColor: theme.colors.card,
            borderRadius: 16,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: theme.colors.cardBorder,
        },
        optionIconContainer: {
            width: 52,
            height: 52,
            borderRadius: 26,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 16,
            backgroundColor: theme.colors.accent,
        },
        optionTextContainer: {
            flex: 1,
        },
        optionTitle: {
            fontSize: 16,
            fontWeight: '600',
            color: theme.colors.text,
            marginBottom: 4,
        },
        optionDescription: {
            fontSize: 13,
            color: theme.colors.secondaryText,
            lineHeight: 18,
        },
    });
};

export default LocationMethodModal;

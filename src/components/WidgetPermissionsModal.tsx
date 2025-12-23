import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import GlassView from './ui/GlassView';
import { useTheme } from '../contexts/ThemeContext';
import {
    requestBatteryOptimization,
    requestOverlayPermission,
    openAutoStartSettings,
    requestNotificationPermission,
    openLockScreenNotificationSettings,
    startNotificationService,
} from '../services/WidgetService';

interface WidgetPermissionsModalProps {
    visible: boolean;
    onClose: () => void;
}

const WidgetPermissionsModal: React.FC<WidgetPermissionsModalProps> = ({ visible, onClose }) => {
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
                <GlassView style={styles.modalContent} autoHeight={false} overlayOpacity={0.99}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Widget Ayarları</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Text style={styles.closeButtonText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                        <Text style={styles.description}>
                            Ana ekran widget'ının sorunsuz çalışması ve vakitleri güncel tutabilmesi için aşağıdaki izinlerin verilmesi önerilir.
                        </Text>

                        <View style={styles.permissionItem}>
                            <View style={styles.permissionInfo}>
                                <Text style={styles.permissionTitle}>Bildirim İzni</Text>
                                <Text style={styles.permissionDesc}>Kalıcı bildirim ve kilit ekranı bildirimi için gereklidir.</Text>
                            </View>
                            <TouchableOpacity style={styles.actionButton} onPress={() => {
                                requestNotificationPermission();
                                // Kısa bir gecikme ile servisi başlat
                                setTimeout(() => startNotificationService(), 1000);
                            }}>
                                <Text style={styles.actionButtonText}>İzin Ver</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.permissionItem}>
                            <View style={styles.permissionInfo}>
                                <Text style={styles.permissionTitle}>Kilit Ekranı Bildirimi</Text>
                                <Text style={styles.permissionDesc}>Xiaomi/MIUI için kilit ekranı bildirim ayarlarını açar.</Text>
                            </View>
                            <TouchableOpacity style={[styles.actionButton, styles.purpleButton]} onPress={openLockScreenNotificationSettings}>
                                <Text style={styles.actionButtonText}>Ayarları Aç</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.permissionItem}>
                            <View style={styles.permissionInfo}>
                                <Text style={styles.permissionTitle}>Pil Optimizasyonu</Text>
                                <Text style={styles.permissionDesc}>Widget'ın arka planda güncellenebilmesi için gereklidir.</Text>
                            </View>
                            <TouchableOpacity style={styles.actionButton} onPress={requestBatteryOptimization}>
                                <Text style={styles.actionButtonText}>İzin Ver</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.permissionItem}>
                            <View style={styles.permissionInfo}>
                                <Text style={styles.permissionTitle}>Diğer Uygulamalar Üzerinde Göster</Text>
                                <Text style={styles.permissionDesc}>Bazı cihazlarda widget'ın doğru çalışması için gerekebilir.</Text>
                            </View>
                            <TouchableOpacity style={styles.actionButton} onPress={requestOverlayPermission}>
                                <Text style={styles.actionButtonText}>İzin Ver</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.permissionItem}>
                            <View style={styles.permissionInfo}>
                                <Text style={styles.permissionTitle}>Otomatik Başlatma</Text>
                                <Text style={styles.permissionDesc}>Telefon yeniden başlatıldığında widget'ın çalışması için gereklidir (Xiaomi, Huawei vb.).</Text>
                            </View>
                            <TouchableOpacity style={styles.actionButton} onPress={openAutoStartSettings}>
                                <Text style={styles.actionButtonText}>Ayarları Aç</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.permissionItem}>
                            <View style={styles.permissionInfo}>
                                <Text style={styles.permissionTitle}>Bildirimi Başlat</Text>
                                <Text style={styles.permissionDesc}>Kalıcı namaz vakti bildirimini şimdi başlat.</Text>
                            </View>
                            <TouchableOpacity style={[styles.actionButton, styles.greenButton]} onPress={startNotificationService}>
                                <Text style={styles.actionButtonText}>Başlat</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.noteContainer}>
                            <Text style={styles.noteTitle}>Not:</Text>
                            <Text style={styles.noteText}>
                                Eğer widget saati güncellenmiyorsa veya donuyorsa, lütfen bu izinleri kontrol edin ve widget'ı ana ekrandan kaldırıp tekrar ekleyin.
                            </Text>
                        </View>
                    </ScrollView>
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
            maxWidth: 500,
            height: '70%',
            maxHeight: 600,
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 20,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.cardBorder,
        },
        title: {
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
            fontSize: 16,
            color: theme.colors.text,
            fontWeight: 'bold',
        },
        scrollView: {
            flex: 1,
        },
        scrollContent: {
            padding: 20,
        },
        description: {
            fontSize: 14,
            color: theme.colors.secondaryText,
            marginBottom: 20,
            lineHeight: 20,
        },
        permissionItem: {
            backgroundColor: theme.colors.card,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: theme.colors.cardBorder,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        permissionInfo: {
            flex: 1,
            marginRight: 12,
        },
        permissionTitle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: theme.colors.text,
            marginBottom: 4,
        },
        permissionDesc: {
            fontSize: 12,
            color: theme.colors.secondaryText,
        },
        actionButton: {
            backgroundColor: theme.colors.accent,
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 8,
        },
        actionButtonText: {
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: 'bold',
        },
        purpleButton: {
            backgroundColor: '#9C27B0',
        },
        greenButton: {
            backgroundColor: '#4CAF50',
        },
        noteContainer: {
            marginTop: 10,
            padding: 12,
            backgroundColor: 'rgba(255, 193, 7, 0.1)',
            borderRadius: 8,
            borderWidth: 1,
            borderColor: 'rgba(255, 193, 7, 0.3)',
        },
        noteTitle: {
            fontSize: 14,
            fontWeight: 'bold',
            color: theme.colors.text,
            marginBottom: 4,
        },
        noteText: {
            fontSize: 12,
            color: theme.colors.secondaryText,
            lineHeight: 18,
        },
    });
};

export default WidgetPermissionsModal;

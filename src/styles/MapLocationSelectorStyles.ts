// MapLocationSelectorStyles.ts

/**
 * Haritadan Konum Seçici bileşeni için stiller
 * Uber/Getir tarzı harita seçim ekranı
 */

import { StyleSheet, Platform } from 'react-native';

export const createStyles = (theme: any) => {
    return StyleSheet.create({
        // Modal ve Container
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
        },
        container: {
            flex: 1,
        },
        mapContainer: {
            flex: 1,
            position: 'relative',
        },

        // Harita
        map: {
            ...StyleSheet.absoluteFillObject,
        },

        // Sabit Pin (Harita ortasında)
        pinContainer: {
            position: 'absolute',
            top: '50%',
            left: '50%',
            marginLeft: -24,
            marginTop: -48, // Pin'in alt ucu merkeze gelsin
            zIndex: 10,
        },
        pinShadow: {
            position: 'absolute',
            bottom: -4,
            left: 12,
            width: 24,
            height: 8,
            borderRadius: 4,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
        },

        // Header (Geri Butonu)
        headerContainer: {
            position: 'absolute',
            top: Platform.OS === 'ios' ? 60 : 40,
            left: 16,
            right: 16,
            zIndex: 20,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        backButton: {
            width: 48,
            height: 48,
            borderRadius: 24,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: theme.colors.cardBackground,
            borderWidth: 1,
            borderColor: theme.colors.cardBorder,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 5,
        },
        headerTitle: {
            fontSize: 18,
            fontWeight: '600',
            color: theme.colors.text,
        },
        placeholder: {
            width: 48,
        },

        // Konumuma Git Butonu
        myLocationButton: {
            position: 'absolute',
            bottom: 220,
            right: 16,
            width: 52,
            height: 52,
            borderRadius: 26,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: theme.colors.cardBackground,
            borderWidth: 1,
            borderColor: theme.colors.cardBorder,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 5,
            zIndex: 15,
        },

        // Bottom Card (Alt Panel) - GlassView ile sarıldığı için padding burada
        bottomCard: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            zIndex: 20,
            overflow: 'hidden',
        },
        bottomCardInner: {
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        },

        // Alt Kart İçerik
        addressContainer: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            marginBottom: 16,
        },
        addressIconContainer: {
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: theme.colors.accent,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
        },
        addressTextContainer: {
            flex: 1,
        },
        addressLabel: {
            fontSize: 13,
            color: theme.colors.secondaryText,
            marginBottom: 4,
        },
        addressText: {
            fontSize: 16,
            fontWeight: '600',
            color: theme.colors.text,
            lineHeight: 22,
        },
        loadingAddressContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            height: 44,
        },
        loadingAddressText: {
            marginLeft: 8,
            fontSize: 14,
            color: theme.colors.secondaryText,
        },

        // Koordinat Bilgisi
        coordsContainer: {
            backgroundColor: theme.colors.card || 'rgba(0,0,0,0.05)',
            borderRadius: 12,
            padding: 12,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: theme.colors.cardBorder,
        },
        coordsText: {
            fontSize: 12,
            color: theme.colors.secondaryText,
            fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
            textAlign: 'center',
        },

        // Onayla Butonu
        confirmButton: {
            backgroundColor: theme.colors.accent,
            paddingVertical: 16,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
        },
        confirmButtonDisabled: {
            opacity: 0.6,
        },
        confirmButtonText: {
            color: '#FFFFFF',
            fontSize: 17,
            fontWeight: 'bold',
        },

        // İzin Ekranı
        permissionContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 30,
            backgroundColor: theme.colors.cardBackground,
        },
        permissionIconContainer: {
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: theme.colors.accent,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 24,
        },
        permissionTitle: {
            fontSize: 22,
            fontWeight: 'bold',
            color: theme.colors.text,
            marginBottom: 12,
            textAlign: 'center',
        },
        permissionMessage: {
            fontSize: 15,
            color: theme.colors.secondaryText,
            textAlign: 'center',
            lineHeight: 22,
            marginBottom: 24,
            paddingHorizontal: 10,
        },
        permissionButtonContainer: {
            width: '100%',
            gap: 12,
        },
        permissionButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.accent,
            paddingVertical: 14,
            paddingHorizontal: 24,
            borderRadius: 20,
            gap: 8,
        },
        permissionButtonText: {
            color: '#FFFFFF',
            fontSize: 16,
            fontWeight: 'bold',
        },
        settingsButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.accent,
            paddingVertical: 14,
            paddingHorizontal: 24,
            borderRadius: 20,
            gap: 8,
        },
        settingsButtonText: {
            color: '#FFFFFF',
            fontSize: 16,
            fontWeight: 'bold',
        },
        cancelButton: {
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.card,
            paddingVertical: 14,
            paddingHorizontal: 24,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: theme.colors.cardBorder,
        },
        cancelButtonText: {
            color: theme.colors.text,
            fontSize: 16,
            fontWeight: '600',
        },

        // Loading Overlay
        loadingOverlay: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 100,
        },
        loadingContent: {
            backgroundColor: theme.colors.cardBackground,
            borderRadius: 16,
            padding: 24,
            alignItems: 'center',
            minWidth: 200,
        },
        loadingText: {
            marginTop: 12,
            fontSize: 15,
            color: theme.colors.text,
            fontWeight: '500',
        },

        // Hata Mesajı
        errorContainer: {
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderRadius: 12,
            padding: 12,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: 'rgba(239, 68, 68, 0.3)',
        },
        errorText: {
            fontSize: 14,
            color: '#EF4444',
            textAlign: 'center',
        },
    });
};

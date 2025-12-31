import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import LocationModal from './LocationModal';
import SavedLocationsModal from './SavedLocationsModal';
import LocationMethodModal from './LocationMethodModal';
import MapLocationSelector, { MapLocationResult } from './MapLocationSelector';
import OfflineModal from './OfflineModal';
import OnboardingOverlay from './OnboardingOverlay';
import GPSLocationService, { GPSLocationResult } from './GPSLocationService';
import QiblaCompass from './QiblaCompass';
import LocationChangeModal from './LocationChangeModal';
import WidgetPermissionsModal from './WidgetPermissionsModal';
import GlassView from './ui/GlassView';
import { createAppStyles } from '../styles/AppStyles';

interface AppModalsProps {
    isLocationPickerOpen: boolean;
    isOnline: boolean;
    onCloseLocationPicker: () => void;
    isSavedLocationsModalOpen: boolean;
    setIsSavedLocationsModalOpen: (open: boolean) => void;
    currentLocation?: { id?: number; country: string; city: string; district: string };
    onToggleLocationPicker: () => void;
    showLocationMethodModal: boolean;
    setShowLocationMethodModal: (show: boolean) => void;
    onSelectGPSMethod: () => void;
    onSelectManualMethod: () => void;
    onSelectMapMethod: () => void;
    showMapSelector: boolean;
    onMapComplete: (result: MapLocationResult) => void;
    setShowMapSelector: (show: boolean) => void;
    showOfflineModal: boolean;
    onCloseOfflineModal: () => void;
    onboardingStep: number;
    targetLayout: any;
    onOnboardingClose: () => void;
    theme: any;
    onToggleTheme: () => void;
    showGPSService: boolean;
    onGPSComplete: (result: GPSLocationResult) => void;
    onGPSSkip: () => void;
    showQiblaCompass: boolean;
    setShowQiblaCompass: (show: boolean) => void;
    showChangeModal: boolean;
    newLocation: any;
    newLocationFullAddress?: string; // Detaylı adres (sokak, mahalle vs.)
    onConfirmLocationChange: () => void;
    onCancelLocationChange: () => void;
    isChangingLocation: boolean;
    showWidgetPermissions: boolean;
    setShowWidgetPermissions: (show: boolean) => void;
    isSmallScreen: boolean;
    screenWidth: number;
    // Aynı konum modalı
    showSameLocationModal: boolean;
    sameLocationName: string;
    onCloseSameLocationModal: () => void;
    onShowSameLocation: (locationName: string) => void;
}

const AppModals: React.FC<AppModalsProps> = ({
    isLocationPickerOpen,
    isOnline,
    onCloseLocationPicker,
    isSavedLocationsModalOpen,
    setIsSavedLocationsModalOpen,
    currentLocation,
    onToggleLocationPicker,
    showLocationMethodModal,
    setShowLocationMethodModal,
    onSelectGPSMethod,
    onSelectManualMethod,
    onSelectMapMethod,
    showMapSelector,
    onMapComplete,
    setShowMapSelector,
    showOfflineModal,
    onCloseOfflineModal,
    onboardingStep,
    targetLayout,
    onOnboardingClose,
    theme,
    onToggleTheme,
    showGPSService,
    onGPSComplete,
    onGPSSkip,
    showQiblaCompass,
    setShowQiblaCompass,
    showChangeModal,
    newLocation,
    newLocationFullAddress,
    onConfirmLocationChange,
    onCancelLocationChange,
    isChangingLocation,
    showWidgetPermissions,
    setShowWidgetPermissions,
    isSmallScreen,
    screenWidth,
    showSameLocationModal,
    sameLocationName,
    onCloseSameLocationModal,
    onShowSameLocation,
}) => {
    const styles = createAppStyles(theme, isSmallScreen, screenWidth);
    const sameLocationStyles = createSameLocationStyles(theme);

    return (
        <>
            <LocationModal
                visible={isLocationPickerOpen && isOnline}
                onClose={onCloseLocationPicker}
                onSameLocation={onShowSameLocation}
            />

            <SavedLocationsModal
                visible={isSavedLocationsModalOpen}
                onClose={() => setIsSavedLocationsModalOpen(false)}
                currentLocation={currentLocation}
                onAddLocation={() => {
                    setIsSavedLocationsModalOpen(false);
                    if (!isLocationPickerOpen) {
                        onToggleLocationPicker();
                    }
                }}
            />

            <LocationMethodModal
                visible={showLocationMethodModal && isOnline}
                onClose={() => setShowLocationMethodModal(false)}
                onSelectGPS={onSelectGPSMethod}
                onSelectManual={onSelectManualMethod}
                onSelectMap={onSelectMapMethod}
            />

            <MapLocationSelector
                visible={showMapSelector && isOnline}
                onComplete={onMapComplete}
                onClose={() => setShowMapSelector(false)}
            />

            <OfflineModal
                visible={showOfflineModal}
                onClose={onCloseOfflineModal}
            />

            <OnboardingOverlay
                visible={onboardingStep > 0}
                targetLayout={targetLayout}
                onClose={onOnboardingClose}
                theme={theme}
                title={onboardingStep === 1 ? 'Tema Ayarı' : 'Konum Değiştirme'}
                message={onboardingStep === 1
                    ? 'Temanız sisteminizin temasına göre ayarlandı, dilerseniz yukarıdaki tema değiştirme butonuna tıklayarak temanızı değiştirebilirsiniz.'
                    : 'Konumunuzu değiştirmek isterseniz yukarıdaki konum butonuna tıklayarak yeni bir konum seçebilirsiniz.'
                }
                stepText={onboardingStep === 1 ? '1/2' : '2/2'}
                onSpotlightPress={onboardingStep === 1 ? onToggleTheme : onToggleLocationPicker}
                renderSpotlightContent={() => (
                    <View style={styles.iconButtonInner}>
                        {onboardingStep === 1 ? (
                            <Text style={styles.iconButtonText}>
                                {theme.type === 'light' ? '🌙' : '☀️'}
                            </Text>
                        ) : (
                            <MaterialIcons
                                name="location-on"
                                size={27}
                                color={theme.colors.accent}
                            />
                        )}
                    </View>
                )}
            />

            <GPSLocationService
                visible={showGPSService && isOnline}
                onComplete={onGPSComplete}
                onSkip={onGPSSkip}
            />

            <QiblaCompass
                visible={showQiblaCompass}
                onClose={() => setShowQiblaCompass(false)}
            />

            <LocationChangeModal
                visible={showChangeModal}
                newLocationName={newLocationFullAddress || (newLocation ? `${newLocation.name}, ${newLocation.city}` : '')}
                onConfirm={onConfirmLocationChange}
                onCancel={onCancelLocationChange}
                isLoading={isChangingLocation}
            />

            <WidgetPermissionsModal
                visible={showWidgetPermissions}
                onClose={() => setShowWidgetPermissions(false)}
            />

            {/* Aynı Konum Modalı */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={showSameLocationModal}
                onRequestClose={onCloseSameLocationModal}
            >
                <View style={sameLocationStyles.modalOverlay}>
                    <GlassView style={sameLocationStyles.sameLocationModal} autoHeight={true} overlayOpacity={0.95}>
                        <View style={sameLocationStyles.sameLocationModalInner}>
                            <View style={sameLocationStyles.sameLocationIconContainer}>
                                <MaterialIcons name="location-on" size={40} color={theme.colors.accent} />
                            </View>
                            <Text style={sameLocationStyles.sameLocationTitle}>Aynı Konum</Text>
                            <Text style={sameLocationStyles.sameLocationMessage}>
                                Zaten <Text style={sameLocationStyles.sameLocationHighlight}>{sameLocationName}</Text> konumundasınız.
                            </Text>
                            <Text style={sameLocationStyles.sameLocationSubMessage}>
                                Mevcut namaz vakitleri kullanılmaya devam edecek.
                            </Text>
                            <TouchableOpacity
                                style={sameLocationStyles.sameLocationButton}
                                onPress={onCloseSameLocationModal}
                            >
                                <Text style={sameLocationStyles.sameLocationButtonText}>Tamam</Text>
                            </TouchableOpacity>
                        </View>
                    </GlassView>
                </View>
            </Modal>
        </>
    );
};

// Aynı Konum Modal Stilleri
const createSameLocationStyles = (theme: any) => StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    sameLocationModal: {
        borderRadius: 20,
        width: '90%',
        maxWidth: 350,
    },
    sameLocationModalInner: {
        padding: 25,
        alignItems: 'center',
    },
    sameLocationIconContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: theme.colors.accent + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    sameLocationTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 12,
        textAlign: 'center',
    },
    sameLocationMessage: {
        fontSize: 15,
        color: theme.colors.secondaryText,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 8,
    },
    sameLocationHighlight: {
        color: theme.colors.accent,
        fontWeight: 'bold',
    },
    sameLocationSubMessage: {
        fontSize: 13,
        color: theme.colors.secondaryText,
        textAlign: 'center',
        marginBottom: 20,
        opacity: 0.8,
    },
    sameLocationButton: {
        backgroundColor: theme.colors.accent,
        paddingVertical: 12,
        paddingHorizontal: 40,
        borderRadius: 25,
        minWidth: 140,
    },
    sameLocationButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
});

export default AppModals;

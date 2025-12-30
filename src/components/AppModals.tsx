import React from 'react';
import { View, Text } from 'react-native';
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
import { createAppStyles } from '../styles/AppStyles';

interface AppModalsProps {
    isLocationPickerOpen: boolean;
    isOnline: boolean;
    onCloseLocationPicker: () => void;
    isSavedLocationsModalOpen: boolean;
    setIsSavedLocationsModalOpen: (open: boolean) => void;
    currentLocation?: { country: string; city: string; district: string };
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
    onConfirmLocationChange: () => void;
    onCancelLocationChange: () => void;
    isChangingLocation: boolean;
    showWidgetPermissions: boolean;
    setShowWidgetPermissions: (show: boolean) => void;
    isSmallScreen: boolean;
    screenWidth: number;
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
    onConfirmLocationChange,
    onCancelLocationChange,
    isChangingLocation,
    showWidgetPermissions,
    setShowWidgetPermissions,
    isSmallScreen,
    screenWidth,
}) => {
    const styles = createAppStyles(theme, isSmallScreen, screenWidth);

    return (
        <>
            <LocationModal
                visible={isLocationPickerOpen && isOnline}
                onClose={onCloseLocationPicker}
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
                newLocationName={newLocation ? `${newLocation.name}, ${newLocation.city}` : ''}
                onConfirm={onConfirmLocationChange}
                onCancel={onCancelLocationChange}
                isLoading={isChangingLocation}
            />

            <WidgetPermissionsModal
                visible={showWidgetPermissions}
                onClose={() => setShowWidgetPermissions(false)}
            />
        </>
    );
};

export default AppModals;

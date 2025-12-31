import React from 'react';
import { ScrollView, StatusBar, Animated } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NetworkProvider } from './contexts/NetworkContext';
import { LocationProvider } from './contexts/LocationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import WeeklyPrayerTimes from './screens/WeeklyPrayerTimes';
import MonthlyPrayerTimes from './screens/MonthlyPrayerTimes';
import PrayerTimesDisplay from './components/PrayerTimesDisplay';
import GradientBackground from './components/ui/GradientBackground';
import Header from './components/Header';
import OfflineBanner from './components/OfflineBanner';
import WelcomeScreen from './components/WelcomeScreen';
import AppModals from './components/AppModals';
import { useAppLogic, DisplayLocation } from './hooks/useAppLogic';
import { createAppStyles, appStyles } from './styles/AppStyles';

const AppContent: React.FC = () => {
    const {
        theme,
        isSmallScreen,
        screenWidth,
        fadeAnim,
        isOnline,
        selectedLocation,
        gpsLocationInfo,
        locationMode,
        isGPSMode,
        currentScreen,
        isLocationPickerOpen,
        isSavedLocationsModalOpen,
        initialCheckDone,
        hasCachedData,
        showOfflineModal,
        previousLocation,
        showGPSService,
        showLocationMethodModal,
        showMapSelector,
        showQiblaCompass,
        isChangingLocation,
        showWidgetPermissions,
        onboardingStep,
        targetLayout,
        themeButtonRef,
        locationButtonRef,
        memoizedPrayerTimes,
        activePrayerTime,
        showChangeModal,
        newLocation,
        newLocationFullAddress,
        toggleTheme,
        setShowWidgetPermissions,
        setShowQiblaCompass,
        setIsSavedLocationsModalOpen,
        handleToggleLocationPicker,
        handleBackToHome,
        handleWeeklyPress,
        handleMonthlyPress,
        handleCloseLocationPicker,
        handleGPSComplete,
        handleGPSSkip,
        handleSelectGPSMethod,
        handleSelectManualMethod,
        handleSelectMapMethod,
        handleMapComplete,
        setShowMapSelector,
        setShowOfflineModal,
        handleOnboardingClose,
        handleConfirmLocationChange,
        handleCancelLocationChange,
        setShowLocationMethodModal,
        // Aynı konum modalı
        showSameLocationModal,
        sameLocationName,
        setShowSameLocationModal,
        setSameLocationName,
    } = useAppLogic();

    // Manuel konum seçiminde aynı konum seçildiğinde
    const handleShowSameLocation = (locationName: string) => {
        setSameLocationName(locationName);
        setShowSameLocationModal(true);
    };

    const styles = createAppStyles(theme, isSmallScreen, screenWidth);

    if (currentScreen === 'weekly' && memoizedPrayerTimes.length > 0) {
        return (
            <WeeklyPrayerTimes
                prayerTimes={memoizedPrayerTimes}
                onBack={handleBackToHome}
            />
        );
    }

    if (currentScreen === 'monthly' && memoizedPrayerTimes.length > 0) {
        return (
            <MonthlyPrayerTimes
                prayerTimes={memoizedPrayerTimes}
                onBack={handleBackToHome}
            />
        );
    }

    const renderMainContent = () => {
        const hasFullLocation = selectedLocation.country && selectedLocation.city && selectedLocation.district;
        const hasGPSLocation = gpsLocationInfo !== null && (locationMode === 'gps' || isGPSMode);

        if (activePrayerTime && (hasFullLocation || hasGPSLocation || previousLocation)) {
            let displayLocation: DisplayLocation;
            if (locationMode === 'manual' && hasFullLocation) {
                displayLocation = {
                    country: selectedLocation.country!.name,
                    city: selectedLocation.city!.name,
                    region: selectedLocation.district!.name,
                };
            } else if ((locationMode === 'gps' || isGPSMode) && hasGPSLocation && gpsLocationInfo) {
                displayLocation = {
                    country: gpsLocationInfo.country,
                    city: gpsLocationInfo.city,
                    region: gpsLocationInfo.name,
                    coords: gpsLocationInfo.coords, // Koordinat bazlı timezone için
                };
            } else if (hasFullLocation) {
                displayLocation = {
                    country: selectedLocation.country!.name,
                    city: selectedLocation.city!.name,
                    region: selectedLocation.district!.name,
                };
            } else if (gpsLocationInfo) {
                displayLocation = {
                    country: gpsLocationInfo.country,
                    city: gpsLocationInfo.city,
                    region: gpsLocationInfo.name,
                    coords: gpsLocationInfo.coords, // Koordinat bazlı timezone için
                };
            } else {
                displayLocation = previousLocation!;
            }

            return (
                <PrayerTimesDisplay
                    prayerTimes={activePrayerTime}
                    allPrayerTimes={memoizedPrayerTimes}
                    locationInfo={displayLocation}
                    onWeeklyPress={handleWeeklyPress}
                    onMonthlyPress={handleMonthlyPress}
                    isPaused={isLocationPickerOpen || showGPSService || showLocationMethodModal}
                />
            );
        }

        if (!hasCachedData && initialCheckDone) {
            return <WelcomeScreen onLocationPress={handleToggleLocationPicker} />;
        }

        return null;
    };

    return (
        <GradientBackground style={styles.gradientContainer}>
            <StatusBar
                barStyle={theme.type === 'dark' ? 'light-content' : 'dark-content'}
                backgroundColor="transparent"
                translucent
            />
            <Animated.View style={[styles.animatedContainer, { opacity: fadeAnim }]}>
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    showsVerticalScrollIndicator={false}
                >
                    <Header
                        onWidgetPermissionsPress={() => setShowWidgetPermissions(true)}
                        onQiblaCompassPress={() => setShowQiblaCompass(true)}
                        onSavedLocationsPress={() => setIsSavedLocationsModalOpen(true)}
                        onLocationPress={handleToggleLocationPicker}
                        onThemePress={toggleTheme}
                        locationButtonRef={locationButtonRef}
                        themeButtonRef={themeButtonRef}
                    />

                    {!isOnline && hasCachedData && <OfflineBanner />}

                    {renderMainContent()}

                    <AppModals
                        isLocationPickerOpen={isLocationPickerOpen}
                        isOnline={isOnline}
                        onCloseLocationPicker={handleCloseLocationPicker}
                        isSavedLocationsModalOpen={isSavedLocationsModalOpen}
                        setIsSavedLocationsModalOpen={setIsSavedLocationsModalOpen}
                        currentLocation={isGPSMode && gpsLocationInfo ? {
                            id: parseInt(gpsLocationInfo.id, 10),
                            country: gpsLocationInfo.country,
                            city: gpsLocationInfo.city,
                            district: gpsLocationInfo.name,
                        } : undefined}
                        onToggleLocationPicker={handleToggleLocationPicker}
                        showLocationMethodModal={showLocationMethodModal}
                        setShowLocationMethodModal={setShowLocationMethodModal}
                        onSelectGPSMethod={handleSelectGPSMethod}
                        onSelectManualMethod={handleSelectManualMethod}
                        onSelectMapMethod={handleSelectMapMethod}
                        showMapSelector={showMapSelector}
                        onMapComplete={handleMapComplete}
                        setShowMapSelector={setShowMapSelector}
                        showOfflineModal={showOfflineModal}
                        onCloseOfflineModal={() => setShowOfflineModal(false)}
                        onboardingStep={onboardingStep}
                        targetLayout={targetLayout}
                        onOnboardingClose={handleOnboardingClose}
                        theme={theme}
                        onToggleTheme={toggleTheme}
                        showGPSService={showGPSService}
                        onGPSComplete={handleGPSComplete}
                        onGPSSkip={handleGPSSkip}
                        showQiblaCompass={showQiblaCompass}
                        setShowQiblaCompass={setShowQiblaCompass}
                        showChangeModal={showChangeModal}
                        newLocation={newLocation}
                        newLocationFullAddress={newLocationFullAddress}
                        onConfirmLocationChange={handleConfirmLocationChange}
                        onCancelLocationChange={handleCancelLocationChange}
                        isChangingLocation={isChangingLocation}
                        showWidgetPermissions={showWidgetPermissions}
                        setShowWidgetPermissions={setShowWidgetPermissions}
                        isSmallScreen={isSmallScreen}
                        screenWidth={screenWidth}
                        showSameLocationModal={showSameLocationModal}
                        sameLocationName={sameLocationName}
                        onCloseSameLocationModal={() => setShowSameLocationModal(false)}
                        onShowSameLocation={handleShowSameLocation}
                    />
                </ScrollView>
            </Animated.View>
        </GradientBackground>
    );
};

const App: React.FC = () => {
    return (
        <GestureHandlerRootView style={appStyles.container}>
            <ThemeProvider>
                <NetworkProvider>
                    <LocationProvider>
                        <AppContent />
                    </LocationProvider>
                </NetworkProvider>
            </ThemeProvider>
        </GestureHandlerRootView>
    );
};

export default App;

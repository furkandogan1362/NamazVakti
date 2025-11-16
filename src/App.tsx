// App.tsx

/**
 * Ana uygulama bileşeni
 * Bu bileşen, uygulamanın temel yapısını oluşturur ve diğer tüm bileşenleri bir araya getirir.
 * - NetworkProvider ve LocationProvider ile uygulama genelinde durum yönetimini sağlar
 * - Kullanıcı arayüzünün ana düzenini oluşturur
 * - Konum seçimi ve namaz vakitlerinin görüntülenmesini koordine eder
 * Sorumlulukları:
 * - Uygulama durumunun yönetimi
 * - Ana kullanıcı arayüzünün oluşturulması
 * - Çevrimdışı/çevrimiçi durum yönetimi
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import LocationPicker from './components/LocationPicker';
import PrayerTimesDisplay from './components/PrayerTimesDisplay';
import { NetworkProvider, useNetwork } from './contexts/NetworkContext';
import { LocationProvider, useLocation } from './contexts/LocationContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { useLocationData } from './hooks/useLocationData';
import { usePrayerTimes } from './hooks/usePrayerTimes';

const AppContent: React.FC = () => {
    const { isOnline } = useNetwork();
    const { selectedLocation } = useLocation();
    const { theme, toggleTheme, isSmallScreen, screenWidth } = useTheme();
    const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
    const prayerTimes = usePrayerTimes();
    useLocationData();

    const styles = createStyles(theme, isSmallScreen, screenWidth);

    return (
        <LinearGradient
            colors={theme.colors.background}
            start={theme.gradientStart}
            end={theme.gradientEnd}
            style={styles.gradientContainer}
        >
            <ScrollView contentContainerStyle={styles.container}>
                {/* Header with theme toggle */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Namaz Vakitleri</Text>
                    <TouchableOpacity
                        style={styles.themeToggle}
                        onPress={toggleTheme}
                    >
                        <Text style={styles.themeToggleText}>
                            {theme.type === 'light' ? '🌙' : '☀️'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {!isOnline && (
                    <View style={styles.offlineContainer}>
                        <Text style={styles.offlineText}>Çevrimdışı Mod</Text>
                    </View>
                )}

                {/* Location Info */}
                {selectedLocation.country && selectedLocation.city && selectedLocation.region && (
                    <View style={styles.locationInfoContainer}>
                        <Text style={styles.locationText}>
                            {selectedLocation.country}, {selectedLocation.city}
                        </Text>
                        <Text style={styles.locationSubText}>
                            {selectedLocation.region}
                        </Text>
                    </View>
                )}

                {/* Prayer Times Display */}
                {prayerTimes && <PrayerTimesDisplay prayerTimes={prayerTimes} />}

                {/* Location Picker Toggle Button */}
                <TouchableOpacity
                    style={styles.locationToggleButton}
                    onPress={() => setIsLocationPickerOpen(!isLocationPickerOpen)}
                    disabled={!isOnline}
                >
                    <Text style={styles.locationToggleText}>
                        {isLocationPickerOpen ? '▲ Konumu Gizle' : '▼ Konum Değiştir'}
                    </Text>
                </TouchableOpacity>

                {/* Location Picker - Collapsible */}
                {isLocationPickerOpen && (
                    isOnline ? (
                        <LocationPicker onClose={() => setIsLocationPickerOpen(false)} />
                    ) : (
                        <View style={styles.offlineMessageContainer}>
                            <Text style={styles.offlineMessageText}>
                                Konum seçmek için internete bağlanın.
                            </Text>
                        </View>
                    )
                )}
            </ScrollView>
        </LinearGradient>
    );
};

const App: React.FC = () => {
    return (
        <ThemeProvider>
            <NetworkProvider>
                <LocationProvider>
                    <AppContent />
                </LocationProvider>
            </NetworkProvider>
        </ThemeProvider>
    );
};

const createStyles = (theme: any, isSmallScreen: boolean, screenWidth: number) => {
    const padding = isSmallScreen ? 10 : screenWidth < 768 ? 15 : 20;
    const fontSize = isSmallScreen ? 14 : screenWidth < 768 ? 16 : 18;

    return StyleSheet.create({
        gradientContainer: {
            flex: 1,
        },
        container: {
            flexGrow: 1,
            padding: padding,
            paddingBottom: 30,
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
            paddingVertical: 15,
        },
        headerTitle: {
            fontSize: isSmallScreen ? 24 : 28,
            fontWeight: 'bold',
            color: theme.colors.headerText,
        },
        themeToggle: {
            width: isSmallScreen ? 45 : 50,
            height: isSmallScreen ? 45 : 50,
            borderRadius: isSmallScreen ? 22.5 : 25,
            backgroundColor: theme.colors.cardBackground,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
        },
        themeToggleText: {
            fontSize: isSmallScreen ? 22 : 24,
        },
        offlineContainer: {
            backgroundColor: '#FF6B6B',
            padding: 10,
            borderRadius: 8,
            marginBottom: 15,
            alignItems: 'center',
        },
        offlineText: {
            color: '#FFFFFF',
            fontSize: fontSize,
            fontWeight: 'bold',
        },
        locationInfoContainer: {
            backgroundColor: theme.colors.cardBackground,
            padding: 15,
            borderRadius: 12,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: theme.colors.cardBorder,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
        },
        locationText: {
            fontSize: fontSize + 2,
            fontWeight: 'bold',
            color: theme.colors.text,
            textAlign: 'center',
        },
        locationSubText: {
            fontSize: fontSize - 2,
            color: theme.colors.secondaryText,
            textAlign: 'center',
            marginTop: 5,
        },
        locationToggleButton: {
            backgroundColor: theme.colors.buttonBackground,
            padding: 15,
            borderRadius: 10,
            marginTop: 20,
            marginBottom: 15,
            alignItems: 'center',
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 3,
            elevation: 4,
        },
        locationToggleText: {
            color: theme.colors.buttonText,
            fontSize: fontSize,
            fontWeight: 'bold',
        },
        offlineMessageContainer: {
            backgroundColor: theme.colors.cardBackground,
            padding: 20,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: theme.colors.cardBorder,
        },
        offlineMessageText: {
            color: theme.colors.text,
            fontSize: fontSize,
            textAlign: 'center',
        },
    });
};

export default App;

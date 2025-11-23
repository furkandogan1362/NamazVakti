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

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, StatusBar } from 'react-native';
import LocationPicker from './components/LocationPicker';
import PrayerTimesDisplay from './components/PrayerTimesDisplay';
import WeeklyPrayerTimes from './screens/WeeklyPrayerTimes';
import MonthlyPrayerTimes from './screens/MonthlyPrayerTimes';
import { NetworkProvider, useNetwork } from './contexts/NetworkContext';
import { LocationProvider, useLocation } from './contexts/LocationContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { useLocationData } from './hooks/useLocationData';
import { usePrayerTimes } from './hooks/usePrayerTimes';
import * as storageService from './services/storageService';
import GradientBackground from './components/ui/GradientBackground';
import GlassView from './components/ui/GlassView';

type ScreenType = 'home' | 'weekly' | 'monthly';

const AppContent: React.FC = () => {
    const { isOnline } = useNetwork();
    const { selectedLocation } = useLocation();
    const { theme, toggleTheme, isSmallScreen, screenWidth } = useTheme();
    const { currentDayPrayerTime, allPrayerTimes } = usePrayerTimes();
    useLocationData();

    const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');
    const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
    const [initialCheckDone, setInitialCheckDone] = useState(false);
    const [hasCachedData, setHasCachedData] = useState(false);
    const [showOfflineModal, setShowOfflineModal] = useState(false);
    const [previousLocation, setPreviousLocation] = useState<{
        country: string;
        city: string;
        region: string;
    } | null>(null);


    // İlk yüklemede cache kontrolü - render ÖNCESINDE
    useEffect(() => {
        const checkInitialCache = async () => {
            const cachedPrayerData = await storageService.loadPrayerTimes();
            const cachedLocationId = await storageService.loadLastLocationId();

            // Cache'de veri varsa hoşgeldiniz ekranını hiç gösterme
            if (cachedPrayerData || cachedLocationId) {
                setHasCachedData(true);
            }

            // İlk kullanıcı için location picker davranışı
            const hasLocation = selectedLocation.country && selectedLocation.city && selectedLocation.region;
            if (!hasLocation && !cachedPrayerData) {
                // İnternet varsa picker'ı aç, yoksa kapalı tut
                setIsLocationPickerOpen(isOnline);
            }

            setInitialCheckDone(true);
        };

        if (!initialCheckDone) {
            checkInitialCache();
        }
    }, [initialCheckDone, selectedLocation, isOnline]);

    // Konum değişikliklerini takip et - TAM seçim yapılana kadar eski konumu sakla
    useEffect(() => {
        const hasFullLocation = selectedLocation.country && selectedLocation.city && selectedLocation.region;

        if (hasFullLocation) {
            // Tam konum seçildiğinde önceki konumu güncelle
            setPreviousLocation({
                country: selectedLocation.country,
                city: selectedLocation.city,
                region: selectedLocation.region,
            });
            setHasCachedData(true);
        }
    }, [selectedLocation]);

    // İnternet bağlantısı geldiğinde offline modalı kapat ve konum seçiciyi aç
    useEffect(() => {
        if (isOnline && showOfflineModal) {
            setShowOfflineModal(false);
            setIsLocationPickerOpen(true);
        }
    }, [isOnline, showOfflineModal]);

    const handleToggleLocationPicker = () => {
        // İnternet yoksa modal göster
        if (!isOnline) {
            setShowOfflineModal(true);
            return;
        }

        setIsLocationPickerOpen(!isLocationPickerOpen);
    };

    // Callback fonksiyonları memoize et (performans için)
    const handleBackToHome = useCallback(() => {
        setCurrentScreen('home');
    }, []);

    const handleWeeklyPress = useCallback(() => {
        setCurrentScreen('weekly');
    }, []);

    const handleMonthlyPress = useCallback(() => {
        setCurrentScreen('monthly');
    }, []);

    // allPrayerTimes'ı memoize et (gereksiz yeniden render'ları önle)
    const memoizedPrayerTimes = useMemo(() => allPrayerTimes, [allPrayerTimes]);

    const styles = createStyles(theme, isSmallScreen, screenWidth);

    // Ekran geçişleri - memoized veriler ile
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

    return (
        <GradientBackground style={styles.gradientContainer}>
            <StatusBar
                barStyle={theme.type === 'dark' ? 'light-content' : 'dark-content'}
                backgroundColor="transparent"
                translucent
            />
            <ScrollView

                contentContainerStyle={styles.container}
                showsVerticalScrollIndicator={false}
            >
                {/* Header with theme toggle */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Namaz Vakti</Text>
                    <View style={styles.headerButtons}>
                        <TouchableOpacity
                            style={styles.iconButton}
                            onPress={handleToggleLocationPicker}
                        >
                            <View style={styles.iconButtonInner}>
                                <Text style={styles.iconButtonText}>📍</Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.iconButton}
                            onPress={toggleTheme}
                        >
                            <View style={styles.iconButtonInner}>
                                <Text style={styles.iconButtonText}>
                                    {theme.type === 'light' ? '🌙' : '☀️'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {!isOnline && (
                    <View style={styles.offlineContainer}>
                        <Text style={styles.offlineIcon}>📡</Text>
                        <View>
                            <Text style={styles.offlineTitle}>Çevrimdışı Mod</Text>
                            <Text style={styles.offlineSubText}>Veriler cihaz hafızasından gösteriliyor</Text>
                        </View>
                    </View>
                )}

                {/* Prayer Times Display - Konum bilgisi içinde */}
                {(() => {
                    const hasFullLocation = selectedLocation.country && selectedLocation.city && selectedLocation.region;

                    // Eğer tam konum seçiliyse veya önceki konum varsa verileri göster
                    if (currentDayPrayerTime && (hasFullLocation || previousLocation)) {
                        // Tam konum varsa onu kullan, yoksa önceki konumu göster
                        const displayLocation = hasFullLocation ? selectedLocation : previousLocation;

                        return (
                            <PrayerTimesDisplay
                                prayerTimes={currentDayPrayerTime}
                                allPrayerTimes={memoizedPrayerTimes}
                                locationInfo={displayLocation!}
                                onWeeklyPress={handleWeeklyPress}
                                onMonthlyPress={handleMonthlyPress}
                            />
                        );
                    }

                    // Hoşgeldiniz ekranını sadece hiç veri yoksa ve initial check bittiyse göster
                    if (!hasCachedData && initialCheckDone) {
                        return (
                            <View style={styles.welcomeContainer}>
                                <View style={styles.welcomeIconContainer}>
                                    <Text style={styles.welcomeIcon}>🕌</Text>
                                </View>
                                <Text style={styles.welcomeTitle}>Hoş Geldiniz</Text>
                                <Text style={styles.welcomeText}>
                                    Namaz vakitlerini doğru bir şekilde görüntüleyebilmek için lütfen konumunuzu belirleyin.
                                </Text>
                                <TouchableOpacity
                                    style={styles.welcomeButton}
                                    onPress={handleToggleLocationPicker}
                                >
                                    <Text style={styles.welcomeButtonText}>Konum Seç</Text>
                                </TouchableOpacity>
                            </View>
                        );
                    }

                    // Henüz initial check bitmemişse hiçbir şey gösterme (loading state)
                    return null;
                })()}

                {/* Location Picker Modal */}
                <Modal
                    animationType="fade"
                    transparent={true}
                    visible={isLocationPickerOpen && isOnline}
                    onRequestClose={() => setIsLocationPickerOpen(false)}
                >
                    <View style={styles.modalOverlay}>
                        <GlassView style={styles.locationModalContent} autoHeight={true} overlayOpacity={0.95}>
                            <View style={styles.locationModalInner}>
                                <View style={styles.locationModalHeader}>
                                    <Text style={styles.locationModalTitle}>Konum Değiştir</Text>
                                    <TouchableOpacity
                                        style={styles.closeButton}
                                        onPress={() => setIsLocationPickerOpen(false)}
                                    >
                                        <Text style={styles.closeButtonText}>✕</Text>
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.locationModalMessage}>
                                    Namaz vakitlerini doğru görüntülemek için lütfen konumunuzu seçin.
                                </Text>

                                <LocationPicker onClose={() => setIsLocationPickerOpen(false)} />
                            </View>
                        </GlassView>
                    </View>
                </Modal>

                {/* Offline Warning Modal */}
                <Modal
                    animationType="fade"
                    transparent={true}
                    visible={showOfflineModal}
                    onRequestClose={() => setShowOfflineModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <GlassView style={styles.modalContent} autoHeight={true}>
                            <View style={styles.modalInnerContent}>
                                <Text style={styles.modalIcon}>🌐</Text>
                                <Text style={styles.modalTitle}>İnternet Bağlantısı Gerekli</Text>
                                <Text style={styles.modalMessage}>
                                    Konum değiştirmek için internet bağlantınızın olması gerekiyor.
                                </Text>
                                <Text style={styles.modalSubMessage}>
                                    Daha önce konum bilgisi girdiyseniz mevcut konumunuz için namaz vakitlerini çevrimdışı olarak görüntülemeye devam edebilirsiniz.
                                </Text>
                                <TouchableOpacity
                                    style={styles.modalButton}
                                    onPress={() => setShowOfflineModal(false)}
                                >
                                    <Text style={styles.modalButtonText}>Tamam</Text>
                                </TouchableOpacity>
                            </View>
                        </GlassView>
                    </View>
                </Modal>
            </ScrollView>
        </GradientBackground>
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

    return StyleSheet.create({
        gradientContainer: {
            flex: 1,
        },
        container: {
            flexGrow: 1,
            padding: padding,
            paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 40,
            paddingBottom: 30,
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
            paddingHorizontal: 5,
        },
        headerTitle: {
            fontSize: isSmallScreen ? 24 : 28,
            fontWeight: 'bold',
            color: theme.colors.text,
            letterSpacing: 1,
        },
        headerButtons: {
            flexDirection: 'row',
            gap: 10,
        },
        iconButton: {
            width: 44,
            height: 44,
            borderRadius: 22,
            overflow: 'hidden',
            backgroundColor: theme.colors.card,
            borderWidth: 1,
            borderColor: theme.colors.cardBorder,
        },
        iconButtonInner: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
        iconButtonText: {
            fontSize: 20,
            color: theme.colors.text, // Ensure icons are bright in dark mode
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
        offlineContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.type === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
            padding: 12,
            borderRadius: 12,
            marginBottom: 8, // Reduced from 20 to 8 to save space
            borderWidth: 1,
            borderColor: 'rgba(239, 68, 68, 0.2)',
        },
        offlineIcon: {
            fontSize: 24,
            marginRight: 12,
            color: theme.colors.text, // Ensure icon is visible
        },
        offlineTitle: {
            color: theme.colors.error,
            fontSize: 16,
            fontWeight: 'bold',
            marginBottom: 2,
        },
        offlineSubText: {
            color: theme.colors.secondaryText,
            fontSize: 12,
        },
        welcomeContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
            marginTop: 40,
        },
        welcomeIconContainer: {
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: theme.colors.cardBackground,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 24,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8,
            borderWidth: 1,
            borderColor: theme.colors.cardBorder,
        },
        welcomeIcon: {
            fontSize: 48,
        },
        welcomeTitle: {
            fontSize: 32,
            fontWeight: 'bold',
            color: theme.colors.text,
            marginBottom: 12,
            textAlign: 'center',
        },
        welcomeText: {
            fontSize: 16,
            color: theme.colors.secondaryText,
            textAlign: 'center',
            marginBottom: 32,
            lineHeight: 24,
            maxWidth: '85%',
        },
        welcomeButton: {
            backgroundColor: theme.colors.accent,
            paddingVertical: 16,
            paddingHorizontal: 32,
            borderRadius: 30,
            shadowColor: theme.colors.accent,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        welcomeButtonText: {
            color: '#FFFFFF',
            fontSize: 18,
            fontWeight: 'bold',
        },
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
        },
        modalContent: {
            borderRadius: 20,
            width: '90%',
            maxWidth: 400,
        },
        modalInnerContent: {
            padding: 30,
            alignItems: 'center',
            // Arka plan rengini artırarak arkadaki kırmızı yansımayı engelle
            backgroundColor: theme.type === 'dark' ? 'rgba(30, 41, 59, 0.5)' : 'rgba(255, 255, 255, 0.5)',
            borderRadius: 20,
        },
        modalIcon: {
            fontSize: 48,
            marginBottom: 15,
            textAlign: 'center',
        },
        modalTitle: {
            fontSize: 20,
            fontWeight: 'bold',
            color: theme.colors.text,
            marginBottom: 12,
            textAlign: 'center',
        },
        modalMessage: {
            fontSize: 16,
            color: theme.colors.text,
            textAlign: 'center',
            marginBottom: 10,
            lineHeight: 22,
        },
        modalSubMessage: {
            fontSize: 14,
            color: theme.colors.secondaryText,
            textAlign: 'center',
            marginBottom: 20,
            lineHeight: 20,
        },
        modalButton: {
            backgroundColor: theme.colors.accent,
            paddingVertical: 12,
            paddingHorizontal: 40,
            borderRadius: 25,
            marginTop: 10,
            minWidth: 120,
        },
        modalButtonText: {
            color: '#FFFFFF',
            fontSize: 16,
            fontWeight: 'bold',
            textAlign: 'center',
        },
    });
};

export default App;

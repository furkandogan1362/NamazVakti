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

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
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

    const scrollViewRef = useRef<ScrollView>(null);

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
    }, [selectedLocation]);    const handleToggleLocationPicker = () => {
        // İnternet yoksa modal göster
        if (!isOnline) {
            setShowOfflineModal(true);
            return;
        }

        const newState = !isLocationPickerOpen;
        setIsLocationPickerOpen(newState);
        
        if (newState) {
            // Lokasyon seçici açıldığında smooth bir şekilde en alta scroll et
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 300);
        } else {
            // Kapatıldığında yukarı scroll et
            setTimeout(() => {
                scrollViewRef.current?.scrollTo({ y: 0, animated: true });
            }, 100);
        }
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
        <LinearGradient
            colors={theme.colors.background}
            start={theme.gradientStart}
            end={theme.gradientEnd}
            style={styles.gradientContainer}
        >
            <ScrollView
                ref={scrollViewRef}
                contentContainerStyle={styles.container}
            >
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
                                <Text style={styles.welcomeTitle}>Hoş Geldiniz! 🕌</Text>
                                <Text style={styles.welcomeText}>
                                    Namaz vakitlerini görmek için lütfen konumunuzu seçin.
                                </Text>
                                <Text style={styles.welcomeHint}>
                                    👇 Aşağıdaki butona tıklayarak başlayın
                                </Text>
                            </View>
                        );
                    }

                    // Henüz initial check bitmemişse hiçbir şey gösterme (loading state)
                    return null;
                })()}

                {/* Location Picker Toggle Button */}
                <TouchableOpacity
                    style={styles.locationToggleButton}
                    onPress={handleToggleLocationPicker}
                >
                    <Text style={styles.locationToggleText}>
                        {isLocationPickerOpen ? '▲ Konumu Gizle' : '▼ Konum Değiştir'}
                    </Text>
                </TouchableOpacity>

                {/* Location Picker - Collapsible */}
                {isLocationPickerOpen && isOnline && (
                    <LocationPicker onClose={() => {
                        setIsLocationPickerOpen(false);
                        setTimeout(() => {
                            scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                        }, 100);
                    }} />
                )}

                {/* Offline Warning Modal */}
                <Modal
                    animationType="fade"
                    transparent={true}
                    visible={showOfflineModal}
                    onRequestClose={() => setShowOfflineModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
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
                    </View>
                </Modal>
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
            fontSize: isSmallScreen ? 22 : screenWidth < 768 ? 24 : 26,
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
            fontSize: isSmallScreen ? 14 : screenWidth < 768 ? 15 : 16,
            fontWeight: 'bold',
        },
        welcomeContainer: {
            backgroundColor: theme.colors.cardBackground,
            padding: isSmallScreen ? 25 : 30,
            borderRadius: 15,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: theme.colors.cardBorder,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 5,
            alignItems: 'center',
        },
        welcomeTitle: {
            fontSize: isSmallScreen ? 22 : screenWidth < 768 ? 24 : 26,
            fontWeight: 'bold',
            color: theme.colors.text,
            marginBottom: 15,
            textAlign: 'center',
        },
        welcomeText: {
            fontSize: isSmallScreen ? 14 : screenWidth < 768 ? 15 : 16,
            color: theme.colors.text,
            textAlign: 'center',
            marginBottom: 10,
            lineHeight: 22,
        },
        welcomeHint: {
            fontSize: isSmallScreen ? 14 : screenWidth < 768 ? 15 : 16,
            color: theme.colors.secondaryText,
            textAlign: 'center',
            marginTop: 10,
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
            fontSize: isSmallScreen ? 14 : screenWidth < 768 ? 15 : 16,
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
            fontSize: isSmallScreen ? 14 : screenWidth < 768 ? 15 : 16,
            textAlign: 'center',
        },
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
        },
        modalContent: {
            backgroundColor: theme.colors.cardBackground,
            borderRadius: 20,
            padding: isSmallScreen ? 25 : 30,
            width: '90%',
            maxWidth: 400,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 10,
            borderWidth: 1,
            borderColor: theme.colors.cardBorder,
        },
        modalIcon: {
            fontSize: isSmallScreen ? 48 : 56,
            marginBottom: 15,
        },
        modalTitle: {
            fontSize: isSmallScreen ? 18 : 20,
            fontWeight: 'bold',
            color: theme.colors.text,
            marginBottom: 12,
            textAlign: 'center',
        },
        modalMessage: {
            fontSize: isSmallScreen ? 14 : 16,
            color: theme.colors.text,
            textAlign: 'center',
            marginBottom: 10,
            lineHeight: 22,
        },
        modalSubMessage: {
            fontSize: isSmallScreen ? 12 : 14,
            color: theme.colors.secondaryText,
            textAlign: 'center',
            marginBottom: 20,
            lineHeight: 20,
        },
        modalButton: {
            backgroundColor: theme.colors.buttonBackground,
            paddingVertical: 12,
            paddingHorizontal: 40,
            borderRadius: 25,
            marginTop: 10,
            minWidth: 120,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 3,
            elevation: 3,
        },
        modalButtonText: {
            color: theme.colors.buttonText,
            fontSize: isSmallScreen ? 14 : 16,
            fontWeight: 'bold',
            textAlign: 'center',
        },
    });
};

export default App;

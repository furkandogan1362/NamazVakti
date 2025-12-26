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
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, StatusBar, Animated } from 'react-native';
import LocationModal from './components/LocationModal';
import SavedLocationsModal from './components/SavedLocationsModal';
import LocationChangeModal from './components/LocationChangeModal';
import LocationMethodModal from './components/LocationMethodModal';
import WidgetPermissionsModal from './components/WidgetPermissionsModal';
import PrayerTimesDisplay from './components/PrayerTimesDisplay';
import WeeklyPrayerTimes from './screens/WeeklyPrayerTimes';
import MonthlyPrayerTimes from './screens/MonthlyPrayerTimes';
import GPSLocationService, { GPSLocationResult } from './components/GPSLocationService';
import { NetworkProvider, useNetwork } from './contexts/NetworkContext';
import { LocationProvider, useLocation } from './contexts/LocationContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { useLocationData } from './hooks/useLocationData';
import { usePrayerTimes } from './hooks/usePrayerTimes';
import { useGPSPrayerTimes } from './hooks/useGPSPrayerTimes';
import { useLocationTime } from './hooks/useLocationTime';
import { useLocationChangeCheck } from './hooks/useLocationChangeCheck';
import { DiyanetService } from './api/apiDiyanet';
import { DiyanetManuelService } from './api/apiDiyanetManuel';
import * as storageService from './services/storageService';
import { updateWidget, syncWidgetMonthlyCache } from './services/WidgetService';
import GradientBackground from './components/ui/GradientBackground';
import GlassView from './components/ui/GlassView';
import OnboardingOverlay from './components/OnboardingOverlay';
import QiblaCompass from './components/QiblaCompass';
import {
    loadThemeOnboardingShown,
    saveThemeOnboardingShown,
    loadLocationOnboardingShown,
    saveLocationOnboardingShown,
    saveGPSPermissionAsked,
    saveGPSCityInfo,
    saveLocationMode,
    loadLocationMode,
    saveGPSPrayerTimes,
    saveGPSLastFetchDate,
    clearManualData,
    clearGPSData,
    loadCachedCountries,
    saveCachedCountries,
} from './services/storageService';
import { SelectedLocation } from './types/types';

type ScreenType = 'home' | 'weekly' | 'monthly';

// Görüntüleme için konum bilgisi tipi
interface DisplayLocation {
    country: string;
    city: string;
    region: string;
}

const AppContent: React.FC = () => {
    // GPS Location Service state - Moved up for useLocationTime
    const [gpsLocationInfo, setGpsLocationInfo] = useState<{
        name: string;
        city: string;
        country: string;
    } | null>(null);
    const [locationMode, setLocationMode] = useState<'gps' | 'manual' | null>(null);

    const { isOnline } = useNetwork();
    const { selectedLocation, setSelectedLocation, addSavedLocation } = useLocation();
    const { theme, toggleTheme, isSmallScreen, screenWidth, fadeAnim } = useTheme();

    // Seçili konumun saat dilimini al
    // Not: isGPSMode hook değeri burada kullanılamaz çünkü döngüsel bağımlılık oluşur
    // locationMode state'i yeterli olmalı
    const locationForTimezone = useMemo(() => {
        // GPS modunda ve GPS konum bilgisi varsa
        if (locationMode === 'gps' && gpsLocationInfo) {
            console.log('🌍 Timezone için GPS konumu kullanılıyor:', gpsLocationInfo.name);
            return {
                country: gpsLocationInfo.country,
                city: gpsLocationInfo.city,
                region: gpsLocationInfo.name,
            };
        }
        // GPS konum bilgisi varsa ama locationMode henüz set edilmemişse de kullan
        // (uygulama açılışında locationMode null olabilir)
        if (gpsLocationInfo && locationMode !== 'manual') {
            console.log('🌍 Timezone için GPS konumu kullanılıyor (fallback):', gpsLocationInfo.name);
            return {
                country: gpsLocationInfo.country,
                city: gpsLocationInfo.city,
                region: gpsLocationInfo.name,
            };
        }
        // Manuel modda veya GPS bilgisi yoksa
        if (selectedLocation.country?.name && selectedLocation.city?.name) {
            console.log('🌍 Timezone için manuel konum kullanılıyor:', selectedLocation.district?.name);
        }
        return {
            country: selectedLocation.country?.name || '',
            city: selectedLocation.city?.name || '',
            region: selectedLocation.district?.name || '',
        };
    }, [locationMode, gpsLocationInfo, selectedLocation]);

    const { timezone } = useLocationTime(locationForTimezone);

    const { currentDayPrayerTime, allPrayerTimes, setAllPrayerTimes } = usePrayerTimes(timezone);
    const { gpsPrayerTimes, currentDayPrayerTime: gpsCurrentDayPrayerTime, isGPSMode, refreshGPSPrayerTimes, setGpsPrayerTimes: setGPSPrayerTimesHook, setIsGPSMode } = useGPSPrayerTimes(timezone);
    useLocationData();
    const { showChangeModal, newLocation, setShowChangeModal, shouldAutoApply, setShouldAutoApply } = useLocationChangeCheck();

    const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');
    const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
    const [isSavedLocationsModalOpen, setIsSavedLocationsModalOpen] = useState(false);
    const [initialCheckDone, setInitialCheckDone] = useState(false);
    const [hasCachedData, setHasCachedData] = useState(false);
    const [showOfflineModal, setShowOfflineModal] = useState(false);
    const [previousLocation, setPreviousLocation] = useState<DisplayLocation | null>(null);

    // GPS Location Service state
    const [showGPSService, setShowGPSService] = useState(false);


    // Location Method Modal state
    const [showLocationMethodModal, setShowLocationMethodModal] = useState(false);


    // Qibla Compass Modal state
    const [showQiblaCompass, setShowQiblaCompass] = useState(false);
    const [isChangingLocation, _setIsChangingLocation] = useState(false);
    const [showWidgetPermissions, setShowWidgetPermissions] = useState(false);



    const themeButtonRef = React.useRef<React.ElementRef<typeof TouchableOpacity>>(null);
    const locationButtonRef = React.useRef<React.ElementRef<typeof TouchableOpacity>>(null);

    const [onboardingStep, setOnboardingStep] = useState<0 | 1 | 2>(0); // 0: None, 1: Theme, 2: Location
    const [targetLayout, setTargetLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);


    // İlk yüklemede cache kontrolü - render ÖNCESINDE
    useEffect(() => {
        const checkInitialCache = async () => {
            console.log('🔄 Cache kontrolü başlatılıyor...');
            const cachedPrayerData = await storageService.loadPrayerTimes();
            const cachedLocationId = await storageService.loadLastLocationId();
            const gpsCityInfo = await storageService.loadGPSCityInfo();
            const savedLocationMode = await loadLocationMode();
            const cachedGpsPrayerTimes = await storageService.loadGPSPrayerTimes();

            console.log('📦 Cache durumu:', {
                savedLocationMode,
                hasGpsCityInfo: !!gpsCityInfo,
                gpsCityName: gpsCityInfo?.name,
                hasCachedGpsPrayerTimes: !!cachedGpsPrayerTimes && cachedGpsPrayerTimes.length > 0,
                gpsPrayerTimesCount: cachedGpsPrayerTimes?.length || 0,
                hasCachedPrayerData: !!cachedPrayerData,
                cachedLocationId,
            });

            // Konum modunu ayarla
            setLocationMode(savedLocationMode);

            // Cache'de veri varsa hoşgeldiniz ekranını hiç gösterme
            if (cachedPrayerData || cachedLocationId || gpsCityInfo || cachedGpsPrayerTimes) {
                setHasCachedData(true);

                // GPS ile kaydedilmiş konum bilgisi varsa göster
                if (gpsCityInfo && savedLocationMode === 'gps') {
                    console.log('📡 GPS modu yükleniyor:', {
                        name: gpsCityInfo.name,
                        city: gpsCityInfo.city,
                        country: gpsCityInfo.country,
                        prayerTimesCount: cachedGpsPrayerTimes?.length || 0,
                    });
                    setGpsLocationInfo({
                        name: gpsCityInfo.name,
                        city: gpsCityInfo.city,
                        country: gpsCityInfo.country,
                    });
                    setIsGPSMode(true); // GPS modunu aktif et

                    // GPS prayer times'ı GPS hook'ına yükle
                    if (cachedGpsPrayerTimes && cachedGpsPrayerTimes.length > 0) {
                        console.log('📡 GPS namaz vakitleri yükleniyor:', cachedGpsPrayerTimes.length, 'gün');
                        setGPSPrayerTimesHook(cachedGpsPrayerTimes);
                    } else {
                        console.log('⚠️ GPS namaz vakitleri cache\'de yok!');
                    }
                } else if (savedLocationMode === 'gps' && !gpsCityInfo) {
                    console.log('⚠️ GPS modu ama gpsCityInfo yok!');
                    // GPS modunu aktif et, konum bilgisi sonra useLocationChangeCheck'ten gelecek
                    setIsGPSMode(true);
                    // Cache'de GPS namaz vakitleri varsa yükle (en azından geçici olarak gösterilsin)
                    if (cachedGpsPrayerTimes && cachedGpsPrayerTimes.length > 0) {
                        console.log('📡 GPS namaz vakitleri yükleniyor (konum bilgisi beklenecek):', cachedGpsPrayerTimes.length, 'gün');
                        setGPSPrayerTimesHook(cachedGpsPrayerTimes);
                    }
                }
            }

            // İlk kullanıcı için konum belirleme akışı
            const hasLocation = selectedLocation.country && selectedLocation.city && selectedLocation.district;

            if (!hasLocation && !cachedPrayerData && !gpsCityInfo && !cachedGpsPrayerTimes) {
                // İlk kullanıcı - konum yöntemi seçim ekranını göster (GPS mi Manuel mi?)
                if (isOnline) {
                    // Sadece ilk açılışta ve veri yoksa göster
                    setShowLocationMethodModal(true);
                }
            } else if (!hasLocation && !gpsCityInfo && isOnline) {
                // Konum verisi yoksa ama cache varsa (örn: veri silinmişse)
                // Otomatik açılmasını engellemek için burayı boş bırakıyoruz
                // Kullanıcı manuel olarak konum seçmeli
            }

            setInitialCheckDone(true);
        };

        if (!initialCheckDone) {
            checkInitialCache();
        }
    }, [initialCheckDone, selectedLocation, isOnline, setAllPrayerTimes, setGPSPrayerTimesHook, setIsGPSMode]);

    // Background fetch for Countries (Cache warming)
    useEffect(() => {
        const warmUpCache = async () => {
            if (!isOnline) {return;}
            try {
                const cachedCountries = await loadCachedCountries();
                if (!cachedCountries || cachedCountries.length === 0) {
                    console.log('🌍 Ülkeler arka planda yükleniyor...');
                    const countries = await DiyanetManuelService.getCountries();
                    await saveCachedCountries(countries);
                    console.log('✅ Ülkeler cachelendi.');
                }
            } catch (error) {
                console.warn('Background cache warming failed:', error);
            }
        };
        warmUpCache();
    }, [isOnline]);

    // GPS modunda uygulama açıldığında ve yeterli veri yoksa otomatik yenile
    useEffect(() => {
        if (isGPSMode && isOnline && gpsPrayerTimes.length > 0) {
            // Bugünden itibaren yeterli veri var mı kontrol et
            const getLocalTodayDate = (): string => {
                const now = new Date();

                if (timezone) {
                    try {
                        const options: Intl.DateTimeFormatOptions = {
                            timeZone: timezone,
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                        };
                        const formatter = new Intl.DateTimeFormat('en-CA', options);
                        return formatter.format(now);
                    } catch (e) {
                        console.warn('Invalid timezone for date calculation:', timezone);
                    }
                }

                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            const today = getLocalTodayDate();
            const todayIndex = gpsPrayerTimes.findIndex(pt => pt.date.split('T')[0] === today);

            if (todayIndex === -1 || (gpsPrayerTimes.length - todayIndex) < 30) {
                console.log('📅 GPS modunda yeterli ileri tarihli veri yok, yenileniyor...');
                refreshGPSPrayerTimes();
            }
        }
    }, [isGPSMode, isOnline, gpsPrayerTimes, refreshGPSPrayerTimes, timezone]);

    // Konum değişikliklerini takip et - TAM seçim yapılana kadar eski konumu sakla
    // Bu useEffect sadece kullanıcı manuel konum SEÇTİĞİNDE tetiklenmeli, storage'dan yüklemede değil
    useEffect(() => {
        const hasFullLocation = selectedLocation.country && selectedLocation.city && selectedLocation.district;

        if (hasFullLocation) {
            // Sadece initialCheckDone true ise ve locationMode zaten set edilmişse
            // Bu, storage'dan yükleme sırasında GPS modunu bozmayı önler
            if (initialCheckDone && locationMode !== null) {
                // Eğer manuel bir konum seçildiyse ve GPS modundaysak, manuel moda geç
                if (isGPSMode || locationMode === 'gps') {
                    console.log('📍 GPS modundan manuel moda geçiliyor...');
                    setIsGPSMode(false);
                    setLocationMode('manual');
                    saveLocationMode('manual');

                    // GPS verilerini temizle
                    clearGPSData();
                    setGpsLocationInfo(null);
                    setGPSPrayerTimesHook([]);
                }
            }

            // Tam konum seçildiğinde önceki konumu güncelle (display format)
            setPreviousLocation({
                country: selectedLocation.country!.name,
                city: selectedLocation.city!.name,
                region: selectedLocation.district!.name,
            });
            setHasCachedData(true);
        }
    }, [selectedLocation, isGPSMode, locationMode, setIsGPSMode, setGPSPrayerTimesHook, initialCheckDone]);

    // Modal kapandığında onboarding kontrolü
    useEffect(() => {
        if (!isLocationPickerOpen && !showGPSService) {
            const hasFullLocation = selectedLocation.country && selectedLocation.city && selectedLocation.district;
            const hasGPSLocation = gpsLocationInfo !== null && locationMode === 'gps';

            if (hasFullLocation || hasGPSLocation) {
                const checkOnboarding = async () => {
                    const themeShown = await loadThemeOnboardingShown();
                    if (!themeShown) {
                        // Start with Theme Onboarding (Step 1)
                        setTimeout(() => {
                            themeButtonRef.current?.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
                                setTargetLayout({ x: pageX, y: pageY, width, height });
                                setOnboardingStep(1);
                            });
                        }, 500);
                    } else {
                        // Check Location Onboarding (Step 2)
                        const locationShown = await loadLocationOnboardingShown();
                        if (!locationShown) {
                            setTimeout(() => {
                                locationButtonRef.current?.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
                                    setTargetLayout({ x: pageX, y: pageY, width, height });
                                    setOnboardingStep(2);
                                });
                            }, 500);
                        }
                    }
                };
                checkOnboarding();
            }
        }
    }, [isLocationPickerOpen, showGPSService, selectedLocation, gpsLocationInfo, locationMode, isGPSMode, setIsGPSMode]);

    // İnternet bağlantısı geldiğinde offline modalı kapat ve konum seçiciyi aç
    useEffect(() => {
        if (isOnline && showOfflineModal) {
            setShowOfflineModal(false);
            setIsLocationPickerOpen(true);
        }
    }, [isOnline, showOfflineModal]);

    // GPS konum servisi tamamlandığında
    const handleGPSComplete = useCallback(async (result: GPSLocationResult) => {
        setShowGPSService(false);

        // Geri tuşu ile iptal edildiyse, konum yöntemi seçim ekranına dön
        if (result.cancelled) {
            setShowLocationMethodModal(true);
            return;
        }

        // İzin bilgisini kaydet (arka planda)
        saveGPSPermissionAsked();

        if (result.success && result.cityDetail && result.prayerTimes) {
            console.log('📍 GPS konumu güncelleniyor:', {
                name: result.cityDetail.name,
                city: result.cityDetail.city,
                country: result.cityDetail.country,
                id: result.cityDetail.id,
                prayerTimesCount: result.prayerTimes.length,
            });

            // 1. Önce UI State'lerini güncelle (Hız için)
            setLocationMode('gps');
            setIsGPSMode(true);
            setGpsLocationInfo({
                name: result.cityDetail.name,
                city: result.cityDetail.city,
                country: result.cityDetail.country,
            });
            setGPSPrayerTimesHook(result.prayerTimes);
            setSelectedLocation({ country: null, city: null, district: null });
            setHasCachedData(true);

            // Konumu kaydet (Varsa eklemez, yoksa ekler)
            const selectedLocationToAdd: SelectedLocation = {
                country: { name: result.cityDetail.country, code: '', id: 0 },
                city: { name: result.cityDetail.city, code: '', id: 0 },
                district: { name: result.cityDetail.name, code: '', id: parseInt(result.cityDetail.id, 10) },
            };
            addSavedLocation(selectedLocationToAdd);

            // 2. Storage işlemlerini arka planda yap (UI'ı bloklamasın)
            Promise.all([
                saveLocationMode('gps'),
                clearManualData(),
                saveGPSCityInfo({
                    id: result.cityDetail.id,
                    name: result.cityDetail.name,
                    city: result.cityDetail.city,
                    country: result.cityDetail.country,
                }),
                saveGPSPrayerTimes(result.prayerTimes),
                saveGPSLastFetchDate(new Date()),
            ]).then(() => {
                console.log('✅ GPS verileri storage\'a kaydedildi');
            }).catch(err => console.error('Error saving GPS data:', err));

        } else {
            console.log('❌ GPS başarısız, method seçici gösteriliyor');
            // GPS başarısız, method seçici göster
            setShowLocationMethodModal(true);
        }
    }, [setGPSPrayerTimesHook, setSelectedLocation, setIsGPSMode, addSavedLocation]);

    // GPS servisi atlandığında
    const handleGPSSkip = useCallback(async () => {
        setShowGPSService(false);
        await saveGPSPermissionAsked();
        // Manuel konum seçiciyi aç
        setIsLocationPickerOpen(true);
    }, []);

    // Konum butonuna tıklandığında
    const handleToggleLocationPicker = () => {
        // İnternet yoksa modal göster
        if (!isOnline) {
            setShowOfflineModal(true);
            return;
        }

        // Method seçim modalını göster
        setShowLocationMethodModal(true);
    };

    // GPS yöntemi seçildiğinde
    const handleSelectGPSMethod = useCallback(() => {
        setShowLocationMethodModal(false);
        setShowGPSService(true);
    }, []);

    // Manuel yöntem seçildiğinde
    const handleSelectManualMethod = useCallback(async () => {
        setShowLocationMethodModal(false);
        setIsLocationPickerOpen(true);
    }, []);

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

    const handleCloseLocationPicker = useCallback(async () => {
        // Eğer tam konum seçilmediyse, önceki geçerli konuma geri dön
        const hasFullLocation = selectedLocation.country && selectedLocation.city && selectedLocation.district;

        if (!hasFullLocation) {
            if (previousLocation) {
                // previousLocation display format olduğu için cache'den yüklenmeli
                // Ama şimdilik sadece modal'ı kapat
            }
            // Hiçbir konum yoksa (ilk açılış) boş bırak
        } else {
            // Tam konum seçildiyse manuel moda geç
            await saveLocationMode('manual');
            setLocationMode('manual');
            setIsGPSMode(false); // Hook'u da güncelle

            // GPS verilerini temizle (cache ve state)
            await clearGPSData();
            setGpsLocationInfo(null);
            setGPSPrayerTimesHook([]); // GPS hook'undaki verileri temizle
        }

        setIsLocationPickerOpen(false);
    }, [selectedLocation, previousLocation, setGPSPrayerTimesHook, setIsGPSMode]);

    const handleOnboardingClose = async () => {
        if (onboardingStep === 1) {
            // Theme onboarding done, move to location onboarding
            await saveThemeOnboardingShown();

            // Measure location button and show step 2
            locationButtonRef.current?.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
                setTargetLayout({ x: pageX, y: pageY, width, height });
                setOnboardingStep(2);
            });
        } else if (onboardingStep === 2) {
            // Location onboarding done, finish
            await saveLocationOnboardingShown();
            setOnboardingStep(0);
            setTargetLayout(null);
        }
    };

    // allPrayerTimes'ı memoize et (gereksiz yeniden render'ları önle)
    // GPS modunda gpsPrayerTimes, manuel modda allPrayerTimes kullan
    // isGPSMode hook'tan geliyor, locationMode ise local state - hook daha güvenilir
    const memoizedPrayerTimes = useMemo(() => {
        // Önce hook'tan gelen isGPSMode'u kontrol et
        if (isGPSMode && gpsPrayerTimes.length > 0) {
            return gpsPrayerTimes;
        }
        // Fallback: local state ile kontrol
        if (locationMode === 'gps' && gpsPrayerTimes.length > 0) {
            return gpsPrayerTimes;
        }
        return allPrayerTimes;
    }, [isGPSMode, locationMode, gpsPrayerTimes, allPrayerTimes]);

    // Aktif currentDayPrayerTime - GPS modunda gpsCurrentDayPrayerTime kullan
    const activePrayerTime = useMemo(() => {
        if (isGPSMode && gpsCurrentDayPrayerTime) {
            return gpsCurrentDayPrayerTime;
        }
        if (locationMode === 'gps' && gpsCurrentDayPrayerTime) {
            return gpsCurrentDayPrayerTime;
        }
        return currentDayPrayerTime;
    }, [isGPSMode, locationMode, gpsCurrentDayPrayerTime, currentDayPrayerTime]);

    // Widget güncelleme (günlük)
    useEffect(() => {
        if (activePrayerTime) {
            const hasFullLocation = selectedLocation.country && selectedLocation.city && selectedLocation.district;
            const hasGPSLocation = gpsLocationInfo !== null;

            let locationName = '';
            let locationDetail = { country: '', city: '', district: '' };

            // GPS modundaysak ve GPS konum bilgisi varsa
            if ((locationMode === 'gps' || isGPSMode) && hasGPSLocation) {
                locationName = gpsLocationInfo.name;
                locationDetail = {
                    country: gpsLocationInfo.country,
                    city: gpsLocationInfo.city,
                    district: gpsLocationInfo.name,
                };
            }
            // Manuel modda ve tam konum varsa
            else if (hasFullLocation && selectedLocation.district) {
                locationName = selectedLocation.district.name;
                locationDetail = {
                    country: selectedLocation.country!.name,
                    city: selectedLocation.city!.name,
                    district: selectedLocation.district.name,
                };
            }
            // Fallback: GPS konum bilgisi varsa onu kullan (locationMode henüz set edilmemiş olabilir)
            else if (hasGPSLocation) {
                locationName = gpsLocationInfo.name;
                locationDetail = {
                    country: gpsLocationInfo.country,
                    city: gpsLocationInfo.city,
                    district: gpsLocationInfo.name,
                };
            }
            // Hiçbir konum bilgisi yok - widget güncellemeyi atla
            else {
                console.log('⏳ Widget güncelleme atlandı: Konum bilgisi yok');
                return;
            }

            // WidgetService kendi timezone hesaplamasını yapıyor (konum bilgisinden)
            updateWidget(locationName, activePrayerTime, locationDetail);
        }
    }, [activePrayerTime, selectedLocation, gpsLocationInfo, locationMode, isGPSMode]);

    // Widget aylık cache senkronizasyonu (gün geçişlerinde otomatik güncelleme için)
    useEffect(() => {
        if (memoizedPrayerTimes.length > 0) {
            const hasFullLocation = selectedLocation.country && selectedLocation.city && selectedLocation.district;
            const hasGPSLocation = gpsLocationInfo !== null;

            let locationName = '';
            let locationDetail = { country: '', city: '', district: '' };

            // GPS modundaysak ve GPS konum bilgisi varsa
            if ((locationMode === 'gps' || isGPSMode) && hasGPSLocation) {
                locationName = gpsLocationInfo.name;
                locationDetail = {
                    country: gpsLocationInfo.country,
                    city: gpsLocationInfo.city,
                    district: gpsLocationInfo.name,
                };
            }
            // Manuel modda ve tam konum varsa
            else if (hasFullLocation && selectedLocation.district) {
                locationName = selectedLocation.district.name;
                locationDetail = {
                    country: selectedLocation.country!.name,
                    city: selectedLocation.city!.name,
                    district: selectedLocation.district.name,
                };
            }
            // Fallback: GPS konum bilgisi varsa onu kullan
            else if (hasGPSLocation) {
                locationName = gpsLocationInfo.name;
                locationDetail = {
                    country: gpsLocationInfo.country,
                    city: gpsLocationInfo.city,
                    district: gpsLocationInfo.name,
                };
            }
            // Konum bilgisi hazır değilse senkronizasyonu atla
            else {
                return;
            }

            // WidgetService kendi timezone hesaplamasını yapıyor (konum bilgisinden)
            syncWidgetMonthlyCache(locationName, memoizedPrayerTimes, locationDetail);
        }
    }, [memoizedPrayerTimes, selectedLocation, gpsLocationInfo, locationMode, isGPSMode]);

    const handleConfirmLocationChange = async () => {
        if (!newLocation) {
            return;
        }

        console.log('📍 GPS konum değişikliği onaylandı:', {
            name: newLocation.name,
            city: newLocation.city,
            id: newLocation.id,
        });

        // Modalı hemen kapat (Kullanıcı isteği: "basar basmaz modal kapanacak")
        setShowChangeModal(false);

        try {
            console.log('🔄 Yeni GPS konumu için namaz vakitleri çekiliyor:', newLocation.name);
            // Namaz vakitlerini çek
            const prayerTimesData = await DiyanetService.getPrayerTimes(newLocation.id, 'Monthly');

            // Veriyi dönüştür
            const convertToPrayerTime = (data: any) => ({
                date: data.gregorianDateShort.split('.').reverse().join('-'),
                fajr: data.fajr,
                sun: data.sunrise,
                dhuhr: data.dhuhr,
                asr: data.asr,
                maghrib: data.maghrib,
                isha: data.isha,
                hijriDate: data.hijriDateShort.split('.')[0],
                hijriMonth: data.hijriDateLong.split(' ')[1],
                hijriYear: data.hijriDateShort.split('.')[2],
                gregorianDateLong: data.gregorianDateLong,
                hijriDateLong: data.hijriDateLong,
            });

            const convertedPrayerTimes = prayerTimesData.map(convertToPrayerTime);
            console.log('✅ GPS namaz vakitleri çekildi:', convertedPrayerTimes.length, 'gün');

            const result: GPSLocationResult = {
                success: true,
                cityDetail: newLocation,
                prayerTimes: convertedPrayerTimes,
            };

            await handleGPSComplete(result);
        } catch (error) {
            console.error('❌ GPS konum değişikliği hatası:', error);
        }
    };

    const handleCancelLocationChange = () => {
        setShowChangeModal(false);
    };

    // GPS modunda ilk konum tespit edildiğinde otomatik uygula (modal göstermeden)
    useEffect(() => {
        const autoApplyLocation = async () => {
            if (shouldAutoApply && newLocation) {
                console.log('🚀 GPS konumu otomatik uygulanıyor:', newLocation.name);
                setShouldAutoApply(false);

                try {
                    // Namaz vakitlerini çek
                    const prayerTimesData = await DiyanetService.getPrayerTimes(newLocation.id, 'Monthly');

                    // Veriyi dönüştür
                    const convertToPrayerTime = (data: any) => ({
                        date: data.gregorianDateShort.split('.').reverse().join('-'),
                        fajr: data.fajr,
                        sun: data.sunrise,
                        dhuhr: data.dhuhr,
                        asr: data.asr,
                        maghrib: data.maghrib,
                        isha: data.isha,
                        hijriDate: data.hijriDateShort.split('.')[0],
                        hijriMonth: data.hijriDateLong.split(' ')[1],
                        hijriYear: data.hijriDateShort.split('.')[2],
                        gregorianDateLong: data.gregorianDateLong,
                        hijriDateLong: data.hijriDateLong,
                    });

                    const convertedPrayerTimes = prayerTimesData.map(convertToPrayerTime);
                    console.log('✅ GPS namaz vakitleri otomatik yüklendi:', convertedPrayerTimes.length, 'gün');

                    const result: GPSLocationResult = {
                        success: true,
                        cityDetail: newLocation,
                        prayerTimes: convertedPrayerTimes,
                    };

                    await handleGPSComplete(result);
                } catch (error) {
                    console.error('❌ Otomatik GPS konumu uygulama hatası:', error);
                }
            }
        };

        autoApplyLocation();
    }, [shouldAutoApply, newLocation, setShouldAutoApply, handleGPSComplete]);

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
            <Animated.View style={[styles.animatedContainer, { opacity: fadeAnim }]}>
                <ScrollView

                    contentContainerStyle={styles.scrollContainer}
                    showsVerticalScrollIndicator={false}
                >
                {/* Header with theme toggle */}
                <View style={styles.header}>
                    <View style={styles.headerButtons}>
                        <TouchableOpacity
                            style={styles.iconButton}
                            onPress={() => setShowWidgetPermissions(true)}
                        >
                            <View style={styles.iconButtonInner}>
                                <MaterialIcons name="widgets" size={24} color={theme.colors.accent} />
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.iconButton}
                            onPress={() => setShowQiblaCompass(true)}
                        >
                            <View style={styles.iconButtonInner}>
                                <Text style={styles.iconButtonText}>🕋</Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.iconButton}
                            onPress={() => setIsSavedLocationsModalOpen(true)}
                        >
                            <View style={styles.iconButtonInner}>
                                <MaterialIcons name="bookmarks" size={24} color={theme.colors.accent} />
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            ref={locationButtonRef}
                            style={styles.iconButton}
                            onPress={handleToggleLocationPicker}
                            onLayout={() => {}} // Force layout calculation
                        >
                            <View style={styles.iconButtonInner}>
                                <MaterialIcons
                                    name="location-on"
                                    size={27}
                                    color={theme.colors.accent}
                                />
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            ref={themeButtonRef}
                            style={styles.iconButton}
                            onPress={toggleTheme}
                            onLayout={() => {}} // Force layout calculation
                        >
                            <View style={styles.iconButtonInner}>
                                <Text style={styles.iconButtonText}>
                                    {theme.type === 'light' ? '🌙' : '☀️'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {!isOnline && hasCachedData && (
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
                    const hasFullLocation = selectedLocation.country && selectedLocation.city && selectedLocation.district;
                    const hasGPSLocation = gpsLocationInfo !== null && (locationMode === 'gps' || isGPSMode);

                    // Eğer tam konum seçiliyse veya GPS konumu varsa veya önceki konum varsa verileri göster
                    if (activePrayerTime && (hasFullLocation || hasGPSLocation || previousLocation)) {
                        // Öncelik sırası: Manuel mod ise manuel konum, GPS mod ise GPS konum
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
                            };
                        } else if (hasFullLocation) {
                            displayLocation = {
                                country: selectedLocation.country!.name,
                                city: selectedLocation.city!.name,
                                region: selectedLocation.district!.name,
                            };
                        } else if (gpsLocationInfo) {
                            // Fallback: GPS konum bilgisi varsa onu kullan
                            displayLocation = {
                                country: gpsLocationInfo.country,
                                city: gpsLocationInfo.city,
                                region: gpsLocationInfo.name,
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
                <LocationModal
                    visible={isLocationPickerOpen && isOnline}
                    onClose={handleCloseLocationPicker}
                />

                {/* Saved Locations Modal */}
                <SavedLocationsModal
                    visible={isSavedLocationsModalOpen}
                    onClose={() => setIsSavedLocationsModalOpen(false)}
                    currentLocation={isGPSMode && gpsLocationInfo ? {
                        country: gpsLocationInfo.country,
                        city: gpsLocationInfo.city,
                        district: gpsLocationInfo.name,
                    } : undefined}
                    onAddLocation={() => {
                        setIsSavedLocationsModalOpen(false);
                        // Eğer zaten açıksa kapatıp açmaya gerek yok, ama toggle olduğu için dikkatli olmalı
                        // handleToggleLocationPicker toggle yapıyor.
                        // Direkt true yapabiliriz ama setter dışarıda değil.
                        // handleToggleLocationPicker'ı kullanacağız.
                        // Eğer zaten açıksa (ki bu modal üstteyse alttaki kapalıdır mantıken)
                        if (!isLocationPickerOpen) {
                            handleToggleLocationPicker();
                        }
                    }}
                />

                {/* Location Method Selection Modal */}
                <LocationMethodModal
                    visible={showLocationMethodModal && isOnline}
                    onClose={() => setShowLocationMethodModal(false)}
                    onSelectGPS={handleSelectGPSMethod}
                    onSelectManual={handleSelectManualMethod}
                />

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

                {/* Onboarding Overlay */}
                <OnboardingOverlay
                    visible={onboardingStep > 0}
                    targetLayout={targetLayout}
                    onClose={handleOnboardingClose}
                    theme={theme}
                    title={onboardingStep === 1 ? 'Tema Ayarı' : 'Konum Değiştirme'}
                    message={onboardingStep === 1
                        ? 'Temanız sisteminizin temasına göre ayarlandı, dilerseniz yukarıdaki tema değiştirme butonuna tıklayarak temanızı değiştirebilirsiniz.'
                        : 'Konumunuzu değiştirmek isterseniz yukarıdaki konum butonuna tıklayarak yeni bir konum seçebilirsiniz.'
                    }
                    stepText={onboardingStep === 1 ? '1/2' : '2/2'}
                    onSpotlightPress={onboardingStep === 1 ? toggleTheme : handleToggleLocationPicker}
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

                {/* GPS Location Service Modal */}
                <GPSLocationService
                    visible={showGPSService && isOnline}
                    onComplete={handleGPSComplete}
                    onSkip={handleGPSSkip}
                />

                {/* Qibla Compass Modal */}
                <QiblaCompass
                    visible={showQiblaCompass}
                    onClose={() => setShowQiblaCompass(false)}
                />

                {/* Location Change Modal */}
                <LocationChangeModal
                    visible={showChangeModal}
                    newLocationName={newLocation ? `${newLocation.name}, ${newLocation.city}` : ''}
                    onConfirm={handleConfirmLocationChange}
                    onCancel={handleCancelLocationChange}
                    isLoading={isChangingLocation}
                />

                {/* Widget Permissions Modal */}
                <WidgetPermissionsModal
                    visible={showWidgetPermissions}
                    onClose={() => setShowWidgetPermissions(false)}
                />


            </ScrollView>
            </Animated.View>
        </GradientBackground>
    );
};

import { GestureHandlerRootView } from 'react-native-gesture-handler';

const appStyles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

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

const createStyles = (theme: any, isSmallScreen: boolean, screenWidth: number) => {
    const padding = isSmallScreen ? 10 : screenWidth < 768 ? 15 : 20;

    return StyleSheet.create({
        animatedContainer: {
            flex: 1,
        },
        gradientContainer: {
            flex: 1,
        },
        container: {
            flex: 1,
        },
        scrollContainer: {
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
            fontSize: 22,
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
            backgroundColor: theme.type === 'dark' ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.9)',
            paddingVertical: 16,
            paddingHorizontal: 32,
            borderRadius: 30,
            borderWidth: 1,
            borderColor: theme.colors.accent,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        welcomeButtonText: {
            color: theme.colors.text,
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

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { TouchableOpacity } from 'react-native';
import { useNetwork } from '../contexts/NetworkContext';
import { useLocation } from '../contexts/LocationContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLocationData } from './useLocationData';
import { usePrayerTimes } from './usePrayerTimes';
import { useGPSPrayerTimes } from './useGPSPrayerTimes';
import { useLocationTime } from './useLocationTime';
import { useLocationChangeCheck } from './useLocationChangeCheck';
import { DiyanetService } from '../api/apiDiyanet';
import { DiyanetManuelService } from '../api/apiDiyanetManuel';
import * as storageService from '../services/storageService';
import { updateWidget, syncWidgetMonthlyCache } from '../services/WidgetService';
import { GPSLocationResult } from '../components/GPSLocationService';
import { MapLocationResult } from '../components/MapLocationSelector';
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
    saveAutoLocationUpdatePreference,
} from '../services/storageService';

export type ScreenType = 'home' | 'weekly' | 'monthly';

export interface DisplayLocation {
    country: string;
    city: string;
    region: string;
    coords?: { lat: number; lon: number }; // Koordinat bazlı timezone için
}

export const useAppLogic = () => {
    // GPS Location Service state
    const [gpsLocationInfo, setGpsLocationInfo] = useState<{
        id: string;         // Namaz vakti ID'si
        name: string;
        city: string;
        country: string;
        coords?: { lat: number; lon: number }; // Koordinat bazlı timezone için
    } | null>(null);
    const [locationMode, setLocationMode] = useState<'gps' | 'manual' | null>(null);

    const { isOnline } = useNetwork();
    const { selectedLocation, setSelectedLocation, addSavedLocation, updatePrimaryLocation } = useLocation();
    const { theme, toggleTheme, isSmallScreen, screenWidth, fadeAnim } = useTheme();

    // Timezone logic
    const locationForTimezone = useMemo(() => {
        if (locationMode === 'gps' && gpsLocationInfo) {
            return {
                country: gpsLocationInfo.country,
                city: gpsLocationInfo.city,
                region: gpsLocationInfo.name,
                coords: gpsLocationInfo.coords, // Koordinat bazlı timezone için
            };
        }
        if (gpsLocationInfo && locationMode !== 'manual') {
            return {
                country: gpsLocationInfo.country,
                city: gpsLocationInfo.city,
                region: gpsLocationInfo.name,
                coords: gpsLocationInfo.coords, // Koordinat bazlı timezone için
            };
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
    const { showChangeModal, newLocation, newLocationFullAddress, setShowChangeModal, shouldAutoApply, setShouldAutoApply } = useLocationChangeCheck();

    const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');
    const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
    const [isSavedLocationsModalOpen, setIsSavedLocationsModalOpen] = useState(false);
    const [initialCheckDone, setInitialCheckDone] = useState(false);
    const [hasCachedData, setHasCachedData] = useState(false);
    const [showOfflineModal, setShowOfflineModal] = useState(false);
    const [previousLocation, setPreviousLocation] = useState<DisplayLocation | null>(null);

    const [showGPSService, setShowGPSService] = useState(false);
    const [showLocationMethodModal, setShowLocationMethodModal] = useState(false);
    const [showMapSelector, setShowMapSelector] = useState(false);
    const [isAutoMapLocation, setIsAutoMapLocation] = useState(false); // Otomatik harita seçimi flag'i
    const [showQiblaCompass, setShowQiblaCompass] = useState(false);
    const [isChangingLocation, _setIsChangingLocation] = useState(false);
    const [showWidgetPermissions, setShowWidgetPermissions] = useState(false);

    // Aynı konum modalı için state
    const [showSameLocationModal, setShowSameLocationModal] = useState(false);
    const [sameLocationName, setSameLocationName] = useState('');

    const themeButtonRef = useRef<React.ElementRef<typeof TouchableOpacity>>(null);
    const locationButtonRef = useRef<React.ElementRef<typeof TouchableOpacity>>(null);

    const [onboardingStep, setOnboardingStep] = useState<0 | 1 | 2>(0);
    const [targetLayout, setTargetLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

    // Initial Cache Check
    useEffect(() => {
        const checkInitialCache = async () => {
            const cachedPrayerData = await storageService.loadPrayerTimes();
            const cachedLocationId = await storageService.loadLastLocationId();
            const gpsCityInfo = await storageService.loadGPSCityInfo();
            const savedLocationMode = await loadLocationMode();
            const cachedGpsPrayerTimes = await storageService.loadGPSPrayerTimes();

            setLocationMode(savedLocationMode);

            if (cachedPrayerData || cachedLocationId || gpsCityInfo || cachedGpsPrayerTimes) {
                setHasCachedData(true);

                if (gpsCityInfo && savedLocationMode === 'gps') {
                    setGpsLocationInfo({
                        id: gpsCityInfo.id,
                        name: gpsCityInfo.name,
                        city: gpsCityInfo.city,
                        country: gpsCityInfo.country,
                        coords: gpsCityInfo.coords, // Koordinat bazlı timezone için
                    });
                    setIsGPSMode(true);

                    if (cachedGpsPrayerTimes && cachedGpsPrayerTimes.length > 0) {
                        setGPSPrayerTimesHook(cachedGpsPrayerTimes);
                    }
                } else if (savedLocationMode === 'gps' && !gpsCityInfo) {
                    setIsGPSMode(true);
                    if (cachedGpsPrayerTimes && cachedGpsPrayerTimes.length > 0) {
                        setGPSPrayerTimesHook(cachedGpsPrayerTimes);
                    }
                }
            }

            const hasLocation = selectedLocation.country && selectedLocation.city && selectedLocation.district;

            if (!hasLocation && !cachedPrayerData && !gpsCityInfo && !cachedGpsPrayerTimes) {
                if (isOnline) {
                    // GPS yerine Harita ile otomatik konum bul
                    setIsAutoMapLocation(true);
                    setShowMapSelector(true);
                }
            }

            setInitialCheckDone(true);
        };

        if (!initialCheckDone) {
            checkInitialCache();
        }
    }, [initialCheckDone, selectedLocation, isOnline, setAllPrayerTimes, setGPSPrayerTimesHook, setIsGPSMode]);

    // Cache Warming
    useEffect(() => {
        const warmUpCache = async () => {
            if (!isOnline) { return; }
            try {
                const cachedCountries = await loadCachedCountries();
                if (!cachedCountries || cachedCountries.length === 0) {
                    const countries = await DiyanetManuelService.getCountries();
                    await saveCachedCountries(countries);
                }
            } catch (error) {
                console.warn('Background cache warming failed:', error);
            }
        };
        warmUpCache();
    }, [isOnline]);

    // Auto Refresh GPS Data
    useEffect(() => {
        if (isGPSMode && isOnline && gpsPrayerTimes.length > 0) {
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
                refreshGPSPrayerTimes();
            }
        }
    }, [isGPSMode, isOnline, gpsPrayerTimes, refreshGPSPrayerTimes, timezone]);

    // Location Change Tracking
    useEffect(() => {
        const hasFullLocation = selectedLocation.country && selectedLocation.city && selectedLocation.district;

        if (hasFullLocation) {
            if (initialCheckDone && locationMode !== null) {
                if (isGPSMode || locationMode === 'gps') {
                    setIsGPSMode(false);
                    setLocationMode('manual');
                    saveLocationMode('manual');
                    clearGPSData();
                    setGpsLocationInfo(null);
                    setGPSPrayerTimesHook([]);
                }
            }

            setPreviousLocation({
                country: selectedLocation.country!.name,
                city: selectedLocation.city!.name,
                region: selectedLocation.district!.name,
            });
            setHasCachedData(true);
        }
    }, [selectedLocation, isGPSMode, locationMode, setIsGPSMode, setGPSPrayerTimesHook, initialCheckDone]);

    // Onboarding Check
    useEffect(() => {
        if (!isLocationPickerOpen && !showGPSService) {
            const hasFullLocation = selectedLocation.country && selectedLocation.city && selectedLocation.district;
            const hasGPSLocation = gpsLocationInfo !== null && locationMode === 'gps';

            if (hasFullLocation || hasGPSLocation) {
                const checkOnboarding = async () => {
                    const themeShown = await loadThemeOnboardingShown();
                    if (!themeShown) {
                        setTimeout(() => {
                            themeButtonRef.current?.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
                                setTargetLayout({ x: pageX, y: pageY, width, height });
                                setOnboardingStep(1);
                            });
                        }, 500);
                    } else {
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

    // Online Check
    useEffect(() => {
        if (isOnline && showOfflineModal) {
            setShowOfflineModal(false);
            setIsLocationPickerOpen(true);
        }
    }, [isOnline, showOfflineModal]);

    // Handlers
    const handleGPSComplete = useCallback(async (result: GPSLocationResult) => {
        setShowGPSService(false);

        if (result.cancelled) {
            setShowLocationMethodModal(true);
            return;
        }

        // GPSLocationService'den gelen sameLocation flag'i kontrolü
        if (result.sameLocation && result.cityDetail) {
            console.log('📍 GPS ile seçilen konum mevcut konum ile aynı (sameLocation flag).');
            setSameLocationName(result.cityDetail.name);
            setShowSameLocationModal(true);
            return;
        }

        saveGPSPermissionAsked();

        if (result.success && result.cityDetail && result.prayerTimes) {
            const newLocationId = parseInt(result.cityDetail.id, 10);

            // Koordinatları al (varsa)
            const coords = result.locationData ? {
                lat: result.locationData.latitude,
                lon: result.locationData.longitude,
            } : undefined;

            setLocationMode('gps');
            setIsGPSMode(true);
            setGpsLocationInfo({
                id: result.cityDetail.id,
                name: result.cityDetail.name,
                city: result.cityDetail.city,
                country: result.cityDetail.country,
                coords, // Koordinat bazlı timezone için
            });
            setGPSPrayerTimesHook(result.prayerTimes);
            setSelectedLocation({ country: null, city: null, district: null });
            setHasCachedData(true);

            // Kayıtlı konumlara EKLENMEYecek - sadece "Yeni Konum Ekle" butonu ile eklenecek
            // Birincil konum olarak güncelle
            updatePrimaryLocation({
                country: { name: result.cityDetail.country, code: '', id: 0 },
                city: { name: result.cityDetail.city, code: '', id: 0 },
                district: { name: result.cityDetail.name, code: '', id: newLocationId },
            });

            Promise.all([
                saveLocationMode('gps'),
                clearManualData(),
                saveGPSCityInfo({
                    id: result.cityDetail.id,
                    name: result.cityDetail.name,
                    city: result.cityDetail.city,
                    country: result.cityDetail.country,
                    coords, // Koordinatları da kaydet
                }),
                saveGPSPrayerTimes(result.prayerTimes),
                saveGPSLastFetchDate(new Date()),
            ]).catch(err => console.error('Error saving GPS data:', err));

        } else {
            setShowLocationMethodModal(true);
        }
    }, [setGPSPrayerTimesHook, setSelectedLocation, setIsGPSMode, updatePrimaryLocation]);

    const handleGPSSkip = useCallback(async () => {
        setShowGPSService(false);
        await saveGPSPermissionAsked();
        setIsLocationPickerOpen(true);
    }, []);

    const handleToggleLocationPicker = () => {
        if (!isOnline) {
            setShowOfflineModal(true);
            return;
        }
        setShowLocationMethodModal(true);
    };

    const handleSelectGPSMethod = useCallback(() => {
        setShowLocationMethodModal(false);
        setShowGPSService(true);
    }, []);

    const handleSelectManualMethod = useCallback(async () => {
        setShowLocationMethodModal(false);
        setIsLocationPickerOpen(true);
    }, []);

    const handleSelectMapMethod = useCallback(() => {
        setShowLocationMethodModal(false);
        setShowMapSelector(true);
    }, []);

    const handleMapComplete = useCallback(async (result: MapLocationResult) => {
        setShowMapSelector(false);
        const isAutoLocation = isAutoMapLocation;
        setIsAutoMapLocation(false); // Flag'i sıfırla

        if (result.cancelled || !result.success) {
            // Sadece kullanıcı tarafından açılan seçicide modal göster
            if (!isAutoLocation) {
                setShowLocationMethodModal(true);
            }
            return;
        }

        if (result.locationData) {
            const { prayerTimeId, city, district, country, formattedAddress, coords } = result.locationData;

            // Aynı ID kontrolü: Mevcut GPS konumu ile aynı mı?
            const currentGPSCityInfo = await storageService.loadGPSCityInfo();
            const currentGPSId = currentGPSCityInfo ? parseInt(currentGPSCityInfo.id, 10) : null;

            if (currentGPSId !== null && currentGPSId === prayerTimeId) {
                console.log('📍 Haritadan seçilen konum mevcut GPS konumu ile aynı, API çağrısı yapılmıyor.');
                // Aynı konum - modal göster (sadece kullanıcı tarafından açıldıysa)
                if (!isAutoLocation) {
                    setSameLocationName(district || formattedAddress);
                    setShowSameLocationModal(true);
                }
                return;
            }

            try {
                // Namaz vakitlerini çek
                const prayerTimesData = await DiyanetService.getPrayerTimes(String(prayerTimeId), 'Monthly');

                if (prayerTimesData && prayerTimesData.length > 0) {
                    // PrayerTime formatına dönüştür
                    const convertedPrayerTimes = prayerTimesData.map((data) => ({
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
                    }));

                    // GPS modu olarak kaydet (haritadan seçilen konum GPS gibi davranır)
                    setLocationMode('gps');
                    setIsGPSMode(true);
                    setGpsLocationInfo({
                        id: String(prayerTimeId),
                        name: district || formattedAddress,
                        city: city,
                        country: country, // Dinamik ülke adı (Diyanet API'den)
                        coords: coords, // Koordinat bazlı timezone için
                    });
                    setGPSPrayerTimesHook(convertedPrayerTimes);
                    setSelectedLocation({ country: null, city: null, district: null });
                    setHasCachedData(true);

                    // Kayıtlı konumlara EKLENMEYecek - sadece "Yeni Konum Ekle" butonu ile eklenecek
                    // Birincil konum olarak güncelle (savedLocations[0])
                    updatePrimaryLocation({
                        country: { name: country, code: '', id: 0 },
                        city: { name: city, code: '', id: 0 },
                        district: { name: district || formattedAddress, code: '', id: prayerTimeId },
                    });

                    // Async storage kayıtları
                    Promise.all([
                        saveLocationMode('gps'),
                        clearManualData(),
                        saveGPSCityInfo({
                            id: String(prayerTimeId),
                            name: district || formattedAddress,
                            city: city,
                            country: country, // Dinamik ülke adı
                            coords: coords, // Koordinatlar (timezone için)
                        }),
                        saveGPSPrayerTimes(convertedPrayerTimes),
                        saveGPSLastFetchDate(new Date()),
                    ]).catch(err => console.error('Error saving map location data:', err));
                } else {
                    console.error('Prayer times not found for map location');
                    if (!isAutoLocation) {
                        setShowLocationMethodModal(true);
                    }
                }
            } catch (error) {
                console.error('Error fetching prayer times for map location:', error);
                if (!isAutoLocation) {
                    setShowLocationMethodModal(true);
                }
            }
        }
    }, [setGPSPrayerTimesHook, setSelectedLocation, setIsGPSMode, updatePrimaryLocation, isAutoMapLocation]);

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
        const hasFullLocation = selectedLocation.country && selectedLocation.city && selectedLocation.district;

        if (!hasFullLocation) {
            // Do nothing
        } else {
            await saveLocationMode('manual');
            setLocationMode('manual');
            setIsGPSMode(false);
            await clearGPSData();
            setGpsLocationInfo(null);
            setGPSPrayerTimesHook([]);
        }

        setIsLocationPickerOpen(false);
    }, [selectedLocation, setGPSPrayerTimesHook, setIsGPSMode]);

    const handleOnboardingClose = async () => {
        if (onboardingStep === 1) {
            await saveThemeOnboardingShown();
            locationButtonRef.current?.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
                setTargetLayout({ x: pageX, y: pageY, width, height });
                setOnboardingStep(2);
            });
        } else if (onboardingStep === 2) {
            await saveLocationOnboardingShown();
            setOnboardingStep(0);
            setTargetLayout(null);
        }
    };

    const memoizedPrayerTimes = useMemo(() => {
        if (isGPSMode && gpsPrayerTimes.length > 0) {
            return gpsPrayerTimes;
        }
        if (locationMode === 'gps' && gpsPrayerTimes.length > 0) {
            return gpsPrayerTimes;
        }
        return allPrayerTimes;
    }, [isGPSMode, locationMode, gpsPrayerTimes, allPrayerTimes]);

    const activePrayerTime = useMemo(() => {
        if (isGPSMode && gpsCurrentDayPrayerTime) {
            return gpsCurrentDayPrayerTime;
        }
        if (locationMode === 'gps' && gpsCurrentDayPrayerTime) {
            return gpsCurrentDayPrayerTime;
        }
        return currentDayPrayerTime;
    }, [isGPSMode, locationMode, gpsCurrentDayPrayerTime, currentDayPrayerTime]);

    // Widget Updates
    useEffect(() => {
        if (activePrayerTime) {
            const hasFullLocation = selectedLocation.country && selectedLocation.city && selectedLocation.district;
            const hasGPSLocation = gpsLocationInfo !== null;

            let locationName = '';
            let locationDetail = { country: '', city: '', district: '' };

            if ((locationMode === 'gps' || isGPSMode) && hasGPSLocation) {
                locationName = gpsLocationInfo!.name;
                locationDetail = {
                    country: gpsLocationInfo!.country,
                    city: gpsLocationInfo!.city,
                    district: gpsLocationInfo!.name,
                };
            } else if (hasFullLocation && selectedLocation.district) {
                locationName = selectedLocation.district.name;
                locationDetail = {
                    country: selectedLocation.country!.name,
                    city: selectedLocation.city!.name,
                    district: selectedLocation.district.name,
                };
            } else if (hasGPSLocation) {
                locationName = gpsLocationInfo!.name;
                locationDetail = {
                    country: gpsLocationInfo!.country,
                    city: gpsLocationInfo!.city,
                    district: gpsLocationInfo!.name,
                };
            } else {
                return;
            }

            updateWidget(locationName, activePrayerTime, locationDetail);
        }
    }, [activePrayerTime, selectedLocation, gpsLocationInfo, locationMode, isGPSMode]);

    useEffect(() => {
        if (memoizedPrayerTimes.length > 0) {
            const hasFullLocation = selectedLocation.country && selectedLocation.city && selectedLocation.district;
            const hasGPSLocation = gpsLocationInfo !== null;

            let locationName = '';
            let locationDetail = { country: '', city: '', district: '' };

            if ((locationMode === 'gps' || isGPSMode) && hasGPSLocation) {
                locationName = gpsLocationInfo!.name;
                locationDetail = {
                    country: gpsLocationInfo!.country,
                    city: gpsLocationInfo!.city,
                    district: gpsLocationInfo!.name,
                };
            } else if (hasFullLocation && selectedLocation.district) {
                locationName = selectedLocation.district.name;
                locationDetail = {
                    country: selectedLocation.country!.name,
                    city: selectedLocation.city!.name,
                    district: selectedLocation.district.name,
                };
            } else if (hasGPSLocation) {
                locationName = gpsLocationInfo!.name;
                locationDetail = {
                    country: gpsLocationInfo!.country,
                    city: gpsLocationInfo!.city,
                    district: gpsLocationInfo!.name,
                };
            } else {
                return;
            }

            syncWidgetMonthlyCache(locationName, memoizedPrayerTimes, locationDetail);
        }
    }, [memoizedPrayerTimes, selectedLocation, gpsLocationInfo, locationMode, isGPSMode]);

    const handleConfirmLocationChange = async (autoUpdateEnabled: boolean = false) => {
        if (!newLocation) { return; }
        setShowChangeModal(false);

        // Otomatik güncelleme tercihi kaydedilsin
        if (autoUpdateEnabled) {
            await saveAutoLocationUpdatePreference(true);
            console.log('📍 Otomatik konum güncelleme tercihi kaydedildi');
        }

        try {
            const prayerTimesData = await DiyanetService.getPrayerTimes(newLocation.id, 'Monthly');
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
            const result: GPSLocationResult = {
                success: true,
                cityDetail: newLocation,
                prayerTimes: convertedPrayerTimes,
            };

            // Otomatik GPS güncellemesi
            await handleGPSComplete(result);
        } catch (error) {
            console.error('❌ GPS konum değişikliği hatası:', error);
        }
    };

    const handleCancelLocationChange = async (autoUpdateEnabled: boolean = false) => {
        // Checkbox işaretliyse tercihi kaydet (iptal edilse bile)
        if (autoUpdateEnabled) {
            await saveAutoLocationUpdatePreference(true);
            console.log('📍 Otomatik konum güncelleme tercihi kaydedildi (iptal edildi ama tercih saklandı)');
        }
        setShowChangeModal(false);
    };

    // Auto Apply Location
    useEffect(() => {
        const autoApplyLocation = async () => {
            if (shouldAutoApply && newLocation) {
                setShouldAutoApply(false);
                try {
                    const prayerTimesData = await DiyanetService.getPrayerTimes(newLocation.id, 'Monthly');
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
                    const result: GPSLocationResult = {
                        success: true,
                        cityDetail: newLocation,
                        prayerTimes: convertedPrayerTimes,
                    };

                    // Otomatik GPS güncellemesi
                    await handleGPSComplete(result);
                } catch (error) {
                    console.error('❌ Otomatik GPS konumu uygulama hatası:', error);
                }
            }
        };
        autoApplyLocation();
    }, [shouldAutoApply, newLocation, setShouldAutoApply, handleGPSComplete]);

    return {
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
        setShowChangeModal,
        addSavedLocation,
        // Aynı konum modalı
        showSameLocationModal,
        sameLocationName,
        setShowSameLocationModal,
        setSameLocationName,
    };
};

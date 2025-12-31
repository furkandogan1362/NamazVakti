import { useState, useEffect, useCallback, useRef } from 'react';
import { PermissionsAndroid, AppState, AppStateStatus } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { MapLocationService, CompleteLocationData, CityDetail } from '../api/apiDiyanet';
import { loadGPSCityInfo, loadLocationMode, loadLocationData, loadAutoLocationUpdatePreference } from '../services/storageService';
import { useNetwork } from '../contexts/NetworkContext';

// Harita verisinden CityDetail formatına dönüştürme helper'ı
const convertToCityDetail = (data: CompleteLocationData): CityDetail => ({
    id: String(data.prayerTimeId),
    name: data.district || data.city, // İlçe yoksa şehir
    city: data.city,
    country: data.country,
    code: '',
    cityEn: '',
    countryEn: '',
    qiblaAngle: '',
    geographicQiblaAngle: '',
    distanceToKaaba: '',
});

export const useLocationChangeCheck = () => {
    const [showChangeModal, setShowChangeModal] = useState(false);
    const [newLocation, setNewLocation] = useState<CityDetail | null>(null);
    const [newLocationFullAddress, setNewLocationFullAddress] = useState<string>(''); // Detaylı adres (sokak vs.)
    const [isChecking, setIsChecking] = useState(false);
    const [shouldAutoApply, setShouldAutoApply] = useState(false);
    const [isAutoUpdateEnabled, setIsAutoUpdateEnabled] = useState(false);
    const { isOnline } = useNetwork();

    const checkLocationChange = useCallback(async () => {
        if (!isOnline || isChecking) {
            return;
        }

        setIsChecking(true);

        try {
            // Önce otomatik güncelleme tercihini kontrol et
            const autoUpdatePreference = await loadAutoLocationUpdatePreference();
            setIsAutoUpdateEnabled(autoUpdatePreference);

            // 1. İzin kontrolü (sadece Android)
            const hasPermission = await PermissionsAndroid.check(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
            );

            if (!hasPermission) {
                setIsChecking(false);
                return;
            }

            // 2. Mevcut konumu al - maximumAge: 0 ile her zaman taze konum
            Geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        // 3. Haritadan Konum Bul ile detaylı konum bilgisi al (GPS yerine)
                        const completeLocation = await MapLocationService.getCompleteLocation(
                            position.coords.latitude,
                            position.coords.longitude
                        );

                        if (!completeLocation) {
                            console.log('🔍 Harita konum bilgisi alınamadı');
                            setIsChecking(false);
                            return;
                        }

                        // CompleteLocationData'yı CityDetail formatına dönüştür
                        const cityDetail = convertToCityDetail(completeLocation);

                        // 4. Mevcut kayıtlı konumla karşılaştır
                        const locationMode = await loadLocationMode();
                        let currentCityName = '';
                        let currentDistrictName = '';
                        let currentLocationId = '';

                        console.log('🔍 Konum değişikliği kontrolü (Harita ile):', {
                            locationMode,
                            newLocation: completeLocation.formattedAddress,
                            newLocationId: completeLocation.prayerTimeId,
                            detail: completeLocation.detail,
                        });

                        if (locationMode === 'gps') {
                            const gpsCityInfo = await loadGPSCityInfo();
                            if (gpsCityInfo) {
                                currentCityName = gpsCityInfo.city;
                                currentDistrictName = gpsCityInfo.name;
                                currentLocationId = gpsCityInfo.id;
                                console.log('🔍 Mevcut GPS konumu:', {
                                    name: gpsCityInfo.name,
                                    city: gpsCityInfo.city,
                                    id: gpsCityInfo.id,
                                });
                            }
                        } else {
                            // Manuel mod - Storage'dan oku (Context yerine)
                            // Bu sayede stale closure sorununu aşarız ve her zaman en son kaydedilen konumu alırız
                            const savedLocation = await loadLocationData();
                            if (savedLocation && savedLocation.city && savedLocation.district) {
                                currentCityName = savedLocation.city.name;
                                currentDistrictName = savedLocation.district.name;
                                console.log('🔍 Mevcut manuel konum:', {
                                    name: savedLocation.district.name,
                                    city: savedLocation.city.name,
                                });
                            }
                        }

                        // Karşılaştırma
                        // Normalize strings for comparison to avoid case/locale issues
                        const normalize = (str: string) => str ? str.toLowerCase().trim() : '';

                        // ID ile karşılaştır (daha güvenilir)
                        const isDifferentById = currentLocationId && String(completeLocation.prayerTimeId) !== currentLocationId;

                        const isDifferentByName =
                            (currentCityName && normalize(cityDetail.city) !== normalize(currentCityName)) ||
                            (currentDistrictName && normalize(cityDetail.name) !== normalize(currentDistrictName));

                        const isDifferent = isDifferentById || isDifferentByName;

                        // Eğer hiç konum yoksa (ilk açılış vs) modal gösterme
                        const hasExistingLocation = currentCityName !== '' || currentDistrictName !== '';

                        console.log('🔍 Konum karşılaştırma sonucu:', {
                            isDifferentById,
                            isDifferentByName,
                            isDifferent,
                            hasExistingLocation,
                            autoUpdatePreference,
                            willShowModal: hasExistingLocation && isDifferent && !autoUpdatePreference,
                        });

                        if (hasExistingLocation && isDifferent) {
                            // Detaylı adres bilgisini oluştur (sokak/mahalle dahil)
                            const fullAddress = completeLocation.detail
                                ? `${completeLocation.district || completeLocation.city}, ${completeLocation.detail}`
                                : completeLocation.formattedAddress;

                            console.log('📍 Harita konum değişikliği tespit edildi:', `${currentDistrictName} -> ${fullAddress}`);
                            setNewLocation(cityDetail);
                            setNewLocationFullAddress(fullAddress);

                            // Otomatik güncelleme aktifse modal gösterme, direkt uygula
                            if (autoUpdatePreference) {
                                console.log('📍 Otomatik güncelleme aktif - modal göstermeden uygulama yapılacak');
                                setShouldAutoApply(true);
                            } else {
                                setShowChangeModal(true);
                            }
                        } else if (!hasExistingLocation && locationMode === 'gps') {
                            // GPS modunda ama mevcut konum yok - yeni konumu otomatik kullan (modal gösterme)
                            const fullAddress = completeLocation.detail
                                ? `${completeLocation.district || completeLocation.city}, ${completeLocation.detail}`
                                : completeLocation.formattedAddress;

                            console.log('📍 GPS modunda ilk konum tespit edildi:', fullAddress);
                            setNewLocation(cityDetail);
                            setNewLocationFullAddress(fullAddress);
                            // Modal göstermeden otomatik uygulama için flag set et
                            setShouldAutoApply(true);
                        }
                    } catch (error) {
                        console.error('Error checking location change:', error);
                    } finally {
                        setIsChecking(false);
                    }
                },
                (error) => {
                    console.log('Location check error:', error);
                    setIsChecking(false);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 0, // Her zaman taze konum al
                    showLocationDialog: false, // GPS kapalıysa sistem diyaloğu gösterme
                },
            );

        } catch (error) {
            console.error('Error in location check flow:', error);
            setIsChecking(false);
        }
    }, [isOnline, isChecking]); // selectedLocation dependency removed as we use storage now

    // AppState ref - uygulama ön plana geldiğinde kontrol için
    const appState = useRef(AppState.currentState);
    const lastCheckTime = useRef<number>(0);

    // Uygulama açıldığında bir kez kontrol et
    useEffect(() => {
        // Biraz gecikmeli başlat ki uygulama açılışını yavaşlatmasın
        const timer = setTimeout(() => {
            checkLocationChange();
            lastCheckTime.current = Date.now();
        }, 1000);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOnline]); // isOnline değiştiğinde de tetiklensin (örn: internet gelince)

    // AppState listener - uygulama ön plana geldiğinde kontrol et
    useEffect(() => {
        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            // Uygulama arka plandan ön plana geldiğinde
            if (
                appState.current.match(/inactive|background/) &&
                nextAppState === 'active'
            ) {
                // Son kontrolden en az 10 saniye geçmişse kontrol et
                const now = Date.now();
                if (now - lastCheckTime.current > 10000) {
                    console.log('📍 Uygulama ön plana geldi - konum kontrolü yapılıyor...');
                    checkLocationChange();
                    lastCheckTime.current = now;
                }
            }
            appState.current = nextAppState;
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription.remove();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOnline]);

    return {
        showChangeModal,
        newLocation,
        newLocationFullAddress, // Detaylı adres (sokak, mahalle vs.)
        setShowChangeModal,
        checkLocationChange,
        shouldAutoApply,
        setShouldAutoApply,
        isAutoUpdateEnabled,
    };
};

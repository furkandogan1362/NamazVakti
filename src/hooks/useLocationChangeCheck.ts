import { useState, useEffect, useCallback, useRef } from 'react';
import { PermissionsAndroid, AppState, AppStateStatus } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { DiyanetService, CityDetail } from '../api/apiDiyanet';
import { loadGPSCityInfo, loadLocationMode, loadLocationData, loadAutoLocationUpdatePreference } from '../services/storageService';
import { useNetwork } from '../contexts/NetworkContext';

export const useLocationChangeCheck = () => {
    const [showChangeModal, setShowChangeModal] = useState(false);
    const [newLocation, setNewLocation] = useState<CityDetail | null>(null);
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
                        // 3. Koordinatlardan şehir bilgisini al
                        const cityDetail = await DiyanetService.getCityFromLocation(
                            position.coords.latitude,
                            position.coords.longitude
                        );

                        if (!cityDetail) {
                            console.log('🔍 GPS konum bilgisi alınamadı');
                            setIsChecking(false);
                            return;
                        }

                        // 4. Mevcut kayıtlı konumla karşılaştır
                        const locationMode = await loadLocationMode();
                        let currentCityName = '';
                        let currentDistrictName = '';
                        let currentLocationId = '';

                        console.log('🔍 Konum değişikliği kontrolü:', {
                            locationMode,
                            newLocation: `${cityDetail.name}, ${cityDetail.city}`,
                            newLocationId: cityDetail.id,
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
                        const isDifferentById = currentLocationId && cityDetail.id !== currentLocationId;

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
                            console.log('📍 GPS konum değişikliği tespit edildi:', `${currentDistrictName} -> ${cityDetail.name}`);
                            setNewLocation(cityDetail);

                            // Otomatik güncelleme aktifse modal gösterme, direkt uygula
                            if (autoUpdatePreference) {
                                console.log('📍 Otomatik güncelleme aktif - modal göstermeden uygulama yapılacak');
                                setShouldAutoApply(true);
                            } else {
                                setShowChangeModal(true);
                            }
                        } else if (!hasExistingLocation && locationMode === 'gps') {
                            // GPS modunda ama mevcut konum yok - yeni konumu otomatik kullan (modal gösterme)
                            console.log('📍 GPS modunda ilk konum tespit edildi:', cityDetail.name);
                            setNewLocation(cityDetail);
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
        setShowChangeModal,
        checkLocationChange,
        shouldAutoApply,
        setShouldAutoApply,
        isAutoUpdateEnabled,
    };
};

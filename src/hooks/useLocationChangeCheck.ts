import { useState, useEffect, useCallback } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { DiyanetService, CityDetail } from '../api/apiDiyanet';
import { loadGPSCityInfo, loadLocationMode, loadLocationData } from '../services/storageService';
import { useNetwork } from '../contexts/NetworkContext';

export const useLocationChangeCheck = () => {
    const [showChangeModal, setShowChangeModal] = useState(false);
    const [newLocation, setNewLocation] = useState<CityDetail | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const { isOnline } = useNetwork();

    const checkLocationChange = useCallback(async () => {
        if (!isOnline || isChecking) {
            return;
        }

        setIsChecking(true);

        try {
            // 1. İzin kontrolü
            let hasPermission = false;
            if (Platform.OS === 'android') {
                hasPermission = await PermissionsAndroid.check(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
                );
            } else {
                const authStatus = await Geolocation.requestAuthorization('whenInUse');
                hasPermission = authStatus === 'granted';
            }

            if (!hasPermission) {
                setIsChecking(false);
                return;
            }

            // 2. Mevcut konumu al
            Geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        // 3. Koordinatlardan şehir bilgisini al
                        const cityDetail = await DiyanetService.getCityFromLocation(
                            position.coords.latitude,
                            position.coords.longitude
                        );

                        if (!cityDetail) {
                            setIsChecking(false);
                            return;
                        }

                        // 4. Mevcut kayıtlı konumla karşılaştır
                        const locationMode = await loadLocationMode();
                        let currentCityName = '';
                        let currentDistrictName = '';

                        if (locationMode === 'gps') {
                            const gpsCityInfo = await loadGPSCityInfo();
                            if (gpsCityInfo) {
                                currentCityName = gpsCityInfo.city;
                                currentDistrictName = gpsCityInfo.name;
                            }
                        } else {
                            // Manuel mod - Storage'dan oku (Context yerine)
                            // Bu sayede stale closure sorununu aşarız ve her zaman en son kaydedilen konumu alırız
                            const savedLocation = await loadLocationData();
                            if (savedLocation && savedLocation.city && savedLocation.district) {
                                currentCityName = savedLocation.city.name;
                                currentDistrictName = savedLocation.district.name;
                            }
                        }

                        // Karşılaştırma
                        // Normalize strings for comparison to avoid case/locale issues
                        const normalize = (str: string) => str ? str.toLowerCase().trim() : '';

                        const isDifferent =
                            (currentCityName && normalize(cityDetail.city) !== normalize(currentCityName)) ||
                            (currentDistrictName && normalize(cityDetail.name) !== normalize(currentDistrictName));

                        // Eğer hiç konum yoksa (ilk açılış vs) modal gösterme
                        const hasExistingLocation = currentCityName !== '' || currentDistrictName !== '';

                        if (hasExistingLocation && isDifferent) {
                            setNewLocation(cityDetail);
                            setShowChangeModal(true);
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
                    maximumAge: 10000,
                    showLocationDialog: false, // GPS kapalıysa sistem diyaloğu gösterme
                },
            );

        } catch (error) {
            console.error('Error in location check flow:', error);
            setIsChecking(false);
        }
    }, [isOnline, isChecking]); // selectedLocation dependency removed as we use storage now

    // Uygulama açıldığında bir kez kontrol et
    useEffect(() => {
        // Biraz gecikmeli başlat ki uygulama açılışını yavaşlatmasın
        const timer = setTimeout(() => {
            checkLocationChange();
        }, 3000);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOnline]); // isOnline değiştiğinde de tetiklensin (örn: internet gelince)

    return {
        showChangeModal,
        newLocation,
        setShowChangeModal,
        checkLocationChange,
    };
};

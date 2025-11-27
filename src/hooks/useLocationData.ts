// useLocationData.ts

/**
 * Konum verilerinin yüklenmesi ve yönetimi için özel hook
 * Bu hook, konum verilerinin API'den yüklenmesi ve yerel depolamadan
 * alınması işlemlerini yönetir.
 * İşlevler:
 * - Ülke, şehir ve ilçe listelerini yükler
 * - Kaydedilmiş konum verilerini geri yükler
 * - Konum değişikliklerini takip eder ve gerekli güncellemeleri yapar
 */
import { useEffect } from 'react';
import { useLocation } from '../contexts/LocationContext';
import { useNetwork } from '../contexts/NetworkContext';
import { DiyanetManuelService } from '../api/apiDiyanetManuel';
import {
    loadLocationData,
    saveLocationData,
    saveCountries,
    loadCountries,
    saveCities,
    loadCities,
    saveDistricts,
    loadDistricts,
} from '../services/storageService';

export const useLocationData = () => {
    const {
        setCountries,
        setCities,
        setDistricts,
        setSelectedLocation,
        setIsSelectingLocation,
        selectedLocation,
    } = useLocation();
    const { isOnline } = useNetwork();

    // Uygulama başlangıcında kaydedilmiş konumu yükle
    useEffect(() => {
        const initializeLocationData = async () => {
            const savedLocation = await loadLocationData();
            if (savedLocation && savedLocation.district) {
                setSelectedLocation(savedLocation);
                setIsSelectingLocation(false);
            }
        };
        initializeLocationData();
    }, [setSelectedLocation, setIsSelectingLocation]);

    // Ülkeleri yükle
    useEffect(() => {
        const loadCountriesData = async () => {
            // Stale-while-revalidate: Önce cache'i göster
            const cachedCountries = await loadCountries();
            if (cachedCountries && cachedCountries.length > 0) {
                setCountries(cachedCountries);
            }

            // Arka planda API'den güncelle (sadece online ise)
            if (isOnline) {
                try {
                    const freshData = await DiyanetManuelService.getCountries();
                    setCountries(freshData);
                    saveCountries(freshData);
                } catch (error) {
                    console.error('Error loading countries:', error);
                }
            }
        };
        loadCountriesData();
    }, [isOnline, setCountries]);

    // Şehirleri yükle (ülke seçildiğinde)
    useEffect(() => {
        const loadCitiesData = async () => {
            if (selectedLocation.country) {
                const countryId = selectedLocation.country.id;

                // Stale-while-revalidate: Önce cache'i göster
                const cachedCities = await loadCities(countryId);
                if (cachedCities && cachedCities.length > 0) {
                    setCities(cachedCities);
                }

                // Arka planda API'den güncelle (sadece online ise)
                if (isOnline) {
                    try {
                        const freshData = await DiyanetManuelService.getStates(countryId);
                        setCities(freshData);
                        saveCities(countryId, freshData);
                    } catch (error) {
                        console.error('Error loading cities:', error);
                    }
                }
            } else {
                setCities([]);
            }
        };
        loadCitiesData();
    }, [selectedLocation.country, isOnline, setCities]);

    // İlçeleri yükle (şehir seçildiğinde)
    useEffect(() => {
        const loadDistrictsData = async () => {
            if (selectedLocation.city) {
                const cityId = selectedLocation.city.id;

                // Stale-while-revalidate: Önce cache'i göster
                const cachedDistricts = await loadDistricts(cityId);
                if (cachedDistricts && cachedDistricts.length > 0) {
                    setDistricts(cachedDistricts);

                    // Tek ilçe varsa otomatik seç
                    if (cachedDistricts.length === 1 && !selectedLocation.district) {
                        setSelectedLocation({
                            ...selectedLocation,
                            district: cachedDistricts[0],
                        });
                    }
                }

                // Arka planda API'den güncelle (sadece online ise)
                if (isOnline) {
                    try {
                        const freshData = await DiyanetManuelService.getDistricts(cityId);
                        setDistricts(freshData);
                        saveDistricts(cityId, freshData);

                        // Tek ilçe varsa otomatik seç
                        if (freshData.length === 1 && !selectedLocation.district) {
                            setSelectedLocation({
                                ...selectedLocation,
                                district: freshData[0],
                            });
                        }
                    } catch (error) {
                        console.error('Error loading districts:', error);
                    }
                }
            } else {
                setDistricts([]);
            }
        };
        loadDistrictsData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedLocation.city, isOnline, setDistricts]);

    // Konum tam seçildiğinde kaydet
    useEffect(() => {
        if (selectedLocation.country && selectedLocation.city && selectedLocation.district) {
            saveLocationData(selectedLocation);
        }
    }, [selectedLocation]);
};

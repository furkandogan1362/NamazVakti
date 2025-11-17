// useLocationData.ts

/**
 * Konum verilerinin yüklenmesi ve yönetimi için özel hook
 * Bu hook, konum verilerinin API'den yüklenmesi ve yerel depolamadan
 * alınması işlemlerini yönetir.
 * İşlevler:
 * - Ülke, şehir ve bölge listelerini yükler
 * - Kaydedilmiş konum verilerini geri yükler
 * - Konum değişikliklerini takip eder ve gerekli güncellemeleri yapar
 */
import { useEffect } from 'react';
import { useLocation } from '../contexts/LocationContext';
import { useNetwork } from '../contexts/NetworkContext';
import { fetchCountries, fetchCities, fetchRegions } from '../api/apiService';
import {
    loadLocationData,
    saveLocationData,
    saveCountries,
    loadCountries,
    saveCities,
    loadCities,
    saveRegions,
    loadRegions,
} from '../services/storageService';

export const useLocationData = () => {
    const {
        setCountries,
        setCities,
        setRegions,
        setSelectedLocation,
        setIsSelectingLocation,
        selectedLocation,
    } = useLocation();
    const { isOnline } = useNetwork();

    useEffect(() => {
        const initializeLocationData = async () => {
            const savedLocation = await loadLocationData();
            if (savedLocation) {
                setSelectedLocation(savedLocation);
                setIsSelectingLocation(false);
            }
        };
        initializeLocationData();
    }, [setSelectedLocation, setIsSelectingLocation]);

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
                    const freshData = await fetchCountries();
                    setCountries(freshData);
                    saveCountries(freshData);
                } catch (error) {
                    console.error('Error loading countries:', error);
                    // Hata durumunda cache kullanılıyor (zaten yukarıda set edildi)
                }
            }
        };
        loadCountriesData();
    }, [isOnline, setCountries]);

    useEffect(() => {
        const loadCitiesData = async () => {
            if (selectedLocation.country) {
                // Stale-while-revalidate: Önce cache'i göster
                const cachedCities = await loadCities(selectedLocation.country);
                if (cachedCities && cachedCities.length > 0) {
                    setCities(cachedCities);
                }

                // Arka planda API'den güncelle (sadece online ise)
                if (isOnline) {
                    try {
                        const freshData = await fetchCities(selectedLocation.country);
                        setCities(freshData);
                        saveCities(selectedLocation.country, freshData);
                    } catch (error) {
                        console.error('Error loading cities:', error);
                    }
                }
            }
        };
        loadCitiesData();
    }, [selectedLocation.country, isOnline, setCities]);

    useEffect(() => {
        const loadRegionsData = async () => {
            if (selectedLocation.country && selectedLocation.city) {
                // Stale-while-revalidate: Önce cache'i göster
                const cachedRegions = await loadRegions(selectedLocation.country, selectedLocation.city);
                if (cachedRegions && cachedRegions.length > 0) {
                    const processedCached = cachedRegions.map(region => ({
                        ...region,
                        region: region.region || selectedLocation.city
                    }));
                    setRegions(processedCached);

                    // Cache'den yüklendiğinde otomatik seçim yap
                    if (processedCached.length === 1 && !selectedLocation.region) {
                        setSelectedLocation({
                            ...selectedLocation,
                            region: processedCached[0].region
                        });
                    }
                }

                // Arka planda API'den güncelle (sadece online ise)
                if (isOnline) {
                    try {
                        const freshData = await fetchRegions(selectedLocation.country, selectedLocation.city);
                        
                        if (freshData && freshData.length > 0) {
                            const processedData = freshData.map(region => ({
                                ...region,
                                region: region.region || selectedLocation.city
                            }));
                            
                            setRegions(processedData);
                            saveRegions(selectedLocation.country, selectedLocation.city, processedData);
                            
                            // API'den yeni veri geldiğinde otomatik seçim yap
                            if (processedData.length === 1 && !selectedLocation.region) {
                                setSelectedLocation({
                                    ...selectedLocation,
                                    region: processedData[0].region
                                });
                            }
                        }
                    } catch (error) {
                        console.error('Error loading regions:', error);
                    }
                }
            }
        };
        loadRegionsData();
    }, [selectedLocation.country, selectedLocation.city, selectedLocation.region, isOnline, setRegions, setSelectedLocation]);

    useEffect(() => {
        if (selectedLocation.country && selectedLocation.city && selectedLocation.region) {
            saveLocationData(selectedLocation);
        }
    }, [selectedLocation]);
};

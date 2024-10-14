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
import { loadLocationData, saveLocationData } from '../services/storageService';

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
        const loadCountries = async () => {
            if (isOnline) {
                try {
                    const data = await fetchCountries();
                    setCountries(data);
                } catch (error) {
                    console.error('Error loading countries:', error);
                }
            }
        };
        loadCountries();
    }, [isOnline, setCountries]);

    useEffect(() => {
        const loadCities = async () => {
            if (isOnline && selectedLocation.country) {
                try {
                    const data = await fetchCities(selectedLocation.country);
                    setCities(data);
                } catch (error) {
                    console.error('Error loading cities:', error);
                }
            }
        };
        loadCities();
    }, [selectedLocation.country, isOnline, setCities]);

    useEffect(() => {
        const loadRegions = async () => {
            if (isOnline && selectedLocation.country && selectedLocation.city) {
                try {
                    const data = await fetchRegions(selectedLocation.country, selectedLocation.city);
                    setRegions(data);
                } catch (error) {
                    console.error('Error loading regions:', error);
                }
            }
        };
        loadRegions();
    }, [selectedLocation.country, selectedLocation.city, isOnline, setRegions]);

    useEffect(() => {
        if (selectedLocation.country && selectedLocation.city && selectedLocation.region) {
            saveLocationData(selectedLocation);
        }
    }, [selectedLocation]);
};

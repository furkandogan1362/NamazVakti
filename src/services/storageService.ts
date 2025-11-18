// storageService.ts

/**
 * Yerel depolama işlemlerini yöneten servis
 * Bu servis, AsyncStorage kullanarak verilerin yerel olarak saklanması ve
 * yüklenmesi işlemlerini gerçekleştirir.
 * Sorumlulukları:
 * - Konum verilerinin kaydedilmesi ve yüklenmesi
 * - Namaz vakitlerinin kaydedilmesi ve yüklenmesi
 * - Son güncelleme tarihinin kaydedilmesi ve yüklenmesi
 * Çevrimdışı kullanım için veri persistence sağlar.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocationData, PrayerTime } from '../types/types';

export const saveLocationData = async (locationData: LocationData): Promise<void> => {
    try {
        await AsyncStorage.setItem('locationData', JSON.stringify(locationData));
    } catch (error) {
        console.error('Error saving location data:', error);
    }
};

export const loadLocationData = async (): Promise<LocationData | null> => {
    try {
        const savedData = await AsyncStorage.getItem('locationData');
        return savedData ? JSON.parse(savedData) : null;
    } catch (error) {
        console.error('Error loading location data:', error);
        return null;
    }
};

export const savePrayerTimes = async (times: PrayerTime[]): Promise<void> => {
    try {
        await AsyncStorage.setItem('prayerTimes', JSON.stringify(times));
    } catch (error) {
        console.error('Error saving prayer times:', error);
    }
};

export const loadPrayerTimes = async (): Promise<PrayerTime[] | null> => {
    try {
        const savedTimes = await AsyncStorage.getItem('prayerTimes');
        return savedTimes ? JSON.parse(savedTimes) : null;
    } catch (error) {
        console.error('Error loading prayer times:', error);
        return null;
    }
};

export const saveLastFetchDate = async (date: Date): Promise<void> => {
    try {
        await AsyncStorage.setItem('lastFetchDate', date.toISOString());
    } catch (error) {
        console.error('Error saving last fetch date:', error);
    }
};

export const loadLastFetchDate = async (): Promise<Date | null> => {
    try {
        const savedDate = await AsyncStorage.getItem('lastFetchDate');
        return savedDate ? new Date(savedDate) : null;
    } catch (error) {
        console.error('Error loading last fetch date:', error);
        return null;
    }
};

export const saveLastLocationId = async (locationId: number): Promise<void> => {
    try {
        await AsyncStorage.setItem('lastLocationId', locationId.toString());
    } catch (error) {
        console.error('Error saving last location ID:', error);
    }
};

export const loadLastLocationId = async (): Promise<number | null> => {
    try {
        const savedId = await AsyncStorage.getItem('lastLocationId');
        return savedId ? parseInt(savedId, 10) : null;
    } catch (error) {
        console.error('Error loading last location ID:', error);
        return null;
    }
};

// Ülke listesi cache
export const saveCountries = async (countries: string[]): Promise<void> => {
    try {
        await AsyncStorage.setItem('countries', JSON.stringify(countries));
    } catch (error) {
        console.error('Error saving countries:', error);
    }
};

export const loadCountries = async (): Promise<string[] | null> => {
    try {
        const savedCountries = await AsyncStorage.getItem('countries');
        return savedCountries ? JSON.parse(savedCountries) : null;
    } catch (error) {
        console.error('Error loading countries:', error);
        return null;
    }
};

// Şehir listesi cache (ülkeye göre)
export const saveCities = async (country: string, cities: string[]): Promise<void> => {
    try {
        await AsyncStorage.setItem(`cities_${country}`, JSON.stringify(cities));
    } catch (error) {
        console.error('Error saving cities:', error);
    }
};

export const loadCities = async (country: string): Promise<string[] | null> => {
    try {
        const savedCities = await AsyncStorage.getItem(`cities_${country}`);
        return savedCities ? JSON.parse(savedCities) : null;
    } catch (error) {
        console.error('Error loading cities:', error);
        return null;
    }
};

// Bölge listesi cache (ülke ve şehre göre)
export const saveRegions = async (country: string, city: string, regions: any[]): Promise<void> => {
    try {
        await AsyncStorage.setItem(`regions_${country}_${city}`, JSON.stringify(regions));
    } catch (error) {
        console.error('Error saving regions:', error);
    }
};

export const loadRegions = async (country: string, city: string): Promise<any[] | null> => {
    try {
        const savedRegions = await AsyncStorage.getItem(`regions_${country}_${city}`);
        return savedRegions ? JSON.parse(savedRegions) : null;
    } catch (error) {
        console.error('Error loading regions:', error);
        return null;
    }
};

export const clearStoredData = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem('prayerTimes');
        await AsyncStorage.removeItem('lastFetchDate');
        await AsyncStorage.removeItem('lastLocationId');
        // Location cache'leri silmiyoruz, onlar kalıcı
    } catch (error) {
        console.error('Error clearing stored data:', error);
    }
};

// Haftalık liste son gösterim tarihi
export const saveWeeklyLastShownDate = async (date: string): Promise<void> => {
    try {
        await AsyncStorage.setItem('weeklyLastShownDate', date);
    } catch (error) {
        console.error('Error saving weekly last shown date:', error);
    }
};

export const loadWeeklyLastShownDate = async (): Promise<string | null> => {
    try {
        return await AsyncStorage.getItem('weeklyLastShownDate');
    } catch (error) {
        console.error('Error loading weekly last shown date:', error);
        return null;
    }
};

// Aylık liste son gösterim tarihi
export const saveMonthlyLastShownDate = async (date: string): Promise<void> => {
    try {
        await AsyncStorage.setItem('monthlyLastShownDate', date);
    } catch (error) {
        console.error('Error saving monthly last shown date:', error);
    }
};

export const loadMonthlyLastShownDate = async (): Promise<string | null> => {
    try {
        return await AsyncStorage.getItem('monthlyLastShownDate');
    } catch (error) {
        console.error('Error loading monthly last shown date:', error);
        return null;
    }
};

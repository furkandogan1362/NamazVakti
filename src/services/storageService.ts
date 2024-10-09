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

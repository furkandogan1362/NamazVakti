// usePrayerTimes.ts

/**
 * Namaz vakitlerinin yüklenmesi ve yönetimi için özel hook
 * Bu hook, seçili konuma göre namaz vakitlerinin API'den alınması ve
 * yerel olarak saklanması işlemlerini yönetir.
 * Özellikler:
 * - Namaz vakitlerini periyodik olarak günceller
 * - Çevrimdışı kullanım için verileri saklar
 * - Son güncelleme tarihini takip eder
 */
import { useState, useEffect, useCallback } from 'react';
import { useLocation } from '../contexts/LocationContext';
import { useNetwork } from '../contexts/NetworkContext';
import { fetchPrayerTimesByLocationId } from '../api/apiService';
import {
    savePrayerTimes,
    loadPrayerTimes,
    saveLastFetchDate,
    loadLastFetchDate,
    saveLocationData,
} from '../services/storageService';
import { PrayerTime } from '../types/types';

export const usePrayerTimes = () => {
    const [allPrayerTimes, setAllPrayerTimes] = useState<PrayerTime[]>([]);
    const [currentDayPrayerTime, setCurrentDayPrayerTime] = useState<PrayerTime | null>(null);
    const [lastFetchDate, setLastFetchDate] = useState<Date | null>(null);
    const { selectedLocation, regions } = useLocation();
    const { isOnline } = useNetwork();

    const updateCurrentDayPrayerTime = useCallback(() => {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        
        if (allPrayerTimes.length > 0) {
            const currentDay = allPrayerTimes.find(pt => pt.date.split('T')[0] === today);
            
            if (currentDay) {
                const ishaTime = new Date(today + 'T' + currentDay.isha);
                const nextDay = allPrayerTimes.find(pt => {
                    const ptDate = new Date(pt.date);
                    const todayDate = new Date(today);
                    return ptDate.getDate() === todayDate.getDate() + 1;
                });

                if (now > ishaTime && nextDay) {
                    setCurrentDayPrayerTime(nextDay);
                } else {
                    setCurrentDayPrayerTime(currentDay);
                }
            }
        }
    }, [allPrayerTimes]);

    useEffect(() => {
        const initializePrayerTimes = async () => {
            const savedTimes = await loadPrayerTimes();
            const savedFetchDate = await loadLastFetchDate();
            setAllPrayerTimes(savedTimes || []);
            setLastFetchDate(savedFetchDate);
        };
        initializePrayerTimes();
    }, []);

    const shouldFetchNewData = useCallback(() => {
        if (!lastFetchDate) return true;
        const daysSinceLastFetch = Math.floor((new Date().getTime() - lastFetchDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysSinceLastFetch >= 29;
    }, [lastFetchDate]);

    useEffect(() => {
        const fetchPrayerTimes = async () => {
            if (isOnline && shouldFetchNewData()) {
                try {
                    const { country, city, region } = selectedLocation;
                    if (country && city && region && regions.length) {
                        const selectedRegionObject = regions.find(r => r.region === region);
                        if (selectedRegionObject) {
                            const data = await fetchPrayerTimesByLocationId(selectedRegionObject.id);
                            setAllPrayerTimes(data);
                            savePrayerTimes(data);
                            saveLocationData(selectedLocation);
                            const newFetchDate = new Date();
                            setLastFetchDate(newFetchDate);
                            saveLastFetchDate(newFetchDate);
                        }
                    }
                } catch (error) {
                    console.error('Error fetching prayer times:', error);
                }
            }
        };

        fetchPrayerTimes();
    }, [selectedLocation, regions, isOnline, shouldFetchNewData]);

    useEffect(() => {
        updateCurrentDayPrayerTime();
        
        const interval = setInterval(() => {
            updateCurrentDayPrayerTime();
        }, 60000); // Her dakika kontrol et

        return () => clearInterval(interval);
    }, [allPrayerTimes, updateCurrentDayPrayerTime]);

    return currentDayPrayerTime;
};
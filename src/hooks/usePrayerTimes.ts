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
    saveLastLocationId,
    loadLastLocationId,
} from '../services/storageService';
import { PrayerTime } from '../types/types';

export const usePrayerTimes = () => {
    const [allPrayerTimes, setAllPrayerTimes] = useState<PrayerTime[]>([]);
    const [currentDayPrayerTime, setCurrentDayPrayerTime] = useState<PrayerTime | null>(null);
    const [lastFetchDate, setLastFetchDate] = useState<Date | null>(null);
    const [lastLocationId, setLastLocationId] = useState<number | null>(null);
    const { selectedLocation, regions } = useLocation();
    const { isOnline } = useNetwork();

    const updateCurrentDayPrayerTime = useCallback(() => {
        // Türkiye saat dilimine göre tarihi al (UTC+3)
        const now = new Date();
        const utcTime = now.getTime();
        const turkeyOffset = 3 * 60 * 60 * 1000; // UTC+3 in milliseconds
        const turkeyTime = new Date(utcTime + turkeyOffset);
        
        // Manuel olarak YYYY-MM-DD formatında oluştur
        const year = turkeyTime.getUTCFullYear();
        const month = String(turkeyTime.getUTCMonth() + 1).padStart(2, '0');
        const day = String(turkeyTime.getUTCDate()).padStart(2, '0');
        const today = `${year}-${month}-${day}`;

        if (allPrayerTimes.length > 0) {
            const currentDay = allPrayerTimes.find(pt => pt.date.split('T')[0] === today);

            if (currentDay) {
                const ishaTime = new Date(today + 'T' + currentDay.isha);
                
                // Yarının tarihini hesapla (ay ve yıl geçişlerinde de çalışır)
                const todayDate = new Date(today);
                const tomorrow = new Date(todayDate);
                tomorrow.setDate(tomorrow.getDate() + 1);
                const tomorrowStr = tomorrow.toISOString().split('T')[0];
                
                const nextDay = allPrayerTimes.find(pt => pt.date.split('T')[0] === tomorrowStr);

                if (now > ishaTime && nextDay) {
                    setCurrentDayPrayerTime(nextDay);
                } else {
                    setCurrentDayPrayerTime(currentDay);
                }
            }
        }
    }, [allPrayerTimes]);

    const fetchPrayerTimes = useCallback(async () => {
        const { country, city, region } = selectedLocation;
        
        if (country && city && region && regions.length) {
            const selectedRegionObject = regions.find(r => r.region === region);
            
            if (selectedRegionObject) {
                // Konum değişti mi kontrol et
                const locationChanged = lastLocationId !== null && lastLocationId !== selectedRegionObject.id;
                
                // Cache süresi kontrolü: Son veri çekme tarihinden 24 saat geçmişse API'den çek
                const now = new Date();
                const cacheExpired = !lastFetchDate ||
                    (now.getTime() - lastFetchDate.getTime()) > 24 * 60 * 60 * 1000; // 24 saat

                // Konum değiştiyse veya cache süresi dolmuşsa API'den çek
                const shouldFetch = locationChanged || cacheExpired;

                if (isOnline && shouldFetch) {
                    try {
                        const data = await fetchPrayerTimesByLocationId(selectedRegionObject.id);
                        setAllPrayerTimes(data);
                        savePrayerTimes(data);
                        const newFetchDate = new Date();
                        setLastFetchDate(newFetchDate);
                        saveLastFetchDate(newFetchDate);
                        setLastLocationId(selectedRegionObject.id);
                        saveLastLocationId(selectedRegionObject.id);
                    } catch (error) {
                        console.error('Error fetching prayer times, using cached data:', error);
                        // Hata durumunda cache'den yükle
                        const cachedTimes = await loadPrayerTimes();
                        if (cachedTimes && cachedTimes.length > 0) {
                            setAllPrayerTimes(cachedTimes);
                        }
                    }
                } else if (!isOnline) {
                    // İnternet yoksa cache'den yükle
                    const cachedTimes = await loadPrayerTimes();
                    if (cachedTimes && cachedTimes.length > 0) {
                        setAllPrayerTimes(cachedTimes);
                    }
                } else if (!locationChanged && !cacheExpired) {
                    // Konum değişmedi ve cache geçerli, mevcut veriyi kullan
                    setLastLocationId(selectedRegionObject.id);
                }
            }
        }
    }, [selectedLocation, regions, isOnline, lastFetchDate, lastLocationId]);

    useEffect(() => {
        const initializePrayerTimes = async () => {
            const savedTimes = await loadPrayerTimes();
            const savedFetchDate = await loadLastFetchDate();
            const savedLocationId = await loadLastLocationId();
            setAllPrayerTimes(savedTimes || []);
            setLastFetchDate(savedFetchDate);
            setLastLocationId(savedLocationId);
        };
        initializePrayerTimes();
    }, []);

    useEffect(() => {
        fetchPrayerTimes();
    }, [fetchPrayerTimes]);

    useEffect(() => {
        updateCurrentDayPrayerTime();

        const interval = setInterval(() => {
            updateCurrentDayPrayerTime();
        }, 60000); // Her dakika kontrol et

        return () => clearInterval(interval);
    }, [allPrayerTimes, updateCurrentDayPrayerTime, lastFetchDate]);

    return currentDayPrayerTime;
};

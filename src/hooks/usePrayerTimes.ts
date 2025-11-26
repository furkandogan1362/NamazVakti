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

import { useState, useEffect, useCallback, useRef } from 'react';
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

// Türkiye saat diliminde bugünün tarihini al
const getTurkeyDate = (): string => {
    const now = new Date();
    const utcTime = now.getTime();
    const turkeyOffset = 3 * 60 * 60 * 1000; // UTC+3
    const turkeyTime = new Date(utcTime + turkeyOffset);

    const year = turkeyTime.getUTCFullYear();
    const month = String(turkeyTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(turkeyTime.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

// Bugünden itibaren belirtilen gün sayısı kadar veri var mı kontrol et
const hasEnoughFutureData = (prayerTimes: PrayerTime[], daysNeeded: number): boolean => {
    if (prayerTimes.length === 0) {return false;}

    const today = getTurkeyDate();
    const todayIndex = prayerTimes.findIndex(pt => pt.date.split('T')[0] === today);

    if (todayIndex === -1) {return false;}

    // Bugünden itibaren kaç gün veri var?
    const remainingDays = prayerTimes.length - todayIndex;

    return remainingDays >= daysNeeded;
};

export const usePrayerTimes = () => {
    const [allPrayerTimes, setAllPrayerTimes] = useState<PrayerTime[]>([]);
    const [currentDayPrayerTime, setCurrentDayPrayerTime] = useState<PrayerTime | null>(null);
    const [lastFetchDate, setLastFetchDate] = useState<Date | null>(null);
    const [lastLocationId, setLastLocationId] = useState<number | null>(null);
    const { selectedLocation, regions } = useLocation();
    const { isOnline } = useNetwork();

    // Ref to hold the latest allPrayerTimes to avoid dependency cycles
    const allPrayerTimesRef = useRef(allPrayerTimes);

    useEffect(() => {
        allPrayerTimesRef.current = allPrayerTimes;
    }, [allPrayerTimes]);

    const updateCurrentDayPrayerTime = useCallback(() => {
        // Türkiye saat dilimine göre tarihi al (UTC+3)
        const today = getTurkeyDate();

        if (allPrayerTimes.length > 0) {
            // Bugünün verilerini bul ve göster
            const currentDay = allPrayerTimes.find(pt => pt.date.split('T')[0] === today);

            if (currentDay) {
                setCurrentDayPrayerTime(currentDay);
            }
        }
    }, [allPrayerTimes]);

    const fetchPrayerTimes = useCallback(async () => {
        // İnternet yoksa direkt cache'den yükle, bölge kontrolüne gerek yok
        if (!isOnline) {
            // Eğer zaten veri varsa tekrar yükleme (Loop'u engelle)
            if (allPrayerTimesRef.current.length > 0) {
                return;
            }
            const cachedTimes = await loadPrayerTimes();
            if (cachedTimes && cachedTimes.length > 0) {
                setAllPrayerTimes(cachedTimes);
            }
            return;
        }

        const { country, city, region } = selectedLocation;

        if (country && city && region && regions.length) {
            const selectedRegionObject = regions.find(r => r.region === region);

            if (selectedRegionObject) {
                // Konum değişti mi kontrol et
                const locationChanged = lastLocationId !== null && lastLocationId !== selectedRegionObject.id;

                // Bugünün verisi var mı kontrol et
                const today = getTurkeyDate();
                const hasDataForToday = allPrayerTimesRef.current.some(pt => pt.date.split('T')[0] === today);

                // Bugünden itibaren en az 30 gün veri var mı? (aylık görünüm için)
                const hasEnoughData = hasEnoughFutureData(allPrayerTimesRef.current, 30);

                // Konum değiştiyse, bugünün verisi yoksa veya yeterli veri yoksa API'den çek
                // Cache süresi kontrolü kaldırıldı - yeterli veri varsa çekme
                const shouldFetch = locationChanged || !hasDataForToday || !hasEnoughData;

                if (shouldFetch) {
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
                } else if (!locationChanged) {
                    // Konum değişmedi, mevcut veriyi kullan
                    setLastLocationId(selectedRegionObject.id);
                }
            }
        }
    }, [selectedLocation, regions, isOnline, lastLocationId]); // allPrayerTimes ve lastFetchDate bağımlılığı kaldırıldı

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

    return { currentDayPrayerTime, allPrayerTimes, setAllPrayerTimes };
};

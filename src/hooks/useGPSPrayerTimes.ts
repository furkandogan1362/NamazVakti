// useGPSPrayerTimes.ts

/**
 * GPS tabanlı namaz vakitlerinin yüklenmesi ve yönetimi için özel hook
 * Bu hook, GPS ile alınan konum verisine göre namaz vakitlerinin
 * 30 günlük cache ile saklanması ve güncellenmesi işlemlerini yönetir.
 * Özellikler:
 * - 30 günlük cache süresi
 * - Yatsı sonrası imsak güncellemesi
 * - Gece yarısı sonrası tam gün güncellemesi
 * - Çevrimdışı kullanım desteği
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNetwork } from '../contexts/NetworkContext';
import { DiyanetService } from '../api/apiDiyanet';
import {
    saveGPSPrayerTimes,
    loadGPSPrayerTimes,
    saveGPSLastFetchDate,
    loadGPSLastFetchDate,
    loadGPSCityInfo,
    loadLocationMode,
} from '../services/storageService';
import { PrayerTime } from '../types/types';

// Diyanet API'den gelen veriyi PrayerTime formatına dönüştür
const convertToPrayerTime = (data: any): PrayerTime => {
    return {
        date: data.gregorianDateShort.split('.').reverse().join('-'), // "26.11.2025" -> "2025-11-26"
        fajr: data.fajr,
        sun: data.sunrise,
        dhuhr: data.dhuhr,
        asr: data.asr,
        maghrib: data.maghrib,
        isha: data.isha,
        hijriDate: data.hijriDateShort.split('.')[0],
        hijriMonth: data.hijriDateLong.split(' ')[1],
        hijriYear: data.hijriDateShort.split('.')[2],
    };
};

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
    if (prayerTimes.length === 0) {
        return false;
    }

    const today = getTurkeyDate();
    const todayIndex = prayerTimes.findIndex(pt => pt.date.split('T')[0] === today);

    if (todayIndex === -1) {
        return false;
    }

    // Bugünden itibaren kaç gün veri var?
    const remainingDays = prayerTimes.length - todayIndex;

    return remainingDays >= daysNeeded;
};

export const useGPSPrayerTimes = () => {
    const [gpsPrayerTimes, setGpsPrayerTimes] = useState<PrayerTime[]>([]);
    const [currentDayPrayerTime, setCurrentDayPrayerTime] = useState<PrayerTime | null>(null);
    const [_lastFetchDate, setLastFetchDate] = useState<Date | null>(null);
    const [isGPSMode, setIsGPSMode] = useState<boolean>(false);
    const { isOnline } = useNetwork();

    // Ref to hold the latest gpsPrayerTimes
    const gpsPrayerTimesRef = useRef(gpsPrayerTimes);

    useEffect(() => {
        gpsPrayerTimesRef.current = gpsPrayerTimes;
    }, [gpsPrayerTimes]);

    // Bugünün namazını güncelle
    const updateCurrentDayPrayerTime = useCallback(() => {
        const today = getTurkeyDate();

        if (gpsPrayerTimes.length > 0) {
            const currentDay = gpsPrayerTimes.find(pt => pt.date.split('T')[0] === today);
            if (currentDay) {
                setCurrentDayPrayerTime(currentDay);
            }
        }
    }, [gpsPrayerTimes]);

    // GPS namaz vakitlerini çek
    const fetchGPSPrayerTimes = useCallback(async (forceRefresh: boolean = false) => {
        // Mod kontrolü
        const locationMode = await loadLocationMode();
        if (locationMode !== 'gps') {
            setIsGPSMode(false);
            return;
        }
        setIsGPSMode(true);

        // GPS şehir bilgisi kontrolü
        const gpsCityInfo = await loadGPSCityInfo();
        if (!gpsCityInfo) {
            return;
        }

        // İnternet yoksa cache'den yükle
        if (!isOnline) {
            if (gpsPrayerTimesRef.current.length === 0) {
                const cachedTimes = await loadGPSPrayerTimes();
                if (cachedTimes && cachedTimes.length > 0) {
                    console.log('📦 GPS namaz vakitleri cache\'den yüklendi (çevrimdışı mod).');
                    setGpsPrayerTimes(cachedTimes);
                }
            }
            return;
        }

        const today = getTurkeyDate();

        // Bugünün verisi var mı kontrol et
        const hasDataForToday = gpsPrayerTimesRef.current.some(pt => pt.date.split('T')[0] === today);

        // Bugünden itibaren en az 30 gün veri var mı? (aylık görünüm için)
        const hasEnoughData = hasEnoughFutureData(gpsPrayerTimesRef.current, 30);

        // Veri çekme gerekli mi?
        // Bugünün verisi ve yeterli ileri tarih verisi varsa çekme
        const shouldFetch = forceRefresh || !hasDataForToday || !hasEnoughData;

        if (shouldFetch) {
            try {
                console.log('🔄 GPS namaz vakitleri çekiliyor (30 günlük)...');
                console.log(`   Sebep: forceRefresh=${forceRefresh}, hasDataForToday=${hasDataForToday}, hasEnoughData=${hasEnoughData}`);
                const prayerTimesData = await DiyanetService.getPrayerTimes(gpsCityInfo.id, 'Monthly');

                // Veriyi dönüştür
                const convertedPrayerTimes = prayerTimesData.map(convertToPrayerTime);

                setGpsPrayerTimes(convertedPrayerTimes);
                await saveGPSPrayerTimes(convertedPrayerTimes);

                const newFetchDate = new Date();
                setLastFetchDate(newFetchDate);
                await saveGPSLastFetchDate(newFetchDate);

                console.log('✅ GPS namaz vakitleri başarıyla güncellendi.');
            } catch (error) {
                console.error('GPS namaz vakitleri çekilirken hata:', error);
                // Hata durumunda cache'den yükle
                const cachedTimes = await loadGPSPrayerTimes();
                if (cachedTimes && cachedTimes.length > 0) {
                    console.log('📦 GPS namaz vakitleri cache\'den yüklendi (hata sonrası).');
                    setGpsPrayerTimes(cachedTimes);
                }
            }
        } else {
            console.log('✅ GPS namaz vakitleri cache\'de mevcut, API çağrısı yapılmadı.');
            console.log(`   Bugünün verisi: ${hasDataForToday}, Yeterli veri: ${hasEnoughData}`);
        }
    }, [isOnline]);

    // İlk yüklemede verileri yükle
    useEffect(() => {
        const initializeGPSPrayerTimes = async () => {
            const locationMode = await loadLocationMode();
            setIsGPSMode(locationMode === 'gps');

            if (locationMode === 'gps') {
                const savedTimes = await loadGPSPrayerTimes();
                const savedFetchDate = await loadGPSLastFetchDate();

                setGpsPrayerTimes(savedTimes || []);
                setLastFetchDate(savedFetchDate);
            }
        };
        initializeGPSPrayerTimes();
    }, []);

    // Veri çekme
    useEffect(() => {
        if (isGPSMode) {
            fetchGPSPrayerTimes();
        }
    }, [fetchGPSPrayerTimes, isGPSMode]);

    // Her dakika günü kontrol et ve güncelle
    useEffect(() => {
        updateCurrentDayPrayerTime();

        const interval = setInterval(() => {
            updateCurrentDayPrayerTime();
        }, 60000); // Her dakika kontrol et

        return () => clearInterval(interval);
    }, [gpsPrayerTimes, updateCurrentDayPrayerTime]);

    return {
        gpsPrayerTimes,
        currentDayPrayerTime,
        setGpsPrayerTimes,
        isGPSMode,
        refreshGPSPrayerTimes: () => fetchGPSPrayerTimes(true),
    };
};

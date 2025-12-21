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
        gregorianDateLong: data.gregorianDateLong,  // Diyanet API'den miladi tarih
        hijriDateLong: data.hijriDateLong,          // Diyanet API'den hicri tarih
    };
};

// Yerel saat diliminde bugünün tarihini al
const getLocalTodayDate = (timezone?: string): string => {
    const now = new Date();

    if (timezone) {
        try {
            const options: Intl.DateTimeFormatOptions = {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            };
            const formatter = new Intl.DateTimeFormat('en-CA', options);
            return formatter.format(now);
        } catch (e) {
            console.warn('Invalid timezone for date calculation:', timezone);
        }
    }

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

// Bugünden itibaren belirtilen gün sayısı kadar veri var mı kontrol et
const hasEnoughFutureData = (prayerTimes: PrayerTime[], daysNeeded: number, timezone?: string): boolean => {
    if (prayerTimes.length === 0) {
        return false;
    }

    const today = getLocalTodayDate(timezone);
    const todayIndex = prayerTimes.findIndex(pt => pt.date.split('T')[0] === today);

    if (todayIndex === -1) {
        return false;
    }

    // Bugünden itibaren kaç gün veri var?
    const remainingDays = prayerTimes.length - todayIndex;

    return remainingDays >= daysNeeded;
};

export const useGPSPrayerTimes = (timezone?: string) => {
    const [gpsPrayerTimes, setGpsPrayerTimes] = useState<PrayerTime[]>([]);
    const [currentDayPrayerTime, setCurrentDayPrayerTime] = useState<PrayerTime | null>(null);
    const [_lastFetchDate, setLastFetchDate] = useState<Date | null>(null);
    const [isGPSMode, setIsGPSMode] = useState<boolean>(false);
    const [gpsCityId, setGpsCityId] = useState<string | null>(null);
    const { isOnline } = useNetwork();

    // Ref to hold the latest gpsPrayerTimes
    const gpsPrayerTimesRef = useRef(gpsPrayerTimes);

    useEffect(() => {
        gpsPrayerTimesRef.current = gpsPrayerTimes;
    }, [gpsPrayerTimes]);

    // Konum modunu dinle ve değişiklikleri takip et
    const checkLocationMode = useCallback(async () => {
        const locationMode = await loadLocationMode();
        const gpsCityInfo = await loadGPSCityInfo();
        const newIsGPSMode = locationMode === 'gps';
        const newCityId = gpsCityInfo?.id || null;

        // GPS modu değiştiyse
        if (newIsGPSMode !== isGPSMode) {
            setIsGPSMode(newIsGPSMode);

            // GPS moduna geçildiyse verileri yeniden yükle
            if (newIsGPSMode) {
                const cachedTimes = await loadGPSPrayerTimes();
                if (cachedTimes && cachedTimes.length > 0) {
                    setGpsPrayerTimesWithUpdate(cachedTimes);
                }
            }
        }

        // GPS şehri değiştiyse (yeni GPS konumu)
        if (newIsGPSMode && newCityId && newCityId !== gpsCityId) {
            setGpsCityId(newCityId);

            // Yeni şehir için cache'den verileri yükle
            const cachedTimes = await loadGPSPrayerTimes();
            if (cachedTimes && cachedTimes.length > 0) {
                setGpsPrayerTimesWithUpdate(cachedTimes);
            }
        }
    }, [isGPSMode, gpsCityId]);

    // Bugünün namazını güncelle
    const updateCurrentDayPrayerTime = useCallback((prayerTimesData?: PrayerTime[]) => {
        const today = getLocalTodayDate(timezone);
        const dataToUse = prayerTimesData || gpsPrayerTimes;

        if (dataToUse.length > 0) {
            // Eğer zaten bugünün verisi gösteriliyorsa ve tarih değişmediyse işlem yapma
            if (currentDayPrayerTime && currentDayPrayerTime.date.split('T')[0] === today) {
                return;
            }

            const currentDay = dataToUse.find(pt => pt.date.split('T')[0] === today);
            if (currentDay) {
                setCurrentDayPrayerTime(currentDay);
            }
        }
    }, [gpsPrayerTimes, timezone, currentDayPrayerTime]);

    // setGpsPrayerTimes için wrapper - aynı zamanda currentDayPrayerTime'ı da günceller
    const setGpsPrayerTimesWithUpdate = useCallback((newPrayerTimes: PrayerTime[]) => {
        setGpsPrayerTimes(newPrayerTimes);

        // Hemen currentDayPrayerTime'ı da güncelle
        const today = getLocalTodayDate(timezone);
        const currentDay = newPrayerTimes.find(pt => pt.date.split('T')[0] === today);
        if (currentDay) {
            setCurrentDayPrayerTime(currentDay);
        }
    }, [timezone]);

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

        const today = getLocalTodayDate(timezone);

        // Bugünün verisi var mı kontrol et
        const hasDataForToday = gpsPrayerTimesRef.current.some(pt => pt.date.split('T')[0] === today);

        // Bugünden itibaren en az 30 gün veri var mı? (aylık görünüm için)
        const hasEnoughData = hasEnoughFutureData(gpsPrayerTimesRef.current, 30, timezone);

        // Cache'deki verilerde gregorianDateLong var mı kontrol et (eski cache için yeniden fetch)
        const hasDateFields = gpsPrayerTimesRef.current.length > 0 &&
            gpsPrayerTimesRef.current[0].gregorianDateLong !== undefined;

        // Veri çekme gerekli mi?
        // Bugünün verisi ve yeterli ileri tarih verisi varsa çekme, tarih alanları eksikse çek
        const shouldFetch = forceRefresh || !hasDataForToday || !hasEnoughData || !hasDateFields;

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

    // Konum modu değişikliklerini periyodik olarak kontrol et
    useEffect(() => {
        const interval = setInterval(() => {
            checkLocationMode();
        }, 1000); // Her saniye kontrol et

        return () => clearInterval(interval);
    }, [checkLocationMode]);

    // Veri çekme
    useEffect(() => {
        if (isGPSMode) {
            fetchGPSPrayerTimes();
        }
    }, [fetchGPSPrayerTimes, isGPSMode]);

    // Her dakika günü kontrol et ve güncelle, periyodik cache kontrolü
    useEffect(() => {
        updateCurrentDayPrayerTime();

        // Her saniye günü kontrol et (Gece yarısı geçişini anlık yakalamak için)
        const interval = setInterval(() => {
            updateCurrentDayPrayerTime();
        }, 1000); // Her saniye kontrol et

        // Her saat cache durumunu kontrol et (30 günlük veri kontrolü)
        const hourlyCheck = setInterval(() => {
            if (isGPSMode) {
                fetchGPSPrayerTimes();
            }
        }, 60 * 60 * 1000); // Her saat

        return () => {
            clearInterval(interval);
            clearInterval(hourlyCheck);
        };
    }, [gpsPrayerTimes, updateCurrentDayPrayerTime, fetchGPSPrayerTimes, isGPSMode]);

    return {
        gpsPrayerTimes,
        currentDayPrayerTime,
        setGpsPrayerTimes: setGpsPrayerTimesWithUpdate,
        isGPSMode,
        setIsGPSMode,
        refreshGPSPrayerTimes: () => fetchGPSPrayerTimes(true),
    };
};

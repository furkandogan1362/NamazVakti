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
import { DiyanetManuelService, PrayerTimeData } from '../api/apiDiyanetManuel';
import {
    savePrayerTimes,
    loadPrayerTimes,
    saveLastFetchDate,
    loadLastFetchDate,
    saveLastLocationId,
    loadLastLocationId,
} from '../services/storageService';
import { PrayerTime } from '../types/types';

// API verisini uygulama formatına dönüştür
const transformPrayerData = (apiData: PrayerTimeData[]): PrayerTime[] => {
    return apiData.map(item => {
        // gregorianDateShort formatı: "27.11.2025" şeklinde geliyor
        // Bunu "2025-11-27" formatına çeviriyoruz
        let formattedDate = item.gregorianDateShort;

        // Eğer DD.MM.YYYY formatındaysa YYYY-MM-DD'ye çevir
        if (item.gregorianDateShort.includes('.')) {
            const parts = item.gregorianDateShort.split('.');
            if (parts.length === 3) {
                formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
        }

        return {
            date: formattedDate,
            fajr: item.fajr,
            sun: item.sunrise,
            dhuhr: item.dhuhr,
            asr: item.asr,
            maghrib: item.maghrib,
            isha: item.isha,
            hijriDate: item.hijriDateShort,
            gregorianDateLong: item.gregorianDateLong,  // Diyanet API'den miladi tarih
            hijriDateLong: item.hijriDateLong,          // Diyanet API'den hicri tarih
        };
    });
};

// Yerel saat diliminde bugünün tarihini al
const getLocalTodayDate = (timezone?: string): string => {
    const now = new Date();

    if (timezone) {
        try {
            // Hedef saat diliminde tarihi al (YYYY-MM-DD formatında)
            const options: Intl.DateTimeFormatOptions = {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            };
            // en-CA formatı YYYY-MM-DD verir
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
    if (prayerTimes.length === 0) {return false;}

    const today = getLocalTodayDate(timezone);
    const todayIndex = prayerTimes.findIndex(pt => pt.date.split('T')[0] === today);

    if (todayIndex === -1) {return false;}

    const remainingDays = prayerTimes.length - todayIndex;
    return remainingDays >= daysNeeded;
};

export const usePrayerTimes = (timezone?: string) => {
    const [allPrayerTimes, setAllPrayerTimes] = useState<PrayerTime[]>([]);
    const [currentDayPrayerTime, setCurrentDayPrayerTime] = useState<PrayerTime | null>(null);
    const [lastFetchDate, setLastFetchDate] = useState<Date | null>(null);
    const [lastLocationId, setLastLocationId] = useState<number | null>(null);
    const { selectedLocation } = useLocation();
    const { isOnline } = useNetwork();

    const allPrayerTimesRef = useRef(allPrayerTimes);

    useEffect(() => {
        allPrayerTimesRef.current = allPrayerTimes;
    }, [allPrayerTimes]);

    const updateCurrentDayPrayerTime = useCallback(() => {
        const today = getLocalTodayDate(timezone);

        if (allPrayerTimes.length > 0) {
            // Eğer zaten bugünün verisi gösteriliyorsa ve tarih değişmediyse işlem yapma
            if (currentDayPrayerTime && currentDayPrayerTime.date.split('T')[0] === today) {
                return;
            }

            const currentDay = allPrayerTimes.find(pt => {
                const ptDate = pt.date.split('T')[0];
                return ptDate === today;
            });

            if (currentDay) {
                setCurrentDayPrayerTime(currentDay);
            } else if (allPrayerTimes.length > 0) {
                // Fallback: bugünün verisi yoksa ilk veriyi göster
                setCurrentDayPrayerTime(allPrayerTimes[0]);
            }
        }
    }, [allPrayerTimes, timezone, currentDayPrayerTime]);

    const fetchPrayerTimes = useCallback(async () => {
        // İnternet yoksa direkt cache'den yükle
        if (!isOnline) {
            if (allPrayerTimesRef.current.length > 0) {
                return;
            }
            const cachedTimes = await loadPrayerTimes();
            if (cachedTimes && cachedTimes.length > 0) {
                setAllPrayerTimes(cachedTimes);
            }
            return;
        }

        // İlçe seçili değilse çıkış
        if (!selectedLocation.district) {
            return;
        }

        const districtId = selectedLocation.district.id;

        // Konum değişti mi kontrol et (null ise ilk seçim demek, fetch yapmalı)
        const isFirstSelection = lastLocationId === null;
        const locationChanged = !isFirstSelection && lastLocationId !== districtId;

        // Bugünün verisi var mı kontrol et
        const today = getLocalTodayDate(timezone);
        const hasDataForToday = allPrayerTimesRef.current.some(pt => {
            const ptDate = pt.date.split('T')[0];
            return ptDate === today;
        });

        // Yeterli veri var mı?
        const hasEnoughData = hasEnoughFutureData(allPrayerTimesRef.current, 30, timezone);

        // Cache'deki verilerde gregorianDateLong var mı kontrol et (eski cache için yeniden fetch)
        const hasDateFields = allPrayerTimesRef.current.length > 0 &&
            allPrayerTimesRef.current[0].gregorianDateLong !== undefined;

        // İlk seçim, konum değişimi, bugünün verisi yok, yeterli veri yok veya tarih alanları eksikse fetch yap
        const shouldFetch = isFirstSelection || locationChanged || !hasDataForToday || !hasEnoughData || !hasDateFields;

        if (shouldFetch) {
            try {
                const apiData = await DiyanetManuelService.getPrayerTimes(districtId, 'Monthly');
                const transformedData = transformPrayerData(apiData);

                setAllPrayerTimes(transformedData);
                savePrayerTimes(transformedData);

                const newFetchDate = new Date();
                setLastFetchDate(newFetchDate);
                saveLastFetchDate(newFetchDate);

                setLastLocationId(districtId);
                saveLastLocationId(districtId);
            } catch (error) {
                console.error('Error fetching prayer times:', error);
                const cachedTimes = await loadPrayerTimes();
                if (cachedTimes && cachedTimes.length > 0) {
                    setAllPrayerTimes(cachedTimes);
                }
            }
        } else {
            setLastLocationId(districtId);
        }
    }, [isOnline, selectedLocation.district, lastLocationId, timezone]);

    // Başlangıçta cache'den yükle
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

    // Konum değiştiğinde veya veri gerektiğinde fetch
    useEffect(() => {
        fetchPrayerTimes();
    }, [fetchPrayerTimes]);

    // Günün namaz vaktini güncelle ve periyodik kontrol
    useEffect(() => {
        updateCurrentDayPrayerTime();

        // Her saniye günü kontrol et (Gece yarısı geçişini anlık yakalamak için)
        const interval = setInterval(() => {
            updateCurrentDayPrayerTime();
        }, 1000);

        // Her saat cache durumunu kontrol et (30 günlük veri kontrolü)
        const hourlyCheck = setInterval(() => {
            fetchPrayerTimes();
        }, 60 * 60 * 1000); // Her saat

        return () => {
            clearInterval(interval);
            clearInterval(hourlyCheck);
        };
    }, [allPrayerTimes, updateCurrentDayPrayerTime, lastFetchDate, fetchPrayerTimes]);

    return { currentDayPrayerTime, allPrayerTimes, setAllPrayerTimes };
};

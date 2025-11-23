// PrayerTimesDisplay.tsx

/**
 * Namaz vakitlerinin görüntülenmesi için bileşen
 * Bu bileşen, günlük namaz vakitlerini görsel olarak gösterir ve
 * aktif namaz vaktini vurgular.
 * Özellikler:
 * - Tüm namaz vakitlerini görüntüler
 * - Aktif namaz vaktini belirler ve vurgular
 * - NextPrayerTime bileşenini entegre eder
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Fontisto from 'react-native-vector-icons/Fontisto';
import { PrayerTime } from '../types/types';
import NextPrayerTime from './NextPrayerTime';
import { useTheme } from '../contexts/ThemeContext';
import AnimatedCard from './ui/AnimatedCard';

interface PrayerTimesDisplayProps {
    prayerTimes: PrayerTime;
    allPrayerTimes?: PrayerTime[];
    locationInfo: {
        country: string;
        city: string;
        region: string;
    };
    onWeeklyPress?: () => void;
    onMonthlyPress?: () => void;
}

type PrayerKey = keyof Omit<PrayerTime, 'date'>;

const PrayerTimesDisplay: React.FC<PrayerTimesDisplayProps> = ({
    prayerTimes,
    allPrayerTimes = [],
    locationInfo,
    onWeeklyPress,
    onMonthlyPress,
}) => {
    const { theme, isSmallScreen, screenWidth } = useTheme();
    const [currentTime, setCurrentTime] = useState('');

    const prayerNames: Record<PrayerKey, string> = {
        fajr: 'İmsak',
        sun: 'Güneş',
        dhuhr: 'Öğle',
        asr: 'İkindi',
        maghrib: 'Akşam',
        isha: 'Yatsı',
    };

    const prayerIcons: Record<PrayerKey, any> = {
        fajr: 'cloudy-gusts', // İmsak için bulutlu ve rüzgarlı/sisli ikon
        sun: 'day-haze', // wi-day-haze
        dhuhr: 'day-sunny', // wi-day-sunny
        asr: 'day-cloudy', // wi-day-cloudy
        maghrib: 'night-alt-cloudy', // wi-night-alt-cloudy
        isha: 'night-clear', // wi-night-clear
    };

    const getCurrentPrayer = (): PrayerKey => {
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const times: Record<PrayerKey, number> = {} as Record<PrayerKey, number>;

        Object.keys(prayerNames).forEach((key) => {
            const prayerKey = key as PrayerKey;
            if (prayerTimes[prayerKey]) {
                const [hours, minutes] = prayerTimes[prayerKey].split(':').map(Number);
                times[prayerKey] = hours * 60 + minutes;
            }
        });

        if (currentMinutes < times.fajr) { return 'isha'; }
        if (currentMinutes < times.sun) { return 'fajr'; }
        if (currentMinutes < times.dhuhr) { return 'sun'; }
        if (currentMinutes < times.asr) { return 'dhuhr'; }
        if (currentMinutes < times.maghrib) { return 'asr'; }
        if (currentMinutes < times.isha) { return 'maghrib'; }
        return 'isha';
    };

    const currentPrayer = getCurrentPrayer();
    const styles = createStyles(theme, isSmallScreen, screenWidth);

    // Yerel saati güncelle (her saniye)
    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            setCurrentTime(`${hours}:${minutes}`);
        };

        updateTime(); // İlk değeri hemen ayarla
        const interval = setInterval(updateTime, 1000); // Her saniye güncelle

        return () => clearInterval(interval);
    }, []);

    // Tarih ve gün bilgisi (Türkiye saat dilimi)
    const formatDate = () => {
        // Türkiye saat dilimine göre tarih oluştur
        const dateStr = prayerTimes.date.split('T')[0]; // "2025-11-18" formatında
        const [year, month, day] = dateStr.split('-').map(Number);

        // Türkiye saat dilimine göre Date oluştur
        const date = new Date(year, month - 1, day);

        const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
        const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
            'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

        const dayName = days[date.getDay()];
        const fullDate = `${day} ${months[month - 1]} ${year}`;

        return { dayName, fullDate };
    };

    // Hicri takvim hesaplama (geliştirilmiş algoritma)
    const getHijriDate = () => {
        const dateStr = prayerTimes.date.split('T')[0];
        const [year, month, day] = dateStr.split('-').map(Number);

        // Miladi tarihi Julian gün sayısına çevir
        let a = Math.floor((14 - month) / 12);
        let y = year + 4800 - a;
        let m = month + (12 * a) - 3;
        let jd = day + Math.floor((153 * m + 2) / 5) + (365 * y) + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;

        // Julian günü Hicri takvime çevir
        let l = jd - 1948440 + 10632;
        let n = Math.floor((l - 1) / 10631);
        l = l - 10631 * n + 354;
        let j = (Math.floor((10985 - l) / 5316)) * (Math.floor((50 * l) / 17719)) + (Math.floor(l / 5670)) * (Math.floor((43 * l) / 15238));
        l = l - (Math.floor((30 - j) / 15)) * (Math.floor((17719 * j) / 50)) - (Math.floor(j / 16)) * (Math.floor((15238 * j) / 43)) + 29;

        let hijriMonth = Math.floor((24 * l) / 709);
        let hijriDay = l - Math.floor((709 * hijriMonth) / 24);
        let hijriYear = 30 * n + j - 30;

        const hijriMonths = ['Muharrem', 'Safer', 'Rebiülevvel', 'Rebiülahir', 'Cemaziyelevvel',
            'Cemaziyelahir', 'Recep', 'Şaban', 'Ramazan', 'Şevval', 'Zilkade', 'Zilhicce'];

        return `${hijriDay} ${hijriMonths[hijriMonth - 1]} ${hijriYear}`;
    };

    const { fullDate } = formatDate();
    const hijriDate = getHijriDate();

    return (
        <View style={styles.container}>
            {/* Header Info */}
            <AnimatedCard style={styles.headerCard} delay={0}>
                <View style={styles.headerContent}>
                    <View style={styles.locationContainer}>
                        <Text style={styles.locationTitle}>{locationInfo.city}</Text>
                        <Text style={styles.locationSubtitle}>{locationInfo.region}, {locationInfo.country}</Text>
                    </View>
                    <View style={styles.dateContainer}>
                        <Text style={styles.timeText}>{currentTime}</Text>
                        <Text style={styles.dateText}>{fullDate}</Text>
                        <Text style={styles.hijriText}>{hijriDate}</Text>
                    </View>
                </View>
            </AnimatedCard>

            {/* Next Prayer Circular Indicator */}
            <NextPrayerTime prayerTimes={prayerTimes} allPrayerTimes={allPrayerTimes} />

            {/* Prayer Times Grid */}
            <View style={styles.gridContainer}>
                {Object.entries(prayerNames).map(([key, name], index) => {
                    const prayerKey = key as PrayerKey;
                    const isActive = prayerKey === currentPrayer;

                    return (
                        <AnimatedCard
                            key={prayerKey}
                            style={[styles.gridItem, isActive ? styles.activeGridItem : undefined]}
                            delay={200 + (index * 50)}
                            scale={isActive ? 1.05 : 1}
                        >
                            <View style={[styles.cardContent, isActive && styles.activeCardContent]}>
                                <Fontisto
                                    name={prayerIcons[prayerKey]}
                                    size={22}
                                    color={isActive ? theme.colors.accent : theme.colors.text}
                                    style={{ marginBottom: 8 }}
                                />

                                <Text style={[styles.prayerTime, isActive && styles.activeText]}>{prayerTimes[prayerKey]}</Text>
                                <Text style={[styles.prayerName, isActive && styles.activeText]}>{name}</Text>
                            </View>
                        </AnimatedCard>
                    );
                })}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
                <TouchableOpacity onPress={onWeeklyPress} style={styles.actionButton}>
                    <Text style={styles.actionButtonText}>Haftalık Vakitler</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onMonthlyPress} style={styles.actionButton}>
                    <Text style={styles.actionButtonText}>Aylık Vakitler</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const createStyles = (theme: any, isSmallScreen: boolean, _screenWidth: number) => {
    return StyleSheet.create({
        container: {
            flex: 1,
        },
        headerCard: {
            marginBottom: 10,
            borderRadius: 20,
            overflow: 'hidden',
        },
        headerContent: {
            padding: 15,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        locationContainer: {
            flex: 1,
        },
        locationTitle: {
            fontSize: 24,
            fontWeight: 'bold',
            color: theme.colors.text,
        },
        locationSubtitle: {
            fontSize: 14,
            color: theme.colors.secondaryText,
            marginTop: 2,
        },
        dateContainer: {
            alignItems: 'flex-end',
        },
        dateText: {
            fontSize: 14,
            fontWeight: '600',
            color: theme.colors.text,
        },
        timeText: {
            fontSize: isSmallScreen ? 24 : 32,
            fontWeight: 'bold',
            color: theme.colors.text,
            marginBottom: 4,
        },
        hijriText: {
            fontSize: 13,
            color: theme.colors.secondaryText,
            marginTop: 2,
            fontWeight: '500',
        },
        gridContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: 8,
        },
        gridItem: {
            width: '31%', // 3 columns
            aspectRatio: 1.35,
            borderRadius: 16,
            overflow: 'hidden',
            marginBottom: 8,
        },
        activeGridItem: {
            borderColor: theme.colors.accent,
            borderWidth: 1,
        },
        cardContent: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 5,
        },
        activeCardContent: {
            backgroundColor: theme.colors.accent + '20', // 20% opacity
        },
        prayerName: {
            fontSize: 14,
            color: theme.colors.secondaryText,
            marginBottom: 4,
        },
        prayerTime: {
            fontSize: 18,
            fontWeight: 'bold',
            color: theme.colors.text,
        },
        prayerIcon: {
            fontSize: 20,
            marginBottom: 2,
            color: theme.colors.text, // Ensure icons are bright
        },
        activeText: {
            color: theme.colors.accent,
            fontWeight: 'bold',
        },
        actionsContainer: {
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 15,
            marginTop: 5,
            marginBottom: 10,
        },
        actionButton: {
            width: 120,
            height: 40,
            borderRadius: 20,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: theme.colors.cardBackground,
            borderWidth: 1,
            borderColor: theme.colors.cardBorder,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
        },
        actionButtonText: {
            color: theme.colors.text,
            fontWeight: '600',
        },
    });
};

export default PrayerTimesDisplay;

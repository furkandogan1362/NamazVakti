// PrayerTimesDisplay.tsx

/**
 * Namaz vakitlerinin görüntülenmesi için bileşen
 * Bu bileşen, günlük namaz vakitlerini görsel olarak gösterir ve
 * aktif namaz vaktini vurgular.
 * Özellikler:
 * - Tüm namaz vakitlerini görüntüler
 * - Aktif namaz vaktini belirler ve vurgular
 * - NextPrayerTime bileşenini entegre eder
 * - Vakit değişimlerini anlık olarak takip eder
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Fontisto from 'react-native-vector-icons/Fontisto';
import { PrayerTime } from '../types/types';
import NextPrayerTime from './NextPrayerTime';
import HeaderCard from './HeaderCard';
import { useTheme } from '../contexts/ThemeContext';
import AnimatedCard from './ui/AnimatedCard';
import { useLocationTime } from '../hooks/useLocationTime';

interface PrayerTimesDisplayProps {
    prayerTimes: PrayerTime;
    allPrayerTimes?: PrayerTime[];
    locationInfo: {
        country: string;
        city: string;
        region: string;
        coords?: { lat: number; lon: number }; // Koordinat bazlı timezone için
    };
    onWeeklyPress?: () => void;
    onMonthlyPress?: () => void;
    isPaused?: boolean;
}

type PrayerKey = keyof Omit<PrayerTime, 'date'>;

const PrayerTimesDisplay: React.FC<PrayerTimesDisplayProps> = ({
    prayerTimes,
    allPrayerTimes = [],
    locationInfo,
    onWeeklyPress,
    onMonthlyPress,
    isPaused = false,
}) => {
    const { theme, isSmallScreen, screenWidth } = useTheme();
    const { timezone } = useLocationTime(locationInfo);
    const [currentPrayer, setCurrentPrayer] = useState<PrayerKey>('fajr');

    const prayerNames: Record<PrayerKey, string> = useMemo(() => ({
        fajr: 'İmsak',
        sun: 'Güneş',
        dhuhr: 'Öğle',
        asr: 'İkindi',
        maghrib: 'Akşam',
        isha: 'Yatsı',
    }), []);

    const prayerIcons: Record<PrayerKey, any> = {
        fajr: 'cloudy-gusts',
        sun: 'day-haze',
        dhuhr: 'day-sunny',
        asr: 'day-cloudy',
        maghrib: 'night-alt-cloudy',
        isha: 'night-clear',
    };

    const getCurrentPrayer = useCallback((): PrayerKey => {
        const now = new Date();
        let currentMinutes;

        if (timezone) {
            try {
                const parts = new Intl.DateTimeFormat('en-US', {
                    timeZone: timezone,
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: false,
                }).formatToParts(now);

                const h = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
                const m = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
                // Handle 24h format edge case
                const hours = h === 24 ? 0 : h;
                currentMinutes = hours * 60 + m;
            } catch (e) {
                currentMinutes = now.getHours() * 60 + now.getMinutes();
            }
        } else {
            currentMinutes = now.getHours() * 60 + now.getMinutes();
        }

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
    }, [prayerTimes, timezone, prayerNames]);

    // Aktif namaz vaktini her saniye güncelle
    useEffect(() => {
        // İlk değeri hemen hesapla
        setCurrentPrayer(getCurrentPrayer());

        // Her saniye güncelle
        const interval = setInterval(() => {
            setCurrentPrayer(getCurrentPrayer());
        }, 1000);

        return () => clearInterval(interval);
    }, [getCurrentPrayer]);
    const styles = createStyles(theme, isSmallScreen, screenWidth);

    return (
        <View style={styles.container}>
            {/* Header Info - Saat her zaman güncel kalsın */}
            <HeaderCard
                locationInfo={locationInfo}
                prayerTimes={prayerTimes}
                isPaused={false}
                timezone={timezone || undefined}
            />

            {/* Next Prayer Circular Indicator */}
            <NextPrayerTime
                prayerTimes={prayerTimes}
                allPrayerTimes={allPrayerTimes}
                isPaused={isPaused}
                timezone={timezone || undefined}
            />

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
                                    style={styles.prayerIcon}
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
            marginTop: 15,
            marginBottom: 20,
            paddingHorizontal: 10,
        },
        actionButton: {
            flex: 1,
            maxWidth: 160,
            height: 48,
            borderRadius: 24,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: theme.type === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#F8FAFC',
            borderWidth: 1,
            borderColor: theme.colors.accent,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: 2,
        },
        actionButtonText: {
            color: theme.colors.text,
            fontWeight: 'bold',
            fontSize: 14,
        },
    });
};

export default PrayerTimesDisplay;

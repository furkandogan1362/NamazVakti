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

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { PrayerTime } from '../types/types';
import NextPrayerTime from './NextPrayerTime';
import { useTheme } from '../contexts/ThemeContext';

interface PrayerTimesDisplayProps {
    prayerTimes: PrayerTime;
}

type PrayerKey = keyof Omit<PrayerTime, 'date'>;

const PrayerTimesDisplay: React.FC<PrayerTimesDisplayProps> = ({ prayerTimes }) => {
    const { theme, isSmallScreen, screenWidth } = useTheme();

    const prayerNames: Record<PrayerKey, string> = {
        fajr: 'İmsak',
        sun: 'Güneş',
        dhuhr: 'Öğle',
        asr: 'İkindi',
        maghrib: 'Akşam',
        isha: 'Yatsı',
    };

    const getCurrentPrayer = (): PrayerKey => {
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const times: Record<PrayerKey, number> = {} as Record<PrayerKey, number>;

        Object.keys(prayerNames).forEach((key) => {
            const prayerKey = key as PrayerKey;
            const [hours, minutes] = prayerTimes[prayerKey].split(':').map(Number);
            times[prayerKey] = hours * 60 + minutes;
        });

        if (currentTime < times.fajr) {return 'isha';}
        if (currentTime < times.sun) {return 'fajr';}
        if (currentTime < times.dhuhr) {return 'sun';}
        if (currentTime < times.asr) {return 'dhuhr';}
        if (currentTime < times.maghrib) {return 'asr';}
        if (currentTime < times.isha) {return 'maghrib';}
        return 'isha';
    };

    const currentPrayer = getCurrentPrayer();
    const styles = createStyles(theme, isSmallScreen, screenWidth);

    return (
        <View>
            <NextPrayerTime prayerTimes={prayerTimes} />
            <View style={styles.prayerTimesGrid}>
                {Object.entries(prayerNames).map(([key, name]) => {
                    const prayerKey = key as PrayerKey;
                    const isActive = prayerKey === currentPrayer;
                    
                    return isActive ? (
                        <LinearGradient
                            key={prayerKey}
                            colors={theme.colors.activeCard}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.prayerTimeCard}
                        >
                            <Text style={styles.activePrayerName}>{name}</Text>
                            <Text style={styles.activePrayerTime}>{prayerTimes[prayerKey]}</Text>
                        </LinearGradient>
                    ) : (
                        <View key={prayerKey} style={styles.prayerTimeCard}>
                            <Text style={styles.prayerName}>{name}</Text>
                            <Text style={styles.prayerTime}>{prayerTimes[prayerKey]}</Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
};

const createStyles = (theme: any, isSmallScreen: boolean, screenWidth: number) => {
    const cardPadding = isSmallScreen ? 12 : screenWidth < 768 ? 15 : 18;
    const fontSize = isSmallScreen ? 13 : screenWidth < 768 ? 15 : 17;
    const timeSize = isSmallScreen ? 18 : screenWidth < 768 ? 22 : 26;
    const columns = isSmallScreen ? 2 : screenWidth < 768 ? 3 : 3;
    const gap = isSmallScreen ? 8 : 12;

    return StyleSheet.create({
        prayerTimesGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: gap,
            marginTop: 20,
        },
        prayerTimeCard: {
            backgroundColor: theme.colors.cardBackground,
            borderRadius: 12,
            padding: cardPadding,
            width: `${(100 - (columns - 1) * 2) / columns}%`,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: theme.colors.cardBorder,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: 3,
            minHeight: isSmallScreen ? 70 : 80,
            justifyContent: 'center',
        },
        prayerName: {
            fontSize: fontSize,
            fontWeight: '600',
            color: theme.colors.text,
            marginBottom: 5,
        },
        prayerTime: {
            fontSize: timeSize,
            fontWeight: 'bold',
            color: theme.colors.text,
        },
        activePrayerName: {
            fontSize: fontSize,
            fontWeight: '600',
            color: theme.colors.activeText,
            marginBottom: 5,
        },
        activePrayerTime: {
            fontSize: timeSize,
            fontWeight: 'bold',
            color: theme.colors.activeText,
        },
    });
};

export default PrayerTimesDisplay;

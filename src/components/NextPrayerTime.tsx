// NextPrayerTime.tsx
/**
 * Sonraki namaz vaktini gösteren bileşen
 * Bu bileşen, bir sonraki namaz vaktine kalan süreyi gerçek zamanlı
 * olarak hesaplar ve gösterir.
 * Özellikler:
 * - Sonraki namaz vaktini belirler
 * - Kalan süreyi saat, dakika ve saniye olarak gösterir
 * - Otomatik olarak güncellenir
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

interface PrayerTimes {
    date: string;
    fajr: string;
    sun: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
}

interface Props {
    prayerTimes: PrayerTimes | null;
    allPrayerTimes?: PrayerTimes[];
}

const NextPrayerTime: React.FC<Props> = ({ prayerTimes, allPrayerTimes = [] }) => {
    const [timeUntilNextPrayer, setTimeUntilNextPrayer] = useState<string>('');
    const [nextPrayer, setNextPrayer] = useState<string>('');
    const { theme, isSmallScreen, screenWidth } = useTheme();

    const prayerNamesturkish: Record<string, string> = {
        Fajr: 'İmsak',
        Sun: 'Güneş',
        Dhuhr: 'Öğle',
        Asr: 'İkindi',
        Maghrib: 'Akşam',
        Isha: 'Yatsı',
    };

    useEffect(() => {
        if (!prayerTimes) {return;}

        const calculateTimeUntilNextPrayer = () => {
            const now = new Date();
            const prayerNames = ['fajr', 'sun', 'dhuhr', 'asr', 'maghrib', 'isha'];
            let nextPrayerTime: Date | null = null;
            let nextPrayerName: string = '';

            // Bugünkün tarihini al (Türkiye saati)
            const utcTime = now.getTime();
            const turkeyOffset = 3 * 60 * 60 * 1000;
            const turkeyTime = new Date(utcTime + turkeyOffset);
            const year = turkeyTime.getUTCFullYear();
            const month = String(turkeyTime.getUTCMonth() + 1).padStart(2, '0');
            const day = String(turkeyTime.getUTCDate()).padStart(2, '0');
            const todayStr = `${year}-${month}-${day}`;

            // Find the next prayer time in today's prayers
            for (const prayerName of prayerNames) {
                const timeString = prayerTimes[prayerName as keyof PrayerTimes];
                if (timeString) {
                    const prayerTime = new Date();
                    const [hours, minutes] = timeString.split(':').map(Number);
                    prayerTime.setHours(hours, minutes, 0, 0);
                    if (prayerTime > now) {
                        nextPrayerTime = prayerTime;
                        nextPrayerName = prayerName.charAt(0).toUpperCase() + prayerName.slice(1);
                        break;
                    }
                }
            }

            // Yatsı geçti ama saat henüz 00:00 olmadı - yarının imsak vaktini göster
            if (!nextPrayerTime && allPrayerTimes.length > 0) {
                // Yarının tarihini hesapla
                const tomorrow = new Date(todayStr);
                tomorrow.setDate(tomorrow.getDate() + 1);
                const tomorrowStr = tomorrow.toISOString().split('T')[0];

                // Yarının verilerini bul
                const tomorrowPrayer = allPrayerTimes.find(pt => pt.date.split('T')[0] === tomorrowStr);
                
                if (tomorrowPrayer) {
                    // Yarının imsak vaktini kullan
                    const fajrTime = new Date();
                    const [fajrHours, fajrMinutes] = tomorrowPrayer.fajr.split(':').map(Number);
                    fajrTime.setDate(fajrTime.getDate() + 1);
                    fajrTime.setHours(fajrHours, fajrMinutes, 0, 0);
                    nextPrayerTime = fajrTime;
                    nextPrayerName = 'Fajr';
                } else {
                    // Fallback: Bugünün imsak vaktini yarın için kullan
                    const fajrTime = new Date();
                    const [fajrHours, fajrMinutes] = prayerTimes.fajr.split(':').map(Number);
                    fajrTime.setDate(fajrTime.getDate() + 1);
                    fajrTime.setHours(fajrHours, fajrMinutes, 0, 0);
                    nextPrayerTime = fajrTime;
                    nextPrayerName = 'Fajr';
                }
            }

            // Calculate the time difference
            if (nextPrayerTime) {
                const diff = nextPrayerTime.getTime() - now.getTime();
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);

                setTimeUntilNextPrayer(`${hours.toString().padStart(2, '0')} : ${minutes.toString().padStart(2, '0')} : ${seconds.toString().padStart(2, '0')}`);
                setNextPrayer(nextPrayerName);
            }
        };

        // Calculate initially
        calculateTimeUntilNextPrayer();

        // Update every second
        const interval = setInterval(calculateTimeUntilNextPrayer, 1000);

        return () => clearInterval(interval); // Cleanup on unmount
    }, [prayerTimes, allPrayerTimes]);

    const styles = createStyles(theme, isSmallScreen, screenWidth);
    const turkishPrayerName = prayerNamesturkish[nextPrayer] || nextPrayer;

    return (
        <LinearGradient
            colors={theme.colors.activeCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.container}
        >
            {nextPrayer && (
                <View style={styles.content}>
                    <Text style={styles.label}>Sonraki Vakit</Text>
                    <Text style={styles.prayerName}>{turkishPrayerName}</Text>
                    <Text style={styles.timeText}>{timeUntilNextPrayer}</Text>
                </View>
            )}
        </LinearGradient>
    );
};

const createStyles = (theme: any, isSmallScreen: boolean, screenWidth: number) => {
    const padding = isSmallScreen ? 20 : screenWidth < 768 ? 25 : 30;
    const labelSize = isSmallScreen ? 16 : screenWidth < 768 ? 17 : 18;
    const prayerSize = isSmallScreen ? 22 : screenWidth < 768 ? 24 : 26;
    const timeSize = isSmallScreen ? 28 : screenWidth < 768 ? 32 : 36;

    return StyleSheet.create({
        container: {
            padding: padding,
            borderRadius: 12,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 5,
        },
        content: {
            alignItems: 'center',
        },
        label: {
            fontSize: labelSize,
            fontWeight: '600',
            color: theme.colors.activeText,
            opacity: 0.9,
            marginBottom: 5,
        },
        prayerName: {
            fontSize: prayerSize,
            fontWeight: 'bold',
            color: theme.colors.activeText,
            marginBottom: 8,
        },
        timeText: {
            fontSize: timeSize,
            fontWeight: '600',
            color: theme.colors.activeText,
        },
    });
};

export default NextPrayerTime;

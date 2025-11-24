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
import { useTheme } from '../contexts/ThemeContext';
import AnimatedCard from './ui/AnimatedCard';
import CircularProgress from './ui/CircularProgress';

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
    isPaused?: boolean;
    timezone?: string;
}

const NextPrayerTime: React.FC<Props> = ({ prayerTimes, allPrayerTimes = [], isPaused = false, timezone }) => {
    const [timeUntilNextPrayer, setTimeUntilNextPrayer] = useState<string>('');
    const [nextPrayer, setNextPrayer] = useState<string>('');
    const [progress, setProgress] = useState(0);
    const { theme, isSmallScreen, screenWidth } = useTheme();

    const prayerNamesturkish: Record<string, string> = {
        Fajr: 'İmsak',
        Sun: 'Güneş',
        Dhuhr: 'Öğle',
        Asr: 'İkindi',
        Maghrib: 'Akşam',
        Isha: 'Yatsı',
    };

    const getCountdownLabel = (): string => {
        return 'Vaktinin Çıkmasına';
    };

    useEffect(() => {
        if (!prayerTimes || isPaused) { return; }

        const calculateTimeUntilNextPrayer = () => {
            const now = new Date();
            let currentHours, currentMinutes, currentSeconds;

            // Get current time in the target timezone
            if (timezone) {
                try {
                    const parts = new Intl.DateTimeFormat('en-US', {
                        timeZone: timezone,
                        hour: 'numeric',
                        minute: 'numeric',
                        second: 'numeric',
                        hour12: false,
                    }).formatToParts(now);

                    const getPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0', 10);
                    currentHours = getPart('hour');
                    // Handle 24h format edge case where 24 might be returned as 0 or 24 depending on implementation
                    if (currentHours === 24) { currentHours = 0; }

                    currentMinutes = getPart('minute');
                    currentSeconds = getPart('second');
                } catch (e) {
                    currentHours = now.getHours();
                    currentMinutes = now.getMinutes();
                    currentSeconds = now.getSeconds();
                }
            } else {
                currentHours = now.getHours();
                currentMinutes = now.getMinutes();
                currentSeconds = now.getSeconds();
            }

            const currentTotalSeconds = currentHours * 3600 + currentMinutes * 60 + currentSeconds;

            const prayerNames = ['fajr', 'sun', 'dhuhr', 'asr', 'maghrib', 'isha'];
            let nextPrayerSeconds: number | null = null;
            let nextPrayerName: string = '';
            let prevPrayerSeconds: number | null = null;

            // Find the next prayer time in today's prayers
            for (let i = 0; i < prayerNames.length; i++) {
                const prayerName = prayerNames[i];
                const timeString = prayerTimes[prayerName as keyof PrayerTimes];
                if (timeString) {
                    const [hours, minutes] = timeString.split(':').map(Number);
                    const prayerSeconds = hours * 3600 + minutes * 60;

                    if (prayerSeconds > currentTotalSeconds) {
                        nextPrayerSeconds = prayerSeconds;
                        nextPrayerName = prayerName.charAt(0).toUpperCase() + prayerName.slice(1);

                        // Previous prayer time
                        if (i > 0) {
                            const prevName = prayerNames[i - 1];
                            const prevTimeString = prayerTimes[prevName as keyof PrayerTimes];
                            const [prevH, prevM] = prevTimeString.split(':').map(Number);
                            prevPrayerSeconds = prevH * 3600 + prevM * 60;
                        } else {
                            // If next is Fajr (today), previous was Isha (yesterday)
                            // We assume yesterday's Isha is roughly same as today's Isha - 24h
                            // Or better, just use 0 (midnight) as start of day
                            prevPrayerSeconds = 0;
                        }
                        break;
                    }
                }
            }

            // Yatsı geçti ama saat henüz 00:00 olmadı - yarının imsak vaktini göster
            if (nextPrayerSeconds === null && allPrayerTimes.length > 0) {
                // Yarının tarihini hesapla
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const tomorrowStr = tomorrow.toISOString().split('T')[0];

                // Yarının verilerini bul
                const tomorrowPrayer = allPrayerTimes.find(pt => pt.date.split('T')[0] === tomorrowStr);

                if (tomorrowPrayer) {
                    // Yarının imsak vaktini kullan
                    const [fajrHours, fajrMinutes] = tomorrowPrayer.fajr.split(':').map(Number);
                    nextPrayerSeconds = (fajrHours * 3600 + fajrMinutes * 60) + (24 * 3600); // Add 24 hours
                    nextPrayerName = 'Fajr';

                    // Previous prayer was today's Isha
                    const [ishaHours, ishaMinutes] = prayerTimes.isha.split(':').map(Number);
                    prevPrayerSeconds = ishaHours * 3600 + ishaMinutes * 60;

                } else {
                    // Fallback
                    const [fajrHours, fajrMinutes] = prayerTimes.fajr.split(':').map(Number);
                    nextPrayerSeconds = (fajrHours * 3600 + fajrMinutes * 60) + (24 * 3600);
                    nextPrayerName = 'Fajr';
                    prevPrayerSeconds = currentTotalSeconds; // Fallback
                }
            }

            // Calculate the time difference
            if (nextPrayerSeconds !== null) {
                const diffSeconds = nextPrayerSeconds - currentTotalSeconds;
                const hours = Math.floor(diffSeconds / 3600);
                const minutes = Math.floor((diffSeconds % 3600) / 60);
                const seconds = Math.floor(diffSeconds % 60);

                setTimeUntilNextPrayer(`${hours.toString().padStart(2, '0')} : ${minutes.toString().padStart(2, '0')} : ${seconds.toString().padStart(2, '0')}`);
                setNextPrayer(nextPrayerName);

                // Calculate progress
                if (prevPrayerSeconds !== null) {
                    const totalDuration = nextPrayerSeconds - prevPrayerSeconds;
                    const elapsed = currentTotalSeconds - prevPrayerSeconds;
                    const p = Math.min(Math.max(elapsed / totalDuration, 0), 1);
                    setProgress(p);
                }
            }
        };

        // Calculate initially
        calculateTimeUntilNextPrayer();

        // Update every second
        const interval = setInterval(calculateTimeUntilNextPrayer, 1000);

        return () => clearInterval(interval); // Cleanup on unmount
    }, [prayerTimes, allPrayerTimes, isPaused, timezone]);

    const styles = createStyles(theme, isSmallScreen, screenWidth);
    const turkishPrayerName = prayerNamesturkish[nextPrayer] || nextPrayer;
    // Responsive circle size calculation
    const circleSize = Math.min(screenWidth * 0.65, isSmallScreen ? 220 : 280);
    const countdownLabel = getCountdownLabel();

    // Determine current prayer name based on next prayer
    const getCurrentPrayerName = (next: string): string => {
        switch (next) {
            case 'Fajr': return 'Yatsı';
            case 'Sun': return 'İmsak';
            case 'Dhuhr': return 'Güneş'; // Or Kerahat? Usually we say Güneş/Kerahat but let's stick to prayer names. After Sun is Dhuhr.
            case 'Asr': return 'Öğle';
            case 'Maghrib': return 'İkindi';
            case 'Isha': return 'Akşam';
            default: return '';
        }
    };
    const currentPrayerName = getCurrentPrayerName(nextPrayer);

    return (
        <AnimatedCard style={styles.container} delay={100}>
            <View style={styles.content}>
                <CircularProgress
                    size={circleSize}
                    strokeWidth={15}
                    progress={progress}
                    color={theme.colors.accent}
                    backgroundColor={theme.colors.cardBorder}
                >
                    <View style={styles.innerContent}>
                        <Text style={styles.currentPrayerName}>{currentPrayerName}</Text>
                        <Text style={styles.label}>{countdownLabel}</Text>
                        <Text style={styles.timeText}>{timeUntilNextPrayer}</Text>
                        <View style={styles.nextPrayerContainer}>
                            <Text style={styles.nextLabel}>Sonraki Vakit</Text>
                            <Text style={styles.prayerName}>{turkishPrayerName}</Text>
                        </View>
                    </View>
                </CircularProgress>
            </View>
        </AnimatedCard>
    );
};

const createStyles = (theme: any, isSmallScreen: boolean, _screenWidth: number) => {
    return StyleSheet.create({
        container: {
            marginBottom: 10,
            borderRadius: 20,
            overflow: 'hidden',
        },
        content: {
            alignItems: 'center',
            justifyContent: 'center',
            padding: 10,
        },
        innerContent: {
            alignItems: 'center',
            justifyContent: 'center',
        },
        currentPrayerName: {
            fontSize: isSmallScreen ? 20 : 24,
            fontWeight: 'bold',
            color: theme.colors.accent,
            marginBottom: 4,
            textAlign: 'center',
        },
        label: {
            fontSize: isSmallScreen ? 12 : 14,
            fontWeight: '500',
            color: theme.colors.secondaryText,
            marginBottom: 2,
            letterSpacing: 0.5,
            textAlign: 'center',
        },
        prayerName: {
            fontSize: isSmallScreen ? 20 : 24,
            fontWeight: 'bold',
            color: theme.colors.accent,
            textAlign: 'center',
        },
        nextLabel: {
            fontSize: isSmallScreen ? 12 : 14,
            color: theme.colors.secondaryText,
            textAlign: 'center',
            marginBottom: 2,
        },
        nextPrayerContainer: {
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: 8,
            justifyContent: 'center',
        },
        timeText: {
            fontSize: isSmallScreen ? 32 : 40,
            fontWeight: 'bold',
            color: theme.colors.text,
            fontVariant: ['tabular-nums'],
            marginVertical: 4,
            textAlign: 'center',
        },
    });
};

export default NextPrayerTime;

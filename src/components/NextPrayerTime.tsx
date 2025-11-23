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
}

const NextPrayerTime: React.FC<Props> = ({ prayerTimes, allPrayerTimes = [] }) => {
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
        if (!prayerTimes) { return; }

        const calculateTimeUntilNextPrayer = () => {
            const now = new Date();
            // Use device local time instead of forced Turkey time
            // This ensures the countdown is correct relative to the user's device time

            const prayerNames = ['fajr', 'sun', 'dhuhr', 'asr', 'maghrib', 'isha'];
            let nextPrayerTime: Date | null = null;
            let nextPrayerName: string = '';
            let prevPrayerTime: Date | null = null;

            // Find the next prayer time in today's prayers
            for (let i = 0; i < prayerNames.length; i++) {
                const prayerName = prayerNames[i];
                const timeString = prayerTimes[prayerName as keyof PrayerTimes];
                if (timeString) {
                    const prayerTime = new Date();
                    const [hours, minutes] = timeString.split(':').map(Number);
                    prayerTime.setHours(hours, minutes, 0, 0);

                    if (prayerTime > now) {
                        nextPrayerTime = prayerTime;
                        nextPrayerName = prayerName.charAt(0).toUpperCase() + prayerName.slice(1);

                        // Previous prayer time
                        if (i > 0) {
                            const prevName = prayerNames[i - 1];
                            const prevTimeString = prayerTimes[prevName as keyof PrayerTimes];
                            const [prevH, prevM] = prevTimeString.split(':').map(Number);
                            const prevDate = new Date();
                            prevDate.setHours(prevH, prevM, 0, 0);
                            prevPrayerTime = prevDate;
                        } else {
                            // If next is Fajr (today), previous was Isha (yesterday)
                            // We need to handle this carefully, but for now let's approximate
                            const startOfDay = new Date();
                            startOfDay.setHours(0, 0, 0, 0);
                            prevPrayerTime = startOfDay;
                        }
                        break;
                    }
                }
            }

            // Yatsı geçti ama saat henüz 00:00 olmadı - yarının imsak vaktini göster
            if (!nextPrayerTime && allPrayerTimes.length > 0) {
                // Yarının tarihini hesapla
                const tomorrow = new Date();
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

                    // Previous prayer was today's Isha
                    const ishaTime = new Date();
                    const [ishaHours, ishaMinutes] = prayerTimes.isha.split(':').map(Number);
                    ishaTime.setHours(ishaHours, ishaMinutes, 0, 0);
                    prevPrayerTime = ishaTime;

                } else {
                    // Fallback
                    const fajrTime = new Date();
                    const [fajrHours, fajrMinutes] = prayerTimes.fajr.split(':').map(Number);
                    fajrTime.setDate(fajrTime.getDate() + 1);
                    fajrTime.setHours(fajrHours, fajrMinutes, 0, 0);
                    nextPrayerTime = fajrTime;
                    nextPrayerName = 'Fajr';
                    prevPrayerTime = new Date(); // Fallback
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

                // Calculate progress
                if (prevPrayerTime) {
                    const totalDuration = nextPrayerTime.getTime() - prevPrayerTime.getTime();
                    const elapsed = now.getTime() - prevPrayerTime.getTime();
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
    }, [prayerTimes, allPrayerTimes]);

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

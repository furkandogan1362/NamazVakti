import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import AnimatedCard from './ui/AnimatedCard';
import { PrayerTime } from '../types/types';

interface HeaderCardProps {
    locationInfo: {
        country: string;
        city: string;
        region: string;
    };
    prayerTimes: PrayerTime;
    isPaused?: boolean;
    timezone?: string;
}

const HeaderCard: React.FC<HeaderCardProps> = ({ locationInfo, prayerTimes, isPaused = false, timezone }) => {
    const { theme, isSmallScreen, screenWidth } = useTheme();
    const [currentTime, setCurrentTime] = useState('');

    // Yerel saati güncelle (her saniye)
    useEffect(() => {
        if (isPaused) {return;}

        const updateTime = () => {
            const now = new Date();
            try {
                // Timezone varsa o bölgenin saatini, yoksa cihaz saatini kullan
                const timeString = now.toLocaleTimeString('tr-TR', {
                    timeZone: timezone,
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                });
                setCurrentTime(timeString);
            } catch (e) {
                // Fallback to device time if timezone is invalid
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                setCurrentTime(`${hours}:${minutes}`);
            }
        };

        updateTime(); // İlk değeri hemen ayarla
        const interval = setInterval(updateTime, 1000); // Her saniye güncelle

        return () => clearInterval(interval);
    }, [isPaused, timezone]);

    // Diyanet API'den gelen miladi ve hicri tarihleri kullan
    const gregorianDate = prayerTimes.gregorianDateLong || '';
    const hijriDate = prayerTimes.hijriDateLong || '';
    const styles = createStyles(theme, isSmallScreen, screenWidth);

    return (
        <AnimatedCard style={styles.headerCard} delay={0}>
            <View style={styles.headerContent}>
                <View style={styles.locationContainer}>
                    <Text style={styles.locationTitle}>{locationInfo.city}</Text>
                    <Text style={styles.locationSubtitle}>{locationInfo.region}, {locationInfo.country}</Text>
                </View>
                <View style={styles.dateContainer}>
                    <Text style={styles.timeText}>{currentTime}</Text>
                    <Text style={styles.dateText}>{gregorianDate}</Text>
                    <Text style={styles.hijriText}>{hijriDate}</Text>
                </View>
            </View>
        </AnimatedCard>
    );
};

const createStyles = (theme: any, isSmallScreen: boolean, _screenWidth: number) => {
    return StyleSheet.create({
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
    });
};

export default React.memo(HeaderCard);

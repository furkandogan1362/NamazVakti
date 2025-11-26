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

    // Tarih ve gün bilgisi (Türkiye saat dilimi)
    const formatDate = () => {
        const dateStr = prayerTimes.date.split('T')[0];
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day);

        const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
        const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
            'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

        const dayName = days[date.getDay()];
        const fullDate = `${day} ${months[month - 1]} ${year}`;

        return { dayName, fullDate };
    };

    // Hicri takvim hesaplama
    const getHijriDate = () => {
        const dateStr = prayerTimes.date.split('T')[0];
        const [year, month, day] = dateStr.split('-').map(Number);

        let a = Math.floor((14 - month) / 12);
        let y = year + 4800 - a;
        let m = month + (12 * a) - 3;
        let jd = day + Math.floor((153 * m + 2) / 5) + (365 * y) + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;

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
                    <Text style={styles.dateText}>{fullDate}</Text>
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

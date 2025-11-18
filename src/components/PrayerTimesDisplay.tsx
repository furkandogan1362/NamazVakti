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
import LinearGradient from 'react-native-linear-gradient';
import { PrayerTime } from '../types/types';
import NextPrayerTime from './NextPrayerTime';
import { useTheme } from '../contexts/ThemeContext';

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
    onMonthlyPress 
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

    // Türkiye yerel saatini güncelle (her saniye)
    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const utcTime = now.getTime();
            const turkeyOffset = 3 * 60 * 60 * 1000;
            const turkeyTime = new Date(utcTime + turkeyOffset);
            const hours = String(turkeyTime.getUTCHours()).padStart(2, '0');
            const minutes = String(turkeyTime.getUTCMinutes()).padStart(2, '0');
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
        const fullDate = `${day} ${months[month - 1]} ${year} - ${currentTime}`;
        
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

    const { dayName, fullDate } = formatDate();
    const hijriDate = getHijriDate();

    return (
        <View>
            {/* Konum, Tarih ve Hicri Takvim Bilgisi - En Üstte */}
            <LinearGradient
                colors={theme.colors.activeCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.dateContainer}
            >
                {/* Konum Bilgisi */}
                <Text style={styles.locationInfo}>
                    {locationInfo.country} • {locationInfo.city}
                </Text>
                <Text style={styles.regionInfo}>
                    {locationInfo.region}
                </Text>
                
                {/* Ayırıcı Çizgi */}
                <View style={styles.divider} />
                
                {/* Miladi Tarih */}
                <Text style={styles.dayName}>{dayName}</Text>
                <Text style={styles.fullDate}>{fullDate}</Text>
                
                {/* Hicri Tarih */}
                <Text style={styles.hijriLabel}>Hicri:</Text>
                <Text style={styles.hijriDate}>{hijriDate}</Text>

                {/* Haftalık ve Aylık Butonlar */}
                <View style={styles.buttonsContainer}>
                    <TouchableOpacity 
                        style={styles.viewButton}
                        onPress={onWeeklyPress}
                    >
                        <Text style={styles.buttonText}>📅 Haftalık</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={styles.viewButton}
                        onPress={onMonthlyPress}
                    >
                        <Text style={styles.buttonText}>📆 Aylık</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <NextPrayerTime prayerTimes={prayerTimes} allPrayerTimes={allPrayerTimes} />

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
    const verticalGap = isSmallScreen ? 10 : 12;

    return StyleSheet.create({
        dateContainer: {
            marginBottom: 15,
            paddingVertical: isSmallScreen ? 12 : 14,
            paddingHorizontal: isSmallScreen ? 15 : 18,
            borderRadius: 12,
            alignItems: 'center',
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.12,
            shadowRadius: 3,
            elevation: 4,
        },
        locationInfo: {
            fontSize: isSmallScreen ? 15 : screenWidth < 768 ? 16 : 17,
            fontWeight: 'bold',
            color: theme.colors.activeText,
            marginBottom: 3,
            letterSpacing: 0.5,
        },
        regionInfo: {
            fontSize: isSmallScreen ? 13 : screenWidth < 768 ? 14 : 15,
            fontWeight: '600',
            color: theme.colors.activeText,
            opacity: 0.9,
            marginBottom: 8,
        },
        divider: {
            width: '80%',
            height: 1,
            backgroundColor: theme.colors.activeText,
            opacity: 0.3,
            marginVertical: 10,
        },
        dayName: {
            fontSize: isSmallScreen ? 20 : screenWidth < 768 ? 22 : 24,
            fontWeight: 'bold',
            color: theme.colors.activeText,
            marginBottom: 4,
            letterSpacing: 0.8,
        },
        fullDate: {
            fontSize: isSmallScreen ? 14 : screenWidth < 768 ? 15 : 16,
            fontWeight: '600',
            color: theme.colors.activeText,
            opacity: 0.95,
            marginBottom: 8,
        },
        hijriLabel: {
            fontSize: isSmallScreen ? 14 : screenWidth < 768 ? 15 : 16,
            fontWeight: '600',
            color: theme.colors.activeText,
            opacity: 0.85,
            marginTop: 6,
        },
        hijriDate: {
            fontSize: isSmallScreen ? 14 : screenWidth < 768 ? 15 : 16,
            fontWeight: '600',
            color: theme.colors.activeText,
            opacity: 0.95,
        },
        buttonsContainer: {
            flexDirection: 'row',
            marginTop: 15,
            gap: 10,
            width: '100%',
            justifyContent: 'center',
        },
        viewButton: {
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            paddingVertical: isSmallScreen ? 8 : 10,
            paddingHorizontal: isSmallScreen ? 15 : 20,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.4)',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 3,
            elevation: 3,
        },
        buttonText: {
            color: theme.colors.activeText,
            fontSize: isSmallScreen ? 12 : 13,
            fontWeight: 'bold',
        },
        prayerTimesGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            marginTop: 20,
            paddingHorizontal: 2,
        },
        prayerTimeCard: {
            backgroundColor: theme.colors.cardBackground,
            borderRadius: 12,
            padding: cardPadding,
            width: '31.5%',
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
            marginBottom: verticalGap,
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

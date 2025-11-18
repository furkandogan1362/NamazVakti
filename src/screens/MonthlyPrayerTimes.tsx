/**
 * Aylık Namaz Vakitleri Ekranı
 * 30 günlük namaz vakitlerini modern ve görsel olarak çekici bir liste şeklinde gösterir
 */

import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, BackHandler, ActivityIndicator, Animated } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { PrayerTime } from '../types/types';
import { saveMonthlyLastShownDate, loadMonthlyLastShownDate } from '../services/storageService';

interface MonthlyPrayerTimesProps {
    prayerTimes: PrayerTime[];
    onBack: () => void;
}

const MonthlyPrayerTimes: React.FC<MonthlyPrayerTimesProps> = ({ prayerTimes, onBack }) => {
    const { theme, isSmallScreen, screenWidth } = useTheme();
    const [lastShownDate, setLastShownDate] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const fadeAnim = useState(new Animated.Value(0))[0];
    const slideAnim = useState(new Animated.Value(50))[0];

    // İlk yüklemede son gösterim tarihini al ve animasyon başlat
    useEffect(() => {
        const loadLastDate = async () => {
            const savedDate = await loadMonthlyLastShownDate();
            setLastShownDate(savedDate);
            
            // Kısa bir gecikme sonrası loading'i kapat ve animasyonu başlat
            setTimeout(() => {
                setIsLoading(false);
                Animated.parallel([
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                    Animated.timing(slideAnim, {
                        toValue: 0,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                ]).start();
            }, 100);
        };
        loadLastDate();
    }, [fadeAnim, slideAnim]);

    // Hardware back button handler
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            onBack();
            return true; // Event'i yakala, uygulamayı kapatma
        });

        return () => backHandler.remove();
    }, [onBack]);

    // Bugünün tarihini al (Türkiye saati)
    const getTodayString = () => {
        const now = new Date();
        const utcTime = now.getTime();
        const turkeyOffset = 3 * 60 * 60 * 1000;
        const turkeyTime = new Date(utcTime + turkeyOffset);
        
        const year = turkeyTime.getUTCFullYear();
        const month = String(turkeyTime.getUTCMonth() + 1).padStart(2, '0');
        const day = String(turkeyTime.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Bugünden itibaren 30 günlük veriyi al (cache'lenmiş ve otomatik güncellenen)
    const monthlyData = useMemo(() => {
        const today = getTodayString();

        // Eğer tarih değiştiyse, yeni tarihi kaydet
        if (lastShownDate !== today) {
            saveMonthlyLastShownDate(today);
            setLastShownDate(today);
        }

        const todayIndex = prayerTimes.findIndex(pt => pt.date.split('T')[0] === today);
        
        if (todayIndex !== -1) {
            return prayerTimes.slice(todayIndex, todayIndex + 30);
        }
        return prayerTimes.slice(0, 30);
    }, [prayerTimes, lastShownDate]);

    const getDayName = (dateString: string) => {
        const date = new Date(dateString);
        const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
        return days[date.getDay()];
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    };

    const styles = createStyles(theme, isSmallScreen, screenWidth);

    return (
        <LinearGradient
            colors={theme.colors.background}
            start={theme.gradientStart}
            end={theme.gradientEnd}
            style={styles.container}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backButtonIcon}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Aylık Namaz Vakitleri</Text>
            </View>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.buttonBackground} />
                    <Text style={styles.loadingText}>Yükleniyor...</Text>
                </View>
            ) : (
                <Animated.View
                    style={[
                        styles.contentContainer,
                        {
                            opacity: fadeAnim,
                            transform: [{translateY: slideAnim}],
                        },
                    ]}
                >
                    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {monthlyData.map((day, index) => {
                    const isToday = index === 0;
                    return (
                        <View key={day.date} style={[styles.dayCard, isToday && styles.todayCard]}>
                            <View style={styles.dateHeader}>
                                <View style={styles.dateInfo}>
                                    <Text style={[styles.dayName, isToday && styles.todayText]}>
                                        {getDayName(day.date)}
                                    </Text>
                                    <Text style={[styles.date, isToday && styles.todayText]}>
                                        {formatDate(day.date)}
                                    </Text>
                                </View>
                                {isToday && (
                                    <View style={styles.todayBadge}>
                                        <Text style={styles.todayBadgeText}>Bugün</Text>
                                    </View>
                                )}
                            </View>

                            <View style={styles.timesRow}>
                                <View style={styles.timeColumn}>
                                    <Text style={styles.timeLabel}>İmsak</Text>
                                    <Text style={styles.timeValue}>{day.fajr}</Text>
                                </View>
                                <View style={styles.timeColumn}>
                                    <Text style={styles.timeLabel}>Güneş</Text>
                                    <Text style={styles.timeValue}>{day.sun}</Text>
                                </View>
                                <View style={styles.timeColumn}>
                                    <Text style={styles.timeLabel}>Öğle</Text>
                                    <Text style={styles.timeValue}>{day.dhuhr}</Text>
                                </View>
                                <View style={styles.timeColumn}>
                                    <Text style={styles.timeLabel}>İkindi</Text>
                                    <Text style={styles.timeValue}>{day.asr}</Text>
                                </View>
                                <View style={styles.timeColumn}>
                                    <Text style={styles.timeLabel}>Akşam</Text>
                                    <Text style={styles.timeValue}>{day.maghrib}</Text>
                                </View>
                                <View style={styles.timeColumn}>
                                    <Text style={styles.timeLabel}>Yatsı</Text>
                                    <Text style={styles.timeValue}>{day.isha}</Text>
                                </View>
                            </View>
                        </View>
                    );
                })}
                    </ScrollView>
                </Animated.View>
            )}
        </LinearGradient>
    );
};

const createStyles = (theme: any, isSmallScreen: boolean, screenWidth: number) => {
    const padding = isSmallScreen ? 10 : screenWidth < 768 ? 15 : 20;

    return StyleSheet.create({
        container: {
            flex: 1,
        },
        header: {
            paddingHorizontal: padding,
            paddingTop: 50,
            paddingBottom: 20,
            flexDirection: 'row',
            alignItems: 'center',
        },
        backButton: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: theme.type === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.1)',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 15,
        },
        backButtonIcon: {
            color: theme.colors.headerText,
            fontSize: 32,
            fontWeight: '300',
            lineHeight: 32,
        },
        headerTitle: {
            fontSize: isSmallScreen ? 20 : 24,
            fontWeight: 'bold',
            color: theme.colors.headerText,
            flex: 1,
        },
        scrollView: {
            flex: 1,
        },
        scrollContent: {
            padding: padding,
            paddingTop: 0,
        },
        dayCard: {
            backgroundColor: theme.colors.cardBackground,
            borderRadius: 12,
            padding: isSmallScreen ? 12 : 15,
            marginBottom: 10,
            borderWidth: 1,
            borderColor: theme.colors.cardBorder,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.08,
            shadowRadius: 3,
            elevation: 2,
        },
        todayCard: {
            borderWidth: 2,
            borderColor: theme.colors.buttonBackground,
            backgroundColor: theme.type === 'light' ? '#F0F8FF' : '#1E3A5F',
            shadowOpacity: 0.15,
            elevation: 4,
        },
        dateHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
            paddingBottom: 8,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.cardBorder,
        },
        dateInfo: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
        },
        dayName: {
            fontSize: isSmallScreen ? 13 : 14,
            fontWeight: '600',
            color: theme.colors.text,
            minWidth: 35,
        },
        date: {
            fontSize: isSmallScreen ? 12 : 13,
            color: theme.colors.secondaryText,
        },
        todayText: {
            color: theme.colors.buttonBackground,
            fontWeight: 'bold',
        },
        todayBadge: {
            backgroundColor: theme.colors.buttonBackground,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 12,
        },
        todayBadgeText: {
            color: '#FFFFFF',
            fontSize: isSmallScreen ? 10 : 11,
            fontWeight: 'bold',
        },
        timesRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
        },
        timeColumn: {
            alignItems: 'center',
            width: '15%',
            minWidth: 45,
        },
        timeLabel: {
            fontSize: isSmallScreen ? 9 : 10,
            color: theme.colors.secondaryText,
            marginBottom: 3,
        },
        timeValue: {
            fontSize: isSmallScreen ? 11 : 12,
            fontWeight: '600',
            color: theme.colors.text,
        },
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingTop: 100,
        },
        loadingText: {
            marginTop: 15,
            fontSize: 16,
            color: theme.colors.text,
            fontWeight: '500',
        },
        contentContainer: {
            flex: 1,
        },
    });
};

export default MonthlyPrayerTimes;

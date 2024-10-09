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
import { View, Text } from 'react-native';
import { PrayerTime } from '../types/types';
import NextPrayerTime from './NextPrayerTime';
import PrayerTimesStyles from '../styles/PrayerTimesStyles';

interface PrayerTimesDisplayProps {
    prayerTimes: PrayerTime;
}

type PrayerKey = keyof Omit<PrayerTime, 'date'>;

const PrayerTimesDisplay: React.FC<PrayerTimesDisplayProps> = ({ prayerTimes }) => {
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

        if (currentTime < times.fajr) return 'isha';
        if (currentTime < times.sun) return 'fajr';
        if (currentTime < times.dhuhr) return 'sun';
        if (currentTime < times.asr) return 'dhuhr';
        if (currentTime < times.maghrib) return 'asr';
        if (currentTime < times.isha) return 'maghrib';
        return 'isha';
    };

    const currentPrayer = getCurrentPrayer();

    return (
        <View>
            <NextPrayerTime prayerTimes={prayerTimes} />
            <View style={PrayerTimesStyles.prayerTimesGrid}>
                {Object.entries(prayerNames).map(([key, name]) => {
                    const prayerKey = key as PrayerKey;
                    return (
                        <View
                            key={prayerKey}
                            style={[
                                PrayerTimesStyles.prayerTimeCard,
                                prayerKey === currentPrayer && PrayerTimesStyles.activePrayerCard,
                            ]}
                        >
                            <Text style={[
                                PrayerTimesStyles.prayerName,
                                prayerKey === currentPrayer && PrayerTimesStyles.activePrayerText,
                            ]}>{name}</Text>
                            <Text style={[
                                PrayerTimesStyles.prayerTime,
                                prayerKey === currentPrayer && PrayerTimesStyles.activePrayerText,
                            ]}>{prayerTimes[prayerKey]}</Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
};

export default PrayerTimesDisplay;
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface PrayerTimes {
    fajr: string;
    sun: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
}

interface Props {
    prayerTimes: PrayerTimes | null;
}

const NextPrayerTime: React.FC<Props> = ({ prayerTimes }) => {
    const [timeUntilNextPrayer, setTimeUntilNextPrayer] = useState<string>('');
    const [nextPrayer, setNextPrayer] = useState<string>('');

    useEffect(() => {
        if (!prayerTimes) {return;}

        const calculateTimeUntilNextPrayer = () => {
            const now = new Date();
            const prayerNames = ['fajr', 'sun', 'dhuhr', 'asr', 'maghrib', 'isha'];
            let nextPrayerTime: Date | null = null;
            let nextPrayerName: string = '';

            // Find the next prayer time
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

            // If no next prayer found (after Isha), set next prayer to tomorrow's Fajr
            if (!nextPrayerTime) {
                const fajrTime = new Date();
                const [fajrHours, fajrMinutes] = prayerTimes.fajr.split(':').map(Number);
                fajrTime.setDate(fajrTime.getDate() + 1); // Set to tomorrow
                fajrTime.setHours(fajrHours, fajrMinutes, 0, 0);
                nextPrayerTime = fajrTime;
                nextPrayerName = 'Fajr';
            }

            // Calculate the time difference
            if (nextPrayerTime) {
                const diff = nextPrayerTime.getTime() - now.getTime();
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);

                setTimeUntilNextPrayer(`${hours}h ${minutes}m ${seconds}s`);
                setNextPrayer(nextPrayerName);
            }
        };

        // Calculate initially
        calculateTimeUntilNextPrayer();

        // Update every second
        const interval = setInterval(calculateTimeUntilNextPrayer, 1000);

        return () => clearInterval(interval); // Cleanup on unmount
    }, [prayerTimes]);

    return (
        <View style={styles.container}>
            {nextPrayer && (
                <Text style={styles.text}>
                    Time until next prayer ({nextPrayer}): {timeUntilNextPrayer}
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 20,
        padding: 10,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        alignItems: 'center',
    },
    text: {
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default NextPrayerTime;

import { NativeModules, Platform } from 'react-native';
import { PrayerTime } from '../types/types';

const { WidgetModule } = NativeModules;

// Cache for timezone IDs to avoid repeated API calls
const timezoneCache: { [key: string]: string } = {};

export const updateWidget = async (
    locationName: string,
    prayerTimes: PrayerTime,
    locationDetail?: { country: string; city: string; district: string }
) => {
    if (Platform.OS !== 'android') {return;}

    try {
        // Default to device timezone
        let timezoneId = Intl.DateTimeFormat().resolvedOptions().timeZone;

        if (locationDetail?.city) {
            const cacheKey = `${locationDetail.city}-${locationDetail.country}`;

            if (timezoneCache[cacheKey] !== undefined) {
                timezoneId = timezoneCache[cacheKey];
            } else {
                try {
                    // 1. Get Coordinates & Timezone directly from Search
                    // Open-Meteo search endpoint returns timezone if available
                    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationDetail.city)}&count=1&language=tr&format=json`;
                    const geoRes = await fetch(geoUrl);
                    const geoData = await geoRes.json();

                    if (geoData.results && geoData.results.length > 0) {
                        const result = geoData.results[0];
                        if (result.timezone) {
                            timezoneId = result.timezone;
                            timezoneCache[cacheKey] = timezoneId;
                        }
                    }
                } catch (e) {
                    console.warn('Failed to fetch timezone:', e);
                }
            }
        }

        // Widget expects a JSON string with keys: fajr, sun, dhuhr, asr, maghrib, isha
        const widgetData = {
            fajr: prayerTimes.fajr,
            sun: prayerTimes.sun,
            dhuhr: prayerTimes.dhuhr,
            asr: prayerTimes.asr,
            maghrib: prayerTimes.maghrib,
            isha: prayerTimes.isha,
            country: locationDetail?.country || '',
            city: locationDetail?.city || '',
            district: locationDetail?.district || '',
            timezoneId: timezoneId,
        };

        WidgetModule.updateWidgetData(locationName, JSON.stringify(widgetData));
    } catch (error) {
        console.error('Error updating widget:', error);
    }
};

export const requestBatteryOptimization = () => {
    if (Platform.OS !== 'android') {return;}
    WidgetModule.requestBatteryOptimizationPermission();
};

export const requestOverlayPermission = () => {
    if (Platform.OS !== 'android') {return;}
    WidgetModule.requestOverlayPermission();
};

export const openAutoStartSettings = () => {
    if (Platform.OS !== 'android') {return;}
    WidgetModule.openAutoStartSettings();
};

export const requestNotificationPermission = () => {
    if (Platform.OS !== 'android') {return;}
    WidgetModule.requestNotificationPermission();
};

export const openLockScreenNotificationSettings = () => {
    if (Platform.OS !== 'android') {return;}
    WidgetModule.openLockScreenNotificationSettings();
};

export const startNotificationService = () => {
    if (Platform.OS !== 'android') {return;}
    WidgetModule.startNotificationService();
};

export const stopNotificationService = () => {
    if (Platform.OS !== 'android') {return;}
    WidgetModule.stopNotificationService();
};

export const checkPermissions = async (): Promise<{
    batteryOptimization: boolean;
    notification: boolean;
    overlay: boolean;
}> => {
    if (Platform.OS !== 'android') {
        return { batteryOptimization: true, notification: true, overlay: true };
    }
    try {
        return await WidgetModule.checkPermissions();
    } catch (e) {
        console.error('Error checking permissions:', e);
        return { batteryOptimization: false, notification: false, overlay: false };
    }
};

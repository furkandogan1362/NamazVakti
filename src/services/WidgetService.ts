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

// Aylık/30 günlük vakit listesini widget'a cache olarak gönder
export const syncWidgetMonthlyCache = async (
    locationName: string,
    monthlyPrayerTimes: PrayerTime[],
    locationDetail?: { country: string; city: string; district: string }
) => {
    if (Platform.OS !== 'android') {return;}
    try {
        // Determine timezone same way we do for single update
        let timezoneId = Intl.DateTimeFormat().resolvedOptions().timeZone;

        if (locationDetail?.city) {
            const cacheKey = `${locationDetail.city}-${locationDetail.country}`;
            if (timezoneCache[cacheKey] !== undefined) {
                timezoneId = timezoneCache[cacheKey];
            } else {
                try {
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
                    console.warn('Failed to fetch timezone for monthly cache:', e);
                }
            }
        }

        // Prepare compact monthly payload for native widget
        const days = monthlyPrayerTimes.map(pt => ({
            date: pt.date.split('T')[0],
            fajr: pt.fajr,
            sun: pt.sun,
            dhuhr: pt.dhuhr,
            asr: pt.asr,
            maghrib: pt.maghrib,
            isha: pt.isha,
        }));

        const monthlyPayload = {
            timezoneId,
            country: locationDetail?.country || '',
            city: locationDetail?.city || '',
            district: locationDetail?.district || '',
            days,
        };

        // Keep last known location name for widget header fallback
        WidgetModule.updateWidgetData(locationName, JSON.stringify({
            fajr: days[0]?.fajr || '',
            sun: days[0]?.sun || '',
            dhuhr: days[0]?.dhuhr || '',
            asr: days[0]?.asr || '',
            maghrib: days[0]?.maghrib || '',
            isha: days[0]?.isha || '',
            country: monthlyPayload.country,
            city: monthlyPayload.city,
            district: monthlyPayload.district,
            timezoneId: monthlyPayload.timezoneId,
        }));

        // Push monthly cache to native side (used for day rollover without app open)
        if (WidgetModule.updateWidgetMonthlyCache) {
            WidgetModule.updateWidgetMonthlyCache(JSON.stringify(monthlyPayload));
        }
    } catch (error) {
        console.error('Error syncing widget monthly cache:', error);
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

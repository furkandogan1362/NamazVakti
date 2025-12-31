import { NativeModules, Platform } from 'react-native';
import { PrayerTime } from '../types/types';

const { WidgetModule } = NativeModules;

// Cache for timezone IDs to avoid repeated API calls
const timezoneCache: { [key: string]: string } = {};

// Dünya genelinde ülke ismi varyasyonları -> country_code eşleştirmesi
// Bu sayede yerel dildeki ülke isimleri API'deki isimlerle eşleştirilir
const COUNTRY_CODE_MAP: { [key: string]: string[] } = {
    'us': ['abd', 'amerika', 'united states', 'usa', 'birlesik devletler', 'amerikan'],
    'gb': ['ingiltere', 'birlesik krallik', 'united kingdom', 'uk', 'britain', 'great britain', 'england'],
    'tr': ['turkiye', 'turkey', 'türkiye'],
    'ru': ['rusya', 'russia', 'rusya federasyonu', 'russian federation'],
    'cn': ['cin', 'china', 'çin', 'cinhalk cumhuriyeti'],
    'au': ['avustralya', 'australia', 'avusturalya'],
    'ca': ['kanada', 'canada'],
    'br': ['brezilya', 'brazil', 'brasil'],
    'mx': ['meksika', 'mexico', 'mejico'],
    'id': ['endonezya', 'indonesia', 'indonezya'],
    'in': ['hindistan', 'india', 'bharata'],
    'de': ['almanya', 'germany', 'deutschland'],
    'fr': ['fransa', 'france'],
    'es': ['ispanya', 'spain', 'espana', 'españa'],
    'it': ['italya', 'italy', 'italia'],
    'jp': ['japonya', 'japan', 'nippon'],
    'kr': ['guney kore', 'south korea', 'korea', 'kore'],
    'sa': ['suudi arabistan', 'saudi arabia', 'arabistan'],
    'ae': ['birlesik arap emirlikleri', 'uae', 'united arab emirates', 'bae', 'dubai'],
    'eg': ['misir', 'egypt', 'mısır'],
    'za': ['guney afrika', 'south africa'],
    'ar': ['arjantin', 'argentina'],
    'cl': ['sili', 'chile', 'şili'],
    'pe': ['peru'],
    'co': ['kolombiya', 'colombia'],
    've': ['venezuela'],
    'pk': ['pakistan'],
    'bd': ['banglades', 'bangladesh'],
    'my': ['malezya', 'malaysia'],
    'th': ['tayland', 'thailand', 'siam'],
    'vn': ['vietnam'],
    'ph': ['filipinler', 'philippines'],
    'ng': ['nijerya', 'nigeria'],
    'ke': ['kenya'],
    'ma': ['fas', 'morocco', 'maroc'],
    'dz': ['cezayir', 'algeria', 'algerie'],
    'tn': ['tunus', 'tunisia'],
    'ly': ['libya'],
    'ir': ['iran'],
    'iq': ['irak', 'iraq'],
    'sy': ['suriye', 'syria'],
    'lb': ['lubnan', 'lebanon', 'lübnan'],
    'jo': ['urdun', 'jordan', 'ürdün'],
    'il': ['israil', 'israel'],
    'ps': ['filistin', 'palestine'],
    'kz': ['kazakistan', 'kazakhstan'],
    'uz': ['ozbekistan', 'uzbekistan', 'özbekistan'],
    'az': ['azerbaycan', 'azerbaijan'],
    'ge': ['gurcistan', 'georgia', 'gürcistan'],
    'ua': ['ukrayna', 'ukraine'],
    'pl': ['polonya', 'poland', 'polska'],
    'cz': ['cekya', 'czech', 'czechia', 'çekya'],
    'at': ['avusturya', 'austria', 'osterreich'],
    'ch': ['isvicre', 'switzerland', 'isviçre', 'schweiz'],
    'nl': ['hollanda', 'netherlands', 'nederland'],
    'be': ['belcika', 'belgium', 'belçika'],
    'se': ['isvec', 'sweden', 'isveç'],
    'no': ['norvec', 'norway', 'norveç'],
    'dk': ['danimarka', 'denmark'],
    'fi': ['finlandiya', 'finland'],
    'gr': ['yunanistan', 'greece', 'hellas'],
    'pt': ['portekiz', 'portugal'],
    'ie': ['irlanda', 'ireland'],
    'nz': ['yeni zelanda', 'new zealand'],
    'sg': ['singapur', 'singapore'],
    'hk': ['hong kong'],
    'tw': ['tayvan', 'taiwan'],
    'mo': ['makao', 'macao', 'macau'],
};

// Konum bilgisinden timezone hesapla (cache ile)
// Önce district (ilçe/kasaba), sonra city (şehir/eyalet), en son country (ülke) ile arar
const getTimezoneForLocation = async (locationDetail: { country: string; city: string; district: string }): Promise<string> => {
    const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (!locationDetail?.district && !locationDetail?.city) {
        return deviceTimezone;
    }

    // Cache key: district + city + country kombinasyonu (en spesifik)
    const cacheKey = `${locationDetail.district}-${locationDetail.city}-${locationDetail.country}`;

    // Cache'de varsa direkt döndür
    if (timezoneCache[cacheKey]) {
        console.log('🕐 Widget timezone (cache):', timezoneCache[cacheKey]);
        return timezoneCache[cacheKey];
    }

    // String normalizasyonu
    const normalizeString = (str: string) => str ? str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim() : '';
    const normalizedCountry = normalizeString(locationDetail.country);

    // Ülke eşleştirme fonksiyonu - dünya geneli destekli
    const matchesCountry = (result: any): boolean => {
        const countryName = normalizeString(result.country || '');
        const countryCode = normalizeString(result.country_code || '');

        // 1. Country code map'ten kontrol et (en güvenilir)
        for (const [code, aliases] of Object.entries(COUNTRY_CODE_MAP)) {
            // Kullanıcının ülkesi bu alias'lardan biri mi?
            const userCountryMatches = aliases.some(alias =>
                normalizedCountry.includes(normalizeString(alias)) ||
                normalizeString(alias).includes(normalizedCountry)
            );

            if (userCountryMatches && countryCode === code) {
                return true;
            }
        }

        // 2. Direkt isim veya kod eşleşmesi
        if (countryName.includes(normalizedCountry) || normalizedCountry.includes(countryName)) {
            return true;
        }

        if (countryCode === normalizedCountry) {
            return true;
        }

        return false;
    };

    // API'den timezone ara - verilen query ile
    const searchTimezone = async (query: string): Promise<string | null> => {
        try {
            const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=tr&format=json`;
            const geoRes = await fetch(geoUrl);
            const geoData = await geoRes.json();

            if (geoData.results && geoData.results.length > 0) {
                // Önce ülke eşleşen sonucu bul
                const matchedResult = geoData.results.find(matchesCountry);

                if (matchedResult?.timezone) {
                    return matchedResult.timezone;
                }
            }
        } catch (e) {
            console.warn('Failed to fetch timezone:', e);
        }
        return null;
    };

    try {
        let foundTimezone: string | null = null;

        // 1. Önce district (ilçe/kasaba) ile ara - en spesifik
        if (locationDetail.district) {
            console.log('🔍 Timezone araması (district):', locationDetail.district);
            foundTimezone = await searchTimezone(locationDetail.district);
            if (foundTimezone) {
                console.log('🕐 Widget timezone (API - district):', foundTimezone, 'for', locationDetail.district);
            }
        }

        // 2. District'te bulunamazsa city (şehir/eyalet) ile ara
        if (!foundTimezone && locationDetail.city && locationDetail.city !== locationDetail.district) {
            console.log('🔍 Timezone araması (city):', locationDetail.city);
            foundTimezone = await searchTimezone(locationDetail.city);
            if (foundTimezone) {
                console.log('🕐 Widget timezone (API - city):', foundTimezone, 'for', locationDetail.city);
            }
        }

        // 3. Hala bulunamazsa country (ülke) ile ara
        if (!foundTimezone && locationDetail.country) {
            console.log('🔍 Timezone araması (country):', locationDetail.country);
            foundTimezone = await searchTimezone(locationDetail.country);
            if (foundTimezone) {
                console.log('🕐 Widget timezone (API - country):', foundTimezone, 'for', locationDetail.country);
            }
        }

        if (foundTimezone) {
            timezoneCache[cacheKey] = foundTimezone;
            return foundTimezone;
        }
    } catch (e) {
        console.warn('Failed to fetch timezone for widget:', e);
    }

    // Fallback: cihaz timezone'u
    console.log('🕐 Widget timezone (fallback):', deviceTimezone);
    return deviceTimezone;
};

export const updateWidget = async (
    locationName: string,
    prayerTimes: PrayerTime,
    locationDetail?: { country: string; city: string; district: string },
    _timezone?: string // Artık kullanılmıyor, geriye uyumluluk için tutuldu
) => {
    if (Platform.OS !== 'android') {return;}

    try {
        // Her zaman konum bilgisinden timezone hesapla (state senkronizasyon sorunlarını önler)
        const timezoneId = locationDetail
            ? await getTimezoneForLocation(locationDetail)
            : Intl.DateTimeFormat().resolvedOptions().timeZone;


        // Widget expects a JSON string with keys: fajr, sun, dhuhr, asr, maghrib, isha
        const widgetData = {
            fajr: prayerTimes.fajr,
            sun: prayerTimes.sun,
            dhuhr: prayerTimes.dhuhr,
            asr: prayerTimes.asr,
            maghrib: prayerTimes.maghrib,
            isha: prayerTimes.isha,
            gregorianDateLong: prayerTimes.gregorianDateLong || '',
            hijriDateLong: prayerTimes.hijriDateLong || '',
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
    locationDetail?: { country: string; city: string; district: string },
    _timezone?: string // Artık kullanılmıyor, geriye uyumluluk için tutuldu
) => {
    if (Platform.OS !== 'android') {return;}
    try {
        // Her zaman konum bilgisinden timezone hesapla (state senkronizasyon sorunlarını önler)
        const timezoneId = locationDetail
            ? await getTimezoneForLocation(locationDetail)
            : Intl.DateTimeFormat().resolvedOptions().timeZone;

        console.log('📱 Widget aylık cache güncelleniyor (final):', { locationName, timezoneId });

        // Prepare compact monthly payload for native widget
        const days = monthlyPrayerTimes.map(pt => ({
            date: pt.date.split('T')[0],
            fajr: pt.fajr,
            sun: pt.sun,
            dhuhr: pt.dhuhr,
            asr: pt.asr,
            maghrib: pt.maghrib,
            isha: pt.isha,
            gregorianDateLong: pt.gregorianDateLong || '',
            hijriDateLong: pt.hijriDateLong || '',
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
            gregorianDateLong: days[0]?.gregorianDateLong || '',
            hijriDateLong: days[0]?.hijriDateLong || '',
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

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNetwork } from '../contexts/NetworkContext';

const TIMEZONE_CACHE_KEY = 'location_timezone_cache_v3';

// Dünya genelinde ülke ismi varyasyonları -> country_code eşleştirmesi
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

interface LocationTimeHook {
    timezone: string;
    loading: boolean;
    timeDiff: number; // Difference in milliseconds between local time and device time
}

interface LocationInfo {
    country: string;
    city: string;
    region: string;
}

export const useLocationTime = (location: LocationInfo): LocationTimeHook => {
    const { country, city, region } = location;
    const [timezone, setTimezone] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone);
    const [loading, setLoading] = useState(false);
    const [timeDiff, _setTimeDiff] = useState(0);
    const { isOnline } = useNetwork();

    useEffect(() => {
        // Konum değiştiğinde timezone'u hemen cihazın varsayılanına sıfırla
        // Bu sayede yeni konum yüklenirken eski konumun saat dilimi (örn: Singapur) kullanılmaz
        setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);

        const fetchTimezone = async () => {
            if (!country || !city) {return;}

            const cacheKey = `${TIMEZONE_CACHE_KEY}_${country}_${city}_${region}`;

            // Try cache first
            try {
                const cachedTz = await AsyncStorage.getItem(cacheKey);
                if (cachedTz) {
                    setTimezone(cachedTz);
                    return;
                }
            } catch (e) {
                console.error('Error reading timezone cache', e);
            }

            if (!isOnline) {return;}

            setLoading(true);
            try {
                // Strategy: Try Region first, then City, then Country
                let foundTz = null;

                // 1. Try Region (e.g. "Auburn")
                if (region && region !== city) {
                    foundTz = await searchLocation(region, country);
                }

                // 2. Try City (e.g. "Alabama" or "Istanbul")
                if (!foundTz && city) {
                    foundTz = await searchLocation(city, country);
                }

                // 3. Try Country (e.g. "ABD")
                if (!foundTz && country) {
                    foundTz = await searchLocation(country);
                }

                // Fallback for Turkey if nothing found
                if (!foundTz && (country === 'TÜRKİYE' || country === 'Turkey')) {
                     foundTz = 'Europe/Istanbul';
                }

                if (foundTz) {
                    setTimezone(foundTz);
                    await AsyncStorage.setItem(cacheKey, foundTz);
                } else {
                    // Bulunamadıysa cihaz timezone'unu kullan
                    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
                }
            } catch (error) {
                console.error('Error fetching timezone:', error);
                // Hata durumunda cihaz timezone'unu kullan
                setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
            } finally {
                setLoading(false);
            }
        };

        // Konum değiştiğinde timezone'u geçici olarak sıfırla ve yeniden fetch et
        // Bu sayede eski timezone kullanılmaz
        fetchTimezone();
    }, [country, city, region, isOnline]);

    return { timezone, loading, timeDiff };
};

const normalizeString = (str: string): string => {
    return str
        .replace(/İ/g, 'i')
        .replace(/I/g, 'i')
        .replace(/ı/g, 'i')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
};

const searchLocation = async (query: string, countryFilter?: string): Promise<string | null> => {
    // Clean query: remove text in parentheses
    const cleanQuery = query.replace(/\s*\(.*?\)\s*/g, '').trim() || query;

    // Handle special country codes
    let effectiveCountryFilter = countryFilter;
    if (countryFilter === 'CIN') {
        effectiveCountryFilter = 'Çin';
    }

    try {
        const response = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanQuery)}&count=10&language=tr&format=json`
        );
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            // If country filter is provided, try to match
            if (effectiveCountryFilter) {
                const normalizedFilter = normalizeString(effectiveCountryFilter);

                const match = data.results.find((r: any) => {
                    const countryName = r.country ? normalizeString(r.country) : '';
                    const countryCode = r.country_code ? normalizeString(r.country_code) : '';

                    // 1. Country code map'ten kontrol et (dünya geneli destekli)
                    for (const [code, aliases] of Object.entries(COUNTRY_CODE_MAP)) {
                        const userCountryMatches = aliases.some(alias => {
                            const normalizedAlias = normalizeString(alias);
                            return normalizedFilter.includes(normalizedAlias) || normalizedAlias.includes(normalizedFilter);
                        });
                        if (userCountryMatches && countryCode === code) {
                            return true;
                        }
                    }

                    // 2. Direkt isim veya kod eşleşmesi
                    const nameMatch = countryName !== '' && (countryName.includes(normalizedFilter) || normalizedFilter.includes(countryName));
                    const codeMatch = countryCode !== '' && countryCode === normalizedFilter;

                    return nameMatch || codeMatch;
                });

                if (match && match.timezone) {
                    return match.timezone;
                }

                // If country filter was provided but no match found, return null
                // to avoid using a location from a different country (e.g. Bala, Romania instead of Bala, Turkey)
                return null;
            }

            // Return first result with a timezone if no filter provided
            if (data.results[0].timezone) {
                return data.results[0].timezone;
            }
        }
        return null;
    } catch (e) {
        return null;
    }
};

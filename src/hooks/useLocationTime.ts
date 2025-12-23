import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNetwork } from '../contexts/NetworkContext';

const TIMEZONE_CACHE_KEY = 'location_timezone_cache_v3';

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

                    // Special handling for Turkey
                    if ((normalizedFilter === 'turkiye' || normalizedFilter === 'turkey') &&
                        (countryName === 'turkiye' || countryName === 'turkey' || countryCode === 'tr')) {
                        return true;
                    }

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

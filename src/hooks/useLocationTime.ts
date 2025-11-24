import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNetwork } from '../contexts/NetworkContext';

const TIMEZONE_CACHE_KEY = 'location_timezone_cache';

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
    const [timeDiff, setTimeDiff] = useState(0);
    const { isOnline } = useNetwork();

    useEffect(() => {
        const fetchTimezone = async () => {
            if (!country || !city) return;

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

            if (!isOnline) return;

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

                if (foundTz) {
                    setTimezone(foundTz);
                    await AsyncStorage.setItem(cacheKey, foundTz);
                }
            } catch (error) {
                console.error('Error fetching timezone:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTimezone();
    }, [country, city, region, isOnline]);

    return { timezone, loading, timeDiff };
};

const searchLocation = async (query: string, countryFilter?: string): Promise<string | null> => {
    try {
        const response = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=tr&format=json`
        );
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            // If country filter is provided, try to match
            if (countryFilter) {
                // Normalize strings for comparison
                const normalizedFilter = countryFilter.toLowerCase();
                const match = data.results.find((r: any) =>
                    (r.country && r.country.toLowerCase() === normalizedFilter) ||
                    (r.country_code && r.country_code.toLowerCase() === normalizedFilter)
                );
                if (match && match.timezone) return match.timezone;
            }

            // Return first result with a timezone
            if (data.results[0].timezone) return data.results[0].timezone;
        }
        return null;
    } catch (e) {
        return null;
    }
};

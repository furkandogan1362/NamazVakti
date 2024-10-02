// apiService.ts
import axios from 'axios';

const BASE_URL = 'https://prayertimes.api.abdus.dev/api/diyanet';

export const fetchCountries = async (): Promise<string[]> => {
    const response = await axios.get<string[]>(`${BASE_URL}/countries`);
    return response.data;
};

export const fetchCities = async (country: string): Promise<string[]> => {
    const response = await axios.get<string[]>(`${BASE_URL}/countries/${country}/cities`);
    return response.data;
};

export const fetchPrayerTimesByLocationId = async (locationId: number): Promise<any> => {
    try {
        const response = await axios.get(`${BASE_URL}/prayertimes`, {
            params: {
                location_id: locationId, // Using location_id as per the new pattern
            },
        });
        return response.data; // Expecting the data structure you provided
    } catch (error: any) {
        console.error('Error fetching prayer times:', error.response?.data || error.message);
        throw error; // Re-throw to handle later if needed
    }
};

export const fetchRegions = async (country: string, city: string): Promise<any[]> => {
    try {
        const response = await axios.get(`${BASE_URL}/locations`, {
            params: { country, city }, // Correctly use the locations API
        });
        // Assuming response.data is an array of objects with { id: location_id, region: region_name }
        return response.data;
    } catch (error: any) {
        console.error('Error loading regions:', error.response?.data || error.message);
        throw error; // Re-throw the error to handle it later if needed
    }
};


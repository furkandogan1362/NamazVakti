import { getApiClient, PrayerTimeData, PrayerPeriod } from './apiDiyanetManuel';

// --- TİP TANIMLAMALARI ---
export interface CityDetail {
  id: string;
  name: string;
  city: string;
  country: string;
  qiblaAngle: string;
  geographicQiblaAngle: string;
  distanceToKaaba: string;
}

interface CityResponse {
  data: CityDetail;
}

interface PrayerTimesResponse {
  data: PrayerTimeData[];
  success: boolean;
}

// PrayerTimeData ve PrayerPeriod'u apiDiyanetManuel'den re-export et
export type { PrayerTimeData, PrayerPeriod } from './apiDiyanetManuel';

// --- DIŞARIYA AÇILAN SERVİSLER (GPS için) ---
export const DiyanetService = {
  getCityFromLocation: async (lat: number, lon: number): Promise<CityDetail> => {
    const apiClient = await getApiClient();
    const response = await apiClient.post<CityResponse>('/apigateway/awqatsalah/api/Location/CityFromLocation', {
      latitude: lat,
      longitude: lon,
    });
    return response.data.data;
  },

  getCityDetail: async (cityId: string): Promise<CityDetail> => {
    const apiClient = await getApiClient();
    const response = await apiClient.get<CityResponse>(`/apigateway/awqatsalah/api/Place/CityDetail/${cityId}`);
    return response.data.data;
  },

  /**
   * GPS ile alınan konum için namaz vakitlerini getirir
   * @param cityId GPS'ten dönen şehir ID'si (string)
   * @param period Periyot: 'Daily' | 'Weekly' | 'Monthly'
   */
  getPrayerTimes: async (cityId: string, period: PrayerPeriod = 'Monthly'): Promise<PrayerTimeData[]> => {
    const apiClient = await getApiClient();
    const response = await apiClient.get<PrayerTimesResponse>(
      `/apigateway/awqatsalah/api/PrayerTime/${period}/${cityId}`
    );
    return response.data.data;
  },
};

import axios from 'axios';

// --- TİP TANIMLAMALARI ---
interface LoginResponse {
  access_token: string;
}

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

export interface PrayerTimeData {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  gregorianDateLong: string;
  gregorianDateShort: string;
  hijriDateLong: string;
  hijriDateShort: string;
  qiblaTime: string;
  shapeMoonUrl: string;
}

interface PrayerTimesResponse {
  data: PrayerTimeData[];
}

export type PrayerPeriod = 'Daily' | 'Weekly' | 'Monthly';

// --- SABİT DEĞERLER ---
const BASE_URL = 'https://t061.diyanet.gov.tr';

const AUTH_CREDENTIALS = {
  client_id: '3e28dc25-54e7-4b8d-a14a-254e97f40b81',
  client_secret: '-',
  grant_type: 'password',
  username: 'DIYANET-MOBIL-001',
  password: 'RMQqpfX42K7HCNs9',
};

// --- AXIOS INSTANCE ---
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'User-Agent': 'Dart/3.5 (dart:io)',
    'Content-Type': 'application/json',
  },
});

let accessToken: string | null = null;

// --- DÜZELTİLMİŞ LOGIN FONKSİYONU ---
// Hata burada çözüldü: URLSearchParams yerine manuel string formatı kullanıyoruz.
const loginAndGetToken = async (): Promise<string | null> => {
  try {
    // Veriyi x-www-form-urlencoded formatına manuel çeviriyoruz (En garanti yöntem)
    const formBody = Object.keys(AUTH_CREDENTIALS)
      .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(AUTH_CREDENTIALS[key as keyof typeof AUTH_CREDENTIALS]))
      .join('&');

    console.log('🔄 Token alınıyor...');

    const response = await axios.post<LoginResponse>(`${BASE_URL}/auth/jwt`, formBody, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Dart/3.5 (dart:io)',
      },
    });

    if (response.data?.access_token) {
      accessToken = response.data.access_token;
      console.log('✅ Token başarıyla alındı.');
      return accessToken;
    }
    return null;
  } catch (error: any) {
    console.error('❌ Login Hatası Detay:', error.response?.data || error.message);
    return null;
  }
};

// --- YARDIMCI: Token Kontrolü ---
// İstekten önce token var mı diye bakar, yoksa alır.
const ensureToken = async () => {
  if (!accessToken) {
    await loginAndGetToken();
  }
};

// --- INTERCEPTORS ---
apiClient.interceptors.request.use(async (config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      console.log('⚠️ 401 Hatası alındı, token yenileniyor...');
      const newToken = await loginAndGetToken();
      if (newToken) {
        accessToken = newToken;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      }
    }
    return Promise.reject(error);
  }
);

// --- DIŞARIYA AÇILAN SERVİSLER ---
export const DiyanetService = {
  getCityFromLocation: async (lat: number, lon: number) => {
    await ensureToken(); // Önce token olduğundan emin ol
    const response = await apiClient.post<CityResponse>('/apigateway/awqatsalah/api/Location/CityFromLocation', {
      latitude: lat,
      longitude: lon,
    });
    return response.data.data;
  },

  getCityDetail: async (cityId: string) => {
    await ensureToken();
    const response = await apiClient.get<CityResponse>(`/apigateway/awqatsalah/api/Place/CityDetail/${cityId}`);
    return response.data.data;
  },

  getPrayerTimes: async (cityId: string, period: PrayerPeriod = 'Daily') => {
    await ensureToken();
    const response = await apiClient.get<PrayerTimesResponse>(`/apigateway/awqatsalah/api/PrayerTime/${period}/${cityId}`);
    return response.data.data;
  },
};

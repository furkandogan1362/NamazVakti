import axios from 'axios';

// --- TİP TANIMLAMALARI ---

// Giriş Cevabı
interface LoginResponse {
  access_token: string;
}

// Konum Listeleri İçin Ortak Tip (Ülke, Şehir, İlçe)
export interface PlaceItem {
  id: number;
  code: string;
  name: string;
}

// Konum Cevap Wrapper
interface PlaceResponse {
  data: PlaceItem[];
  success: boolean;
}

// Namaz Vakti Veri Tipi
export interface PrayerTimeData {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  astronomicalSunset: string;
  astronomicalSunrise: string;
  gregorianDateLong: string;
  gregorianDateShort: string;
  hijriDateLong: string;
  hijriDateShort: string;
  qiblaTime: string;
  shapeMoonUrl: string;
}

// Namaz Vakitleri Cevap Wrapper
interface PrayerTimesResponse {
  data: PrayerTimeData[];
  success: boolean;
}

// Namaz Vakti Periyodu
export type PrayerPeriod = 'Daily' | 'Weekly' | 'Monthly';

// Esmaul Hüsna Veri Tipi
export interface EsmaulHusnaData {
  id: number;
  arabic: string;
  read: string;
  translation: string;
}

// Esmaul Hüsna Cevap Wrapper
interface EsmaulHusnaResponse {
  data: EsmaulHusnaData;
  isSuccess: boolean;
}

// --- SABİT DEĞERLER VE KİMLİK BİLGİLERİ ---
const BASE_URL = 'https://t061.diyanet.gov.tr';

// Diyanet'in sabit mobil uygulama kimlik bilgileri
const AUTH_CREDENTIALS = {
  client_id: '3e28dc25-54e7-4b8d-a14a-254e97f40b81',
  client_secret: '-',
  grant_type: 'password',
  username: 'DIYANET-MOBIL-001',
  password: 'RMQqpfX42K7HCNs9',
};

// --- AXIOS AYARLARI ---
// User-Agent: Dart/3.5 (dart:io) -> Sunucuya kendini resmi Flutter uygulaması gibi tanıtır.
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'User-Agent': 'Dart/3.5 (dart:io)',
    'Content-Type': 'application/json',
  },
});

// Token'ı hafızada tutuyoruz
let accessToken: string | null = null;

// --- TOKEN YÖNETİMİ (MOTOR KISMI) ---

/**
 * Giriş yapar ve yeni token alır.
 * x-www-form-urlencoded formatını manuel oluşturarak React Native uyumluluğu sağlar.
 */
const loginAndGetToken = async (): Promise<string | null> => {
  try {
    // Body verisini manuel string olarak oluştur (En güvenli yöntem)
    const formBody = Object.keys(AUTH_CREDENTIALS)
      .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(AUTH_CREDENTIALS[key as keyof typeof AUTH_CREDENTIALS]))
      .join('&');

    // console.log('🔐 [ManuelAPI] Token alınıyor...');

    const response = await axios.post<LoginResponse>(`${BASE_URL}/auth/jwt`, formBody, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Dart/3.5 (dart:io)',
      },
    });

    if (response.data?.access_token) {
      accessToken = response.data.access_token;
      return accessToken;
    }
    return null;
  } catch (error: any) {
    console.error('❌ [ManuelAPI] Login Hatası:', error.message);
    return null;
  }
};

/**
 * İstek atılmadan önce token varlığını kontrol eder.
 * Token yoksa, isteği bekletip önce login olur.
 */
const ensureToken = async () => {
  if (!accessToken) {
    await loginAndGetToken();
  }
};

// --- INTERCEPTORS (Araya Girenler) ---

// 1. İstek Giderken: Token'ı başlığa ekle
apiClient.interceptors.request.use(async (config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// 2. Cevap Gelirken: Hata yönetimi ve Retry mekanizması
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Retry sayacı başlat
    if (!originalRequest._retryCount) {
      originalRequest._retryCount = 0;
    }

    // 401 (Yetkisiz) hatası: Token yenile ve tekrar dene
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const newToken = await loginAndGetToken();
      if (newToken) {
        accessToken = newToken;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      }
    }

    // Network Error veya Timeout durumunda tekrar dene (Max 3 kere)
    if ((error.code === 'ECONNABORTED' || error.message === 'Network Error' || !error.response) && originalRequest._retryCount < 3) {
      originalRequest._retryCount += 1;

      // Sadece production'da veya debug modunda değilse log göster
      if (__DEV__ === false) {
        console.log(`⚠️ [ManuelAPI] Ağ hatası, tekrar deneniyor (${originalRequest._retryCount}/3)...`);
      }

      // Exponential backoff (1s, 2s, 4s bekle)
      const delay = Math.pow(2, originalRequest._retryCount - 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));

      return apiClient(originalRequest);
    }

    return Promise.reject(error);
  }
);

/**
 * Diğer modüller için hazır apiClient döndürür (token ile)
 * GPS servisi bu fonksiyonu kullanır
 */
export const getApiClient = async () => {
  await ensureToken();
  return apiClient;
};

// --- DIŞARIYA AÇILAN SERVİSLER ---

export const DiyanetManuelService = {

  /**
   * 1. ADIM: Tüm Ülkeleri Listeler
   * Örn: Türkiye ID: 2
   */
  getCountries: async (): Promise<PlaceItem[]> => {
    await ensureToken();
    const response = await apiClient.get<PlaceResponse>('/apigateway/awqatsalah/api/Place/Countries');
    return response.data.data;
  },

  /**
   * 2. ADIM: Seçilen Ülkeye ait Şehirleri (İlleri) Listeler
   * @param countryId Ülke ID'si (Örn: Türkiye için 2)
   * Örn: Sivas ID: 571
   */
  getStates: async (countryId: number): Promise<PlaceItem[]> => {
    await ensureToken();
    const response = await apiClient.get<PlaceResponse>(`/apigateway/awqatsalah/api/Place/States/${countryId}`);
    return response.data.data;
  },

  /**
   * 3. ADIM: Seçilen Şehre ait İlçeleri (Bölgeleri) Listeler
   * @param stateId Şehir/İl ID'si (Örn: Sivas için 571)
   * Örn: Divriği ID: 9858 (Bu ID ile namaz vakti çekilir)
   */
  getDistricts: async (stateId: number): Promise<PlaceItem[]> => {
    await ensureToken();
    const response = await apiClient.get<PlaceResponse>(`/apigateway/awqatsalah/api/Place/Cities/${stateId}`);
    return response.data.data;
  },

  /**
   * Namaz Vakitlerini Getirir
   * @param districtId İlçe ID'si (getDistricts'ten dönen id)
   * @param period Periyot: 'Daily' | 'Weekly' | 'Monthly'
   */
  getPrayerTimes: async (districtId: number, period: PrayerPeriod = 'Monthly'): Promise<PrayerTimeData[]> => {
    await ensureToken();
    const response = await apiClient.get<PrayerTimesResponse>(
      `/apigateway/awqatsalah/api/PrayerTime/${period}/${districtId}`
    );
    return response.data.data;
  },

  /**
   * BONUS: Günün Esmaul Hüsna Verisini Getirir
   * Arapça, Okunuş ve Anlam içerir.
   */
  getEsmaulHusna: async (): Promise<EsmaulHusnaData> => {
    await ensureToken();
    const response = await apiClient.get<EsmaulHusnaResponse>('/apigateway/apisuperapp/EsmaulHusna/esmaul-husna-of-the-day/tr');
    return response.data.data;
  },
};

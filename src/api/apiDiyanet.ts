import axios from 'axios'; // OSM için axios'a ihtiyacımız var
import { getApiClient, PrayerTimeData, PrayerPeriod } from './apiDiyanetManuel';

// =================================================================
// 1. TİP TANIMLAMALARI
// =================================================================

// --- Mevcut Tipler ---
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

// --- YENİ: OSM (Adres) Tipleri ---
export interface OsmAddressResult {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    road?: string;        // "1728 Sokak"
    suburb?: string;      // "Şehit Kubilay Mahallesi"
    town?: string;        // "Keçiören"
    city?: string;        // Bazı durumlarda şehir burada olur
    province?: string;    // "Ankara"
    country: string;
    postcode?: string;
    [key: string]: string | undefined;
  };
}

// --- YENİ: Diyanet (Yerleşim Yeri) Tipleri ---
// Endpoint: CityFromSettlement
export interface CitySettlementResult {
  id: number;           // Namaz Vakti ID'si (Örn: 9206)
  name: string;         // Örn: "ANKARA"
  normalizedName: string;
  state: {              // İl Bilgisi
    id: number;
    name: string;       // Örn: "ANKARA"
  };
  country: {
    id: number;
    code: string;
    name: string;
  };
}

interface SettlementResponse {
  data: CitySettlementResult;
  success: boolean;
}

// --- YENİ: Birleştirilmiş Sonuç Tipi (UI Kullanımı İçin) ---
export interface CompleteLocationData {
  prayerTimeId: number;     // Namaz vakitlerini çekeceğin ID (9206)
  formattedAddress: string; // "ANKARA, Keçiören, 1728 Sokak"
  city: string;             // "ANKARA"
  district: string;         // "Keçiören"
  detail: string;           // "1728 Sokak"
  coords: {
    lat: number;
    lon: number;
  };
}

// PrayerTimeData ve PrayerPeriod'u apiDiyanetManuel'den re-export et
export type { PrayerTimeData, PrayerPeriod } from './apiDiyanetManuel';


// =================================================================
// 2. ÖZEL İSTEMCİLER
// =================================================================

// OSM Client: Diyanet Uygulaması Taklidi (Gizlilik İçin)
const osmClient = axios.create({
  baseURL: 'https://nominatim.openstreetmap.org',
  headers: {
    'User-Agent': 'DibSuperApp/1.0', // KRİTİK: Diyanet App User-Agent'i
    'Accept-Language': 'tr',         // Türkçe sonuç istiyoruz
  },
  timeout: 10000,
});


// =================================================================
// 3. SERVİSLER
// =================================================================

// --- GPS (Mevcut Servisler) ---
export const DiyanetService = {
  getCityFromLocation: async (lat: number, lon: number): Promise<CityDetail> => {
    const apiClient = await getApiClient(); // Token yönetimi apiDiyanetManuel'den gelir
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

  getPrayerTimes: async (cityId: string, period: PrayerPeriod = 'Monthly'): Promise<PrayerTimeData[]> => {
    const apiClient = await getApiClient();
    const response = await apiClient.get<PrayerTimesResponse>(
      `/apigateway/awqatsalah/api/PrayerTime/${period}/${cityId}`
    );
    return response.data.data;
  },
};

// --- YENİ: HARİTA VE ADRES BİRLEŞTİRME SERVİSİ ---
export const MapLocationService = {

  // 1. OSM'den Adres Detayı Çekme
  getOsmDetails: async (lat: number, lon: number): Promise<OsmAddressResult | null> => {
    try {
      const response = await osmClient.get<OsmAddressResult>('/reverse', {
        params: {
          format: 'json',
          lat: lat,
          lon: lon,
          zoom: 18,
          addressdetails: 1,
          'accept-language': 'tr',
        },
      });
      return response.data;
    } catch (error) {
      console.error('❌ OSM Error:', error);
      return null;
    }
  },

  // 2. Diyanet'ten Hiyerarşik Konum Bilgisi Çekme (CityFromSettlement)
  getDiyanetSettlement: async (lat: number, lon: number): Promise<CitySettlementResult | null> => {
    try {
      const apiClient = await getApiClient(); // Güvenli client
      const response = await apiClient.post<SettlementResponse>('/apigateway/awqatsalah/api/Location/CityFromSettlement', {
        latitude: lat,
        longitude: lon,
      });
      return response.data.data;
    } catch (error) {
      console.error('❌ Diyanet Settlement Error:', error);
      return null;
    }
  },

  /**
   * ANA FONKSİYON: Haritaya tıklandığında çağrılacak.
   * Hem OSM hem Diyanet verisini paralel çeker ve birleştirir.
   * Çıktı Formatı: "ANKARA, Keçiören, 1728 Sokak"
   */
  getCompleteLocation: async (lat: number, lon: number): Promise<CompleteLocationData | null> => {
    try {
      // İki isteği aynı anda atıyoruz (Performans için)
      const [osmData, diyanetData] = await Promise.all([
        MapLocationService.getOsmDetails(lat, lon),
        MapLocationService.getDiyanetSettlement(lat, lon),
      ]);

      if (!diyanetData) {
        console.warn('⚠️ Diyanet bu koordinat için namaz vakti ID döndürmedi.');
        return null;
      }

      // --- FORMATLAMA MANTIĞI ---

      // 1. Şehir (İl): Diyanet'ten gelir (Örn: "ANKARA")
      // Bazen name ilçe olabilir, state.name garanti ildir.
      const city = diyanetData.state?.name || diyanetData.name;

      // 2. İlçe: OSM'den 'town', yoksa 'suburb', o da yoksa 'city'
      const district = osmData?.address?.town || osmData?.address?.suburb || osmData?.address?.city || '';

      // 3. Detay (Sokak/Mahalle): OSM'den 'road', yoksa 'suburb'
      // Eğer ilçe ismi ile detay aynıysa (örn: ikisi de mahalle adıysa) detayı tekrar yazdırma
      let detail = osmData?.address?.road || '';
      if (!detail && district !== osmData?.address?.suburb) {
        detail = osmData?.address?.suburb || '';
      }

      // Parçaları birleştir ve boş olanları temizle
      // Örn: ["ANKARA", "Keçiören", "1728 Sokak"]
      const parts = [city, district, detail].filter(p => p && p.trim() !== '');
      const formattedAddress = parts.join(', ');

      return {
        prayerTimeId: diyanetData.id, // Örn: 9206
        formattedAddress: formattedAddress, // Örn: "ANKARA, Keçiören, 1728 Sokak"
        city,
        district,
        detail,
        coords: { lat, lon },
      };

    } catch (error) {
      console.error('❌ Complete Location Error:', error);
      return null;
    }
  },
};

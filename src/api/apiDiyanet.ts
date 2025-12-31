import axios from 'axios'; // OSM için axios'a ihtiyacımız var
import { getApiClient, PrayerTimeData, PrayerPeriod } from './apiDiyanetManuel';

// =================================================================
// 1. TİP TANIMLAMALARI
// =================================================================

// --- Mevcut Tipler ---
export interface CityDetail {
  id: string;
  name: string;           // Şehir/Bölge adı (Örn: "WASHINGTON", "NIEDERSACHSEN")
  code: string;           // Şehir kodu
  city: string;           // Eyalet/Bölge kısaltması (Örn: "D.C")
  cityEn: string;         // İngilizce eyalet adı
  country: string;        // Ülke adı (Örn: "ABD", "ALMANYA")
  countryEn: string;      // İngilizce ülke adı (Örn: "USA", "GERMANY")
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
// Endpoint: CityFromSettlement (ŞİMDİLİK DEVRE DIŞI)
/*
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
*/

// --- YENİ: Birleştirilmiş Sonuç Tipi (UI Kullanımı İçin) ---
export interface CompleteLocationData {
  prayerTimeId: number;     // Namaz vakitlerini çekeceğin ID (9206)
  formattedAddress: string; // "WASHINGTON, Georgetown, ABD"
  city: string;             // Şehir/Bölge adı (Örn: "WASHINGTON")
  district: string;         // İlçe/Kasaba (OSM'den) (Örn: "Georgetown")
  country: string;          // Ülke adı (Örn: "ABD")
  detail: string;           // Sokak/Mahalle detayı
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

  // 2. Diyanet'ten Hiyerarşik Konum Bilgisi Çekme (CityFromSettlement) - ŞİMDİLİK DEVRE DIŞI
  /*
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
  */

  /**
   * ANA FONKSİYON: Haritaya tıklandığında çağrılacak.
   * OSM'den adres detayı, Diyanet'ten (getCityFromLocation) namaz vakti ID'si alınır.
   * KÖPRÜ: Koordinatlar (Lat/Lon)
   * - OSM: Sokak/Mahalle/Köy gibi detaylı adres (Display Name)
   * - Diyanet: Namaz vakti bölgesi ID'si
   * Çıktı Formatı: "ANKARA, Keçiören, 1728 Sokak"
   */
  getCompleteLocation: async (lat: number, lon: number): Promise<CompleteLocationData | null> => {
    try {
      // İki isteği aynı anda atıyoruz (Performans için)
      // OSM: Görsel adres için | Diyanet: Namaz vakti ID'si için
      const [osmData, diyanetData] = await Promise.all([
        MapLocationService.getOsmDetails(lat, lon),
        DiyanetService.getCityFromLocation(lat, lon),
      ]);

      if (!diyanetData) {
        console.warn('⚠️ Diyanet bu koordinat için namaz vakti ID döndürmedi.');
        return null;
      }

      // --- FORMATLAMA MANTIĞI ---

      // 1. Şehir/Bölge: Diyanet'ten 'name' alanı (Örn: "WASHINGTON", "NIEDERSACHSEN")
      const city = diyanetData.name;

      // 2. İlçe/Kasaba: OSM'den 'road', yoksa 'suburb', o da yoksa 'city'
      const district = osmData?.address?.road || osmData?.address?.suburb || osmData?.address?.city || '';

      // 3. Ülke: Diyanet'ten 'country' alanı (Örn: "ABD", "ALMANYA")
      const country = diyanetData.country;

      // 4. Detay (Sokak/Mahalle): OSM'den 'road', yoksa 'suburb'
      let detail = osmData?.address?.road || '';
      if (!detail && district !== osmData?.address?.suburb) {
        detail = osmData?.address?.suburb || '';
      }

      // Parçaları birleştir ve boş olanları temizle
      // Format: "WASHINGTON, Georgetown, ABD" veya "NIEDERSACHSEN, Herzberg am Harz, ALMANYA"
      const parts = [city, district, country].filter(p => p && p.trim() !== '');
      const formattedAddress = parts.join(', ');

      return {
        prayerTimeId: parseInt(diyanetData.id, 10), // CityDetail.id string, number'a çevir
        formattedAddress: formattedAddress,
        city,
        district,
        country,
        detail,
        coords: { lat, lon },
      };

    } catch (error) {
      console.error('❌ Complete Location Error:', error);
      return null;
    }
  },
};

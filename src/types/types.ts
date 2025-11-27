// types.ts

/**
 * Uygulama genelinde kullanılan tip tanımlamaları
 * Bu dosya, uygulamada kullanılan tüm özel tipleri ve arayüzleri tanımlar.
 * Tip tutarlılığını sağlamak ve kod tekrarını önlemek için merkezi bir kaynak görevi görür.
 * Tanımlanan tipler:
 * - PlaceItem: API'den dönen konum öğelerini temsil eder (ülke, şehir, ilçe)
 * - SelectedLocation: Seçili konum bilgilerini (ID'ler dahil) temsil eder
 * - PrayerTime: Namaz vakitlerini temsil eder
 */

// API'den dönen konum öğesi (Ülke, Şehir, İlçe için ortak)
export interface PlaceItem {
    id: number;
    code: string;
    name: string;
}

// Seçili konum bilgileri (ID'ler dahil - API çağrıları için gerekli)
export interface SelectedLocation {
    country: PlaceItem | null;
    city: PlaceItem | null;
    district: PlaceItem | null;
}

// Eski LocationData interface'i (geriye uyumluluk için)
export interface LocationData {
    country: string;
    city: string;
    region: string;
}

// Eski Region interface'i (geriye uyumluluk için)
export interface Region {
    id: number;
    region: string;
}

export interface PrayerTime {
    date: string;
    fajr: string;
    sun: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
    hijriDate?: string;
    hijriMonth?: string;
    hijriYear?: string;
    gregorianDateLong?: string;  // Diyanet API'den gelen miladi tarih (örn: "27 Kasım 2025 Perşembe")
    hijriDateLong?: string;      // Diyanet API'den gelen hicri tarih (örn: "7 Cemaziyelahir 1447")
    [key: string]: string | undefined;
}

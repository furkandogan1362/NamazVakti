// types.ts

/**
 * Uygulama genelinde kullanılan tip tanımlamaları
 * Bu dosya, uygulamada kullanılan tüm özel tipleri ve arayüzleri tanımlar.
 * Tip tutarlılığını sağlamak ve kod tekrarını önlemek için merkezi bir kaynak görevi görür.
 * Tanımlanan tipler:
 * - LocationData: Konum bilgilerini temsil eder
 * - Region: Bölge bilgilerini temsil eder
 * - PrayerTime: Namaz vakitlerini temsil eder
 */

export interface LocationData {
    country: string;
    city: string;
    region: string;
}

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
    [key: string]: string; // Index signature ekledik
}

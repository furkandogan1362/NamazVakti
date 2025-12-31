// LocationContext.tsx

/**
 * Konum verilerinin yönetimi için context sağlayıcı
 * Bu context, kullanıcının seçtiği konum bilgilerini ve ilgili durumları yönetir.
 * Konum verilerini tüm uygulama bileşenlerine sağlar.
 * Yönetilen veriler:
 * - Ülkeler, şehirler ve ilçeler listesi (PlaceItem formatında)
 * - Seçili konum bilgileri (ID'ler dahil)
 * - Konum seçim durumu
 */

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { PlaceItem, SelectedLocation } from '../types/types';
import * as storageService from '../services/storageService';

interface LocationContextType {
    countries: PlaceItem[];
    cities: PlaceItem[];
    districts: PlaceItem[];
    selectedLocation: SelectedLocation;
    savedLocations: SelectedLocation[];
    isSelectingLocation: boolean;
    setCountries: (countries: PlaceItem[]) => void;
    setCities: (cities: PlaceItem[]) => void;
    setDistricts: (districts: PlaceItem[]) => void;
    setSelectedLocation: (location: SelectedLocation) => void;
    setIsSelectingLocation: (isSelecting: boolean) => void;
    addSavedLocation: (location: SelectedLocation) => void;
    removeSavedLocation: (location: SelectedLocation) => void;
    updateSavedLocations: (locations: SelectedLocation[]) => void;
    updatePrimaryLocation: (location: SelectedLocation) => void;
}

const defaultSelectedLocation: SelectedLocation = {
    country: null,
    city: null,
    district: null,
};

const LocationContext = createContext<LocationContextType>({
    countries: [],
    cities: [],
    districts: [],
    selectedLocation: defaultSelectedLocation,
    savedLocations: [],
    isSelectingLocation: true,
    setCountries: () => {},
    setCities: () => {},
    setDistricts: () => {},
    setSelectedLocation: () => {},
    setIsSelectingLocation: () => {},
    addSavedLocation: () => {},
    removeSavedLocation: () => {},
    updateSavedLocations: () => {},
    updatePrimaryLocation: () => {},
});

export const LocationProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const [countries, setCountries] = useState<PlaceItem[]>([]);
    const [cities, setCities] = useState<PlaceItem[]>([]);
    const [districts, setDistricts] = useState<PlaceItem[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<SelectedLocation>(defaultSelectedLocation);
    const [savedLocations, setSavedLocations] = useState<SelectedLocation[]>([]);
    const [isSelectingLocation, setIsSelectingLocation] = useState(true);

    // Kayıtlı konumları yükle
    useEffect(() => {
        const loadLocations = async () => {
            const locations = await storageService.loadSavedLocations();
            setSavedLocations(locations);
        };
        loadLocations();
    }, []);

    const addSavedLocation = useCallback(async (location: SelectedLocation) => {
        // Maksimum 10 konum kontrolü
        if (savedLocations.length >= 10) {
            // Kullanıcıya uyarı verilebilir veya en eski silinebilir
            // Şimdilik ekleme yapmıyoruz
            return;
        }

        // Zaten kayıtlı mı kontrolü (ID veya İsim ile)
        const exists = savedLocations.some(l => {
            // 1. ID kontrolü (0 değilse)
            if (l.district?.id && location.district?.id && l.district.id !== 0 && location.district.id !== 0) {
                return l.district.id === location.district.id;
            }
            // 2. İsim kontrolü (Fallback)
            const name1 = (l.district?.name || l.city?.name || '').toLowerCase().trim();
            const name2 = (location.district?.name || location.city?.name || '').toLowerCase().trim();
            return name1 === name2 && name1 !== '';
        });

        if (!exists) {
            const newLocations = [...savedLocations, location];
            setSavedLocations(newLocations);
            await storageService.saveSavedLocations(newLocations);
        }
    }, [savedLocations]);

    const removeSavedLocation = useCallback(async (location: SelectedLocation) => {
        const newLocations = savedLocations.filter(l =>
            !(l.country?.id === location.country?.id &&
            l.city?.id === location.city?.id &&
            l.district?.id === location.district?.id)
        );
        setSavedLocations(newLocations);
        await storageService.saveSavedLocations(newLocations);
    }, [savedLocations]);

    const updateSavedLocations = useCallback(async (locations: SelectedLocation[]) => {
        setSavedLocations(locations);
        await storageService.saveSavedLocations(locations);
    }, []);

    // Birincil konumu güncelle (savedLocations[0])
    // Eğer aynı ID varsa günceller, yoksa ilk sıraya ekler
    const updatePrimaryLocation = useCallback(async (location: SelectedLocation) => {
        const locationId = location.district?.id;

        // Aynı ID ile mevcut konum var mı kontrol et
        const existingIndex = savedLocations.findIndex(l => {
            if (l.district?.id && locationId && l.district.id !== 0 && locationId !== 0) {
                return l.district.id === locationId;
            }
            const name1 = (l.district?.name || l.city?.name || '').toLowerCase().trim();
            const name2 = (location.district?.name || location.city?.name || '').toLowerCase().trim();
            return name1 === name2 && name1 !== '';
        });

        let newLocations: SelectedLocation[];

        if (existingIndex !== -1) {
            // Mevcut konum bulundu - önce kaldır, sonra başa ekle
            newLocations = savedLocations.filter((_, index) => index !== existingIndex);
            newLocations.unshift(location);
        } else if (savedLocations.length === 0) {
            // Hiç konum yok - yeni olarak ekle
            newLocations = [location];
        } else {
            // Mevcut değil - birincil konumu güncelle (ilk elemanı değiştir)
            newLocations = [location, ...savedLocations.slice(1)];
        }

        setSavedLocations(newLocations);
        await storageService.saveSavedLocations(newLocations);
    }, [savedLocations]);

    return (
        <LocationContext.Provider value={{
            countries,
            cities,
            districts,
            selectedLocation,
            savedLocations,
            isSelectingLocation,
            setCountries,
            setCities,
            setDistricts,
            setSelectedLocation,
            setIsSelectingLocation,
            addSavedLocation,
            removeSavedLocation,
            updateSavedLocations,
            updatePrimaryLocation,
        }}>
            {children}
        </LocationContext.Provider>
    );
};

export const useLocation = () => useContext(LocationContext);

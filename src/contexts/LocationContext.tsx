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
        }}>
            {children}
        </LocationContext.Provider>
    );
};

export const useLocation = () => useContext(LocationContext);

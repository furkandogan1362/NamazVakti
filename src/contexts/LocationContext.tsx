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

import React, { createContext, useState, useContext } from 'react';
import { PlaceItem, SelectedLocation } from '../types/types';

interface LocationContextType {
    countries: PlaceItem[];
    cities: PlaceItem[];
    districts: PlaceItem[];
    selectedLocation: SelectedLocation;
    isSelectingLocation: boolean;
    setCountries: (countries: PlaceItem[]) => void;
    setCities: (cities: PlaceItem[]) => void;
    setDistricts: (districts: PlaceItem[]) => void;
    setSelectedLocation: (location: SelectedLocation) => void;
    setIsSelectingLocation: (isSelecting: boolean) => void;
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
    isSelectingLocation: true,
    setCountries: () => {},
    setCities: () => {},
    setDistricts: () => {},
    setSelectedLocation: () => {},
    setIsSelectingLocation: () => {},
});

export const LocationProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const [countries, setCountries] = useState<PlaceItem[]>([]);
    const [cities, setCities] = useState<PlaceItem[]>([]);
    const [districts, setDistricts] = useState<PlaceItem[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<SelectedLocation>(defaultSelectedLocation);
    const [isSelectingLocation, setIsSelectingLocation] = useState(true);

    return (
        <LocationContext.Provider value={{
            countries,
            cities,
            districts,
            selectedLocation,
            isSelectingLocation,
            setCountries,
            setCities,
            setDistricts,
            setSelectedLocation,
            setIsSelectingLocation,
        }}>
            {children}
        </LocationContext.Provider>
    );
};

export const useLocation = () => useContext(LocationContext);

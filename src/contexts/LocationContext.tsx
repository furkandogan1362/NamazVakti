// LocationContext.tsx

/**
 * Konum verilerinin yönetimi için context sağlayıcı
 * Bu context, kullanıcının seçtiği konum bilgilerini ve ilgili durumları yönetir.
 * Konum verilerini tüm uygulama bileşenlerine sağlar.
 * Yönetilen veriler:
 * - Ülkeler, şehirler ve bölgeler listesi
 * - Seçili konum bilgileri
 * - Konum seçim durumu
 */

import React, { createContext, useState, useContext } from 'react';
import { LocationData, Region } from '../types/types';

interface LocationContextType {
    countries: string[];
    cities: string[];
    regions: Region[];
    selectedLocation: LocationData;
    isSelectingLocation: boolean;
    setCountries: (countries: string[]) => void;
    setCities: (cities: string[]) => void;
    setRegions: (regions: Region[]) => void;
    setSelectedLocation: (location: LocationData) => void;
    setIsSelectingLocation: (isSelecting: boolean) => void;
}

const LocationContext = createContext<LocationContextType>({
    countries: [],
    cities: [],
    regions: [],
    selectedLocation: { country: '', city: '', region: '' },
    isSelectingLocation: true,
    setCountries: () => {},
    setCities: () => {},
    setRegions: () => {},
    setSelectedLocation: () => {},
    setIsSelectingLocation: () => {},
});

export const LocationProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const [countries, setCountries] = useState<string[]>([]);
    const [cities, setCities] = useState<string[]>([]);
    const [regions, setRegions] = useState<Region[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<LocationData>({ country: '', city: '', region: '' });
    const [isSelectingLocation, setIsSelectingLocation] = useState(true);

    return (
        <LocationContext.Provider value={{
            countries,
            cities,
            regions,
            selectedLocation,
            isSelectingLocation,
            setCountries,
            setCities,
            setRegions,
            setSelectedLocation,
            setIsSelectingLocation,
        }}>
            {children}
        </LocationContext.Provider>
    );
};

export const useLocation = () => useContext(LocationContext);

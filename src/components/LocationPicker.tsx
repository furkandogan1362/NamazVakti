// LocationPicker.tsx

/**
 * Konum seçimi için kullanıcı arayüzü bileşeni
 * Bu bileşen, kullanıcının ülke, şehir ve bölge seçimi yapabilmesini sağlar.
 * LocationContext ile entegre çalışır.
 * Özellikler:
 * - Kademeli konum seçimi (ülke -> şehir -> bölge)
 * - Seçilen konumu context üzerinden günceller
 * - Dinamik olarak güncellenen seçenekler
 */

import React from 'react';
import { View, Text } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useLocation } from '../contexts/LocationContext';

const LocationPicker: React.FC = () => {
    const {
        countries,
        cities,
        regions,
        selectedLocation,
        setSelectedLocation,
    } = useLocation();

    return (
        <View>
            <Text>Select Country:</Text>
            <Picker
                selectedValue={selectedLocation.country}
                onValueChange={(country: string) =>
                    setSelectedLocation({...selectedLocation, country, city: '', region: ''})}
            >
                {countries.map((country) => (
                    <Picker.Item key={country} label={country} value={country} />
                ))}
            </Picker>

            <Text>Select City:</Text>
            <Picker
                selectedValue={selectedLocation.city}
                onValueChange={(city: string) =>
                    setSelectedLocation({...selectedLocation, city, region: ''})}
            >
                {cities.map((city) => (
                    <Picker.Item key={city} label={city} value={city} />
                ))}
            </Picker>

            <Text>Select Region:</Text>
            <Picker
                selectedValue={selectedLocation.region}
                onValueChange={(region: string) =>
                    setSelectedLocation({...selectedLocation, region})}
            >
                {regions.map((region) => (
                    <Picker.Item key={region.id} label={region.region} value={region.region} />
                ))}
            </Picker>
        </View>
    );
};

export default LocationPicker;

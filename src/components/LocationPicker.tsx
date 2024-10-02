// LocationPicker.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { Picker } from '@react-native-picker/picker';

interface LocationPickerProps {
    countries: string[];
    cities: string[];
    regions: any[];
    selectedCountry: string;
    selectedCity: string;
    selectedRegion: string;
    setSelectedCountry: (country: string) => void;
    setSelectedCity: (city: string) => void;
    setSelectedRegion: (region: string) => void;
}

const LocationPicker: React.FC<LocationPickerProps> = ({
    countries,
    cities,
    regions,
    selectedCountry,
    selectedCity,
    selectedRegion,
    setSelectedCountry,
    setSelectedCity,
    setSelectedRegion,
}) => {
    return (
        <View>
            <Text>Select Country:</Text>
            <Picker
                selectedValue={selectedCountry}
                onValueChange={(itemValue: string) => setSelectedCountry(itemValue)}
            >
                {countries.map((country) => (
                    <Picker.Item key={country} label={country} value={country} />
                ))}
            </Picker>

            <Text>Select City:</Text>
            <Picker
                selectedValue={selectedCity}
                onValueChange={(itemValue: string) => setSelectedCity(itemValue)}
            >
                {cities.map((city) => (
                    <Picker.Item key={city} label={city} value={city} />
                ))}
            </Picker>

            <Text>Select Region:</Text>
            <Picker
                selectedValue={selectedRegion}
                onValueChange={(itemValue: string) => setSelectedRegion(itemValue)}
            >
                {regions.map((region) => (
                    <Picker.Item key={region.id} label={region.region} value={region.region} />
                ))}
            </Picker>
        </View>
    );
};

export default LocationPicker;

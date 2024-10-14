import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
        <View style={styles.container}>
            <Text style={styles.label}>Select Country:</Text>
            <Picker
                selectedValue={selectedLocation.country}
                onValueChange={(country: string) =>
                    setSelectedLocation({...selectedLocation, country, city: '', region: ''})}
                style={styles.picker}
            >
                <Picker.Item label="Choose a country" value="" />
                {countries.map((country) => (
                    <Picker.Item key={country} label={country} value={country} />
                ))}
            </Picker>

            <Text style={styles.label}>Select City:</Text>
            <Picker
                selectedValue={selectedLocation.city}
                onValueChange={(city: string) =>
                    setSelectedLocation({...selectedLocation, city, region: ''})}
                style={styles.picker}
                enabled={!!selectedLocation.country}
            >
                <Picker.Item label="Choose a city" value="" />
                {cities.map((city) => (
                    <Picker.Item key={city} label={city} value={city} />
                ))}
            </Picker>

            <Text style={styles.label}>Select Region:</Text>
            <Picker
                selectedValue={selectedLocation.region}
                onValueChange={(region: string) =>
                    setSelectedLocation({...selectedLocation, region})}
                style={styles.picker}
                enabled={!!selectedLocation.city}
            >
                <Picker.Item label="Choose a region" value="" />
                {regions.map((region) => (
                    <Picker.Item key={region.id} label={region.region} value={region.region} />
                ))}
            </Picker>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        paddingHorizontal: 10,
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 10,
        marginBottom: 5,
    },
    picker: {
        width: '100%',
        height: 50,
        backgroundColor: '#f0f0f0',
        marginBottom: 10,
    },
});

export default LocationPicker;

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useLocation } from '../contexts/LocationContext';
import { useTheme } from '../contexts/ThemeContext';

interface LocationPickerProps {
    onClose: () => void;
}

const LocationPicker: React.FC<LocationPickerProps> = ({ onClose }) => {
    const {
        countries,
        cities,
        regions,
        selectedLocation,
        setSelectedLocation,
    } = useLocation();
    const { theme, isSmallScreen, screenWidth } = useTheme();

    const handleConfirmLocation = () => {
        if (selectedLocation.country && selectedLocation.city && selectedLocation.region) {
            onClose();
        }
    };

    const styles = createStyles(theme, isSmallScreen, screenWidth);

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
                {regions.map((region) => {
                    // Region adı boş veya null ise city adını göster
                    const displayName = region.region || selectedLocation.city;
                    return (
                        <Picker.Item 
                            key={region.id} 
                            label={displayName} 
                            value={displayName} 
                        />
                    );
                })}
            </Picker>

            {selectedLocation.country && selectedLocation.city && selectedLocation.region && (
                <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={handleConfirmLocation}
                >
                    <Text style={styles.confirmButtonText}>✓ Konumu Onayla</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const createStyles = (theme: any, isSmallScreen: boolean, screenWidth: number) => {
    const padding = isSmallScreen ? 10 : screenWidth < 768 ? 15 : 20;
    const fontSize = isSmallScreen ? 14 : screenWidth < 768 ? 16 : 18;

    return StyleSheet.create({
        container: {
            width: '100%',
            backgroundColor: theme.colors.cardBackground,
            borderRadius: 12,
            padding: padding,
            borderWidth: 1,
            borderColor: theme.colors.cardBorder,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
        },
        label: {
            fontSize: isSmallScreen ? 14 : screenWidth < 768 ? 15 : 16,
            fontWeight: 'bold',
            marginTop: 10,
            marginBottom: 8,
            color: theme.colors.text,
        },
        picker: {
            width: '100%',
            height: isSmallScreen ? 45 : 50,
            backgroundColor: theme.colors.pickerBackground,
            borderRadius: 8,
            marginBottom: 10,
            borderWidth: 1,
            borderColor: theme.colors.pickerBorder,
            color: theme.colors.text,
        },
        confirmButton: {
            marginTop: 20,
            backgroundColor: '#4CAF50',
            padding: 15,
            borderRadius: 10,
            alignItems: 'center',
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 3,
            elevation: 4,
        },
        confirmButtonText: {
            color: '#FFFFFF',
            fontSize: isSmallScreen ? 14 : screenWidth < 768 ? 15 : 16,
            fontWeight: 'bold',
        },
    });
};

export default LocationPicker;
